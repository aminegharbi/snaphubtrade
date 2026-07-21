import { Module, Controller, Get, Query, Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Public } from '../../shared/auth/public.decorator';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  private activePromotionWhere(now = new Date()) {
    return {
      active: true,
      starts_at: { lte: now },
      OR: [{ ends_at: null }, { ends_at: { gte: now } }],
    };
  }

  async search(q: any) {
    const {
      query, make, model, year_min, year_max, price_min, price_max,
      fuel_type, body_type, export_eligible, sort = 'newest', page = 1, limit = 24,
    } = q;

    // Allow admin to query all statuses
    const where: any = {};
    if (q.status && q.status !== 'all') {
      where.status = q.status;
    } else if (!q.status) {
      where.status = 'available';
    }

    if (query) {
      where.OR = [
        { make: { contains: query, mode: 'insensitive' } },
        { model: { contains: query, mode: 'insensitive' } },
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { trim: { contains: query, mode: 'insensitive' } },
      ];
    }
    if (make) where.make = { equals: make, mode: 'insensitive' };
    if (model) where.model = { equals: model, mode: 'insensitive' };
    if (year_min || year_max) where.year = { gte: year_min ? +year_min : undefined, lte: year_max ? +year_max : undefined };
    if (price_min || price_max) where.price_aed = { gte: price_min ? +price_min : undefined, lte: price_max ? +price_max : undefined };
    if (fuel_type) where.fuel_type = fuel_type;
    if (body_type) where.body_type = { contains: body_type, mode: 'insensitive' };
    if (export_eligible !== undefined) where.export_eligible = export_eligible === 'true';

    const sortMap: any = {
      newest: { created_at: 'desc' },
      price_asc: { price_aed: 'asc' },
      price_desc: { price_aed: 'desc' },
      popular: { view_count: 'desc' },
    };

    const skip = (Number(page) - 1) * Number(limit);
    const take = Math.min(Number(limit), 48);

    const [items, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where, skip, take,
        orderBy: sortMap[sort] || sortMap.newest,
        include: {
          vehicle_images: { where: { is_primary: true }, take: 1 },
          dealer: {
            select: {
              id: true, company_name: true, slug: true,
              verified: true, rating: true, whatsapp: true,
            },
          },
          promotions: { where: this.activePromotionWhere(), take: 1 },
          valuations: {
            where: { is_stale: false, expires_at: { gt: new Date() } },
            orderBy: { computed_at: 'desc' as const },
            take: 1,
            select: {
              deal_rating: true, deal_score: true, market_score: true,
              investment_score: true, estimated_value_aed: true,
              price_trend_direction: true, price_trend_pct: true,
              market_demand: true, avg_days_to_sell: true,
              confidence_score: true,
            },
          },
        },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    const makes = await this.prisma.vehicle.groupBy({
      by: ['make'],
      where: { status: 'available' },
      // eslint-disable-next-line @typescript-eslint/naming-convention
      _count: { make: true },
      orderBy: { _count: { make: 'desc' } },
      take: 30,
    });

    return {
      items,
      total,
      page: +page,
      limit: take,
      pages: Math.ceil(total / take),
      facets: {
        makes: makes.map((m) => ({ value: m.make, count: m._count.make })),
      },
    };
  }

  async suggest(q: string) {
    if (!q || q.length < 2) return [];
    return this.prisma.vehicle.findMany({
      where: {
        status: 'available',
        OR: [
          { make: { contains: q, mode: 'insensitive' } },
          { model: { contains: q, mode: 'insensitive' } },
          { title: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { make: true, model: true, year: true, title: true },
      distinct: ['make', 'model'],
      take: 8,
    });
  }
}

@Public()
@Controller('search')
export class SearchController {
  constructor(private service: SearchService) {}

  @Get()
  search(@Query() q: any) { return this.service.search(q); }

  @Get('suggest')
  suggest(@Query('q') q: string) { return this.service.suggest(q); }
}

@Module({
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
