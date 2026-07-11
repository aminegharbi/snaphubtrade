import { Module, Controller, Get, Post, Patch, Body, Param, Query, Injectable, NotFoundException, BadRequestException, ConflictException, Request, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ReservationsModule, ReservationsService } from '../reservations/reservations.module';
import { NotificationsService, NotificationsModule } from '../notifications/notifications.module';
import { Roles } from '../../shared/auth/roles.decorator';
import { Public } from '../../shared/auth/public.decorator';

@Injectable()
export class BrokerService {
  constructor(
    private prisma: PrismaService,
    private reservations: ReservationsService,
    private notifications: NotificationsService,
  ) {}

  async getBrokerByCode(affiliateCode: string) {
    const broker = await this.prisma.broker.findUnique({
      where: { affiliate_code: affiliateCode },
      include: { deals: { orderBy: { created_at: 'desc' }, take: 20,
        include: { dealer: { select: { id: true, company_name: true, slug: true } } } },
        referrals: { orderBy: { created_at: 'desc' } } },
    });
    if (!broker) throw new NotFoundException('Broker not found');
    return broker;
  }

  async getBrokerById(id: string) {
    const broker = await this.prisma.broker.findUnique({ where: { id } });
    if (!broker) throw new NotFoundException('Broker not found');
    return broker;
  }

  async getBrokerStats(brokerId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [dealsAll, dealsMonth, totalEarned, pendingPayout, referrals] = await Promise.all([
      this.prisma.brokerDeal.count({ where: { broker_id: brokerId } }),
      this.prisma.brokerDeal.count({ where: { broker_id: brokerId, created_at: { gte: monthStart } } }),
      this.prisma.brokerDeal.aggregate({ where: { broker_id: brokerId, status: 'paid' }, _sum: { commission_aed: true } }),
      this.prisma.brokerDeal.aggregate({ where: { broker_id: brokerId, status: { in: ['pending', 'processing'] } }, _sum: { commission_aed: true } }),
      this.prisma.brokerReferral.count({ where: { broker_id: brokerId, status: 'active' } }),
    ]);

    const monthEarned = await this.prisma.brokerDeal.aggregate({
      where: { broker_id: brokerId, status: 'paid', paid_at: { gte: monthStart } },
      _sum: { commission_aed: true },
    });

    return {
      deals_total: dealsAll,
      deals_this_month: dealsMonth,
      earnings_total: Number(totalEarned._sum.commission_aed || 0),
      earnings_this_month: Number(monthEarned._sum.commission_aed || 0),
      pending_payout: Number(pendingPayout._sum.commission_aed || 0),
      referrals_active: referrals,
    };
  }

  async getBrokerDeals(brokerId: string, q: any) {
    const { status, page = 1, limit = 20 } = q;
    const where: any = { broker_id: brokerId };
    if (status) where.status = status;
    const [items, total] = await Promise.all([
      this.prisma.brokerDeal.findMany({
        where, skip: (Number(page)-1)*Number(limit), take: Number(limit),
        orderBy: { created_at: 'desc' },
        include: { dealer: { select: { company_name: true, slug: true } } },
      }),
      this.prisma.brokerDeal.count({ where }),
    ]);
    return { items, total, page: Number(page) };
  }

  async createDeal(data: any) {
    const broker = await this.prisma.broker.findUnique({ where: { id: data.broker_id } });
    if (!broker) throw new NotFoundException('Broker not found');
    const dealer = await this.prisma.dealer.findUnique({
      where: { id: data.dealer_id },
      include: { country: true },
    });
    const currency = dealer?.country?.currency_code || 'AED';
    const commission = Number(data.deal_price_aed) * Number(broker.commission_rate);
    const deal = await this.prisma.brokerDeal.create({
      data: {
        broker_id: data.broker_id, dealer_id: data.dealer_id, vehicle_id: data.vehicle_id,
        buyer_name: data.buyer_name, buyer_country: data.buyer_country,
        deal_price_aed: data.deal_price_aed,
        currency,
        commission_rate: broker.commission_rate,
        commission_aed: commission,
        notes: data.notes,
      },
    });

    await this.notifications.create({
      broker_id: data.broker_id, type: 'broker_deal_created', category: 'broker_deal',
      title: '📋 New deal recorded',
      body: `${currency} ${Number(data.deal_price_aed).toLocaleString()} deal · commission ${currency} ${commission.toLocaleString()}.`,
      data: { deal_id: deal.id, vehicle_id: data.vehicle_id },
    });

    return deal;
  }

  // ── Dealer marks a vehicle as sold + designates the broker who closed it ────
  async completeSale(data: {
    vehicle_id: string; dealer_id: string; broker_id?: string;
    buyer_name?: string; buyer_country?: string; deal_price_aed?: number; notes?: string;
  }) {
    if (!data.vehicle_id || !data.dealer_id) {
      throw new BadRequestException('vehicle_id and dealer_id are required');
    }
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: data.vehicle_id } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.dealer_id !== data.dealer_id) {
      throw new BadRequestException('Vehicle does not belong to this dealer');
    }

    let deal = null;
    if (data.broker_id) {
      deal = await this.createDeal({
        broker_id: data.broker_id,
        dealer_id: data.dealer_id,
        vehicle_id: data.vehicle_id,
        buyer_name: data.buyer_name,
        buyer_country: data.buyer_country,
        deal_price_aed: data.deal_price_aed ?? vehicle.price_aed,
        notes: data.notes,
      });
    }

    await this.prisma.vehicle.update({ where: { id: data.vehicle_id }, data: {
      stock_quantity: { decrement: 1 },
      sold_units:     { increment: 1 },
      status: Number(vehicle.stock_quantity) <= 1 ? 'sold' : 'available',
    } });
    await this.reservations.markConverted(data.vehicle_id);

    // Auto-generate a pre-filled draft invoice — dealer can review, edit and send
    const dealerWithCountry = await this.prisma.dealer.findUnique({
      where: { id: data.dealer_id },
      include: { country: true },
    });
    const currency = dealerWithCountry?.country?.currency_code || 'AED';
    // VAT rate now comes from the dealer's actual country instead of being
    // hardcoded to UAE's 5% — Saudi Arabia is 15%, Bahrain 10%, Qatar/Kuwait 0%.
    const vatRate   = dealerWithCountry?.country ? Number(dealerWithCountry.country.vat_rate) : 0.05;
    const salePrice = Number(data.deal_price_aed ?? vehicle.price_aed);
    const taxAed    = Math.round(salePrice * vatRate * 100) / 100;
    const autoInvoice = await this.prisma.invoice.create({
      data: {
        dealer_id:      data.dealer_id,
        broker_id:      data.broker_id || null,
        vehicle_id:     data.vehicle_id,
        buyer_name:     data.buyer_name || 'Buyer',
        buyer_country:  data.buyer_country || null,
        invoice_number: `INV-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`,
        currency,
        subtotal_aed:   salePrice,
        discount_aed:   0,
        tax_aed:        taxAed,
        total_aed:      Math.round((salePrice + taxAed) * 100) / 100,
        due_date:       new Date(Date.now() + 30 * 86400000),
        notes: `Auto-generated from vehicle sale: ${vehicle.year} ${vehicle.make} ${vehicle.model}${deal ? ` via broker` : ''}`,
        status: 'draft',
        items: { create: [{
          description: `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ' ' + vehicle.trim : ''} — Vehicle Sale`,
          quantity: 1, unit_price: salePrice, total: salePrice,
        }] },
      },
    }).catch(() => null);

    await this.notifications.createForBoth(
      data.dealer_id, data.broker_id,
      'sale_completed', 'sale',
      `💰 ${vehicle.year} ${vehicle.make} ${vehicle.model} sold`,
      deal
        ? `Sale closed via broker for AED ${Number(deal.deal_price_aed).toLocaleString()}.`
        : `Marked as sold for AED ${salePrice.toLocaleString()}.`,
      `✅ Vehicle marked as sold`,
      deal ? `The ${vehicle.year} ${vehicle.make} ${vehicle.model} sale is confirmed.` : undefined,
      { vehicle_id: data.vehicle_id, broker_deal_id: deal?.id },
    );

    return { vehicle_id: data.vehicle_id, status: 'sold', broker_deal: deal, auto_invoice: autoInvoice };
  }

  async updateDealStatus(dealId: string, status: string) {
    return this.prisma.brokerDeal.update({
      where: { id: dealId },
      data: { status, paid_at: status === 'paid' ? new Date() : undefined },
    });
  }

  // ── Dealer perspective ────────────────────────────────────────────────────

  async getDealerBrokerStats(dealerId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalDeals, monthDeals, totalRevenue, allBrokersRanked] = await Promise.all([
      this.prisma.brokerDeal.count({ where: { dealer_id: dealerId } }),
      this.prisma.brokerDeal.count({ where: { dealer_id: dealerId, created_at: { gte: monthStart } } }),
      this.prisma.brokerDeal.aggregate({ where: { dealer_id: dealerId, status: { in: ['processing', 'paid'] } }, _sum: { deal_price_aed: true } }),
      // Every broker who has ever sold for this dealer, ranked by deal count.
      // No `take` limit here — the dealer dashboard's Brokers tab needs the
      // full list (top 3 highlighted + the rest in a table), not just top 3.
      this.prisma.brokerDeal.groupBy({
        by: ['broker_id'],
        where: { dealer_id: dealerId },
        _count: { id: true },
        _sum: { deal_price_aed: true, commission_aed: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    // Enrich with broker info in one batch query instead of N+1.
    const brokerIds = allBrokersRanked.map((tb) => tb.broker_id);
    const brokerRecords = await this.prisma.broker.findMany({
      where: { id: { in: brokerIds } },
      select: { id: true, full_name: true, affiliate_code: true, tier: true, country: true, commission_rate: true, status: true },
    });
    const brokerById = new Map(brokerRecords.map((b) => [b.id, b] as const));

    const rankedBrokers = allBrokersRanked.map((tb) => {
      const broker = brokerById.get(tb.broker_id);
      return {
        broker_id: tb.broker_id,
        broker_name: broker?.full_name || 'Unknown broker',
        affiliate_code: broker?.affiliate_code,
        tier: broker?.tier,
        country: broker?.country,
        status: broker?.status,
        commission_rate: broker ? Number(broker.commission_rate) : null,
        deals_count: tb._count.id,
        total_revenue: Number(tb._sum.deal_price_aed || 0),
        commissions_paid: Number(tb._sum.commission_aed || 0),
      };
    });

    const topBrokers = rankedBrokers.slice(0, 3);
    const otherBrokers = rankedBrokers.slice(3);

    // Recent deals with broker info
    const recentDeals = await this.prisma.brokerDeal.findMany({
      where: { dealer_id: dealerId },
      orderBy: { created_at: 'desc' },
      take: 10,
      include: { broker: { select: { full_name: true, affiliate_code: true, tier: true, country: true } } },
    });

    return {
      total_broker_deals: totalDeals,
      broker_deals_this_month: monthDeals,
      total_revenue_via_brokers: Number(totalRevenue._sum.deal_price_aed || 0),
      total_brokers_count: rankedBrokers.length,
      top_brokers: topBrokers,
      other_brokers: otherBrokers,
      recent_deals: recentDeals,
    };
  }

  async getAllBrokers(q: any) {
    const { status = 'active', tier, limit = 20, page = 1 } = q;
    const where: any = {};
    if (status) where.status = status;
    if (tier) where.tier = tier;
    const [items, total] = await Promise.all([
      this.prisma.broker.findMany({ where, skip: (Number(page)-1)*Number(limit), take: Number(limit), orderBy: { created_at: 'desc' } }),
      this.prisma.broker.count({ where }),
    ]);
    return { items, total };
  }

  // Lightweight, name-only lookup so a dealer can find a broker to share a
  // vehicle with — deliberately returns far less than getAllBrokers (no
  // financials/contact details), since this is reachable by any dealer, not
  // just admins.
  async searchBrokers(query: string, limit = 8) {
    if (!query || query.trim().length < 2) return { items: [] };
    const items = await this.prisma.broker.findMany({
      where: {
        status: 'active',
        OR: [
          { full_name: { contains: query, mode: 'insensitive' } },
          { company_name: { contains: query, mode: 'insensitive' } },
          { affiliate_code: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true, full_name: true, company_name: true, tier: true, city: true, country: true },
      take: Math.min(Number(limit) || 8, 20),
    });
    return { items };
  }

  // ── AI Matching — a broker perk unlocked at 5 active referrals ─────────────
  // Rewards brokers who actively grow the network (dealers, buyers, other
  // brokers) with a real feature: cross-references their specialties against
  // vehicles currently shared with them (and the wider network) to surface
  // the best-fit matches instead of them having to scroll everything.
  private static readonly AI_MATCHING_REQUIRED_REFERRALS = 5;

  async getAiMatchingStatus(brokerId: string) {
    const referrals = await this.prisma.brokerReferral.count({ where: { broker_id: brokerId, status: 'active' } });
    const required = BrokerService.AI_MATCHING_REQUIRED_REFERRALS;
    const unlocked = referrals >= required;

    if (!unlocked) {
      return { unlocked: false, referrals_count: referrals, required, matches: [] };
    }

    const broker = await this.prisma.broker.findUnique({ where: { id: brokerId }, select: { specialties: true, languages: true } });
    const specialties = (broker?.specialties || []).map(s => s.toLowerCase());

    // Pull everything currently shared with this broker (real inventory, not
    // mocked) and score each vehicle against the broker's stated specialties.
    const shared = await this.prisma.brokerSharePermission.findMany({
      where: { broker_id: brokerId, revoked_at: null },
      include: { share: true },
    });
    const activeShareVehicleIds = shared.filter(s => s.share?.active).map(s => s.share.vehicle_id);
    if (!activeShareVehicleIds.length) {
      return { unlocked: true, referrals_count: referrals, required, matches: [] };
    }

    const vehicles = await this.prisma.vehicle.findMany({
      where: { id: { in: activeShareVehicleIds }, status: { not: 'sold' } },
      select: {
        id: true, make: true, model: true, year: true, body_type: true, fuel_type: true,
        price_aed: true, dealer_id: true, view_count: true,
      },
    });

    const scored = vehicles.map(v => {
      let score = 40; // baseline — every shared, unsold vehicle is a candidate
      const haystack = `${v.make} ${v.model} ${v.body_type} ${v.fuel_type}`.toLowerCase();
      if (specialties.some(s => haystack.includes(s))) score += 35;
      if ((v.view_count || 0) > 20) score += 15; // proven buyer interest
      if (v.price_aed && Number(v.price_aed) > 150000) score += 10; // higher commission potential
      return { ...v, match_score: Math.min(99, score) };
    }).sort((a, b) => b.match_score - a.match_score).slice(0, 5);

    const dealerIds = [...new Set(scored.map(v => v.dealer_id).filter(Boolean))] as string[];
    const dealers = await this.prisma.dealer.findMany({ where: { id: { in: dealerIds } }, select: { id: true, company_name: true } });
    const dMap = new Map(dealers.map(d => [d.id, d] as const));

    return {
      unlocked: true,
      referrals_count: referrals,
      required,
      matches: scored.map(v => ({ ...v, dealer: v.dealer_id ? dMap.get(v.dealer_id) || null : null })),
    };
  }

  async registerBroker(data: any) {
    if (!data.full_name || !data.email) {
      throw new BadRequestException('full_name and email are required');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new ConflictException('Email already registered');

    const existingBroker = await this.prisma.broker.findUnique({ where: { email: data.email } });
    if (existingBroker) throw new ConflictException('A broker account already exists with this email');

    const code = (data.full_name.replace(/[^A-Z0-9]/gi,'').toUpperCase().slice(0,5) || 'BRKR') + '-' + Math.random().toString(36).slice(2,6).toUpperCase();

    // Password is optional (passwordless / magic-link friendly, same pattern as
    // dealer + buyer registration) but strongly recommended so the broker can
    // actually log back in via the standard /login form.
    const passwordHash = data.password ? await bcrypt.hash(data.password, 12) : null;

    // Create the User and Broker together so a broker can never end up without
    // a way to sign in — this was the root cause of broker sessions never
    // being established via the login form.
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password_hash: passwordHash,
        full_name: data.full_name,
        phone: data.phone || data.whatsapp,
        role: 'broker',
        email_verified: true,
      },
    });

    const broker = await this.prisma.broker.create({
      data: {
        user_id: user.id,
        full_name: data.full_name, email: data.email, phone: data.phone,
        whatsapp: data.whatsapp, company_name: data.company_name,
        broker_type: data.broker_type || 'independent',
        affiliate_code: code, country: data.country, city: data.city,
        languages: data.languages || [], specialties: data.specialties || [],
      },
    });

    const { password_hash, ...safeUser } = user;

    // Broker-refers-broker: same referral crediting as the main /auth/register
    // flow (see AuthService.creditReferral) — never blocks signup on a bad code.
    if (data.referral_code) {
      const referrer = await this.prisma.broker.findUnique({ where: { affiliate_code: data.referral_code } });
      if (referrer) {
        await this.prisma.brokerReferral.create({
          data: { broker_id: referrer.id, referred_type: 'broker', referred_id: broker.id, referral_code: data.referral_code, status: 'active' },
        });
      }
    }

    return { ...broker, user: safeUser };
  }
}

@Roles('broker','admin')
@Controller('broker')
export class BrokerController {
  constructor(private svc: BrokerService) {}

  @Get('all')
  all(@Query() q: any) { return this.svc.getAllBrokers(q); }

  // Dealers need this to find a broker when sharing a vehicle — overrides
  // the controller-level @Roles('broker','admin') for this one route.
  @Roles('dealer', 'broker', 'admin')
  @Get('search')
  search(@Query('query') query: string, @Query('limit') limit: string) {
    return this.svc.searchBrokers(query, limit ? Number(limit) : undefined);
  }

  @Public()
  @Get('code/:code')
  byCode(@Param('code') code: string) { return this.svc.getBrokerByCode(code); }

  @Get(':id/stats')
  stats(@Param('id') id: string) { return this.svc.getBrokerStats(id); }

  @Get(':id/ai-matching')
  aiMatching(@Param('id') id: string) { return this.svc.getAiMatchingStatus(id); }

  @Get(':id/deals')
  deals(@Param('id') id: string, @Query() q: any) { return this.svc.getBrokerDeals(id, q); }

  @Get(':id')
  byId(@Param('id') id: string) { return this.svc.getBrokerById(id); }

  @Public()
  @Post('register')
  register(@Body() body: any) { return this.svc.registerBroker(body); }

  @Post('deals')
  createDeal(@Body() body: any) { return this.svc.createDeal(body); }

  @Post('complete-sale')
  completeSale(@Body() body: any) { return this.svc.completeSale(body); }

  @Patch('deals/:id/status')
  updateStatus(@Param('id') id: string, @Body() body: any) { return this.svc.updateDealStatus(id, body.status); }

  // Dealers need this to see how brokers are performing on their own listings —
  // it was incorrectly locked to broker/admin only, which silently broke the
  // "Top brokers" panel on the dealer dashboard (403 → caught → hidden).
  @Roles('dealer', 'broker', 'admin')
  @Get('dealer/:dealerId/stats')
  dealerBrokerStats(@Param('dealerId') id: string, @Request() req: any) {
    if (req.user.role === 'dealer' && req.user.dealerId !== id) {
      throw new ForbiddenException('You can only view broker stats for your own dealership');
    }
    return this.svc.getDealerBrokerStats(id);
  }
}

@Module({ imports: [ReservationsModule, NotificationsModule], controllers: [BrokerController], providers: [BrokerService], exports: [BrokerService] })
export class BrokerModule {}
