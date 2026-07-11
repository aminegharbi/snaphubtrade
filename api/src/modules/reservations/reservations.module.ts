import {
  Module, Controller, Get, Post, Patch, Body, Param, Query,
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationsService, NotificationsModule } from '../notifications/notifications.module';

const RESERVATION_HOURS = 24;

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  // Lazily expire any reservation whose window has passed. Called before every
  // read so the system stays correct without needing a background cron job.
  private async sweepExpired(vehicleId?: string) {
    const where: any = { status: 'active', expires_at: { lt: new Date() } };
    if (vehicleId) where.vehicle_id = vehicleId;

    const expiring = await this.prisma.vehicleReservation.findMany({ where });
    for (const r of expiring) {
      await this.prisma.$transaction([
        this.prisma.vehicleReservation.update({ where: { id: r.id }, data: { status: 'expired' } }),
        this.prisma.vehicle.update({
          where: { id: r.vehicle_id },
          data: { stock_quantity: { increment: 1 }, status: 'available' },
        }),
      ]);
      await this.notifications.createForBoth(
        r.dealer_id, r.broker_id ?? undefined,
        'reservation_expired', 'reservation',
        'Reservation expired',
        `A 24h broker reservation has expired — the vehicle is back on the market.`,
        'Your reservation expired',
        `Your 24h hold expired and the vehicle is now available to other buyers.`,
        { reservation_id: r.id, vehicle_id: r.vehicle_id },
      );
    }
    return expiring.length;
  }

  // ── Create a reservation (broker books a vehicle) ───────────────────────────

  async create(data: {
    vehicle_id: string; broker_id?: string;
    reserved_by_name?: string; reserved_by_contact?: string; note?: string;
  }) {
    if (!data.vehicle_id) throw new BadRequestException('vehicle_id is required');

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: data.vehicle_id } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    await this.sweepExpired(data.vehicle_id);

    const fresh = await this.prisma.vehicle.findUnique({ where: { id: data.vehicle_id } });
    if (fresh!.status !== 'available' || fresh!.stock_quantity < 1) {
      throw new ConflictException(`Vehicle is currently '${fresh!.status}' with no available stock and cannot be reserved`);
    }

    let brokerName = data.reserved_by_name;
    if (data.broker_id && !brokerName) {
      const broker = await this.prisma.broker.findUnique({ where: { id: data.broker_id } });
      brokerName = broker?.full_name;
    }

    const expiresAt = new Date(Date.now() + RESERVATION_HOURS * 60 * 60 * 1000);

    const newStatus = fresh!.stock_quantity <= 1 ? 'reserved' : 'available';

    const [reservation] = await this.prisma.$transaction([
      this.prisma.vehicleReservation.create({
        data: {
          vehicle_id: data.vehicle_id,
          dealer_id: vehicle.dealer_id,
          broker_id: data.broker_id,
          reserved_by_name: brokerName,
          reserved_by_contact: data.reserved_by_contact,
          note: data.note,
          expires_at: expiresAt,
        },
      }),
      this.prisma.vehicle.update({
        where: { id: data.vehicle_id },
        data: { stock_quantity: { decrement: 1 }, status: newStatus },
      }),
    ]);

    await this.notifications.createForBoth(
      vehicle.dealer_id, data.broker_id,
      'reservation_created', 'reservation',
      `🔖 ${vehicle.year} ${vehicle.make} ${vehicle.model} reserved`,
      `${brokerName || 'A broker'} reserved this vehicle. Hold expires in 24h (${expiresAt.toLocaleString()}).`,
      `🔖 Reservation confirmed`,
      `You've reserved the ${vehicle.year} ${vehicle.make} ${vehicle.model} for 24h. Close the deal before it expires.`,
      { reservation_id: reservation.id, vehicle_id: vehicle.id, broker_id: data.broker_id },
    );

    return reservation;
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  async getForVehicle(vehicleId: string) {
    await this.sweepExpired(vehicleId);
    return this.prisma.vehicleReservation.findFirst({
      where: { vehicle_id: vehicleId, status: 'active' },
      include: { broker: { select: { id: true, full_name: true, affiliate_code: true, tier: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async getForDealer(dealerId: string, q: any = {}) {
    await this.sweepExpired();
    const where: any = { dealer_id: dealerId };
    if (q.status) where.status = q.status;
    return this.prisma.vehicleReservation.findMany({
      where,
      include: {
        vehicle: { select: { id: true, make: true, model: true, year: true, price_aed: true,
          vehicle_images: { where: { is_primary: true }, take: 1 } } },
        broker: { select: { id: true, full_name: true, affiliate_code: true, tier: true, phone: true, whatsapp: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  async getForBroker(brokerId: string) {
    await this.sweepExpired();
    return this.prisma.vehicleReservation.findMany({
      where: { broker_id: brokerId },
      include: {
        vehicle: { select: { id: true, make: true, model: true, year: true, price_aed: true,
          vehicle_images: { where: { is_primary: true }, take: 1 } } },
        dealer: { select: { id: true, company_name: true, slug: true, whatsapp: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  async cancel(id: string, actor?: string) {
    const r = await this.prisma.vehicleReservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Reservation not found');
    if (r.status !== 'active') throw new BadRequestException(`Reservation is already '${r.status}'`);

    await this.prisma.$transaction([
      this.prisma.vehicleReservation.update({ where: { id }, data: { status: 'cancelled', cancelled_at: new Date() } }),
      this.prisma.vehicle.update({
        where: { id: r.vehicle_id },
        data: { stock_quantity: { increment: 1 }, status: 'available' },
      }),
    ]);

    await this.notifications.createForBoth(
      r.dealer_id, r.broker_id ?? undefined,
      'reservation_cancelled', 'reservation',
      'Reservation cancelled',
      `The reservation${actor ? ` by ${actor}` : ''} was cancelled — vehicle is available again.`,
      'Reservation cancelled',
      `Your reservation${actor ? ` was cancelled by ${actor}` : ' was cancelled'}.`,
      { reservation_id: id, vehicle_id: r.vehicle_id },
    );

    return { ok: true };
  }

  // ── Sell: dealer confirms sale from an active broker reservation ─────────────

  async sell(id: string, data: {
    deal_price_aed?: number;
    buyer_name?: string;
    buyer_country?: string;
    notes?: string;
  }) {
    const r = await this.prisma.vehicleReservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Reservation not found');
    if (r.status !== 'active') throw new BadRequestException(`Reservation is already '${r.status}'`);

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: r.vehicle_id } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const dealPrice = data.deal_price_aed ?? Number(vehicle.price_aed);

    // Create BrokerDeal + compute commission if a broker is linked
    let deal: any = null;
    if (r.broker_id) {
      const broker = await this.prisma.broker.findUnique({ where: { id: r.broker_id } });
      if (broker) {
        const commission = dealPrice * Number(broker.commission_rate);
        deal = await this.prisma.brokerDeal.create({
          data: {
            broker_id: r.broker_id,
            dealer_id: r.dealer_id,
            vehicle_id: r.vehicle_id,
            buyer_name: data.buyer_name,
            buyer_country: data.buyer_country,
            deal_price_aed: dealPrice,
            commission_rate: broker.commission_rate,
            commission_aed: commission,
            notes: data.notes,
            status: 'processing', // Sale confirmed by dealer — commission payment pending
          },
        });
      }
    }

    // If the reserved unit was the last one (stock already decremented on reserve), mark vehicle sold
    const vehicleNewStatus = Number(vehicle.stock_quantity) <= 0 ? 'sold' : vehicle.status;

    await this.prisma.$transaction([
      this.prisma.vehicleReservation.update({
        where: { id },
        data: { status: 'converted', converted_at: new Date() },
      }),
      this.prisma.vehicle.update({
        where: { id: r.vehicle_id },
        data: { status: vehicleNewStatus, sold_units: { increment: 1 } },
      }),
    ]);

    // Auto-generate a pre-filled draft invoice — dealer can review, edit and send
    const dealerWithCountry = await this.prisma.dealer.findUnique({
      where: { id: r.dealer_id },
      include: { country: true },
    });
    const currency = dealerWithCountry?.country?.currency_code || 'AED';
    const vatRate  = dealerWithCountry?.country ? Number(dealerWithCountry.country.vat_rate) : 0.05;
    const taxAed = Math.round(dealPrice * vatRate * 100) / 100;
    const autoInvoice = await this.prisma.invoice.create({
      data: {
        dealer_id:      r.dealer_id,
        broker_id:      r.broker_id || null,
        vehicle_id:     r.vehicle_id,
        buyer_name:     data.buyer_name || 'Buyer',
        buyer_country:  data.buyer_country || null,
        invoice_number: `INV-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`,
        currency,
        subtotal_aed:   dealPrice,
        discount_aed:   0,
        tax_aed:        taxAed,
        total_aed:      Math.round((dealPrice + taxAed) * 100) / 100,
        due_date:       new Date(Date.now() + 30 * 86400000),
        notes: `Auto-generated from broker reservation: ${vehicle.year} ${vehicle.make} ${vehicle.model}${deal ? ` · commission ${currency} ${Number(deal.commission_aed).toLocaleString()}` : ''}`,
        status: 'draft',
        items: { create: [{
          description: `${vehicle.year} ${vehicle.make} ${vehicle.model} — Sale via Broker Reservation`,
          quantity: 1, unit_price: dealPrice, total: dealPrice,
        }] },
      },
    }).catch(() => null);

    await this.notifications.createForBoth(
      r.dealer_id, r.broker_id ?? undefined,
      'reservation_sold', 'sale',
      `💰 ${vehicle.year} ${vehicle.make} ${vehicle.model} sold`,
      deal
        ? `Reservation converted to sale · AED ${Number(dealPrice).toLocaleString()} · Commission AED ${Number(deal.commission_aed).toLocaleString()} recorded for broker.`
        : `Reservation converted to sale · AED ${Number(dealPrice).toLocaleString()}.`,
      `✅ Your reservation was confirmed as a sale!`,
      deal
        ? `${vehicle.year} ${vehicle.make} ${vehicle.model} sold for AED ${Number(dealPrice).toLocaleString()}. Commission AED ${Number(deal.commission_aed).toLocaleString()} is now pending payment.`
        : undefined,
      { reservation_id: id, vehicle_id: r.vehicle_id, broker_deal_id: deal?.id },
    );

    return {
      ok: true,
      vehicle_id: r.vehicle_id,
      vehicle_status: vehicleNewStatus,
      deal_price_aed: dealPrice,
      broker_deal: deal,
      auto_invoice: autoInvoice,
    };
  }

  // Called automatically when a dealer marks the vehicle as sold (see VehiclesService hook)
  async markConverted(vehicleId: string) {
    const active = await this.prisma.vehicleReservation.findFirst({ where: { vehicle_id: vehicleId, status: 'active' } });
    if (active) {
      await this.prisma.vehicleReservation.update({
        where: { id: active.id }, data: { status: 'converted', converted_at: new Date() },
      });
    }
  }

  async stats(dealerId: string) {
    await this.sweepExpired();
    const [active, expiredToday, convertedTotal] = await Promise.all([
      this.prisma.vehicleReservation.count({ where: { dealer_id: dealerId, status: 'active' } }),
      this.prisma.vehicleReservation.count({
        where: { dealer_id: dealerId, status: 'expired', created_at: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
      }),
      this.prisma.vehicleReservation.count({ where: { dealer_id: dealerId, status: 'converted' } }),
    ]);
    return { active, expired_last_24h: expiredToday, converted_total: convertedTotal };
  }
}

@Controller('reservations')
export class ReservationsController {
  constructor(private svc: ReservationsService) {}

  @Post()
  create(@Body() body: any) { return this.svc.create(body); }

  @Get('vehicle/:vehicleId')
  forVehicle(@Param('vehicleId') id: string) { return this.svc.getForVehicle(id); }

  @Get('dealer/:dealerId')
  forDealer(@Param('dealerId') id: string, @Query() q: any) { return this.svc.getForDealer(id, q); }

  @Get('dealer/:dealerId/stats')
  stats(@Param('dealerId') id: string) { return this.svc.stats(id); }

  @Get('broker/:brokerId')
  forBroker(@Param('brokerId') id: string) { return this.svc.getForBroker(id); }

  @Patch(':id/sell')
  sell(@Param('id') id: string, @Body() body: any) { return this.svc.sell(id, body); }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Body() body: { actor?: string }) { return this.svc.cancel(id, body?.actor); }
}

@Module({
  imports: [NotificationsModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
