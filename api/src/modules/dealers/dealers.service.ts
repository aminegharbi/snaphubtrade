import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class DealersService {
  constructor(private prisma: PrismaService) {}

  async getTrustScore(dealerId: string) {
    const dealer = await this.prisma.dealer.findUnique({
      where: { id: dealerId },
      include: {
        vehicles: { where: { status: 'available' }, select: { created_at: true } },
        broker_deals: { where: { status: 'paid' }, select: { id: true } },
      },
    });
    if (!dealer) throw new NotFoundException('Dealer not found');

    let score = 50;
    const breakdown: Record<string, number> = {};

    if (dealer.verified) { score += 20; breakdown.verified = 20; }

    const ratingBonus = dealer.review_count > 0 ? Math.round((Number(dealer.rating) - 3) * 7.5) : 0;
    if (ratingBonus > 0) { const b = Math.min(15, ratingBonus); score += b; breakdown.rating = b; }

    const reviewBonus = Math.min(10, Math.floor(dealer.review_count / 5));
    score += reviewBonus; breakdown.reviews = reviewBonus;

    const veh = (dealer as any).vehicles || [];
    if (veh.length > 0) {
      const avgAge = veh.reduce((s: number, v: any) => s + (Date.now() - new Date(v.created_at).getTime()) / 86400000, 0) / veh.length;
      const freshnessBonus = avgAge < 30 ? 10 : avgAge < 60 ? 5 : 0;
      score += freshnessBonus; breakdown.freshness = freshnessBonus;
    }

    const ageYears = (Date.now() - new Date(dealer.created_at).getTime()) / (365 * 86400000);
    if (ageYears >= 2) { score += 5; breakdown.account_age = 5; }

    const brokerBonus = ((dealer as any).broker_deals?.length || 0) >= 5 ? 5 : 0;
    score += brokerBonus; breakdown.broker_activity = brokerBonus;

    const activityBonus = Math.min(10, Math.floor(veh.length / 5));
    score += activityBonus; breakdown.activity = activityBonus;

    score = Math.max(0, Math.min(100, score));
    const label = score >= 90 ? 'Excellent' : score >= 75 ? 'Very Good' : score >= 60 ? 'Good' : score >= 45 ? 'Average' : 'New Dealer';
    const color = score >= 90 ? '#065F46' : score >= 75 ? '#1E40AF' : score >= 60 ? '#007A3D' : score >= 45 ? '#92400E' : '#9CA3AF';

    return {
      score, label, color, breakdown,
      dealer_name: dealer.company_name, verified: dealer.verified,
      rating: dealer.rating, review_count: dealer.review_count,
    };
  }

  async getZones(countryCode?: string) {
    const where: any = { is_active: true };
    if (countryCode) where.country = { code: countryCode.toUpperCase() };

    const countries = await this.prisma.country.findMany({
      where: countryCode ? { code: countryCode.toUpperCase() } : { is_active: true },
      include: {
        free_zones: { where: { is_active: true }, orderBy: { name: 'asc' } },
        _count: { select: { dealers: true } },
      },
      orderBy: { name: 'asc' },
    });

    return {
      countries: countries.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        name_ar: c.name_ar,
        currency_code: c.currency_code,
        phone_prefix: c.phone_prefix,
        dealer_count: c._count.dealers,
        zones: c.free_zones.map((z) => ({ id: z.id, code: z.code, name: z.name, city: z.city })),
      })),
    };
  }

  async findAll(query: any) {
    const { verified, zone, country, lang, search, page = 1, limit = 30 } = query;
    const where: any = {};
    if (verified) where.verified = verified === 'true';
    if (lang) where.languages = { has: lang };
    if (search) {
      where.OR = [
        { company_name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }
    // Country filter accepts either the ISO code (AE, SA, QA...) or the raw
    // country_id — code is the ergonomic public API, id works for internal callers.
    if (country) {
      where.country = { code: String(country).toUpperCase() };
    }
    // Zone filter now matches the real FreeZone relation by code, replacing the
    // old fragile substring-match against the free-text `address` field
    // (which only ever worked for 3 hardcoded Dubai/Sharjah zones).
    if (zone) {
      where.free_zone = { code: String(zone).toLowerCase() };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      this.prisma.dealer.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ verified: 'desc' }, { rating: 'desc' }],
        include: {
          _count: { select: { vehicles: true } },
          country: true,
          free_zone: true,
        },
      }),
      this.prisma.dealer.count({ where }),
    ]);

    // Fetch social media for all dealers
    const dealerIds = items.map((d) => d.id);
    const social = await this.getSocialByDealerIds(dealerIds);

    return {
      items: items.map((d) => ({
        ...d,
        vehicle_count: d._count.vehicles,
        social_media: social[d.id] || [],
      })),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    };
  }

  async findBySlug(slug: string) {
    const dealer = await this.prisma.dealer.findUnique({
      where: { slug },
      include: {
        _count: { select: { vehicles: true, reviews: true } },
        vehicles: {
          where: { status: 'available' },
          take: 12,
          orderBy: { created_at: 'desc' },
          include: {
            vehicle_images: { where: { is_primary: true }, take: 1 },
          },
        },
        reviews: {
          orderBy: { created_at: 'desc' },
          take: 5,
          include: { user: { select: { full_name: true, avatar_url: true } } },
        },
      },
    });
    if (!dealer) throw new NotFoundException('Dealer not found');

    const social = await this.getSocialByDealerIds([dealer.id]);

    return {
      ...dealer,
      vehicle_count: dealer._count.vehicles,
      review_count_total: dealer._count.reviews,
      social_media: social[dealer.id] || [],
    };
  }

  private async getSocialByDealerIds(ids: string[]): Promise<Record<string, any[]>> {
    if (!ids.length) return {};
    try {
      // dealer_social_media is not in Prisma schema, use raw query
      const rows = await (this.prisma as any).$queryRawUnsafe(
        `SELECT dealer_id, platform, url, handle
         FROM dealer_social_media
         WHERE dealer_id = ANY($1::text[])
         ORDER BY dealer_id, platform`,
        ids,
      ) as any[];

      const map: Record<string, any[]> = {};
      for (const row of rows) {
        if (!map[row.dealer_id]) map[row.dealer_id] = [];
        map[row.dealer_id].push({ platform: row.platform, url: row.url, handle: row.handle });
      }
      return map;
    } catch {
      return {};
    }
  }

  async update(id: string, data: any) {
    return this.prisma.dealer.update({ where: { id }, data });
  }

  async getStats(id: string) {
    try {
      const [total, available, reserved, sold, leads] = await Promise.all([
        this.prisma.vehicle.count({ where: { dealer_id: id } }),
        this.prisma.vehicle.count({ where: { dealer_id: id, status: 'available' } }),
        this.prisma.vehicle.count({ where: { dealer_id: id, status: 'reserved' } }),
        this.prisma.vehicle.count({ where: { dealer_id: id, status: 'sold' } }),
        this.prisma.lead.count({ where: { dealer_id: id } }),
      ]);
      return { total, available, reserved, sold, leads };
    } catch {
      return { total: 0, available: 0, reserved: 0, sold: 0, leads: 0 };
    }
  }

  async getReviews(dealerId: string) {
    return this.prisma.dealerReview.findMany({
      where: { dealer_id: dealerId },
      orderBy: { created_at: 'desc' },
      take: 20,
      include: { user: { select: { full_name: true, avatar_url: true } } },
    });
  }

  async addReview(dealerId: string, data: any) {
    const review = await this.prisma.dealerReview.create({
      data: { dealer_id: dealerId, ...data },
    });
    const agg = await this.prisma.dealerReview.aggregate({
      where: { dealer_id: dealerId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await this.prisma.dealer.update({
      where: { id: dealerId },
      data: { rating: agg._avg.rating || 0, review_count: agg._count.rating },
    });
    return review;
  }
}
