import { Module, Controller, Get, Post, Patch, Body, Param, Query, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { MarketAnalysisService, MarketAnalysisModule } from '../market-analysis/market-analysis.module';
import { getAIClient, aiModel } from '../../shared/ai/ai-client';
import { CurrencyService } from '../../shared/currency/currency.service';
import { Roles } from '../../shared/auth/roles.decorator';
import { Public } from '../../shared/auth/public.decorator';

// ─── No static market data — all prices come from live AI + DB ────────────────

@Injectable()
export class ValuationService {
  private anthropic = getAIClient();

  constructor(
    private prisma: PrismaService,
    private marketAnalysis: MarketAnalysisService,
    private currency: CurrencyService,
  ) {}

  // ── Export score derived from vehicle characteristics (no hardcoded lookup) ─
  private computeExportScore(vehicle: any): number {
    let score = 35;
    const body  = (vehicle.body_type  || '').toLowerCase();
    const make  = (vehicle.make       || '').toLowerCase();
    const fuel  = (vehicle.fuel_type  || '').toLowerCase();
    const price = Number(vehicle.price_aed);
    const km    = Number(vehicle.mileage_km);

    // Body type: SUV/Pickup dominate UAE-to-Africa exports
    if (['suv','pickup','van','wagon'].some(t => body.includes(t))) score += 22;
    if (body.includes('sedan')) score -= 5;

    // Make: Toyota/Nissan/Mitsubishi have dominant export networks
    if (['toyota','nissan','mitsubishi','isuzu','ford','ram','gmc'].some(m => make.includes(m))) score += 20;
    if (['byd','mg','geely','chery','haval'].some(m => make.includes(m)))  score += 8; // growing EV exports
    if (['porsche','ferrari','lamborghini','bentley','rolls'].some(m => make.includes(m))) score -= 30;

    // Price: under AED 200K is the sweet spot for export markets
    if (price < 80_000)  score += 15;
    else if (price < 150_000) score += 10;
    else if (price < 250_000) score += 3;
    else if (price > 500_000) score -= 20;

    // Mileage: fresh vehicles export best
    if (km === 0)          score += 8;
    else if (km < 30_000)  score += 5;
    else if (km > 120_000) score -= 15;
    else if (km > 200_000) score -= 30;

    // Electric/hybrid: growing African EV adoption
    if (fuel === 'electric') score += 5;
    if (vehicle.export_eligible) score += 8;

    return Math.max(0, Math.min(100, score));
  }

  // ── Investment score derived from deal quality + live market data ──────────
  private computeInvestmentScore(vehicle: any, mkt: any, dealScore: number): number {
    let score = dealScore * 0.35;

    if (mkt) {
      // Trend: rising markets make better investments
      const trendScore = Math.min(100, Math.max(0, 50 + (mkt.monthly_trend_pct || 0) * 8));
      score += trendScore * 0.35;
      // Demand
      const demandScore: Record<string, number> = { very_high: 92, high: 72, medium: 50, low: 22 };
      score += (demandScore[mkt.demand || 'medium'] || 50) * 0.30;
    } else {
      // No market data: use vehicle age + mileage as proxy
      const age = Math.max(0, new Date().getFullYear() - vehicle.year);
      const ageScore = Math.max(10, 85 - age * 9);
      const kmPenalty = Math.min(40, Math.floor(vehicle.mileage_km / 15000) * 4);
      score += (ageScore - kmPenalty) * 0.65;
    }
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  // ── Market benchmark: AI live data → DB comparables → nothing (trigger refresh) ─
  private async getMarketBenchmark(make: string, model: string, year: number): Promise<any | null> {
    // 1. Live AI benchmark (Dubizzle + DubiCars via admin-configured refresh)
    try {
      const live = await this.marketAnalysis.getBenchmark(make, model, year);
      if (live) {
        return {
          avg_price: live.avg_price, min_price: live.min_price, max_price: live.max_price,
          listing_count: live.listing_count, avg_days_to_sell: live.avg_days_listed,
          monthly_trend_pct: live.trend_pct, demand: live.demand,
          is_live: true, source: 'ai_web_search',
        };
      }
    } catch { /* continue */ }

    // 2. Platform DB comparables — real vehicles listed on DubaiAuto
    const dbComps = await this.prisma.vehicle.findMany({
      where: {
        make: { equals: make, mode: 'insensitive' },
        model: { contains: model.split(' ')[0], mode: 'insensitive' },
        year:  { gte: year - 2, lte: year + 1 },
        status: 'available',
      },
      select: { price_aed: true, mileage_km: true, view_count: true, created_at: true },
      take: 30,
    });

    if (dbComps.length >= 3) {
      const prices = dbComps.map(v => Number(v.price_aed));
      const sorted = [...prices].sort((a, b) => a - b);
      // Trim outliers (remove top/bottom 10%)
      const trim = Math.floor(sorted.length * 0.1);
      const trimmed = sorted.slice(trim, sorted.length - trim);
      const avgPrice = Math.round(trimmed.reduce((s, p) => s + p, 0) / trimmed.length);
      const avgViews = dbComps.reduce((s, v) => s + v.view_count, 0) / dbComps.length;
      const avgDays = dbComps.reduce((s, v) => s +
        Math.floor((Date.now() - new Date(v.created_at).getTime()) / 86_400_000), 0) / dbComps.length;
      const demand = avgViews > 80 ? 'high' : avgViews > 30 ? 'medium' : 'low';

      return {
        avg_price: avgPrice,
        min_price: Math.round(sorted[Math.floor(sorted.length * 0.1)] || sorted[0]),
        max_price: Math.round(sorted[Math.floor(sorted.length * 0.9)] || sorted[sorted.length - 1]),
        listing_count: dbComps.length,
        avg_days_to_sell: Math.round(avgDays),
        monthly_trend_pct: 0, // no trend data without AI
        demand,
        is_live: false, source: 'platform_inventory',
      };
    }

    // 3. No data — trigger AI refresh in background for next valuation
    this.marketAnalysis.refreshOne(make, model, year, 'auto').catch(() => {});
    return null;
  }

  async getConfig() {
    return this.prisma.valuationConfig.upsert({ where: { id: 'default' }, create: { id: 'default' }, update: {} });
  }

  async updateConfig(data: any) {
    return this.prisma.valuationConfig.upsert({ where: { id: 'default' }, create: { id: 'default', ...data }, update: { ...data } });
  }

  // ── Core valuation engine ──────────────────────────────────────────────────
  async valuateVehicle(vehicleId: string, currency = 'AED'): Promise<any> {
    const cached = await this.prisma.vehicleValuation.findFirst({
      where: { vehicle_id: vehicleId, is_stale: false, expires_at: { gt: new Date() } },
      orderBy: { computed_at: 'desc' },
    });
    if (cached) return this.formatWithCurrency(cached, currency);

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        dealer: { select: { verified: true, rating: true, review_count: true, created_at: true } },
        price_history: { orderBy: { changed_at: 'desc' }, take: 10 },
      },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const config = await this.getConfig();
    return this.computeValuation(vehicle, config, currency);
  }

  async computeValuation(vehicle: any, config: any, currency = 'AED'): Promise<any> {
    const mkt = await this.getMarketBenchmark(vehicle.make, vehicle.model, vehicle.year);
    const myPrice = Number(vehicle.price_aed);
    const currentYear = new Date().getFullYear();
    const vehicleAge = Math.max(0, currentYear - vehicle.year);

    // ── 1. Base value from live market data or suggested price ───────────────
    let baseValue = mkt?.avg_price || Number(vehicle.price_suggested_aed) || myPrice;

    // ── 2. Mileage adjustment ─────────────────────────────────────────────────
    const baselineKm = Number(config.mileage_baseline_km || 15000) * vehicleAge;
    const extraKm = Math.max(0, vehicle.mileage_km - baselineKm);
    const mileagePenalty = (extraKm / 10000) * Number(config.mileage_penalty_pct || 0.015) * baseValue;
    baseValue -= mileagePenalty;

    // ── 3. Year depreciation ──────────────────────────────────────────────────
    if      (vehicleAge === 0) { /* brand new */ }
    else if (vehicleAge === 1) baseValue *= (1 - Number(config.depreciation_year1  || 0.12));
    else if (vehicleAge === 2) baseValue *= (1 - Number(config.depreciation_year2  || 0.08));
    else if (vehicleAge === 3) baseValue *= (1 - Number(config.depreciation_year3  || 0.06));
    else                       baseValue *= Math.pow(1 - Number(config.depreciation_year4plus || 0.05), vehicleAge - 3);

    const estimatedValue = Math.round(Math.max(baseValue, myPrice * 0.45));
    const valueMin = Math.round(estimatedValue * 0.92);
    const valueMax = Math.round(estimatedValue * 1.08);

    // ── 4. Deal rating ────────────────────────────────────────────────────────
    const ratio = myPrice / estimatedValue;
    let dealRating: string, dealScore: number;
    if      (ratio <= Number(config.excellent_deal_below || 0.88)) { dealRating = 'excellent_deal'; dealScore = Math.round((1 - ratio) * 300); }
    else if (ratio <= Number(config.good_deal_below      || 0.96)) { dealRating = 'good_deal';     dealScore = Math.round((1.05 - ratio) * 200); }
    else if (ratio <= Number(config.fair_price_below     || 1.04)) { dealRating = 'fair_price';    dealScore = 50; }
    else if (ratio <= Number(config.above_market_below   || 1.12)) { dealRating = 'above_market';  dealScore = Math.round((1.15 - ratio) * 100); }
    else                                                            { dealRating = 'overpriced';    dealScore = 5; }
    dealScore = Math.max(0, Math.min(100, dealScore));

    // ── 5. Market scores ──────────────────────────────────────────────────────
    const demandMap: Record<string, number> = { very_high: 95, high: 78, medium: 55, low: 30, very_low: 12 };
    const demand = mkt?.demand || 'medium';
    const demandScore = demandMap[demand] || 55;
    const trendPct = mkt?.monthly_trend_pct || 0;
    const trendDir = trendPct > 1 ? 'rising' : trendPct < -1 ? 'falling' : 'stable';
    const avgDays = mkt?.avg_days_to_sell || 35;

    const marketScore = Math.round(
      demandScore * 0.4 +
      Math.min(100, 50 + trendPct * 5) * 0.3 +
      Math.max(0, 100 - avgDays * 1.5) * 0.3
    );

    const exportScore     = this.computeExportScore(vehicle);
    const investmentScore = this.computeInvestmentScore(vehicle, mkt, dealScore);

    // Dealer confidence from real dealer data
    const dealer = vehicle.dealer;
    let dealerConfidence = 65;
    if (dealer?.verified)              dealerConfidence += 18;
    if (Number(dealer?.rating) >= 4.5) dealerConfidence += 10;
    if (Number(dealer?.review_count) >= 50) dealerConfidence += 5;
    const dealerAge = dealer?.created_at
      ? Math.floor((Date.now() - new Date(dealer.created_at).getTime()) / (365 * 86400000)) : 0;
    if (dealerAge >= 2) dealerConfidence += 5;
    dealerConfidence = Math.min(100, dealerConfidence);

    // ── 6. AI reasoning paragraph ─────────────────────────────────────────────
    const aiStrengths: string[] = [];
    const aiRisks: string[] = [];
    if (dealRating === 'excellent_deal' || dealRating === 'good_deal')
      aiStrengths.push(`Priced ${Math.round((1 - ratio) * 100)}% below estimated market value`);
    if (demand === 'very_high')  aiStrengths.push('Very high market demand — fast sale expected');
    if (trendDir === 'rising')   aiStrengths.push(`Price trend +${trendPct.toFixed(1)}%/month — buy momentum`);
    if (exportScore >= 80)       aiStrengths.push('Top export vehicle — strong Africa/Asia demand');
    if (vehicle.mileage_km === 0) aiStrengths.push('Brand new — maximum resale value');
    if (dealRating === 'overpriced' || dealRating === 'above_market')
      aiRisks.push(`${Math.round((ratio - 1) * 100)}% above estimated market — may deter buyers`);
    if (trendDir === 'falling')  aiRisks.push(`Declining market ${Math.abs(trendPct).toFixed(1)}%/month`);
    if (vehicle.mileage_km > 150_000) aiRisks.push('High mileage reduces export eligibility');

    let aiReasoning = '';
    try {
      const prompt = `UAE automotive valuation expert. ONE paragraph, max 55 words, data-driven.
Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ' ' + vehicle.trim : ''}
Listed: AED ${myPrice.toLocaleString()} | Estimated market: AED ${estimatedValue.toLocaleString()}
Rating: ${dealRating.replace('_', ' ')} | Demand: ${demand.replace('_', ' ')} | Trend: ${trendPct > 0 ? '+' : ''}${trendPct}%/mo
Data source: ${mkt?.source || 'internal estimate'}
No fluff, specific AED numbers, direct.`;
      const r = await this.anthropic.messages.create({
        model: aiModel('sonnet'), max_tokens: 130,
        messages: [{ role: 'user', content: prompt }],
      });
      aiReasoning = r.content[0].type === 'text' ? r.content[0].text.trim() : '';
    } catch {
      aiReasoning = `${vehicle.year} ${vehicle.make} ${vehicle.model} is listed at AED ${myPrice.toLocaleString()}, ${Math.abs(Math.round((ratio - 1) * 100))}% ${ratio < 1 ? 'below' : 'above'} the estimated market value of AED ${estimatedValue.toLocaleString()}. ${mkt?.source === 'ai_web_search' ? 'Live Dubizzle/DubiCars data used.' : mkt?.source === 'platform_inventory' ? 'Compared against platform inventory.' : 'AI market data pending first refresh.'}`;
    }

    // ── 7. Confidence score based on data source ──────────────────────────────
    const confidence = mkt?.source === 'ai_web_search' ? 91
      : mkt?.source === 'platform_inventory' ? Math.min(85, 50 + (mkt.listing_count || 0) * 2)
      : 52;

    const valuation = await this.prisma.vehicleValuation.create({
      data: {
        vehicle_id: vehicle.id, make: vehicle.make, model: vehicle.model,
        year: vehicle.year, trim: vehicle.trim, mileage_km: vehicle.mileage_km,
        estimated_value_aed: estimatedValue, value_min_aed: valueMin, value_max_aed: valueMax,
        confidence_score: confidence,
        deal_rating: dealRating, deal_score: dealScore,
        market_demand: demand, demand_score: demandScore,
        avg_days_to_sell: avgDays, price_trend_pct: trendPct, price_trend_direction: trendDir,
        market_score: marketScore, investment_score: investmentScore,
        dealer_confidence: dealerConfidence, export_score: exportScore,
        comparable_count: mkt?.listing_count || 0,
        comparable_sources: mkt?.source === 'ai_web_search' ? ['dubizzle', 'dubicars']
          : mkt?.source === 'platform_inventory' ? ['platform_inventory'] : [],
        ai_reasoning: aiReasoning, ai_strengths: aiStrengths, ai_risks: aiRisks,
        expires_at: new Date(Date.now() + 24 * 3600000),
      },
    });

    return this.formatWithCurrency(valuation, currency);
  }

  async formatWithCurrency(val: any, currency: string) {
    const rates = await this.currency.getRates();
    const rate = rates[currency] || 1;
    return {
      ...val,
      currency,
      fx_rate: rate,
      estimated_value: {
        aed: Number(val.estimated_value_aed),
        converted: Math.round(Number(val.estimated_value_aed) * rate),
        currency,
      },
      value_range: {
        min_aed: Number(val.value_min_aed), max_aed: Number(val.value_max_aed),
        min_converted: Math.round(Number(val.value_min_aed) * rate),
        max_converted: Math.round(Number(val.value_max_aed) * rate),
      },
      scores: {
        deal: val.deal_score, market: val.market_score, investment: val.investment_score,
        export: val.export_score, dealer_confidence: val.dealer_confidence, confidence: val.confidence_score,
      },
    };
  }

  async getInstantValuation(params: {
    make: string; model: string; year: number; mileage_km?: number; trim?: string;
    price_aed?: number; currency?: string;
  }) {
    const config = await this.getConfig();
    const fakeVehicle = {
      id: null, make: params.make, model: params.model, year: params.year, trim: params.trim,
      mileage_km: params.mileage_km || 20000,
      price_aed: params.price_aed || 0,
      export_eligible: false, fuel_type: null, body_type: null,
      dealer: { verified: true, rating: 4.5, review_count: 50, created_at: new Date(Date.now() - 2 * 365 * 86400000) },
    };
    return this.computeValuation(fakeVehicle, config, params.currency || 'AED');
  }
}

@Controller('valuations')
export class ValuationController {
  constructor(private svc: ValuationService) {}

  @Public()
  @Get('vehicle/:id')
  getForVehicle(@Param('id') id: string, @Query('currency') currency = 'AED') {
    return this.svc.valuateVehicle(id, currency);
  }

  @Public()
  @Post('instant')
  instant(@Body() body: any) { return this.svc.getInstantValuation(body); }

  @Get('config')
  getConfig() { return this.svc.getConfig(); }

  @Roles('admin')
  @Patch('config')
  updateConfig(@Body() body: any) { return this.svc.updateConfig(body); }
}

@Module({
  imports: [MarketAnalysisModule],
  controllers: [ValuationController],
  providers: [ValuationService],
  exports: [ValuationService],
})
export class ValuationModule {}
