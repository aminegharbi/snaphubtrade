import { Module, Controller, Get, Post, Patch, Put, Delete, Body, Param, Query, Injectable, Request, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Roles } from '../../shared/auth/roles.decorator';

// ─── Pricing Intelligence Service ─────────────────────────────────────────────

@Injectable()
export class DealerDashboardService {
  constructor(private prisma: PrismaService) {}

  private activePromotionWhere(now = new Date()) {
    return {
      active: true,
      starts_at: { lte: now },
      OR: [{ ends_at: null }, { ends_at: { gte: now } }],
    };
  }

  // ── Rapid stock operations ─────────────────────────────────────────────────

  async getDealerInventory(dealerId: string, filters: {
    status?: string; search?: string; sort?: string; page?: number; limit?: number;
  }) {
    const where: any = { dealer_id: dealerId };
    // Normalize status: handle both string and array (duplicate query param)
    const rawStatus = filters.status;
    const status = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus;
    if (status && status !== 'all') where.status = status;
    // No default status filter — dealers want to see sold vehicles too
    if (filters.search) {
      where.OR = [
        { make: { contains: filters.search, mode: 'insensitive' } },
        { model: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const sortMap: any = {
      newest: { created_at: 'desc' },
      oldest: { created_at: 'asc' },
      price_asc: { price_aed: 'asc' },
      price_desc: { price_aed: 'desc' },
      views: { view_count: 'desc' },
      days: { created_at: 'asc' },
    };

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100);

    const [items, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        orderBy: sortMap[filters.sort || 'newest'] || sortMap.newest,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          vehicle_images: { where: { is_primary: true }, take: 1 },
          price_history: { orderBy: { changed_at: 'desc' }, take: 3 },
          promotions: { where: this.activePromotionWhere(), take: 1 },
          _count: { select: { leads: true } },
        },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return {
      items: items.map(v => ({
        ...v,
        days_listed: Math.floor((Date.now() - new Date(v.created_at).getTime()) / 86400000),
        lead_count: v._count.leads,
      })),
      total,
      page,
      limit,
    };
  }

  async getDashboardStats(dealerId: string) {
    const [totalAgg, availableAgg, reservedAgg, soldUnitsAgg, draft, exported, viewsAgg, stockVehicles, leadsTotal] = await Promise.all([
      this.prisma.vehicle.aggregate({ where: { dealer_id: dealerId }, _sum: { stock_quantity: true }, _count: true }),
      this.prisma.vehicle.aggregate({ where: { dealer_id: dealerId, status: 'available' }, _sum: { stock_quantity: true }, _count: true }),
      this.prisma.vehicle.aggregate({ where: { dealer_id: dealerId, status: 'reserved' }, _sum: { stock_quantity: true }, _count: true }),
      // Sum of sold_units: incremented by every sale path (direct, reservation, invoice)
      this.prisma.vehicle.aggregate({ where: { dealer_id: dealerId }, _sum: { sold_units: true } }),
      this.prisma.vehicle.count({ where: { dealer_id: dealerId, status: 'draft' } }),
      this.prisma.vehicle.count({ where: { dealer_id: dealerId, status: 'exported' } }),
      this.prisma.vehicle.aggregate({ where: { dealer_id: dealerId }, _sum: { view_count: true } }),
      // Stock value must be quantity-weighted (a listing with stock_quantity=5 is worth
      // 5× its unit price) and include reserved units (still unsold, still "in stock" —
      // the previous version only summed `available` and ignored stock_quantity entirely,
      // understating stock value whenever a listing represented more than 1 unit).
      this.prisma.vehicle.findMany({
        where: { dealer_id: dealerId, status: { in: ['available', 'reserved'] } },
        select: { price_aed: true, stock_quantity: true, status: true },
      }),
      this.prisma.lead.count({ where: { dealer_id: dealerId } }),
    ]);

    const stockValueAed = stockVehicles.reduce(
      (sum, v) => sum + Number(v.price_aed) * Math.max(1, Number(v.stock_quantity) || 1),
      0,
    );

    // Days listed average
    const vehicles = await this.prisma.vehicle.findMany({
      where: { dealer_id: dealerId, status: { in: ['available', 'reserved'] } },
      select: { created_at: true },
    });

    const avgDaysListed = vehicles.length
      ? Math.round(vehicles.reduce((s, v) => s + Math.floor((Date.now() - new Date(v.created_at).getTime()) / 86400000), 0) / vehicles.length)
      : 0;

    // Revenue actually collected (paid invoices) vs. invoiced-but-unpaid, plus
    // broker commissions owed against this dealer's sales — needed to see real
    // profitability, not just gross stock value.
    const [revenuePaidAgg, revenueOutstandingAgg, revenueInvoicedAgg, commissionPaidAgg, commissionPendingAgg] = await Promise.all([
      this.prisma.invoice.aggregate({ where: { dealer_id: dealerId, status: 'paid' }, _sum: { total_aed: true }, _count: true }),
      this.prisma.invoice.aggregate({ where: { dealer_id: dealerId, status: { in: ['sent', 'overdue'] } }, _sum: { total_aed: true }, _count: true }),
      this.prisma.invoice.aggregate({ where: { dealer_id: dealerId, status: { not: 'cancelled' } }, _sum: { total_aed: true } }),
      this.prisma.brokerDeal.aggregate({ where: { dealer_id: dealerId, status: 'paid' }, _sum: { commission_aed: true }, _count: true }),
      this.prisma.brokerDeal.aggregate({ where: { dealer_id: dealerId, status: { not: 'paid' } }, _sum: { commission_aed: true }, _count: true }),
    ]);

    const revenueCollectedAed = Number(revenuePaidAgg._sum.total_aed || 0);
    const commissionPaidAed = Number(commissionPaidAgg._sum.commission_aed || 0);

    return {
      total: Number(totalAgg._count),
      total_units: Number(totalAgg._sum?.stock_quantity ?? totalAgg._count),
      available: Number(availableAgg._sum?.stock_quantity ?? availableAgg._count),
      available_listings: Number(availableAgg._count),
      reserved: Number(reservedAgg._sum?.stock_quantity ?? reservedAgg._count),
      sold: Number(soldUnitsAgg._sum?.sold_units ?? 0),
      draft:    Number(draft),
      exported: Number(exported),
      total_views: Number(viewsAgg._sum.view_count || 0),
      stock_value_aed: Math.round(stockValueAed),
      avg_days_listed: avgDaysListed,
      total_leads: Number(leadsTotal),

      // ── Profitability KPIs ──────────────────────────────────────────────
      revenue_collected_aed: revenueCollectedAed,
      revenue_collected_invoices: Number(revenuePaidAgg._count),
      revenue_outstanding_aed: Number(revenueOutstandingAgg._sum.total_aed || 0),
      revenue_outstanding_invoices: Number(revenueOutstandingAgg._count),
      revenue_invoiced_total_aed: Number(revenueInvoicedAgg._sum.total_aed || 0),
      commission_paid_aed: commissionPaidAed,
      commission_paid_deals: Number(commissionPaidAgg._count),
      commission_pending_aed: Number(commissionPendingAgg._sum.commission_aed || 0),
      commission_pending_deals: Number(commissionPendingAgg._count),
      // Net revenue = what actually landed in the dealer's pocket after broker commissions.
      net_revenue_aed: Math.round(revenueCollectedAed - commissionPaidAed),
      // Stock turnover: revenue collected relative to current stock value — a rough
      // proxy for how efficiently inventory is being converted to cash.
      stock_turnover_ratio: stockValueAed > 0 ? Math.round((revenueCollectedAed / stockValueAed) * 100) / 100 : null,
    };
  }

  // ── Profitability evolution (for charts) ───────────────────────────────────
  // Builds a month-by-month series so the dealer can see trend, not just a
  // snapshot. Based on real timestamped records (Invoice.paid_at, BrokerDeal.paid_at)
  // — never fabricated. `months` caps how far back to look (default 12).
  async getProfitabilityTrend(dealerId: string, months = 12) {
    const clampedMonths = Math.min(Math.max(months, 1), 36);
    const since = new Date();
    since.setMonth(since.getMonth() - (clampedMonths - 1));
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const [paidInvoices, paidCommissions, soldTxns] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { dealer_id: dealerId, status: 'paid', paid_at: { gte: since } },
        select: { total_aed: true, paid_at: true },
      }),
      this.prisma.brokerDeal.findMany({
        where: { dealer_id: dealerId, status: 'paid', paid_at: { gte: since } },
        select: { commission_aed: true, paid_at: true },
      }),
      this.prisma.stockTransaction.findMany({
        where: { dealer_id: dealerId, txn_type: 'sale', occurred_at: { gte: since } },
        select: { quantity: true, occurred_at: true },
      }),
    ]);

    // Build an ordered list of the last N month buckets (YYYY-MM), oldest first,
    // so months with zero activity still appear on the chart instead of gaps.
    const buckets: { month: string; label: string }[] = [];
    const cursor = new Date(since);
    for (let i = 0; i < clampedMonths; i++) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      buckets.push({
        month: `${y}-${String(m + 1).padStart(2, '0')}`,
        label: cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const revenueByMonth = new Map<string, number>();
    for (const inv of paidInvoices) {
      if (!inv.paid_at) continue;
      const k = monthKey(new Date(inv.paid_at));
      revenueByMonth.set(k, (revenueByMonth.get(k) || 0) + Number(inv.total_aed));
    }

    const commissionByMonth = new Map<string, number>();
    for (const deal of paidCommissions) {
      if (!deal.paid_at) continue;
      const k = monthKey(new Date(deal.paid_at));
      commissionByMonth.set(k, (commissionByMonth.get(k) || 0) + Number(deal.commission_aed));
    }

    const unitsSoldByMonth = new Map<string, number>();
    for (const txn of soldTxns) {
      const k = monthKey(new Date(txn.occurred_at));
      unitsSoldByMonth.set(k, (unitsSoldByMonth.get(k) || 0) + Number(txn.quantity || 1));
    }

    const series = buckets.map(({ month, label }) => {
      const revenue = Math.round(revenueByMonth.get(month) || 0);
      const commission = Math.round(commissionByMonth.get(month) || 0);
      return {
        month,
        label,
        revenue_collected_aed: revenue,
        commission_paid_aed: commission,
        net_revenue_aed: revenue - commission,
        units_sold: unitsSoldByMonth.get(month) || 0,
      };
    });

    const totals = series.reduce(
      (acc, m) => ({
        revenue_collected_aed: acc.revenue_collected_aed + m.revenue_collected_aed,
        commission_paid_aed: acc.commission_paid_aed + m.commission_paid_aed,
        net_revenue_aed: acc.net_revenue_aed + m.net_revenue_aed,
        units_sold: acc.units_sold + m.units_sold,
      }),
      { revenue_collected_aed: 0, commission_paid_aed: 0, net_revenue_aed: 0, units_sold: 0 },
    );

    // Simple month-over-month trend indicator on the most recent two points.
    const last = series[series.length - 1];
    const prev = series[series.length - 2];
    const momChangePct = prev && prev.revenue_collected_aed > 0
      ? Math.round(((last.revenue_collected_aed - prev.revenue_collected_aed) / prev.revenue_collected_aed) * 1000) / 10
      : null;

    return {
      period_months: clampedMonths,
      series,
      totals,
      month_over_month_change_pct: momChangePct,
    };
  }

  // ── Bulk update operations ─────────────────────────────────────────────────

  async bulkUpdateStatus(vehicleIds: string[], status: string, dealerId: string) {
    if (status === 'sold') {
      // Need to update each vehicle individually to properly increment sold_units
      const vehicles = await this.prisma.vehicle.findMany({
        where: { id: { in: vehicleIds }, dealer_id: dealerId },
        select: { id: true, stock_quantity: true },
      });
      let count = 0;
      for (const v of vehicles) {
        await this.prisma.vehicle.update({
          where: { id: v.id },
          data: {
            status: 'sold',
            sold_units: { increment: 1 },
            stock_quantity: Number(v.stock_quantity) > 0 ? { decrement: 1 } : undefined,
            updated_at: new Date(),
          },
        });
        count++;
      }
      return { updated: count, status };
    }
    const result = await this.prisma.vehicle.updateMany({
      where: { id: { in: vehicleIds }, dealer_id: dealerId },
      data: { status: status, updated_at: new Date() },
    });
    return { updated: result.count, status };
  }

  async bulkUpdatePrice(vehicleIds: string[], adjustment: number, type: 'fixed' | 'percentage', dealerId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { id: { in: vehicleIds }, dealer_id: dealerId },
      select: { id: true, price_aed: true },
    });

    const updates = await Promise.all(
      vehicles.map(async v => {
        const newPrice = type === 'percentage'
          ? Math.round(Number(v.price_aed) * (1 + adjustment / 100))
          : Math.round(Number(v.price_aed) + adjustment);
        const safePrice = Math.max(1000, newPrice);

        await this.prisma.vehicle.update({
          where: { id: v.id },
          data: { price_aed: safePrice, updated_at: new Date() },
        });

        await this.prisma.priceHistory.create({
          data: { vehicle_id: v.id, price_aed: safePrice },
        });

        return { id: v.id, old_price: v.price_aed, new_price: safePrice };
      })
    );

    return { updated: updates.length, changes: updates };
  }

  async quickUpdateVehicle(id: string, dealerId: string, data: {
    price_aed?: number;
    status?: string;
    export_eligible?: boolean;
    mileage_km?: number;
    color_exterior?: string;
    color_interior?: string;
    description?: string;
  }) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, dealer_id: dealerId } });
    if (!vehicle) throw new Error('Vehicle not found or not owned by dealer');

    if (data.price_aed && Number(data.price_aed) !== Number(vehicle.price_aed)) {
      await this.prisma.priceHistory.create({
        data: { vehicle_id: id, price_aed: data.price_aed },
      });
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
      include: { vehicle_images: { where: { is_primary: true }, take: 1 } },
    });
  }

  // ── AI Pricing Intelligence ────────────────────────────────────────────────

  async getPriceAnalysis(dealerId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { dealer_id: dealerId, status: { in: ['available', 'reserved'] } },
      select: {
        id: true, make: true, model: true, year: true, trim: true,
        fuel_type: true, mileage_km: true, price_aed: true, status: true,
        color_exterior: true, body_type: true, export_eligible: true,
        price_suggested_aed: true, view_count: true, created_at: true, vin: true, stock_quantity: true, plate_number: true,
      },
    });

    const analysed = vehicles.map(v => {
      const daysListed = Math.floor((Date.now() - new Date(v.created_at).getTime()) / 86400000);
      const suggested = Number(v.price_suggested_aed) || Number(v.price_aed);
      const current = Number(v.price_aed);
      const delta = ((current - suggested) / suggested) * 100;

      let status: 'optimal' | 'overpriced' | 'underpriced' = 'optimal';
      let urgency: 'high' | 'medium' | 'low' = 'low';
      let recommendation = '';

      if (delta > 8) {
        status = 'overpriced';
        urgency = daysListed > 45 ? 'high' : 'medium';
        recommendation = `Price is ${delta.toFixed(1)}% above market. Suggest reducing to AED ${suggested.toLocaleString()} for faster sale.`;
      } else if (delta < -5) {
        status = 'underpriced';
        urgency = 'medium';
        recommendation = `Price is ${Math.abs(delta).toFixed(1)}% below market. Raising to AED ${suggested.toLocaleString()} could capture an additional AED ${(suggested - current).toLocaleString()}.`;
      } else {
        recommendation = 'Price is within market range. No change needed.';
      }

      if (daysListed > 60 && status !== 'underpriced') {
        urgency = 'high';
        recommendation = `Vehicle listed ${daysListed} days. ${recommendation} Immediate action recommended.`;
      }

      return {
        vehicle_id: v.id,
        vehicle_name: `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ''}`,
        current_price_aed: current,
        suggested_price_aed: suggested,
        delta_pct: Math.round(delta * 10) / 10,
        status,
        urgency,
        days_listed: daysListed,
        view_count: v.view_count,
        recommendation,
      };
    });

    const alerts = analysed.filter(a => a.status !== 'optimal' || a.days_listed > 60);
    const potentialRevenue = analysed.filter(a => a.status === 'underpriced')
      .reduce((s, a) => s + (a.suggested_price_aed - a.current_price_aed), 0);

    return {
      vehicles: analysed,
      alerts,
      summary: {
        total_vehicles: analysed.length,
        optimal: analysed.filter(a => a.status === 'optimal').length,
        overpriced: analysed.filter(a => a.status === 'overpriced').length,
        underpriced: analysed.filter(a => a.status === 'underpriced').length,
        high_urgency: alerts.filter(a => a.urgency === 'high').length,
        potential_revenue_gain_aed: potentialRevenue,
      },
    };
  }

  async applyRecommendedPrice(vehicleId: string, dealerId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, dealer_id: dealerId },
      select: { id: true, price_suggested_aed: true, price_aed: true },
    });
    if (!vehicle || !vehicle.price_suggested_aed) throw new Error('No suggested price available');

    await this.prisma.priceHistory.create({
      data: { vehicle_id: vehicleId, price_aed: vehicle.price_suggested_aed },
    });

    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { price_aed: vehicle.price_suggested_aed, updated_at: new Date() },
    });
  }

  async applyAllRecommendations(dealerId: string) {
    const analysis = await this.getPriceAnalysis(dealerId);
    const toUpdate = analysis.vehicles.filter(v => v.status !== 'optimal');

    const results = await Promise.all(
      toUpdate.map(v => this.prisma.vehicle.update({
        where: { id: v.vehicle_id },
        data: { price_aed: v.suggested_price_aed, updated_at: new Date() },
      }))
    );

    return {
      updated: results.length,
      vehicles: toUpdate.map(v => ({ id: v.vehicle_id, new_price: v.suggested_price_aed })),
    };
  }

  // ── Activity feed ──────────────────────────────────────────────────────────

  async getRecentActivity(dealerId: string) {
    const [recentViews, recentLeads, recentPriceChanges] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: { dealer_id: dealerId },
        orderBy: { updated_at: 'desc' },
        take: 5,
        select: { id: true, make: true, model: true, year: true, view_count: true, updated_at: true, status: true },
      }),
      this.prisma.lead.findMany({
        where: { dealer_id: dealerId },
        orderBy: { created_at: 'desc' },
        take: 5,
        include: { vehicle: { select: { make: true, model: true, year: true } } },
      }),
      this.prisma.priceHistory.findMany({
        where: { vehicle: { dealer_id: dealerId } },
        orderBy: { changed_at: 'desc' },
        take: 5,
        include: { vehicle: { select: { make: true, model: true, year: true } } },
      }),
    ]);

    const feed = [
      ...recentViews.map(v => ({ type: 'view', time: v.updated_at, label: `${v.year} ${v.make} ${v.model}`, value: `${v.view_count} views`, status: v.status })),
      ...recentLeads.map(l => ({ type: 'lead', time: l.created_at, label: l.vehicle ? `${l.vehicle.year} ${l.vehicle.make} ${l.vehicle.model}` : 'Unknown vehicle', value: l.channel || 'website', stage: l.stage })),
      ...recentPriceChanges.map(p => ({ type: 'price', time: p.changed_at, label: p.vehicle ? `${p.vehicle.year} ${p.vehicle.make} ${p.vehicle.model}` : 'Unknown vehicle', value: `AED ${Number(p.price_aed).toLocaleString()}` })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 15);

    return feed;
  }
}

// ─── Controller ───────────────────────────────────────────────────────────────

@Roles('dealer','admin')
@Controller('dealer-dashboard')
export class DealerDashboardController {
  constructor(private service: DealerDashboardService) {}

  // Anti-IDOR: a dealer may only ever query their own dashboard. Admins bypass.
  private assertOwnership(dealerId: string, req: any) {
    if (req.user.role === 'admin') return;
    if (req.user.dealerId !== dealerId) {
      throw new ForbiddenException("You can only view your own dashboard");
    }
  }

  @Get(':dealerId/inventory')
  getInventory(@Param('dealerId') dealerId: string, @Query() q: any, @Request() req: any) {
    this.assertOwnership(dealerId, req);
    return this.service.getDealerInventory(dealerId, {
      status: q.status, search: q.search, sort: q.sort,
      page: q.page ? +q.page : 1, limit: q.limit ? +q.limit : 50,
    });
  }

  @Get(':dealerId/stats')
  getStats(@Param('dealerId') dealerId: string, @Request() req: any) {
    this.assertOwnership(dealerId, req);
    return this.service.getDashboardStats(dealerId);
  }

  // Profitability evolution curve — revenue collected, commissions paid, net
  // revenue and units sold, month by month. ?months=6|12|24 (default 12, max 36).
  @Get(':dealerId/profitability')
  getProfitability(@Param('dealerId') dealerId: string, @Query('months') months: string, @Request() req: any) {
    this.assertOwnership(dealerId, req);
    return this.service.getProfitabilityTrend(dealerId, months ? parseInt(months, 10) : 12);
  }

  @Get(':dealerId/price-analysis')
  getPriceAnalysis(@Param('dealerId') dealerId: string, @Request() req: any) {
    this.assertOwnership(dealerId, req);
    return this.service.getPriceAnalysis(dealerId);
  }

  @Post(':dealerId/price-analysis/apply-all')
  applyAllRecommendations(@Param('dealerId') dealerId: string, @Request() req: any) {
    this.assertOwnership(dealerId, req);
    return this.service.applyAllRecommendations(dealerId);
  }

  @Post(':dealerId/price-analysis/:vehicleId/apply')
  applyRecommendedPrice(@Param('dealerId') dealerId: string, @Param('vehicleId') vehicleId: string, @Request() req: any) {
    this.assertOwnership(dealerId, req);
    return this.service.applyRecommendedPrice(vehicleId, dealerId);
  }

  @Patch(':dealerId/bulk-status')
  bulkStatus(@Param('dealerId') dealerId: string, @Body() body: { vehicle_ids: string[]; status: string }, @Request() req: any) {
    this.assertOwnership(dealerId, req);
    return this.service.bulkUpdateStatus(body.vehicle_ids, body.status, dealerId);
  }

  @Patch(':dealerId/bulk-price')
  bulkPrice(@Param('dealerId') dealerId: string, @Body() body: { vehicle_ids: string[]; adjustment: number; type: 'fixed' | 'percentage' }, @Request() req: any) {
    this.assertOwnership(dealerId, req);
    return this.service.bulkUpdatePrice(body.vehicle_ids, body.adjustment, body.type, dealerId);
  }

  @Patch(':dealerId/vehicle/:vehicleId')
  quickUpdate(@Param('dealerId') dealerId: string, @Param('vehicleId') vehicleId: string, @Body() body: any, @Request() req: any) {
    this.assertOwnership(dealerId, req);
    return this.service.quickUpdateVehicle(vehicleId, dealerId, body);
  }

  @Get(':dealerId/activity')
  getActivity(@Param('dealerId') dealerId: string, @Request() req: any) {
    this.assertOwnership(dealerId, req);
    return this.service.getRecentActivity(dealerId);
  }
}

// ─── Module ───────────────────────────────────────────────────────────────────

@Module({
  controllers: [DealerDashboardController],
  providers: [DealerDashboardService],
  exports: [DealerDashboardService],
})
export class DealerDashboardModule {}
