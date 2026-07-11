import { Module, Controller, Get, Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Public } from '../../shared/auth/public.decorator';

@Injectable()
export class TrendingService {
  constructor(private prisma: PrismaService) {}

  async getTrending() {
    const [mostViewed, newest, priceDrops, mostFavorited] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: { status: 'available' }, orderBy: { view_count: 'desc' }, take: 6,
        include: { vehicle_images: { where: { is_primary: true }, take: 1 }, dealer: { select: { company_name: true, verified: true } } },
      }),
      this.prisma.vehicle.findMany({
        where: { status: 'available' }, orderBy: { created_at: 'desc' }, take: 6,
        include: { vehicle_images: { where: { is_primary: true }, take: 1 }, dealer: { select: { company_name: true, verified: true } } },
      }),
      this.prisma.vehicle.findMany({
        where: { status: 'available', price_history: { some: {} } }, take: 6,
        include: {
          vehicle_images: { where: { is_primary: true }, take: 1 },
          dealer: { select: { company_name: true, verified: true } },
          price_history: { orderBy: { changed_at: 'desc' }, take: 2 },
        },
      }),
      this.prisma.vehicle.findMany({
        where: { status: 'available' }, orderBy: { favorite_count: 'desc' }, take: 6,
        include: { vehicle_images: { where: { is_primary: true }, take: 1 }, dealer: { select: { company_name: true, verified: true } } },
      }),
    ]);

    const mostExpensive = await this.prisma.vehicle.findMany({
      where: { status: 'available' }, orderBy: { price_aed: 'desc' }, take: 6,
      include: { vehicle_images: { where: { is_primary: true }, take: 1 }, dealer: { select: { company_name: true, verified: true } } },
    });

    // Filter actual price drops (current < previous)
    const realDrops = priceDrops.filter(v => {
      const hist = (v as any).price_history;
      return hist?.length >= 2 && Number(hist[0].price_aed) < Number(hist[1].price_aed);
    }).map(v => {
      const hist = (v as any).price_history;
      const dropPct = ((Number(hist[1].price_aed) - Number(hist[0].price_aed)) / Number(hist[1].price_aed) * 100);
      return { ...v, drop_pct: dropPct.toFixed(1) };
    });

    return {
      most_viewed: mostViewed,
      newest_inventory: newest,
      price_drops: realDrops,
      most_saved: mostFavorited,
      most_expensive: mostExpensive,
      // Fastest selling = vehicles with high views relative to days listed
      fastest_selling: mostViewed.filter(v => {
        const days = (Date.now() - new Date(v.created_at).getTime()) / 86400000;
        return days < 14 && v.view_count > 50;
      }).slice(0, 6),
    };
  }
}

@Public()
@Controller('trending')
export class TrendingController {
  constructor(private svc: TrendingService) {}
  @Get() getAll() { return this.svc.getTrending(); }
}

@Module({ controllers: [TrendingController], providers: [TrendingService] })
export class TrendingModule {}
