import {
  Module, Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Injectable, NotFoundException, ForbiddenException, BadRequestException, Request,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationsService, NotificationsModule } from '../notifications/notifications.module';
import { ReservationsService, ReservationsModule } from '../reservations/reservations.module';
import { BrokerService, BrokerModule } from '../broker/broker.module';
import { Public } from '../../shared/auth/public.decorator';

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class CollaborativeService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private reservationsSvc: ReservationsService,
    private brokerSvc: BrokerService,
  ) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async logTimeline(
    vehicleId: string,
    eventType: string,
    data: Record<string, any> = {},
    actorId?: string,
    note?: string,
  ) {
    try {
      await this.prisma.vehicleTimeline.create({
        data: { vehicle_id: vehicleId, event_type: eventType, event_data: data, actor_id: actorId, note },
      });
    } catch { /* non-fatal */ }
  }

  // Routes through the centralized NotificationsService so this feeds the same
  // dashboard notification bell as reservations and broker deals.
  private async notify(
    dealerId: string,
    type: string,
    title: string,
    body: string,
    data: Record<string, any> = {},
  ) {
    await this.notifications.create({ dealer_id: dealerId, type, category: 'shared_stock', title, body, data });
  }

  private async notifyBroker(
    brokerId: string,
    type: string,
    title: string,
    body: string,
    data: Record<string, any> = {},
  ) {
    await this.notifications.create({ broker_id: brokerId, type, category: 'shared_stock', title, body, data });
  }

  // ── QR Code ────────────────────────────────────────────────────────────────

  async getOrCreateQR(vehicleId: string) {
    let qr = await this.prisma.vehicleQrCode.findUnique({ where: { vehicle_id: vehicleId } });
    if (!qr) {
      const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true } });
      if (!vehicle) throw new NotFoundException('Vehicle not found');
      qr = await this.prisma.vehicleQrCode.create({
        data: { vehicle_id: vehicleId, qr_url: `/scan/${vehicleId}` },
      });
    }
    return qr;
  }

  // ── Sharing ────────────────────────────────────────────────────────────────

  async getMyShares(ownerDealerId: string) {
    const shares = await this.prisma.vehicleShare.findMany({
      where: { owner_dealer_id: ownerDealerId, active: true },
      include: {
        vehicle: { select: { id: true, make: true, model: true, year: true, status: true, price_aed: true } },
        permissions: {
          include: { dealer: { select: { id: true, company_name: true, slug: true } } },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    // Filter out revoked permissions in JS (no nested where in include)
    return shares.map(s => ({
      ...s,
      permissions: s.permissions.filter(p => !p.revoked_at),
    }));
  }

  async getSharedWithMe(dealerId: string) {
    // Step 1: get all active permissions for this dealer
    const perms = await this.prisma.sharePermission.findMany({
      where: { dealer_id: dealerId, revoked_at: null },
      include: { share: true },
    });

    // Step 2: filter to active shares, then load vehicle + owner separately
    const activePerms = perms.filter(p => p.share && p.share.active);
    const results = [];

    for (const perm of activePerms) {
      const [vehicle, owner] = await Promise.all([
        this.prisma.vehicle.findUnique({
          where: { id: perm.share.vehicle_id },
          select: {
            id: true, make: true, model: true, year: true, trim: true,
            status: true, price_aed: true, mileage_km: true, color_exterior: true,
            vehicle_images: { where: { is_primary: true }, take: 1 },
          },
        }),
        this.prisma.dealer.findUnique({
          where: { id: perm.share.owner_dealer_id },
          select: { id: true, company_name: true, slug: true, whatsapp: true },
        }),
      ]);

      if (vehicle && vehicle.status !== 'sold') {
        results.push({
          ...vehicle,
          share_id: perm.share.id,
          dealer: owner,
          my_permissions: {
            can_view: perm.can_view,
            can_propose: perm.can_propose,
            can_reserve: perm.can_reserve,
            can_transfer: perm.can_transfer,
            can_negotiate: perm.can_negotiate,
          },
        });
      }
    }
    return results;
  }

  async getSharedWithMeForBroker(brokerId: string) {
    const perms = await this.prisma.brokerSharePermission.findMany({
      where: { broker_id: brokerId, revoked_at: null },
      include: { share: true },
    });
    const activePerms = perms.filter(p => p.share && p.share.active);

    // 'network_all' shares are visible to every broker automatically — same
    // implicit-full-permissions behavior 'network' already gives every
    // dealer, just extended to brokers too (this is the actual "full network
    // dealer + brokers" option).
    const networkAllShares = await this.prisma.vehicleShare.findMany({
      where: { visibility: 'network_all', active: true },
    });

    type Entry = { share: any; perm: { can_view: boolean; can_propose: boolean; can_reserve: boolean; can_transfer: boolean; can_negotiate: boolean } };
    const byVehicle = new Map<string, Entry>();

    for (const share of networkAllShares) {
      byVehicle.set(share.vehicle_id, {
        share,
        perm: { can_view: true, can_propose: true, can_reserve: true, can_transfer: true, can_negotiate: true },
      });
    }
    for (const p of activePerms) {
      byVehicle.set(p.share.vehicle_id, {
        share: p.share,
        perm: { can_view: p.can_view, can_propose: p.can_propose, can_reserve: p.can_reserve, can_transfer: p.can_transfer, can_negotiate: p.can_negotiate },
      });
    }

    const results = [];
    for (const { share, perm } of byVehicle.values()) {
      const [vehicle, owner] = await Promise.all([
        this.prisma.vehicle.findUnique({
          where: { id: share.vehicle_id },
          select: {
            id: true, make: true, model: true, year: true, trim: true,
            status: true, price_aed: true, mileage_km: true, color_exterior: true,
            vehicle_images: { where: { is_primary: true }, take: 1 },
          },
        }),
        this.prisma.dealer.findUnique({
          where: { id: share.owner_dealer_id },
          select: { id: true, company_name: true, slug: true, whatsapp: true },
        }),
      ]);

      if (vehicle && vehicle.status !== 'sold') {
        results.push({ ...vehicle, share_id: share.id, dealer: owner, my_permissions: perm });
      }
    }
    return results;
  }

  // The broker's "Request Transfer" button — a thin, purpose-built wrapper
  // around the generic messaging system so the frontend doesn't need to know
  // msg_type plumbing. Requires can_transfer on this broker's permission for
  // the vehicle (checked, not just trusted from the client).
  // Resolves what a broker can actually do on a shared vehicle — either an
  // explicit BrokerSharePermission row ('selected' visibility), or implicit
  // full access when the share is 'network_all' (no row is ever created for
  // that case, see getSharedWithMeForBroker). Both requestTransfer and
  // requestReserve go through this so neither can drift out of sync with
  // what the broker's own "Shared with me" list already shows them.
  private async resolveBrokerPermission(shareId: string, brokerId: string, share: { visibility: string }) {
    if (share.visibility === 'network_all') {
      return { can_view: true, can_propose: true, can_reserve: true, can_transfer: true, can_negotiate: true };
    }
    const perm = await this.prisma.brokerSharePermission.findFirst({
      where: { share_id: shareId, broker_id: brokerId, revoked_at: null },
    });
    return perm;
  }

  async requestTransfer(vehicleId: string, brokerId: string, note?: string) {
    const share = await this.prisma.vehicleShare.findFirst({ where: { vehicle_id: vehicleId, active: true } });
    if (!share) throw new NotFoundException('This vehicle is not currently shared');

    const perm = await this.resolveBrokerPermission(share.id, brokerId, share);
    if (!perm || !perm.can_transfer) throw new ForbiddenException('You do not have transfer permission on this vehicle');

    const vehicleCheck = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { status: true } });
    if (!vehicleCheck || vehicleCheck.status !== 'available') {
      throw new BadRequestException('This vehicle is no longer available');
    }

    const broker = await this.prisma.broker.findUnique({ where: { id: brokerId }, select: { full_name: true } });
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { make: true, model: true, year: true } });

    const msg = await this.prisma.collaborationMessage.create({
      data: {
        vehicle_id: vehicleId,
        from_broker_id: brokerId,
        to_dealer_id: share.owner_dealer_id,
        msg_type: 'transfer_request',
        content: note || null,
        status: 'pending',
      },
    });

    await this.notify(share.owner_dealer_id, 'transfer_request', 'Transfer request',
      `${broker?.full_name || 'A broker'} requested a transfer for ${vehicle?.year} ${vehicle?.make} ${vehicle?.model}`,
      { vehicle_id: vehicleId, message_id: msg.id });

    await this.logTimeline(vehicleId, 'collab_transfer_request', { broker_id: brokerId }, brokerId);
    return msg;
  }

  // The broker's "Reserve" button — was missing entirely, only "Request
  // Transfer" had a working action even though can_reserve was already
  // being computed and shown on every shared-vehicle card.
  async requestReserve(vehicleId: string, brokerId: string, note?: string) {
    const share = await this.prisma.vehicleShare.findFirst({ where: { vehicle_id: vehicleId, active: true } });
    if (!share) throw new NotFoundException('This vehicle is not currently shared');

    const perm = await this.resolveBrokerPermission(share.id, brokerId, share);
    if (!perm || !perm.can_reserve) throw new ForbiddenException('You do not have reserve permission on this vehicle');

    const vehicleCheck = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { status: true } });
    if (!vehicleCheck || vehicleCheck.status !== 'available') {
      throw new BadRequestException('This vehicle is no longer available');
    }

    const broker = await this.prisma.broker.findUnique({ where: { id: brokerId }, select: { full_name: true } });
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { make: true, model: true, year: true } });

    const msg = await this.prisma.collaborationMessage.create({
      data: {
        vehicle_id: vehicleId,
        from_broker_id: brokerId,
        to_dealer_id: share.owner_dealer_id,
        msg_type: 'reserve_request',
        content: note || null,
        status: 'pending',
      },
    });

    await this.notify(share.owner_dealer_id, 'reserve_request', 'Reservation request',
      `${broker?.full_name || 'A broker'} requested to reserve ${vehicle?.year} ${vehicle?.make} ${vehicle?.model}`,
      { vehicle_id: vehicleId, message_id: msg.id });

    await this.logTimeline(vehicleId, 'collab_reserve_request', { broker_id: brokerId }, brokerId);
    return msg;
  }

  // The recap: every request this broker has made, with its current status
  // (pending/accepted/declined) — this is what was missing entirely before:
  // a broker had no way to see what happened after they asked for something.
  async getBrokerRequests(brokerId: string) {
    const messages = await this.prisma.collaborationMessage.findMany({
      where: { from_broker_id: brokerId },
      orderBy: { created_at: 'desc' },
    });
    const vehicleIds = [...new Set(messages.map(m => m.vehicle_id))];
    const vehicles = await this.prisma.vehicle.findMany({
      where: { id: { in: vehicleIds } },
      select: { id: true, make: true, model: true, year: true, price_aed: true, dealer_id: true },
    });
    const dealerIds = [...new Set(vehicles.map(v => v.dealer_id).filter(Boolean))];
    const dealers = await this.prisma.dealer.findMany({
      where: { id: { in: dealerIds as string[] } },
      select: { id: true, company_name: true },
    });
    const vMap = new Map(vehicles.map(v => [v.id, v] as const));
    const dMap = new Map(dealers.map(d => [d.id, d] as const));
    return messages.map(m => ({
      ...m,
      vehicle: vMap.get(m.vehicle_id) || null,
      dealer: vMap.get(m.vehicle_id)?.dealer_id ? dMap.get(vMap.get(m.vehicle_id)!.dealer_id!) : null,
    }));
  }

  async shareVehicle(
    vehicleId: string,
    ownerDealerId: string,
    body: {
      visibility: string;
      group_id?: string;
      dealer_ids?: string[];
      broker_ids?: string[];
      permissions: { can_propose?: boolean; can_reserve?: boolean; can_transfer?: boolean; can_negotiate?: boolean };
      starts_at?: string;
      ends_at?: string;
    },
  ) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, dealer_id: ownerDealerId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found or not owned by you');

    // Upsert the share record
    let share = await this.prisma.vehicleShare.findFirst({
      where: { vehicle_id: vehicleId, owner_dealer_id: ownerDealerId },
    });

    if (share) {
      share = await this.prisma.vehicleShare.update({
        where: { id: share.id },
        data: { visibility: body.visibility, group_id: body.group_id ?? null, active: true },
      });
    } else {
      share = await this.prisma.vehicleShare.create({
        data: {
          vehicle_id: vehicleId,
          owner_dealer_id: ownerDealerId,
          visibility: body.visibility,
          group_id: body.group_id ?? null,
        },
      });
    }

    // For 'selected' visibility, create per-dealer permissions
    if (body.visibility === 'selected' && body.dealer_ids?.length) {
      for (const did of body.dealer_ids) {
        const existing = await this.prisma.sharePermission.findFirst({
          where: { share_id: share.id, dealer_id: did },
        });

        const permData = {
          can_view: true,
          can_propose: body.permissions.can_propose ?? false,
          can_reserve: body.permissions.can_reserve ?? false,
          can_transfer: body.permissions.can_transfer ?? false,
          can_negotiate: body.permissions.can_negotiate ?? false,
          starts_at: body.starts_at ? new Date(body.starts_at) : new Date(),
          ends_at: body.ends_at ? new Date(body.ends_at) : null,
        };

        if (existing) {
          await this.prisma.sharePermission.update({ where: { id: existing.id }, data: permData });
        } else {
          await this.prisma.sharePermission.create({ data: { share_id: share.id, dealer_id: did, ...permData } });
        }

        await this.notify(did, 'share_invitation', 'Vehicle shared with you',
          `${vehicle.year} ${vehicle.make} ${vehicle.model} has been shared with you`,
          { vehicle_id: vehicleId });
      }
    }

    await this.logTimeline(vehicleId, 'shared', { visibility: body.visibility, dealer_ids: body.dealer_ids }, ownerDealerId);

    // Same "selected" flow, but for brokers in the dealer's network — kept as
    // its own branch/table (BrokerSharePermission) so the dealer-to-dealer
    // path above is completely unaffected.
    if (body.visibility === 'selected' && body.broker_ids?.length) {
      for (const bid of body.broker_ids) {
        const existing = await this.prisma.brokerSharePermission.findFirst({
          where: { share_id: share.id, broker_id: bid },
        });

        const permData = {
          can_view: true,
          can_propose: body.permissions.can_propose ?? false,
          can_reserve: body.permissions.can_reserve ?? false,
          can_transfer: body.permissions.can_transfer ?? false,
          can_negotiate: body.permissions.can_negotiate ?? false,
          starts_at: body.starts_at ? new Date(body.starts_at) : new Date(),
          ends_at: body.ends_at ? new Date(body.ends_at) : null,
        };

        if (existing) {
          await this.prisma.brokerSharePermission.update({ where: { id: existing.id }, data: permData });
        } else {
          await this.prisma.brokerSharePermission.create({ data: { share_id: share.id, broker_id: bid, ...permData } });
        }

        await this.notifyBroker(bid, 'share_invitation', 'Vehicle shared with you',
          `${vehicle.year} ${vehicle.make} ${vehicle.model} has been shared with you`,
          { vehicle_id: vehicleId });
      }
      await this.logTimeline(vehicleId, 'shared_with_brokers', { broker_ids: body.broker_ids }, ownerDealerId);
    }

    return share;
  }

  async revokeShare(vehicleId: string, ownerDealerId: string, dealerId?: string) {
    const share = await this.prisma.vehicleShare.findFirst({
      where: { vehicle_id: vehicleId, owner_dealer_id: ownerDealerId },
    });
    if (!share) throw new NotFoundException('Share not found');

    if (dealerId) {
      await this.prisma.sharePermission.updateMany({
        where: { share_id: share.id, dealer_id: dealerId },
        data: { revoked_at: new Date(), revoked_by: ownerDealerId },
      });
    } else {
      await this.prisma.vehicleShare.update({ where: { id: share.id }, data: { active: false } });
      await this.prisma.sharePermission.updateMany({
        where: { share_id: share.id },
        data: { revoked_at: new Date(), revoked_by: ownerDealerId },
      });
    }

    await this.logTimeline(vehicleId, 'share_revoked', { dealer_id: dealerId }, ownerDealerId);
    return { revoked: true };
  }

  // ── Network inventory ──────────────────────────────────────────────────────

  async getNetworkInventory(dealerId: string, q: any) {
    const { search, make, page = 1, limit = 24 } = q;

    // Get all network-wide shares — 'network' (dealers only) and
    // 'network_all' (dealers + brokers) are both fully visible to dealers.
    const networkShares = await this.prisma.vehicleShare.findMany({
      where: { visibility: { in: ['network', 'network_all'] }, active: true },
      select: { id: true, vehicle_id: true, owner_dealer_id: true },
    });

    // Get shares this dealer has explicit access to
    const myPerms = await this.prisma.sharePermission.findMany({
      where: { dealer_id: dealerId, revoked_at: null },
      include: { share: { select: { id: true, vehicle_id: true, owner_dealer_id: true, active: true } } },
    });

    // Collect vehicle IDs (exclude own vehicles)
    const vehicleMap = new Map<string, { share_id: string; my_permissions: any }>();

    for (const s of networkShares) {
      if (s.owner_dealer_id !== dealerId) {
        vehicleMap.set(s.vehicle_id, {
          share_id: s.id,
          my_permissions: { can_view: true, can_propose: true, can_reserve: true, can_transfer: true, can_negotiate: true },
        });
      }
    }

    for (const p of myPerms) {
      if (p.share?.active && p.share.owner_dealer_id !== dealerId) {
        vehicleMap.set(p.share.vehicle_id, {
          share_id: p.share.id,
          my_permissions: {
            can_view: p.can_view, can_propose: p.can_propose,
            can_reserve: p.can_reserve, can_transfer: p.can_transfer, can_negotiate: p.can_negotiate,
          },
        });
      }
    }

    if (vehicleMap.size === 0) return { items: [], total: 0, page: 1, pages: 0 };

    // Fetch vehicles
    const whereClause: any = {
      id: { in: Array.from(vehicleMap.keys()) },
      status: 'available',
    };
    if (search) whereClause.OR = [
      { make: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
    ];
    if (make) whereClause.make = make;

    const [vehicles, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: whereClause,
        include: {
          vehicle_images: { where: { is_primary: true }, take: 1 },
          dealer: { select: { id: true, company_name: true, slug: true, rating: true, whatsapp: true } },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.vehicle.count({ where: whereClause }),
    ]);

    const items = vehicles.map((v: any) => ({
      ...v,
      ...vehicleMap.get(v.id),
    }));

    return { items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  // ── Timeline ───────────────────────────────────────────────────────────────

  async getTimeline(vehicleId: string) {
    return this.prisma.vehicleTimeline.findMany({
      where: { vehicle_id: vehicleId },
      orderBy: { occurred_at: 'asc' },
    });
  }

  async addTimelineEvent(vehicleId: string, body: {
    event_type: string; note?: string; actor_id?: string; event_data?: Record<string, any>;
  }) {
    return this.prisma.vehicleTimeline.create({
      data: {
        vehicle_id: vehicleId,
        event_type: body.event_type,
        note: body.note,
        actor_id: body.actor_id,
        event_data: body.event_data ?? {},
      },
    });
  }

  // ── One-Tap / Quick Action ─────────────────────────────────────────────────

  async oneTapSale(vehicleId: string, dealerId: string, action = 'sold', source = 'widget') {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const STATUS_MAP: Record<string, string> = {
      sold: 'sold', reserved: 'reserved', available: 'available',
      delivered: 'exported', preparing: 'reserved', returned: 'available',
    };
    const newStatus = STATUS_MAP[action] ?? action;

    // Update status and decrement quantity if selling
    const updateData: any = { status: newStatus };
    if (action === 'sold' && vehicle.stock_quantity > 1) {
      updateData.stock_quantity = vehicle.stock_quantity - 1;
      updateData.status = 'available'; // Still available with remaining stock
      updateData.sold_units = { increment: 1 };
    } else if (action === 'sold') {
      updateData.status = 'sold';
      updateData.sold_units = { increment: 1 };
    }

    await this.prisma.vehicle.update({ where: { id: vehicleId }, data: updateData });

    // Log stock transaction
    try {
      await (this.prisma as any).$executeRawUnsafe(
        `INSERT INTO stock_transactions (vehicle_id, dealer_id, txn_type, quantity, quantity_before, quantity_after, note, source, actor_id)
         VALUES ($1, $2, $3, 1, $4, $5, $6, $7, $8)`,
        vehicleId, vehicle.dealer_id,
        action === 'sold' ? 'stock_out' : 'adjustment',
        vehicle.stock_quantity,
        action === 'sold' ? Math.max(0, vehicle.stock_quantity - 1) : vehicle.stock_quantity,
        `Quick action: ${action} via ${source}`,
        source, dealerId
      );
    } catch { /* non-fatal */ }

    await this.prisma.scanEvent.create({
      data: { vehicle_id: vehicleId, dealer_id: dealerId, scan_type: source, action_taken: action, source },
    });
    await this.logTimeline(vehicleId, action, { source, previous_status: vehicle.status }, dealerId, `Quick action: ${action}`);

    // Notify owner if different
    const notified = new Set<string>();
    if (vehicle.dealer_id !== dealerId) {
      await this.notify(vehicle.dealer_id, 'quick_sale', `Vehicle ${action}`,
        `${vehicle.year} ${vehicle.make} ${vehicle.model} marked as ${action}`, { vehicle_id: vehicleId });
      notified.add(vehicle.dealer_id);
    }

    // Find all active share permissions and notify those dealers
    const shares = await this.prisma.vehicleShare.findMany({
      where: { vehicle_id: vehicleId, active: true },
      include: { permissions: { where: { revoked_at: null }, select: { dealer_id: true } } },
    });

    for (const share of shares) {
      for (const perm of share.permissions) {
        if (!notified.has(perm.dealer_id) && perm.dealer_id !== dealerId) {
          await this.notify(perm.dealer_id, 'shared_vehicle_update',
            `Shared vehicle ${action}`,
            `${vehicle.year} ${vehicle.make} ${vehicle.model} is now ${action}`,
            { vehicle_id: vehicleId, action });
          notified.add(perm.dealer_id);
        }
      }
    }

    return { vehicle_id: vehicleId, new_status: newStatus, action, notifications_sent: notified.size };
  }

  // ── Scan ──────────────────────────────────────────────────────────────────

  async processScan(body: { scan_type: string; scan_data: string; dealer_id: string; source?: string }) {
    let vehicleId: string | null = null;

    if (body.scan_type === 'qr') {
      const qr = await this.prisma.vehicleQrCode.findFirst({ where: { qr_token: body.scan_data } });
      vehicleId = qr?.vehicle_id ?? null;
    } else if (body.scan_type === 'vin') {
      const v = await this.prisma.vehicle.findFirst({ where: { vin: body.scan_data } });
      vehicleId = v?.id ?? null;
    } else if (body.scan_type === 'plate_ocr') {
      // Search by plate_number field first, then fallback to text search
      const v = await this.prisma.vehicle.findFirst({
        where: {
          OR: [
            { plate_number: { contains: body.scan_data.toUpperCase(), mode: 'insensitive' } },
            { vin: { contains: body.scan_data.toUpperCase(), mode: 'insensitive' } },
            { title: { contains: body.scan_data, mode: 'insensitive' } },
            { description: { contains: body.scan_data, mode: 'insensitive' } },
          ],
        },
      });
      vehicleId = v?.id ?? null;
    } else if (body.scan_type === 'barcode') {
      // Barcode is typically VIN
      const v = await this.prisma.vehicle.findFirst({ where: { vin: body.scan_data } });
      vehicleId = v?.id ?? null;
    }

    if (!vehicleId) return { found: false, scan_data: body.scan_data, scan_type: body.scan_type };

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { vehicle_images: { where: { is_primary: true }, take: 1 } },
    });

    await this.prisma.scanEvent.create({
      data: { vehicle_id: vehicleId, dealer_id: body.dealer_id, scan_type: body.scan_type, scan_data: body.scan_data, source: body.source ?? 'mobile' },
    });

    return {
      found: true, vehicle,
      available_actions: ['sold', 'reserved', 'available', 'delivered', 'returned', 'preparing'],
    };
  }

  // ── Collaboration messages ─────────────────────────────────────────────────

  async getMessages(vehicleId: string) {
    return this.prisma.collaborationMessage.findMany({
      where: { vehicle_id: vehicleId },
      orderBy: { created_at: 'asc' },
    });
  }

  async sendMessage(vehicleId: string, body: {
    from_dealer_id: string;
    to_dealer_id: string;
    msg_type: string;
    content?: string;
    offer_price_aed?: number;
    expires_at?: string;
  }) {
    const msg = await this.prisma.collaborationMessage.create({
      data: {
        vehicle_id: vehicleId,
        from_dealer_id: body.from_dealer_id,
        to_dealer_id: body.to_dealer_id,
        msg_type: body.msg_type,
        content: body.content,
        offer_price_aed: body.offer_price_aed,
        expires_at: body.expires_at ? new Date(body.expires_at) : null,
      },
    });

    const [fromDealer, vehicle] = await Promise.all([
      this.prisma.dealer.findUnique({ where: { id: body.from_dealer_id }, select: { company_name: true } }),
      this.prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { make: true, model: true, year: true } }),
    ]);

    const typeLabels: Record<string, string> = {
      message: 'New message', offer: 'New offer received',
      reserve_request: 'Reservation request', transfer_request: 'Transfer request',
      exchange_proposal: 'Exchange proposal',
    };

    if (body.to_dealer_id) {
      await this.notify(body.to_dealer_id, body.msg_type,
        typeLabels[body.msg_type] ?? 'New message',
        `${fromDealer?.company_name} regarding ${vehicle?.year} ${vehicle?.make} ${vehicle?.model}`,
        { vehicle_id: vehicleId, message_id: msg.id, offer_price: body.offer_price_aed });
    }

    await this.logTimeline(vehicleId, `collab_${body.msg_type}`,
      { from: body.from_dealer_id, to: body.to_dealer_id, price: body.offer_price_aed },
      body.from_dealer_id);

    return msg;
  }

  // Everything requested BY brokers/dealers ON this dealer's shared vehicles —
  // so the dealer has one place to see and act on incoming requests, instead
  // of having to open each vehicle's message thread individually.
  async getIncomingRequestsForDealer(dealerId: string) {
    const messages = await this.prisma.collaborationMessage.findMany({
      where: { to_dealer_id: dealerId },
      orderBy: { created_at: 'desc' },
    });
    const vehicleIds = [...new Set(messages.map(m => m.vehicle_id))];
    const vehicles = await this.prisma.vehicle.findMany({
      where: { id: { in: vehicleIds } },
      select: { id: true, make: true, model: true, year: true, price_aed: true },
    });
    const brokerIds = [...new Set(messages.map(m => m.from_broker_id).filter(Boolean))] as string[];
    const dealerIds = [...new Set(messages.map(m => m.from_dealer_id).filter(Boolean))] as string[];
    const [brokers, dealers] = await Promise.all([
      brokerIds.length ? this.prisma.broker.findMany({ where: { id: { in: brokerIds } }, select: { id: true, full_name: true, affiliate_code: true } }) : [],
      dealerIds.length ? this.prisma.dealer.findMany({ where: { id: { in: dealerIds } }, select: { id: true, company_name: true } }) : [],
    ]);
    const vMap = new Map(vehicles.map(v => [v.id, v] as const));
    const bMap = new Map(brokers.map(b => [b.id, b] as const));
    const dMap = new Map(dealers.map(d => [d.id, d] as const));
    return messages.map(m => ({
      ...m,
      vehicle: vMap.get(m.vehicle_id) || null,
      from_broker: m.from_broker_id ? bMap.get(m.from_broker_id) || null : null,
      from_dealer: m.from_dealer_id ? dMap.get(m.from_dealer_id) || null : null,
    }));
  }

  // The missing back-half of the shared-inventory request flow: until now,
  // "accepting" a request only flipped a message's status and sent a
  // notification — the vehicle itself never actually got reserved or sold,
  // no invoice was raised, and stock/KPI counters never moved. This routes
  // each accepted request through the SAME logic the dealer's own "Mark as
  // sold" / reservation flows already use, so shared-stock deals behave
  // identically to ones made directly on the dealer's own dashboard.
  async respondToMessage(messageId: string, response: string, dealerId: string) {
    const msg = await this.prisma.collaborationMessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.to_dealer_id !== dealerId) {
      throw new ForbiddenException('You can only respond to requests sent to you');
    }

    const updated = await this.prisma.collaborationMessage.update({
      where: { id: messageId },
      data: { status: response, updated_at: new Date() },
    });

    let outcome: any = null;
    if (response === 'accepted' && msg.vehicle_id) {
      // Guard against two requests on the same vehicle both being accepted
      // (e.g. two dealers asking for the same single-unit car) — without
      // this, completeSale/reservationsSvc would happily run twice and
      // decrement stock into the negative, or double-sell the same unit.
      const currentVehicle = await this.prisma.vehicle.findUnique({ where: { id: msg.vehicle_id } });
      if (!currentVehicle || currentVehicle.status !== 'available' || Number(currentVehicle.stock_quantity) < 1) {
        outcome = { kind: 'error', message: 'This vehicle is no longer available — it may have just been reserved or sold via another request.' };
      } else {

      const requesterName = msg.from_broker_id
        ? (await this.prisma.broker.findUnique({ where: { id: msg.from_broker_id }, select: { full_name: true } }))?.full_name
        : msg.from_dealer_id
          ? (await this.prisma.dealer.findUnique({ where: { id: msg.from_dealer_id }, select: { company_name: true } }))?.company_name
          : undefined;

      try {
        if (msg.msg_type === 'reserve_request') {
          // Reserves the vehicle for the requester — decrements stock,
          // flips status to 'reserved' if it was the last unit, and creates
          // a VehicleReservation record just like a direct dashboard reserve.
          const reservation = await this.reservationsSvc.create({
            vehicle_id: msg.vehicle_id,
            broker_id: msg.from_broker_id || undefined,
            reserved_by_name: requesterName || 'Network partner',
            note: `Reserved via shared-inventory request (${msg.msg_type})`,
          });
          outcome = { kind: 'reserved', reservation };
        } else if (msg.msg_type === 'transfer_request' || msg.msg_type === 'offer') {
          // Treated as a completed sale via the network: decrements stock,
          // increments sold_units, flips status to 'sold' on the last unit,
          // raises a draft invoice with a line item, and records a broker
          // deal (with commission) when the requester is a broker.
          const result = await this.brokerSvc.completeSale({
            vehicle_id: msg.vehicle_id,
            dealer_id: dealerId,
            broker_id: msg.from_broker_id || undefined,
            buyer_name: requesterName || 'Network partner',
            deal_price_aed: msg.offer_price_aed ? Number(msg.offer_price_aed) : undefined,
            notes: `Closed via shared-inventory ${msg.msg_type} request`,
          });
          outcome = { kind: 'sold', ...result };
        }

        // The vehicle is now reserved/sold — every OTHER pending request on
        // it (from other dealers/brokers) can no longer be honored. Close
        // them out automatically instead of leaving them stuck as "pending"
        // forever, and let each requester know why.
        if (outcome && (outcome.kind === 'sold' || outcome.kind === 'reserved')) {
          const others = await this.prisma.collaborationMessage.findMany({
            where: { vehicle_id: msg.vehicle_id, status: 'pending', id: { not: messageId } },
          });
          for (const o of others) {
            await this.prisma.collaborationMessage.update({ where: { id: o.id }, data: { status: 'declined', updated_at: new Date() } });
            const note = 'This vehicle is no longer available — another request was accepted first.';
            if (o.from_dealer_id) await this.notify(o.from_dealer_id, 'collab_declined', 'Request no longer available', note, { vehicle_id: msg.vehicle_id });
            if (o.from_broker_id) await this.notifyBroker(o.from_broker_id, 'collab_declined', 'Request no longer available', note, { vehicle_id: msg.vehicle_id });
          }
        }
      } catch (err: any) {

        // The message is still marked accepted — but if the vehicle turned
        // out to be unavailable in the meantime (race with another accepted
        // request), surface that clearly instead of silently losing it.
        outcome = { kind: 'error', message: err.message || 'Could not update the vehicle' };
      }
      } // close the availability-guard else block
    }

    if (msg.from_dealer_id) {
      await this.notify(msg.from_dealer_id, `collab_${response}`,
        `Your ${msg.msg_type} was ${response}`, 'Response to your request',
        { vehicle_id: msg.vehicle_id ?? undefined, message_id: messageId });
    }
    if (msg.from_broker_id) {
      await this.notifyBroker(msg.from_broker_id, `collab_${response}`,
        `Your ${msg.msg_type} was ${response}`, 'Response to your request',
        { vehicle_id: msg.vehicle_id ?? undefined, message_id: messageId });
    }

    if (msg.vehicle_id) {
      await this.logTimeline(msg.vehicle_id, `collab_${response}`, { message_id: messageId, outcome: outcome?.kind }, dealerId);
    }

    return { ...updated, outcome };
  }

  // ── Notifications (legacy route — delegates to centralized NotificationsService) ──

  async getNotifications(dealerId: string) {
    return this.notifications.listForDealer(dealerId, { limit: '50' });
  }

  async markRead(dealerId: string, notifId?: string) {
    if (notifId) return this.notifications.markRead(notifId);
    return this.notifications.markAllReadForDealer(dealerId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

@Controller('collaborative')
export class CollaborativeController {
  constructor(private svc: CollaborativeService) {}

  // Same anti-IDOR pattern used across the rest of the dealer/broker
  // dashboards: admins can access anything, everyone else only their own.
  private assertOwnDealer(dealerId: string, req: any) {
    if (req.user?.role === 'admin') return;
    if (req.user?.dealerId !== dealerId) throw new ForbiddenException('You can only access your own data');
  }
  private assertOwnBroker(brokerId: string, req: any) {
    if (req.user?.role === 'admin') return;
    if (req.user?.brokerId !== brokerId) throw new ForbiddenException('You can only access your own data');
  }

  @Get('vehicles/:id/qr')
  getQR(@Param('id') id: string) { return this.svc.getOrCreateQR(id); }

  @Get('dealer/:dealerId/my-shares')
  myShares(@Param('dealerId') id: string) { return this.svc.getMyShares(id); }

  @Get('dealer/:dealerId/shared-with-me')
  sharedWithMe(@Param('dealerId') id: string) { return this.svc.getSharedWithMe(id); }

  @Get('broker/:brokerId/shared-with-me')
  sharedWithMeBroker(@Param('brokerId') id: string, @Request() req: any) {
    this.assertOwnBroker(id, req);
    return this.svc.getSharedWithMeForBroker(id);
  }

  @Post('vehicles/:id/request-transfer')
  requestTransfer(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    this.assertOwnBroker(body.broker_id, req);
    return this.svc.requestTransfer(id, body.broker_id, body.note);
  }

  @Post('vehicles/:id/request-reserve')
  requestReserve(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    this.assertOwnBroker(body.broker_id, req);
    return this.svc.requestReserve(id, body.broker_id, body.note);
  }

  @Get('broker/:brokerId/requests')
  brokerRequests(@Param('brokerId') id: string, @Request() req: any) {
    this.assertOwnBroker(id, req);
    return this.svc.getBrokerRequests(id);
  }

  @Get('dealer/:dealerId/incoming-requests')
  incomingRequests(@Param('dealerId') id: string, @Request() req: any) {
    this.assertOwnDealer(id, req);
    return this.svc.getIncomingRequestsForDealer(id);
  }

  @Get('dealer/:dealerId/network')
  network(@Param('dealerId') id: string, @Query() q: any) { return this.svc.getNetworkInventory(id, q); }

  @Post('vehicles/:id/share')
  share(@Param('id') id: string, @Body() body: any) { return this.svc.shareVehicle(id, body.owner_dealer_id, body); }

  @Delete('vehicles/:id/share')
  revoke(@Param('id') id: string, @Body() body: any) { return this.svc.revokeShare(id, body.owner_dealer_id, body.dealer_id); }

  @Get('vehicles/:id/timeline')
  timeline(@Param('id') id: string) { return this.svc.getTimeline(id); }

  @Post('vehicles/:id/timeline')
  addEvent(@Param('id') id: string, @Body() body: any) { return this.svc.addTimelineEvent(id, body); }

  @Post('vehicles/:id/quick-action')
  quickAction(@Param('id') id: string, @Body() body: any) {
    return this.svc.oneTapSale(id, body.dealer_id, body.action, body.source ?? 'widget');
  }

  @Public()
  @Post('scan')
  scan(@Body() body: any) { return this.svc.processScan(body); }

  @Public()
  @Get('scan/:token')
  scanByToken(@Param('token') token: string, @Query('dealer_id') dealerId: string) {
    return this.svc.processScan({ scan_type: 'qr', scan_data: token, dealer_id: dealerId });
  }

  @Get('vehicles/:id/messages')
  messages(@Param('id') id: string) { return this.svc.getMessages(id); }

  @Post('vehicles/:id/messages')
  sendMsg(@Param('id') id: string, @Body() body: any) { return this.svc.sendMessage(id, body); }

  @Patch('messages/:id/respond')
  respond(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    this.assertOwnDealer(body.dealer_id, req);
    return this.svc.respondToMessage(id, body.response, body.dealer_id);
  }

  @Get('dealer/:dealerId/notifications')
  notifications(@Param('dealerId') id: string) { return this.svc.getNotifications(id); }

  @Patch('dealer/:dealerId/notifications/read')
  markRead(@Param('dealerId') id: string, @Body() body: any) { return this.svc.markRead(id, body.notification_id); }
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE
// ─────────────────────────────────────────────────────────────────────────────

@Module({
  imports: [NotificationsModule, ReservationsModule, BrokerModule],
  controllers: [CollaborativeController],
  providers: [CollaborativeService],
  exports: [CollaborativeService],
})
export class CollaborativeModule {}
