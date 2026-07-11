import { Module, Controller, Get, Param, Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Roles } from '../../shared/auth/roles.decorator';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDealerAnalytics(dealerId: string) {
    try {
      const [total, available, reserved, soldUnitsAgg, leads, viewsAgg, stockAgg] = await Promise.all([
        this.prisma.vehicle.count({ where: { dealer_id: dealerId } }),
        this.prisma.vehicle.count({ where: { dealer_id: dealerId, status: 'available' } }),
        this.prisma.vehicle.count({ where: { dealer_id: dealerId, status: 'reserved' } }),
        this.prisma.vehicle.aggregate({ where: { dealer_id: dealerId }, _sum: { sold_units: true } }),
        this.prisma.lead.count({ where: { dealer_id: dealerId } }),
        this.prisma.vehicle.aggregate({ where: { dealer_id: dealerId }, _sum: { view_count: true } }),
        this.prisma.vehicle.aggregate({ where: { dealer_id: dealerId, status: 'available' }, _sum: { price_aed: true } }),
      ]);

      const topMakes = await this.prisma.vehicle.groupBy({
        by: ['make'],
        where: { dealer_id: dealerId },
        _count: { make: true },
        orderBy: { _count: { make: 'desc' } },
        take: 5,
      });

      return {
        inventory: { total: Number(total), available: Number(available), reserved: Number(reserved), sold: Number(soldUnitsAgg._sum?.sold_units ?? 0) },
        stock_value_aed: Number(stockAgg._sum.price_aed || 0),
        total_views: Number(viewsAgg._sum.view_count || 0),
        total_leads: Number(leads),
        top_makes: topMakes.map((m) => ({ make: m.make, count: Number(m._count.make) })),
      };
    } catch {
      return { inventory: { total: 0, available: 0, reserved: 0, sold: 0 }, stock_value_aed: 0, total_views: 0, total_leads: 0, top_makes: [] };
    }
  }

  async getPlatformAnalytics() {
    try {
      const [users, dealers, vehicles, leads] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.dealer.count(),
        this.prisma.vehicle.count({ where: { status: 'available' } }),
        this.prisma.lead.count(),
      ]);
      return {
        users: Number(users),
        dealers: Number(dealers),
        available_vehicles: Number(vehicles),
        total_leads: Number(leads)
      };
    } catch {
      return { users: 0, dealers: 0, available_vehicles: 0, total_leads: 0 };
    }
  }
}

@Roles('admin')
@Controller('analytics')
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get('dealer/:id')
  dealerStats(@Param('id') id: string) { return this.service.getDealerAnalytics(id); }

  @Get('platform')
  platformStats() { return this.service.getPlatformAnalytics(); }
}

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
