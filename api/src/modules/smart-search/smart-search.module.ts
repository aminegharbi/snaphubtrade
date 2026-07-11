import { Module, Controller, Get, Post, Body, Query, Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { getAIClient, aiModel } from '../../shared/ai/ai-client';
import { Public } from '../../shared/auth/public.decorator';

@Injectable()
export class SmartSearchService {
  private anthropic = getAIClient();
  constructor(private prisma: PrismaService) {}

  async parseNaturalLanguage(query: string): Promise<any> {
    if (!query?.trim()) return {};
    const prompt = `You are a UAE car marketplace search engine. Parse this natural language query into structured filters.

Query: "${query}"

Respond ONLY with a JSON object (no markdown) with these optional fields:
{
  "make": "Toyota" | "Nissan" | "Mercedes-Benz" | "BMW" | "Land Rover" | "Porsche" | "Ford" | "GMC" | "Cadillac" | "BYD" | "Tesla" | "MG" | "Lexus" | "Audi" | null,
  "model": string | null,
  "year_min": number | null,
  "year_max": number | null,
  "price_min": number | null,
  "price_max": number | null,
  "body_type": "SUV" | "Sedan" | "Pickup" | "Coupe" | "Van" | "Convertible" | null,
  "fuel_type": "petrol" | "diesel" | "hybrid" | "electric" | null,
  "export_eligible": boolean | null,
  "mileage_max": number | null,
  "keywords": string | null,
  "intent": "export" | "family" | "luxury" | "investment" | "budget" | "performance" | "ev" | "pickup" | null,
  "interpreted_as": "Human-readable short description of what was searched"
}

Examples:
"SUV under 150000" → {"body_type":"SUV","price_max":150000,"interpreted_as":"SUVs under AED 150,000"}
"luxury car for export to Nigeria" → {"export_eligible":true,"intent":"export","interpreted_as":"Export-eligible luxury vehicles"}
"best family SUV under 200k" → {"body_type":"SUV","price_max":200000,"intent":"family","interpreted_as":"Family SUVs under AED 200,000"}
"fastest selling toyota" → {"make":"Toyota","intent":"investment","interpreted_as":"Toyota vehicles with fastest turnover"}
"electric vehicles cheap" → {"fuel_type":"electric","price_max":150000,"intent":"ev","interpreted_as":"Affordable electric vehicles"}
"reliable pickup for africa" → {"body_type":"Pickup","export_eligible":true,"intent":"export","interpreted_as":"Export-ready pickup trucks for Africa"}
"low depreciation cars" → {"intent":"investment","interpreted_as":"Vehicles with low depreciation rate"}`;

    try {
      const r = await this.anthropic.messages.create({
        model: aiModel('sonnet'), max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = r.content[0].type === 'text' ? r.content[0].text.trim() : '{}';
      const clean = text.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch { return { keywords: query, interpreted_as: query }; }
  }

  async smartSearch(query: string, extra: any = {}) {
    const parsed = await this.parseNaturalLanguage(query);
    const where: any = { status: 'available' };

    if (parsed.make)            where.make  = parsed.make;
    if (parsed.model)           where.model = { contains: parsed.model, mode: 'insensitive' };
    if (parsed.body_type)       where.body_type  = { contains: parsed.body_type, mode: 'insensitive' };
    if (parsed.fuel_type)       where.fuel_type  = parsed.fuel_type;
    if (parsed.export_eligible) where.export_eligible = true;
    if (parsed.price_min || parsed.price_max) {
      where.price_aed = {};
      if (parsed.price_min) where.price_aed.gte = parsed.price_min;
      if (parsed.price_max) where.price_aed.lte = parsed.price_max;
    }
    if (parsed.year_min || parsed.year_max) {
      where.year = {};
      if (parsed.year_min) where.year.gte = parsed.year_min;
      if (parsed.year_max) where.year.lte = parsed.year_max;
    }
    if (parsed.mileage_max) where.mileage_km = { lte: parsed.mileage_max };
    if (parsed.keywords) {
      where.OR = [
        { make:  { contains: parsed.keywords, mode: 'insensitive' } },
        { model: { contains: parsed.keywords, mode: 'insensitive' } },
        { title: { contains: parsed.keywords, mode: 'insensitive' } },
        { description: { contains: parsed.keywords, mode: 'insensitive' } },
      ];
    }

    // Intent-based sorting
    let orderBy: any = { created_at: 'desc' };
    if (parsed.intent === 'budget')    orderBy = { price_aed: 'asc' };
    if (parsed.intent === 'luxury')    orderBy = { price_aed: 'desc' };
    if (parsed.intent === 'investment') orderBy = [{ view_count: 'desc' }, { created_at: 'desc' }];

    const page  = Number(extra.page  || 1);
    const limit = Number(extra.limit || 24);

    const [items, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where, orderBy, skip: (page-1)*limit, take: limit,
        include: {
          vehicle_images: { where: { is_primary: true }, take: 1 },
          dealer: { select: { id: true, company_name: true, slug: true, verified: true, rating: true, whatsapp: true } },
          valuations: { where: { is_stale: false }, orderBy: { computed_at: 'desc' }, take: 1,
            select: { deal_rating: true, deal_score: true, market_score: true, investment_score: true, estimated_value_aed: true, price_trend_direction: true, price_trend_pct: true, market_demand: true, avg_days_to_sell: true } },
        },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    // Dynamic tip built from live DB inventory stats
    let searchTip = '';
    if (items.length > 0 && parsed.intent) {
      searchTip = await this.buildDynamicTip(parsed.intent, parsed, where);
    }

    return { items, total, page, limit, parsed, search_tip: searchTip };
  }

  private async buildDynamicTip(intent: string, parsed: any, baseWhere: any = {}): Promise<string> {
    try {
      // Pull real stats from DB for this intent
      const where: any = { status: 'available' };
      if (parsed.make)      where.make = parsed.make;
      if (parsed.body_type) where.body_type = { contains: parsed.body_type, mode: 'insensitive' };
      if (parsed.fuel_type) where.fuel_type = parsed.fuel_type;
      if (parsed.export_eligible) where.export_eligible = true;

      const [count, topMakeRes, avgPriceRes, exportCount, recentCount] = await Promise.all([
        this.prisma.vehicle.count({ where }),
        this.prisma.vehicle.groupBy({ by: ['make'], where, _count: true, orderBy: { _count: { make: 'desc' } }, take: 1 }),
        this.prisma.vehicle.aggregate({ where, _avg: { price_aed: true } }),
        this.prisma.vehicle.count({ where: { ...where, export_eligible: true } }),
        this.prisma.vehicle.count({ where: { ...where, created_at: { gte: new Date(Date.now() - 7 * 86400000) } } }),
      ]);

      const topMake    = topMakeRes[0]?.make || '';
      const avgPrice   = Math.round(Number(avgPriceRes._avg.price_aed || 0));
      const avgFmt     = avgPrice >= 1000000 ? `AED ${(avgPrice/1000000).toFixed(1)}M` : `AED ${Math.round(avgPrice/1000)}K`;

      const tips: Record<string, string> = {
        export:      `💡 ${exportCount} export-eligible vehicles available now — avg ${avgFmt}. ${topMake ? `${topMake} is the top export make.` : ''} Ships from JAFZA to 40+ countries.`,
        investment:  `💡 ${count} vehicles match your search — avg ${avgFmt}. ${recentCount > 0 ? `${recentCount} added this week.` : ''} ${topMake ? `${topMake} shows strongest market retention.` : ''}`,
        family:      `💡 ${count} family vehicles in stock — avg ${avgFmt}. ${topMake ? `${topMake} is the most popular family choice on the platform.` : ''}`,
        ev:          `💡 ${count} electric/hybrid vehicles available — avg ${avgFmt}. ${recentCount > 0 ? `${recentCount} new EV listings this week.` : ''}`,
        luxury:      `💡 ${count} luxury vehicles from avg ${avgFmt}. ${topMake ? `${topMake} leads luxury demand.` : ''} ${exportCount > 0 ? `${exportCount} are export-eligible.` : ''}`,
        budget:      `💡 ${count} vehicles match your budget — avg ${avgFmt}. ${recentCount > 0 ? `${recentCount} added this week.` : ''} ${topMake ? `${topMake} is best value for money right now.` : ''}`,
        performance: `💡 ${count} performance vehicles available — avg ${avgFmt}. ${topMake ? `${topMake} tops performance demand.` : ''}`,
        pickup:      `💡 ${count} pickup trucks listed — avg ${avgFmt}. ${exportCount > 0 ? `${exportCount} are export-eligible for Africa/Asia.` : ''} ${topMake ? `${topMake} leads pickup exports.` : ''}`,
      };
      return tips[intent] || `💡 ${count} matching vehicles — avg ${avgFmt}.${recentCount > 0 ? ` ${recentCount} new this week.` : ''}`;
    } catch {
      return '';
    }
  }

    getSuggestions() {
    return [
      { label: '🔥 Best deals right now',          query: 'excellent deal SUV' },
      { label: '✈️ Export to Africa',               query: 'pickup export africa' },
      { label: '👨‍👩‍👧 Best family SUV',                 query: 'family SUV under 200000' },
      { label: '⚡ Electric vehicles',              query: 'electric cars cheap' },
      { label: '💎 Luxury under 500K',              query: 'luxury car under 500000' },
      { label: '📈 Low depreciation cars',          query: 'low depreciation investment' },
      { label: '🚙 Toyota Land Cruiser',            query: 'toyota land cruiser 2024' },
      { label: '💰 Under AED 100,000',              query: 'budget car under 100000' },
      { label: '🏆 Performance cars',               query: 'performance sports car fast' },
      { label: '🌍 Export eligible all brands',     query: 'export eligible' },
    ];
  }
}

@Public()
@Controller('smart-search')
export class SmartSearchController {
  constructor(private svc: SmartSearchService) {}

  @Get()
  search(@Query('q') q: string, @Query() extra: any) {
    return this.svc.smartSearch(q, extra);
  }

  @Post('parse')
  parse(@Body() body: { query: string }) {
    return this.svc.parseNaturalLanguage(body.query);
  }

  @Get('suggestions')
  suggestions() { return this.svc.getSuggestions(); }
}

@Module({ controllers: [SmartSearchController], providers: [SmartSearchService], exports: [SmartSearchService] })
export class SmartSearchModule {}
