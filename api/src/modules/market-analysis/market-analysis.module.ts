import { Module, Controller, Get, Post, Patch, Body, Param, Query, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { getAIClient, aiModel } from '../../shared/ai/ai-client';
import { Roles } from '../../shared/auth/roles.decorator';

interface TrackedModel { make: string; model: string; year_range: [number, number]; }

interface ExtractedBenchmark {
  make: string; model: string; year: number; source: 'dubizzle' | 'dubicars';
  avg_price_aed: number; min_price_aed: number; max_price_aed: number;
  listing_count: number; avg_days_listed: number;
  demand_level: 'very_high' | 'high' | 'medium' | 'low';
  trend_pct: number; confidence_pct: number; source_url?: string; notes?: string;
}

@Injectable()
export class MarketAnalysisService {
  private anthropic = getAIClient();

  constructor(private prisma: PrismaService) {}

  // ── Admin configuration ─────────────────────────────────────────────────────

  async getConfig() {
    return this.prisma.marketAnalysisConfig.upsert({
      where: { id: 'default' }, create: { id: 'default' }, update: {},
    });
  }

  async updateConfig(data: any, actor?: string) {
    const allowed: any = {};
    for (const k of ['enabled', 'sources', 'auto_refresh_enabled', 'refresh_interval_hours', 'min_confidence_pct', 'tracked_models', 'ai_model']) {
      if (data[k] !== undefined) allowed[k] = data[k];
    }
    allowed.updated_by = actor || 'admin';
    return this.prisma.marketAnalysisConfig.upsert({
      where: { id: 'default' }, create: { id: 'default', ...allowed }, update: allowed,
    });
  }

  async addTrackedModel(model: TrackedModel) {
    const config = await this.getConfig();
    const tracked = (config.tracked_models as any[]) || [];
    const exists = tracked.some(t => t.make === model.make && t.model === model.model);
    if (exists) throw new BadRequestException('This model is already tracked');
    tracked.push(model);
    return this.prisma.marketAnalysisConfig.update({ where: { id: 'default' }, data: { tracked_models: tracked } });
  }

  async removeTrackedModel(make: string, model: string) {
    const config = await this.getConfig();
    const tracked = ((config.tracked_models as any[]) || []).filter(t => !(t.make === make && t.model === model));
    return this.prisma.marketAnalysisConfig.update({ where: { id: 'default' }, data: { tracked_models: tracked } });
  }

  // ── Reading current benchmark data (used by valuation/reports/pricing) ────────
  // Lake-first: the Market Data Lake (MarketSnapshot history) is the primary
  // source for all AI calculations. The legacy MarketCompetitorData cache is
  // kept as a seamless fallback so nothing breaks before the first lake sync.

  async getBenchmark(make: string, model: string, year: number) {
    // 1) Primary: latest snapshot per source from the Market Data Lake
    const snaps = await this.prisma.marketSnapshot.findMany({
      where: { make, model, year, captured_at: { gt: new Date(Date.now() - 14 * 86400000) } },
      orderBy: { captured_at: 'desc' },
      take: 20,
    });
    if (snaps.length > 0) {
      const latestBySource = new Map<string, typeof snaps[number]>();
      for (const s of snaps) if (!latestBySource.has(s.source)) latestBySource.set(s.source, s);
      const rows = [...latestBySource.values()];
      const totalListings = rows.reduce((s, r) => s + r.listing_count, 0) || 1;
      const weightedAvg = rows.reduce((s, r) => s + Number(r.avg_price_aed) * Math.max(1, r.listing_count), 0)
        / rows.reduce((s, r) => s + Math.max(1, r.listing_count), 0);
      return {
        make, model, year,
        avg_price: Math.round(weightedAvg),
        min_price: Math.round(Math.min(...rows.map(r => Number(r.min_price_aed ?? r.avg_price_aed)))),
        max_price: Math.round(Math.max(...rows.map(r => Number(r.max_price_aed ?? r.avg_price_aed)))),
        listing_count: totalListings,
        avg_days_listed: Math.round(rows.reduce((s, r) => s + (r.avg_days_listed || 30), 0) / rows.length),
        demand: rows[0].demand_level || 'medium',
        trend_pct: Number((rows.reduce((s, r) => s + Number(r.trend_pct || 0), 0) / rows.length).toFixed(1)),
        confidence_pct: Math.round(rows.reduce((s, r) => s + r.confidence_pct, 0) / rows.length),
        sources: rows.map(r => ({ source: r.source, avg_price: Number(r.avg_price_aed), listings: r.listing_count, fetched_at: r.captured_at })),
        is_live_data: true,
        from_data_lake: true,
      };
    }

    // 2) Fallback: legacy latest-benchmark cache (pre-lake behavior, unchanged)
    const rows = await this.prisma.marketCompetitorData.findMany({
      where: { make, model, year, is_active: true, expires_at: { gt: new Date() } },
    });
    if (rows.length === 0) return null;

    // Merge sources into a single composite benchmark
    const totalListings = rows.reduce((s, r) => s + r.listing_count, 0) || 1;
    const weightedAvg = rows.reduce((s, r) => s + Number(r.avg_price_aed) * r.listing_count, 0) / totalListings;
    return {
      make, model, year,
      avg_price: Math.round(weightedAvg),
      min_price: Math.round(Math.min(...rows.map(r => Number(r.min_price_aed ?? r.avg_price_aed)))),
      max_price: Math.round(Math.max(...rows.map(r => Number(r.max_price_aed ?? r.avg_price_aed)))),
      listing_count: totalListings,
      avg_days_listed: Math.round(rows.reduce((s, r) => s + (r.avg_days_listed || 30), 0) / rows.length),
      demand: rows[0].demand_level || 'medium',
      trend_pct: Number((rows.reduce((s, r) => s + Number(r.trend_pct || 0), 0) / rows.length).toFixed(1)),
      confidence_pct: Math.round(rows.reduce((s, r) => s + r.confidence_pct, 0) / rows.length),
      sources: rows.map(r => ({ source: r.source, avg_price: Number(r.avg_price_aed), listings: r.listing_count, fetched_at: r.fetched_at })),
      is_live_data: true,
    };
  }

  async listAllBenchmarks(q: any) {
    const { make, stale_only } = q;
    const where: any = { is_active: true };
    if (make) where.make = make;
    if (stale_only === 'true') where.expires_at = { lt: new Date() };
    return this.prisma.marketCompetitorData.findMany({ where, orderBy: [{ make: 'asc' }, { model: 'asc' }, { year: 'desc' }] });
  }

  // ── AI refresh — the core engine ────────────────────────────────────────────

  async refreshAll(actor = 'admin') {
    const config = await this.getConfig();
    if (!config.enabled) throw new BadRequestException('Market analysis is disabled in admin settings');

    const tracked = (config.tracked_models as unknown as TrackedModel[]) || [];
    if (tracked.length === 0) throw new BadRequestException('No tracked models configured. Add models in admin settings first.');

    const run = await this.prisma.marketAnalysisRun.create({
      data: { triggered_by: actor, status: 'running', models_requested: tracked.length, sources_used: config.sources as any },
    });

    let updated = 0, failed = 0;
    const summaryLines: string[] = [];

    for (const t of tracked) {
      const [yMin, yMax] = t.year_range;
      const years = Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i);
      for (const year of years) {
        try {
          const results = await this.fetchLiveBenchmark(t.make, t.model, year, config.sources as unknown as string[]);
          for (const r of results) {
            if (r.confidence_pct < config.min_confidence_pct) { continue; }
            await this.prisma.marketCompetitorData.upsert({
              where: { make_model_year_source: { make: r.make, model: r.model, year: r.year, source: r.source } },
              create: {
                make: r.make, model: r.model, year: r.year, source: r.source,
                avg_price_aed: r.avg_price_aed, min_price_aed: r.min_price_aed, max_price_aed: r.max_price_aed,
                listing_count: r.listing_count, avg_days_listed: r.avg_days_listed, demand_level: r.demand_level,
                trend_pct: r.trend_pct, confidence_pct: r.confidence_pct, source_url: r.source_url, raw_ai_notes: r.notes,
                expires_at: new Date(Date.now() + config.refresh_interval_hours * 3600 * 1000 * 7),
              },
              update: {
                avg_price_aed: r.avg_price_aed, min_price_aed: r.min_price_aed, max_price_aed: r.max_price_aed,
                listing_count: r.listing_count, avg_days_listed: r.avg_days_listed, demand_level: r.demand_level,
                trend_pct: r.trend_pct, confidence_pct: r.confidence_pct, source_url: r.source_url, raw_ai_notes: r.notes,
                fetched_at: new Date(), expires_at: new Date(Date.now() + config.refresh_interval_hours * 3600 * 1000 * 7),
              },
            });
            updated++;
          }
          summaryLines.push(`✓ ${year} ${t.make} ${t.model}: ${results.length} source(s) updated`);
        } catch (err: any) {
          failed++;
          summaryLines.push(`✗ ${year} ${t.make} ${t.model}: ${err.message || 'fetch failed'}`);
        }
      }
    }

    const status = failed === 0 ? 'success' : updated > 0 ? 'partial' : 'failed';
    await this.prisma.marketAnalysisRun.update({
      where: { id: run.id },
      data: { status, models_updated: updated, models_failed: failed, summary: summaryLines.join('\n'), completed_at: new Date() },
    });
    await this.prisma.marketAnalysisConfig.update({
      where: { id: 'default' },
      data: { last_refreshed_at: new Date(), last_refresh_status: status, last_refresh_summary: `${updated} updated, ${failed} failed` },
    });

    return { run_id: run.id, status, updated, failed, summary: summaryLines };
  }

  async refreshOne(make: string, model: string, year: number, actor = 'admin') {
    const config = await this.getConfig();
    const run = await this.prisma.marketAnalysisRun.create({
      data: { triggered_by: actor, status: 'running', models_requested: 1, sources_used: config.sources as any },
    });
    try {
      const results = await this.fetchLiveBenchmark(make, model, year, config.sources as unknown as string[]);
      for (const r of results) {
        const existing = await this.prisma.marketCompetitorData.findFirst({ where: { make: r.make, model: r.model, year: r.year, source: r.source } });
        const payload = {
          avg_price_aed: r.avg_price_aed, min_price_aed: r.min_price_aed, max_price_aed: r.max_price_aed,
          listing_count: r.listing_count, avg_days_listed: r.avg_days_listed, demand_level: r.demand_level,
          trend_pct: r.trend_pct, confidence_pct: r.confidence_pct, source_url: r.source_url, raw_ai_notes: r.notes,
          fetched_at: new Date(), expires_at: new Date(Date.now() + config.refresh_interval_hours * 3600 * 1000 * 7),
        };
        if (existing) await this.prisma.marketCompetitorData.update({ where: { id: existing.id }, data: payload });
        else await this.prisma.marketCompetitorData.create({ data: { make: r.make, model: r.model, year: r.year, source: r.source, ...payload } });
      }
      await this.prisma.marketAnalysisRun.update({ where: { id: run.id }, data: { status: 'success', models_updated: results.length, completed_at: new Date(), summary: `${results.length} source(s) updated for ${year} ${make} ${model}` } });
      return { status: 'success', results };
    } catch (err: any) {
      await this.prisma.marketAnalysisRun.update({ where: { id: run.id }, data: { status: 'failed', models_failed: 1, error_detail: err.message, completed_at: new Date() } });
      throw err;
    }
  }

  // ── Core: AI web search + structured extraction ────────────────────────────

  private async fetchLiveBenchmark(make: string, model: string, year: number, sources: string[]): Promise<ExtractedBenchmark[]> {
    const sourceLabels = sources.map(s => s === 'dubizzle' ? 'Dubizzle UAE (uae.dubizzle.com)' : s === 'dubicars' ? 'DubiCars UAE (dubicars.com)' : s).join(' and ');

    const prompt = `Search the web for current ${year} ${make} ${model} prices for sale in the UAE, specifically on ${sourceLabels}.

Find real, current listings and extract pricing data. I need accurate market intelligence, not estimates.

For EACH source separately, determine:
- Average asking price in AED across listings found
- Minimum and maximum price observed
- Approximate number of active listings (your best estimate from search results)
- Estimated average days a listing stays active before selling (infer from market knowledge if not directly stated)
- Demand level: very_high, high, medium, or low (based on listing volume and price trend)
- Monthly price trend percentage (positive = rising, negative = falling) — estimate based on recent vs older listings if visible
- Your confidence in this data as a percentage (0-100), considering how many actual listings you found and how recent they are

Respond ONLY with a JSON array (no markdown, no prose) in this exact format:
[
  {
    "source": "dubizzle",
    "avg_price_aed": 228000,
    "min_price_aed": 210000,
    "max_price_aed": 250000,
    "listing_count": 89,
    "avg_days_listed": 18,
    "demand_level": "very_high",
    "trend_pct": 3.1,
    "confidence_pct": 85,
    "source_url": "https://uae.dubizzle.com/...",
    "notes": "brief note on data quality or market observation"
  }
]

If you cannot find reliable data for a source, omit it from the array rather than guessing. If you find zero reliable data for any source, return an empty array [].`;

    const response = await this.anthropic.messages.create({
      model: aiModel('sonnet'),
      max_tokens: 1500,
      tools: [{ type: 'web_search_20250305', name: 'web_search' } as any],
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((b: any) => b.type === 'text') as any;
    const raw = textBlock?.text || '[]';
    const clean = raw.replace(/```json|```/g, '').trim();

    let parsed: any[];
    try {
      const jsonMatch = clean.match(/\[[\s\S]*\]/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : clean);
    } catch {
      throw new Error('AI response could not be parsed as valid JSON');
    }

    if (!Array.isArray(parsed)) throw new Error('AI response was not a JSON array');

    return parsed
      .filter(r => r.source && r.avg_price_aed > 0)
      .map(r => ({
        make, model, year,
        source: r.source as 'dubizzle' | 'dubicars',
        avg_price_aed: Number(r.avg_price_aed),
        min_price_aed: Number(r.min_price_aed || r.avg_price_aed * 0.92),
        max_price_aed: Number(r.max_price_aed || r.avg_price_aed * 1.08),
        listing_count: Number(r.listing_count || 0),
        avg_days_listed: Number(r.avg_days_listed || 30),
        demand_level: r.demand_level || 'medium',
        trend_pct: Number(r.trend_pct || 0),
        confidence_pct: Math.min(100, Math.max(0, Number(r.confidence_pct || 50))),
        source_url: r.source_url,
        notes: r.notes,
      }));
  }

  // ── Run history (admin audit trail) ─────────────────────────────────────────

  async getRuns(limit = 20) {
    return this.prisma.marketAnalysisRun.findMany({ orderBy: { started_at: 'desc' }, take: Number(limit) });
  }

  async getStats() {
    const [totalBenchmarks, staleBenchmarks, lastRun, config] = await Promise.all([
      this.prisma.marketCompetitorData.count({ where: { is_active: true } }),
      this.prisma.marketCompetitorData.count({ where: { is_active: true, expires_at: { lt: new Date() } } }),
      this.prisma.marketAnalysisRun.findFirst({ orderBy: { started_at: 'desc' } }),
      this.getConfig(),
    ]);
    const avgConfidence = await this.prisma.marketCompetitorData.aggregate({ where: { is_active: true }, _avg: { confidence_pct: true } });
    return {
      total_benchmarks: totalBenchmarks,
      stale_benchmarks: staleBenchmarks,
      fresh_benchmarks: totalBenchmarks - staleBenchmarks,
      avg_confidence_pct: Math.round(Number(avgConfidence._avg.confidence_pct || 0)),
      tracked_model_count: ((config.tracked_models as any[]) || []).length,
      last_run: lastRun,
      config_enabled: config.enabled,
    };
  }
}

@Roles('admin')
@Controller('market-analysis')
export class MarketAnalysisController {
  constructor(private svc: MarketAnalysisService) {}

  // Admin config
  @Get('config')             getConfig() { return this.svc.getConfig(); }
  @Patch('config')           updateConfig(@Body() b: any) { return this.svc.updateConfig(b, b.actor); }
  @Post('config/models')     addModel(@Body() b: any) { return this.svc.addTrackedModel(b); }
  @Post('config/models/remove') removeModel(@Body() b: { make: string; model: string }) { return this.svc.removeTrackedModel(b.make, b.model); }

  // Reading benchmarks
  @Get('benchmark')          benchmark(@Query('make') make: string, @Query('model') model: string, @Query('year') year: string) {
    return this.svc.getBenchmark(make, model, Number(year));
  }
  @Get('benchmarks')         list(@Query() q: any) { return this.svc.listAllBenchmarks(q); }

  // AI refresh actions
  @Post('refresh')           refreshAll(@Body() b: any) { return this.svc.refreshAll(b?.actor); }
  @Post('refresh/one')       refreshOne(@Body() b: any) { return this.svc.refreshOne(b.make, b.model, Number(b.year), b.actor); }

  // Audit
  @Get('runs')                runs(@Query('limit') l: string) { return this.svc.getRuns(Number(l) || 20); }
  @Get('stats')                stats() { return this.svc.getStats(); }
}

@Module({ controllers: [MarketAnalysisController], providers: [MarketAnalysisService], exports: [MarketAnalysisService] })
export class MarketAnalysisModule {}
