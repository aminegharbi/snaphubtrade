import { Module, Controller, Get, Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Roles } from '../../shared/auth/roles.decorator';

@Injectable()
export class MarketAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekAgo    = new Date(Date.now() - 7 * 86400000);

    const [
      totalVehicles, totalDealers, totalValue, byMake, byBodyType, byFuelType,
      byStatus, recentVehicles, dealsThisMonth, avgPrice,
      // Stock reality
      soldUnitsAgg,
      // Reservation pipeline
      activeReservations, convertedReservations, allReservations,
      // Revenue
      revenueAgg, commissionsAgg, revenueMonthAgg,
    ] = await Promise.all([
      this.prisma.vehicle.count(),
      this.prisma.dealer.count(),
      this.prisma.vehicle.aggregate({ where: { status: 'available' }, _sum: { price_aed: true } }),
      this.prisma.vehicle.groupBy({ by: ['make'], where: { status: 'available' }, _count: true, orderBy: { _count: { make: 'desc' } }, take: 10 }),
      this.prisma.vehicle.groupBy({ by: ['body_type'], where: { status: 'available' }, _count: true, orderBy: { _count: { body_type: 'desc' } } }),
      this.prisma.vehicle.groupBy({ by: ['fuel_type'], where: { status: 'available' }, _count: true }),
      this.prisma.vehicle.groupBy({ by: ['status'], _count: true }),
      this.prisma.vehicle.count({ where: { created_at: { gte: weekAgo } } }),
      this.prisma.brokerDeal.count({ where: { created_at: { gte: monthStart } } }),
      this.prisma.vehicle.aggregate({ where: { status: 'available' }, _avg: { price_aed: true } }),
      // Sum of all sold_units — incremented on every sale path (direct, reservation, invoice)
      this.prisma.vehicle.aggregate({ _sum: { sold_units: true } }),
      // Reservation pipeline
      this.prisma.vehicleReservation.count({ where: { status: 'active' } }),
      this.prisma.vehicleReservation.count({ where: { status: 'converted' } }),
      this.prisma.vehicleReservation.count({ where: { status: { not: 'active' } } }),
      // Revenue from confirmed + paid broker deals
      this.prisma.brokerDeal.aggregate({ where: { status: { in: ['processing', 'paid'] } }, _sum: { deal_price_aed: true } }),
      this.prisma.brokerDeal.aggregate({ where: { status: { in: ['processing', 'paid'] } }, _sum: { commission_aed: true } }),
      this.prisma.brokerDeal.aggregate({ where: { status: { in: ['processing', 'paid'] }, created_at: { gte: monthStart } }, _sum: { deal_price_aed: true } }),
    ]);

    const exportEligible = await this.prisma.vehicle.count({ where: { export_eligible: true, status: 'available' } });

    // Price distribution buckets
    const priceRanges = await Promise.all([
      this.prisma.vehicle.count({ where: { status: 'available', price_aed: { lt: 50000 } } }),
      this.prisma.vehicle.count({ where: { status: 'available', price_aed: { gte: 50000, lt: 150000 } } }),
      this.prisma.vehicle.count({ where: { status: 'available', price_aed: { gte: 150000, lt: 300000 } } }),
      this.prisma.vehicle.count({ where: { status: 'available', price_aed: { gte: 300000, lt: 500000 } } }),
      this.prisma.vehicle.count({ where: { status: 'available', price_aed: { gte: 500000 } } }),
    ]);

    // Deal rating distribution (from valuations)
    const dealRatings = await this.prisma.vehicleValuation.groupBy({
      by: ['deal_rating'], where: { is_stale: false }, _count: true,
    });

    const totalSoldUnits = Number(soldUnitsAgg._sum?.sold_units || 0);
    const reservationConversionPct = allReservations > 0
      ? Math.round((convertedReservations / allReservations) * 100) : 0;

    return {
      kpis: {
        total_vehicles: totalVehicles,
        total_dealers: totalDealers,
        total_inventory_value: Math.round(Number(totalValue._sum.price_aed || 0)),
        avg_price: Math.round(Number(avgPrice._avg.price_aed || 0)),
        export_eligible_count: exportEligible,
        new_this_week: recentVehicles,
        broker_deals_this_month: dealsThisMonth,
        // Live stock reality
        total_sold_units: totalSoldUnits,
        // Reservation pipeline
        active_reservations: activeReservations,
        converted_reservations: convertedReservations,
        reservation_conversion_rate_pct: reservationConversionPct,
        // Revenue
        total_revenue_aed: Math.round(Number(revenueAgg._sum?.deal_price_aed || 0)),
        total_commissions_aed: Math.round(Number(commissionsAgg._sum?.commission_aed || 0)),
        revenue_this_month_aed: Math.round(Number(revenueMonthAgg._sum?.deal_price_aed || 0)),
      },
      by_make: byMake.map(m => ({ make: m.make, count: m._count })),
      by_body_type: byBodyType.map(b => ({ type: b.body_type || 'Other', count: b._count })),
      by_fuel_type: byFuelType.map(f => ({ fuel: f.fuel_type || 'Other', count: f._count })),
      by_status: byStatus.map(s => ({ status: s.status, count: s._count })),
      price_distribution: [
        { range: 'Under 50K', count: priceRanges[0] },
        { range: '50K-150K', count: priceRanges[1] },
        { range: '150K-300K', count: priceRanges[2] },
        { range: '300K-500K', count: priceRanges[3] },
        { range: '500K+', count: priceRanges[4] },
      ],
      deal_ratings: dealRatings.map(d => ({ rating: d.deal_rating, count: d._count })),
    };
  }
}

@Roles('admin')
@Controller('market-analytics')
export class MarketAnalyticsController {
  constructor(private svc: MarketAnalyticsService) {}
  @Get('dashboard') dashboard() { return this.svc.getDashboard(); }
}

@Module({ controllers: [MarketAnalyticsController], providers: [MarketAnalyticsService] })
export class MarketAnalyticsModule {}
