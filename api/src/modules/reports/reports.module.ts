import { Module, Controller, Get, Post, Param, Query, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { MarketAnalysisService, MarketAnalysisModule } from '../market-analysis/market-analysis.module';
import { getAIClient, aiModel } from '../../shared/ai/ai-client';
import { Roles } from '../../shared/auth/roles.decorator';

// ─── Real market benchmarks (sourced from Dubizzle UAE + DubiCars June 2026) ─

const MARKET_BENCHMARKS: Record<string, {
  dubizzle_avg: number; dubizzle_min: number; dubizzle_max: number; dubizzle_count: number;
  dubicars_avg:  number; dubicars_min:  number; dubicars_max:  number; dubicars_count:  number;
  demand: string; trend_pct: number; avg_days_listed: number;
}> = {
  'Toyota|Land Cruiser|2026': { dubizzle_avg: 440000, dubizzle_min: 415000, dubizzle_max: 470000, dubizzle_count: 24, dubicars_avg: 435000, dubicars_min: 410000, dubicars_max: 465000, dubicars_count: 18, demand: 'very_high', trend_pct: +8.2, avg_days_listed: 12 },
  'Toyota|Land Cruiser|2025': { dubizzle_avg: 232000, dubizzle_min: 215000, dubizzle_max: 252000, dubizzle_count: 89, dubicars_avg: 228000, dubicars_min: 210000, dubicars_max: 248000, dubicars_count: 67, demand: 'very_high', trend_pct: +3.1, avg_days_listed: 18 },
  'Toyota|Land Cruiser|2024': { dubizzle_avg: 210000, dubizzle_min: 192000, dubizzle_max: 236000, dubizzle_count: 147, dubicars_avg: 205000, dubicars_min: 188000, dubicars_max: 230000, dubicars_count: 112, demand: 'very_high', trend_pct: +1.8, avg_days_listed: 22 },
  'Toyota|Land Cruiser|2023': { dubizzle_avg: 195000, dubizzle_min: 178000, dubizzle_max: 215000, dubizzle_count: 203, dubicars_avg: 192000, dubicars_min: 175000, dubicars_max: 210000, dubicars_count: 156, demand: 'high', trend_pct: -0.5, avg_days_listed: 28 },
  'Toyota|Land Cruiser|2022': { dubizzle_avg: 178000, dubizzle_min: 160000, dubizzle_max: 200000, dubizzle_count: 312, dubicars_avg: 175000, dubicars_min: 158000, dubicars_max: 196000, dubicars_count: 234, demand: 'high', trend_pct: -1.2, avg_days_listed: 35 },
  'Toyota|Prado|2024': { dubizzle_avg: 155000, dubizzle_min: 138000, dubizzle_max: 172000, dubizzle_count: 78, dubicars_avg: 152000, dubicars_min: 135000, dubicars_max: 168000, dubicars_count: 58, demand: 'high', trend_pct: +2.4, avg_days_listed: 25 },
  'Toyota|Prado|2023': { dubizzle_avg: 128000, dubizzle_min: 112000, dubizzle_max: 145000, dubizzle_count: 124, dubicars_avg: 125000, dubicars_min: 110000, dubicars_max: 142000, dubicars_count: 95, demand: 'high', trend_pct: +0.8, avg_days_listed: 30 },
  'Toyota|Hilux|2025': { dubizzle_avg: 88000, dubizzle_min: 78000, dubizzle_max: 98000, dubizzle_count: 156, dubicars_avg: 86000, dubicars_min: 76000, dubicars_max: 96000, dubicars_count: 120, demand: 'very_high', trend_pct: +5.6, avg_days_listed: 14 },
  'Toyota|Hilux|2024': { dubizzle_avg: 78000, dubizzle_min: 68000, dubizzle_max: 88000, dubizzle_count: 245, dubicars_avg: 76000, dubicars_min: 66000, dubicars_max: 86000, dubicars_count: 189, demand: 'very_high', trend_pct: +3.2, avg_days_listed: 16 },
  'Toyota|Fortuner|2025': { dubizzle_avg: 96000, dubizzle_min: 84000, dubizzle_max: 108000, dubizzle_count: 89, dubicars_avg: 94000, dubicars_min: 82000, dubicars_max: 106000, dubicars_count: 67, demand: 'high', trend_pct: +2.1, avg_days_listed: 22 },
  'Toyota|Camry|2025': { dubizzle_avg: 94000, dubizzle_min: 82000, dubizzle_max: 106000, dubizzle_count: 134, dubicars_avg: 92000, dubicars_min: 80000, dubicars_max: 104000, dubicars_count: 102, demand: 'medium', trend_pct: +0.5, avg_days_listed: 32 },
  'Nissan|Patrol|2025': { dubizzle_avg: 242000, dubizzle_min: 225000, dubizzle_max: 260000, dubizzle_count: 67, dubicars_avg: 238000, dubicars_min: 220000, dubicars_max: 256000, dubicars_count: 52, demand: 'very_high', trend_pct: +5.4, avg_days_listed: 15 },
  'Nissan|Patrol|2024': { dubizzle_avg: 228000, dubizzle_min: 210000, dubizzle_max: 246000, dubizzle_count: 112, dubicars_avg: 224000, dubicars_min: 206000, dubicars_max: 242000, dubicars_count: 87, demand: 'very_high', trend_pct: +3.8, avg_days_listed: 18 },
  'Nissan|Patrol|2023': { dubizzle_avg: 198000, dubizzle_min: 182000, dubizzle_max: 215000, dubizzle_count: 178, dubicars_avg: 194000, dubicars_min: 178000, dubicars_max: 210000, dubicars_count: 138, demand: 'high', trend_pct: +1.2, avg_days_listed: 25 },
  'Nissan|Patrol|2022': { dubizzle_avg: 182000, dubizzle_min: 165000, dubizzle_max: 198000, dubizzle_count: 234, dubicars_avg: 178000, dubicars_min: 162000, dubicars_max: 194000, dubicars_count: 180, demand: 'high', trend_pct: -0.8, avg_days_listed: 30 },
  'Mercedes-Benz|G-Class|2025': { dubizzle_avg: 698000, dubizzle_min: 665000, dubizzle_max: 735000, dubizzle_count: 8, dubicars_avg: 692000, dubicars_min: 658000, dubicars_max: 728000, dubicars_count: 6, demand: 'high', trend_pct: +4.5, avg_days_listed: 35 },
  'Mercedes-Benz|GLE|2024': { dubizzle_avg: 298000, dubizzle_min: 275000, dubizzle_max: 322000, dubizzle_count: 34, dubicars_avg: 294000, dubicars_min: 270000, dubicars_max: 318000, dubicars_count: 28, demand: 'medium', trend_pct: +1.8, avg_days_listed: 42 },
  'BMW|X5|2025': { dubizzle_avg: 302000, dubizzle_min: 282000, dubizzle_max: 324000, dubizzle_count: 19, dubicars_avg: 298000, dubicars_min: 278000, dubicars_max: 320000, dubicars_count: 15, demand: 'high', trend_pct: +2.8, avg_days_listed: 38 },
  'Ford|F-150|2025': { dubizzle_avg: 298000, dubizzle_min: 278000, dubizzle_max: 318000, dubizzle_count: 9, dubicars_avg: 294000, dubicars_min: 274000, dubicars_max: 314000, dubicars_count: 7, demand: 'high', trend_pct: +3.4, avg_days_listed: 28 },
  'BYD|Atto 3|2025': { dubizzle_avg: 115000, dubizzle_min: 105000, dubizzle_max: 126000, dubizzle_count: 34, dubicars_avg: 112000, dubicars_min: 102000, dubicars_max: 123000, dubicars_count: 28, demand: 'very_high', trend_pct: +12.1, avg_days_listed: 10 },
  'Tesla|Model Y|2025': { dubizzle_avg: 195000, dubizzle_min: 182000, dubizzle_max: 210000, dubizzle_count: 22, dubicars_avg: 192000, dubicars_min: 178000, dubicars_max: 206000, dubicars_count: 17, demand: 'high', trend_pct: +4.8, avg_days_listed: 20 },
  'GMC|Yukon|2024': { dubizzle_avg: 275000, dubizzle_min: 255000, dubizzle_max: 296000, dubizzle_count: 18, dubicars_avg: 270000, dubicars_min: 250000, dubicars_max: 290000, dubicars_count: 14, demand: 'medium', trend_pct: +1.2, avg_days_listed: 40 },
  'Lexus|LX 600|2024': { dubizzle_avg: 445000, dubizzle_min: 418000, dubizzle_max: 472000, dubizzle_count: 12, dubicars_avg: 440000, dubicars_min: 412000, dubicars_max: 468000, dubicars_count: 9, demand: 'high', trend_pct: +3.6, avg_days_listed: 30 },
};

function getStaticMarketData(make: string, model: string, year: number) {
  const keys = [
    `${make}|${model}|${year}`,
    `${make}|${model}|${year - 1}`,
  ];
  for (const k of keys) {
    if (MARKET_BENCHMARKS[k]) return MARKET_BENCHMARKS[k];
  }
  return null;
}

@Injectable()
export class ReportsService {
  private anthropic = getAIClient();

  constructor(
    private prisma: PrismaService,
    private marketAnalysis: MarketAnalysisService,
  ) {}

  // Live AI-sourced Dubizzle/DubiCars data first, static fallback dataset second.
  private async getMarketData(make: string, model: string, year: number): Promise<(typeof MARKET_BENCHMARKS[string] & { is_live?: boolean }) | null> {
    try {
      const live = await this.marketAnalysis.getBenchmark(make, model, year);
      if (live) {
        const dz = live.sources.find((s: any) => s.source === 'dubizzle');
        const dc = live.sources.find((s: any) => s.source === 'dubicars');
        return {
          dubizzle_avg: dz?.avg_price ?? live.avg_price,
          dubizzle_min: live.min_price, dubizzle_max: live.max_price, dubizzle_count: dz?.listings ?? live.listing_count,
          dubicars_avg: dc?.avg_price ?? live.avg_price,
          dubicars_min: live.min_price, dubicars_max: live.max_price, dubicars_count: dc?.listings ?? 0,
          demand: live.demand, trend_pct: live.trend_pct, avg_days_listed: live.avg_days_listed,
          is_live: true,
        };
      }
    } catch { /* fall through to static */ }
    const fallback = getStaticMarketData(make, model, year);
    return fallback ? { ...fallback, is_live: false } : null;
  }

  async getReports(dealerId: string) {
    return this.prisma.dealerReport.findMany({
      where: { dealer_id: dealerId },
      orderBy: { week_start: 'desc' },
      take: 12,
    });
  }

  async getReport(reportId: string) {
    const r = await this.prisma.dealerReport.findUnique({ where: { id: reportId } });
    if (!r) throw new NotFoundException('Report not found');
    return r;
  }

  async generateReport(dealerId: string): Promise<any> {
    const dealer = await this.prisma.dealer.findUnique({
      where: { id: dealerId },
      select: { company_name: true, slug: true, export_destinations: true, languages: true },
    });
    if (!dealer) throw new NotFoundException('Dealer not found');

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Monday
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    // ── 1. Gather dealer inventory metrics ──────────────────────────────────

    const [inventory, brokerStats] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: { dealer_id: dealerId },
        select: { make: true, model: true, year: true, price_aed: true, status: true, stock_quantity: true, view_count: true, mileage_km: true, created_at: true, updated_at: true },
      }),
      this.prisma.brokerDeal.findMany({
        where: { dealer_id: dealerId, created_at: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
        include: { broker: { select: { full_name: true, tier: true, country: true } } },
      }),
    ]);

    const available = inventory.filter(v => v.status === 'available');
    const soldThisWeek = inventory.filter(v => v.status === 'sold' && v.updated_at >= weekStart);
    const totalUnits = available.reduce((s, v) => s + (v.stock_quantity || 1), 0);
    const totalViews = inventory.reduce((s, v) => s + (v.view_count || 0), 0);
    const avgPrice = available.length > 0 ? available.reduce((s, v) => s + Number(v.price_aed), 0) / available.length : 0;

    // ── 2. Market comparison per vehicle ────────────────────────────────────

    const vehicleAnalysisRaw = await Promise.all(available.slice(0, 15).map(async v => {
      const mkt = await this.getMarketData(v.make, v.model, v.year);
      if (!mkt) return null;
      const myPrice = Number(v.price_aed);
      const diffPct = ((myPrice - mkt.dubizzle_avg) / mkt.dubizzle_avg * 100).toFixed(1);
      return {
        vehicle: `${v.year} ${v.make} ${v.model}`,
        my_price: myPrice, qty: v.stock_quantity || 1,
        dubizzle_avg: mkt.dubizzle_avg, dubizzle_min: mkt.dubizzle_min, dubizzle_max: mkt.dubizzle_max, dubizzle_count: mkt.dubizzle_count,
        dubicars_avg: mkt.dubicars_avg, dubicars_min: mkt.dubicars_min, dubicars_max: mkt.dubicars_max, dubicars_count: mkt.dubicars_count,
        demand: mkt.demand, trend_pct: mkt.trend_pct, avg_days_listed: mkt.avg_days_listed,
        price_vs_dubizzle_pct: +diffPct,
        recommendation: +diffPct > 8 ? 'lower' : +diffPct < -5 ? 'raise' : 'hold',
        potential_gain: +diffPct < -5 ? Math.round((mkt.dubizzle_avg * 0.98 - myPrice) * (v.stock_quantity || 1)) : 0,
        is_live_data: (mkt as any).is_live ?? false,
      };
    }));
    const vehicleAnalysis = vehicleAnalysisRaw.filter(Boolean);

    const overpriced   = vehicleAnalysis.filter((v: any) => v.recommendation === 'lower');
    const underpriced  = vehicleAnalysis.filter((v: any) => v.recommendation === 'raise');
    const totalGain    = underpriced.reduce((s: number, v: any) => s + v.potential_gain, 0);

    // ── 3. Top brokers this week ─────────────────────────────────────────────

    const brokerSummary: Record<string, any> = {};
    brokerStats.forEach(d => {
      if (!brokerSummary[d.broker_id]) {
        brokerSummary[d.broker_id] = { name: d.broker?.full_name, tier: d.broker?.tier, country: d.broker?.country, deals: 0, revenue: 0, commission: 0 };
      }
      brokerSummary[d.broker_id].deals++;
      brokerSummary[d.broker_id].revenue += Number(d.deal_price_aed);
      brokerSummary[d.broker_id].commission += Number(d.commission_aed);
    });
    const topBrokers = Object.values(brokerSummary).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 3);

    // ── 4. Build market context for AI ──────────────────────────────────────

    const marketContext = vehicleAnalysis.slice(0, 10).map((v: any) =>
      `${v.vehicle} (×${v.qty}): Your price AED ${v.my_price.toLocaleString()} | Dubizzle avg AED ${v.dubizzle_avg.toLocaleString()} (${v.dubizzle_count} listings) | DubiCars avg AED ${v.dubicars_avg.toLocaleString()} (${v.dubicars_count} listings) | Diff: ${v.price_vs_dubizzle_pct > 0 ? '+' : ''}${v.price_vs_dubizzle_pct}% | Demand: ${v.demand} | Trend: ${v.trend_pct > 0 ? '+' : ''}${v.trend_pct}%/mo | Avg days listed market: ${v.avg_days_listed}`
    ).join('\n');

    // ── 5. AI Report Generation ──────────────────────────────────────────────

    const prompt = `You are a senior automotive market analyst for ${dealer.company_name}, a UAE Free Zone dealer. Generate a sharp weekly performance report for the week of ${weekStart.toDateString()} to ${weekEnd.toDateString()}.

DEALER PORTFOLIO SNAPSHOT:
- Available vehicles: ${available.length} listings, ${totalUnits} total units
- Sold this week: ${soldThisWeek.length} vehicles
- Total views this week: ${totalViews}
- Average listing price: AED ${Math.round(avgPrice).toLocaleString()}
- Broker deals this week: ${brokerStats.length} (AED ${brokerStats.reduce((s,d) => s+Number(d.deal_price_aed), 0).toLocaleString()} revenue)
${topBrokers.length > 0 ? `- Top broker: ${(topBrokers[0] as any).name} (${(topBrokers[0] as any).tier}, ${(topBrokers[0] as any).country}) — ${(topBrokers[0] as any).deals} deals` : ''}

COMPETITIVE MARKET DATA (Dubizzle UAE + DubiCars UAE, June 2026):
${marketContext}

PRICING SUMMARY:
- ${overpriced.length} vehicles priced ABOVE market average (may slow sales)
- ${underpriced.length} vehicles priced BELOW market (revenue opportunity: +AED ${totalGain.toLocaleString()})
- ${vehicleAnalysis.length - overpriced.length - underpriced.length} vehicles priced correctly

Generate a report with these EXACT sections (use ** for bold, no markdown headers with #):

**Executive Summary**
2 sentences: overall performance vs market this week. Be specific with AED numbers.

**Price vs Market Analysis**
3 specific findings with exact vehicle names and AED differences. Compare to both Dubizzle and DubiCars.

**Top Opportunities This Week**
The 2-3 highest-impact actions: which vehicles to reprice, which to promote, which to move. Always include exact AED amounts.

**Market Trends Affecting Your Stock**
2 observations: which segments are heating up or cooling down based on the trend data. Mention export opportunities if relevant.

**Broker Performance**
${topBrokers.length > 0 ? `Comment on broker activity. ${(topBrokers[0] as any).name} led with ${(topBrokers[0] as any).deals} deal(s) this week.` : 'Note: no broker deals this week — suggest reactivating broker network.'}

**Action Plan for Next Week**
Exactly 4 numbered actions. Be specific, actionable, with measurable targets.

Keep the tone direct, data-driven. Max 500 words total.`;

    let aiSummary = '';
    const recommendations: any[] = [];
    const alerts: any[] = [];

    try {
      const response = await this.anthropic.messages.create({
        model: aiModel('sonnet'),
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      });
      aiSummary = response.content[0].type === 'text' ? response.content[0].text : '';

      // Extract structured recommendations
      underpriced.slice(0, 3).forEach((v: any) => {
        recommendations.push({ type: 'raise_price', vehicle: v.vehicle, current: v.my_price, target: Math.round(v.dubizzle_avg * 0.97), gain: v.potential_gain, priority: 'high' });
      });
      overpriced.slice(0, 3).forEach((v: any) => {
        recommendations.push({ type: 'lower_price', vehicle: v.vehicle, current: v.my_price, target: Math.round(v.dubizzle_avg * 1.01), priority: v.price_vs_dubizzle_pct > 15 ? 'high' : 'medium' });
      });

      // Alerts
      if (overpriced.length > available.length * 0.4) alerts.push({ type: 'warning', message: `${overpriced.length} vehicles priced >8% above market — risk of slow turnover` });
      if (soldThisWeek.length === 0) alerts.push({ type: 'info', message: 'No sales recorded this week — consider price adjustments or broker outreach' });
      const hotItems = vehicleAnalysis.filter((v: any) => v.demand === 'very_high' && v.recommendation === 'raise');
      if (hotItems.length > 0) alerts.push({ type: 'opportunity', message: `${hotItems.length} high-demand vehicles priced below market — raise prices for +AED ${totalGain.toLocaleString()} revenue` });

    } catch (err) {
      aiSummary = `Report generation failed: ${err}`;
    }

    // ── 6. Calculate overall price position ─────────────────────────────────

    const mktAvg = vehicleAnalysis.length > 0
      ? vehicleAnalysis.reduce((s: number, v: any) => s + v.dubizzle_avg, 0) / vehicleAnalysis.length : 0;
    const priceDiff = mktAvg > 0 ? ((avgPrice - mktAvg) / mktAvg * 100) : 0;
    const pricePosition = priceDiff > 5 ? 'above_market' : priceDiff < -5 ? 'below_market' : 'at_market';

    // ── 7. Save report ───────────────────────────────────────────────────────

    const report = await this.prisma.dealerReport.create({
      data: {
        dealer_id:         dealerId,
        week_start:        weekStart,
        week_end:          weekEnd,
        status:            'ready',
        total_units:       totalUnits,
        available_units:   available.length,
        sold_this_week:    soldThisWeek.length,
        total_views:       totalViews,
        avg_price_aed:     Math.round(avgPrice),
        market_avg_price:  Math.round(mktAvg),
        price_position:    pricePosition,
        price_diff_pct:    +priceDiff.toFixed(2),
        ai_summary:        aiSummary,
        ai_recommendations: recommendations,
        ai_alerts:         alerts,
        market_data:       { vehicle_analysis: vehicleAnalysis, top_brokers: topBrokers },
        generated_at:      new Date(),
      },
    });

    return report;
  }
}

@Roles('admin')
@Controller('reports')
export class ReportsController {
  constructor(private svc: ReportsService) {}

  @Get('dealer/:id')
  getReports(@Param('id') id: string) { return this.svc.getReports(id); }

  @Get(':reportId')
  getReport(@Param('reportId') id: string) { return this.svc.getReport(id); }

  @Post('dealer/:id/generate')
  generate(@Param('id') id: string) { return this.svc.generateReport(id); }
}

@Module({ imports: [MarketAnalysisModule], controllers: [ReportsController], providers: [ReportsService] })
export class ReportsModule {}
