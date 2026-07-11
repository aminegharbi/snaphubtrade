import {
  Module, Controller, Get, Post, Put, Body, Param, Query, Injectable,
  Request, ForbiddenException, BadRequestException, OnModuleInit, OnModuleDestroy, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Roles } from '../../shared/auth/roles.decorator';
import { getAIClient, aiModel } from '../../shared/ai/ai-client';
import { MarketAnalysisService, MarketAnalysisModule } from '../market-analysis/market-analysis.module';

// ─────────────────────────────────────────────────────────────────────────────
// AUTOMOTIVE MARKET DATA LAKE + INTELLIGENCE ENGINE
//
// Extends (does not replace) the existing Market Analysis system:
//  • MarketAnalysisService keeps producing "latest benchmark" rows
//    (MarketCompetitorData) exactly as before — nothing existing breaks.
//  • This module adds the proprietary, APPEND-ONLY historical layer:
//      - MarketSnapshot     → benchmark time-series (one row per sync)
//      - MarketListing      → permanent Market Intelligence ID per vehicle
//      - MarketObservation  → every sighting of every listing, forever
//  • A DB-backed job queue (MarketSyncJob) + in-process background worker
//    runs full syncs asynchronously (no new infra dependency).
//  • An intelligence engine computes scores/forecasts FROM THE LAKE, with
//    confidence, data sources, historical trend and recommended actions.
//  • A small in-memory cache keeps reads fast; it is invalidated after
//    every sync so the platform never serves stale intelligence.
// ─────────────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

interface SampledListing {
  source: string; make: string; model: string; year: number;
  trim?: string; body_type?: string; dealer_name?: string; emirate?: string;
  price_aed: number; url?: string;
}

const norm = (s?: string | null) =>
  (s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

@Injectable()
export class MarketLakeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('MarketLake');
  private anthropic = getAIClient();
  private workerTimer: NodeJS.Timeout | null = null;
  private workerBusy = false;
  private cache = new Map<string, { at: number; data: any }>();
  private CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private marketAnalysis: MarketAnalysisService,
  ) {}

  // ── Cache helpers ───────────────────────────────────────────────────────────
  private cached<T>(key: string): T | null {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < this.CACHE_TTL_MS) return hit.data as T;
    return null;
  }
  private setCache(key: string, data: any) { this.cache.set(key, { at: Date.now(), data }); }
  private invalidateCache() { this.cache.clear(); }

  // ── Config ──────────────────────────────────────────────────────────────────
  async getConfig() {
    const existing = await this.prisma.marketLakeConfig.findUnique({ where: { id: 'global' } });
    if (existing) return existing;
    return this.prisma.marketLakeConfig.create({ data: { id: 'global' } });
  }

  async updateConfig(body: any, actor?: string) {
    const data: any = {};
    for (const k of ['providers', 'retention_days', 'delist_after_days', 'match_price_tolerance', 'sample_listings_per_model', 'auto_recalculate']) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    data.updated_by = actor || 'admin';
    const cfg = await this.prisma.marketLakeConfig.upsert({ where: { id: 'global' }, create: { id: 'global', ...data }, update: data });
    this.invalidateCache();
    return cfg;
  }

  // ── Job queue (manual Market Sync launch) ───────────────────────────────────

  async enqueueSync(triggeredBy: string, type: 'full_sync' | 'recalculate' = 'full_sync') {
    const running = await this.prisma.marketSyncJob.findFirst({ where: { status: { in: ['queued', 'running'] } } });
    if (running) throw new BadRequestException('A market sync is already queued or running. Please wait for it to finish.');
    const job = await this.prisma.marketSyncJob.create({ data: { type, triggered_by: triggeredBy, status: 'queued' } });
    // Kick the worker immediately instead of waiting for the next tick.
    setImmediate(() => this.workerTick().catch(() => {}));
    return job;
  }

  async getJobs(limit = 20) {
    return this.prisma.marketSyncJob.findMany({ orderBy: { queued_at: 'desc' }, take: Math.min(limit, 100) });
  }

  async getJob(id: string) {
    return this.prisma.marketSyncJob.findUnique({ where: { id } });
  }

  onModuleInit() {
    // In-process background worker: polls the DB queue. Deliberately uses a
    // native interval (same pattern as the AI Twin nightly job) so no external
    // queue/scheduler dependency is introduced.
    this.workerTimer = setInterval(() => this.workerTick().catch(() => {}), 30_000);
  }
  onModuleDestroy() { if (this.workerTimer) clearInterval(this.workerTimer); }

  private async workerTick() {
    if (this.workerBusy) return;
    const job = await this.prisma.marketSyncJob.findFirst({ where: { status: 'queued' }, orderBy: { queued_at: 'asc' } });
    if (!job) return;
    this.workerBusy = true;
    try { await this.runJob(job.id); }
    finally { this.workerBusy = false; }
  }

  private async setProgress(jobId: string, pct: number, note: string) {
    await this.prisma.marketSyncJob.update({ where: { id: jobId }, data: { progress_pct: pct, progress_note: note } }).catch(() => {});
  }

  private async runJob(jobId: string) {
    const job = await this.prisma.marketSyncJob.update({
      where: { id: jobId }, data: { status: 'running', started_at: new Date(), progress_pct: 1, progress_note: 'Starting…' },
    });
    try {
      let result: any = {};
      if (job.type === 'recalculate') {
        await this.setProgress(jobId, 30, 'Recalculating AI indicators…');
        this.invalidateCache();
        result = { recalculated: true };
      } else {
        result = await this.runFullSync(jobId, job.triggered_by || 'admin');
      }
      await this.prisma.marketSyncJob.update({
        where: { id: jobId },
        data: { status: result.failed > 0 && result.updated > 0 ? 'partial' : result.failed > 0 && !result.updated ? 'failed' : 'success', progress_pct: 100, progress_note: 'Done', result, completed_at: new Date() },
      });
    } catch (err: any) {
      this.logger.error(`Market sync job ${jobId} failed: ${err?.message}`);
      await this.prisma.marketSyncJob.update({
        where: { id: jobId },
        data: { status: 'failed', error_detail: err?.message || 'unknown error', completed_at: new Date() },
      }).catch(() => {});
    }
  }

  // ── Full Market Sync: benchmark refresh + lake ingestion + recalculation ───

  private async runFullSync(jobId: string, actor: string) {
    // Phase 1 — existing engine, untouched behavior: refreshes the "latest
    // benchmark" cache (MarketCompetitorData) via AI web search per tracked model.
    await this.setProgress(jobId, 5, 'Phase 1/4 — refreshing live benchmarks…');
    const refresh = await this.marketAnalysis.refreshAll(actor);

    // Phase 2 — append benchmark history snapshots (never overwrite).
    await this.setProgress(jobId, 45, 'Phase 2/4 — appending historical snapshots to the Data Lake…');
    const fresh = await this.prisma.marketCompetitorData.findMany({ where: { is_active: true } });
    let snapshots = 0;
    for (const r of fresh) {
      // Only snapshot rows updated by this refresh (fetched in the last hour).
      if (Date.now() - new Date(r.fetched_at).getTime() > 3_600_000) continue;
      await this.prisma.marketSnapshot.create({
        data: {
          run_id: String(refresh.run_id), source: r.source, make: r.make, model: r.model, year: r.year,
          avg_price_aed: r.avg_price_aed, min_price_aed: r.min_price_aed, max_price_aed: r.max_price_aed,
          listing_count: r.listing_count, avg_days_listed: r.avg_days_listed,
          demand_level: r.demand_level, trend_pct: r.trend_pct, confidence_pct: r.confidence_pct,
        },
      });
      snapshots++;
    }

    // Phase 3 — ingest representative listings into the permanent lake with
    // intelligent matching (Market Intelligence IDs, price/dealer/status history).
    await this.setProgress(jobId, 60, 'Phase 3/4 — ingesting listings into the Data Lake…');
    const cfg = await this.getConfig();
    const enabledProviders = ((cfg.providers as any[]) || []).filter(p => p.enabled).map(p => p.key);
    const listingStats = await this.ingestSampleListings(String(refresh.run_id), enabledProviders, Number(cfg.sample_listings_per_model) || 6);

    // Mark stale active listings as delisted → their lifetime becomes the
    // estimated selling time signal.
    const cutoff = new Date(Date.now() - Number(cfg.delist_after_days || 21) * DAY_MS);
    const delisted = await this.prisma.marketListing.updateMany({
      where: { status: 'active', last_seen_at: { lt: cutoff } },
      data: { status: 'delisted', delisted_at: new Date() },
    });

    // Retention: prune observations beyond the configured horizon (config-driven,
    // default 5 years — the lake stays lean without losing meaningful history).
    const retentionCutoff = new Date(Date.now() - Number(cfg.retention_days || 1825) * DAY_MS);
    const pruned = await this.prisma.marketObservation.deleteMany({ where: { observed_at: { lt: retentionCutoff } } });

    // Phase 4 — refresh all AI indicators platform-wide (cache invalidation:
    // every consumer recomputes from the newest lake data on next read).
    await this.setProgress(jobId, 90, 'Phase 4/4 — recalculating AI indicators…');
    if (cfg.auto_recalculate) this.invalidateCache();

    return {
      ...refresh,
      snapshots_appended: snapshots,
      listings_ingested: listingStats.ingested,
      listings_matched: listingStats.matched,
      new_market_ids: listingStats.created,
      price_changes_detected: listingStats.priceChanges,
      delisted: delisted.count,
      observations_pruned: pruned.count,
    };
  }

  // AI-assisted sampling of representative public listings per tracked model,
  // in line with each provider's ToS (search-visible public data only).
  private async ingestSampleListings(runId: string, providers: string[], perModel: number) {
    const config = await this.marketAnalysis.getConfig();
    const tracked = ((config.tracked_models as any[]) || []);
    const stats = { ingested: 0, matched: 0, created: 0, priceChanges: 0 };
    if (!providers.length || !tracked.length) return stats;

    const providerLabels = providers.map(p => p === 'dubizzle' ? 'Dubizzle UAE (uae.dubizzle.com)' : p === 'dubicars' ? 'DubiCars (dubicars.com)' : p).join(', ');

    for (const t of tracked) {
      const [yMin, yMax] = t.year_range || [new Date().getFullYear() - 3, new Date().getFullYear()];
      try {
        const r = await this.anthropic.messages.create({
          model: aiModel('sonnet'), max_tokens: 1800,
          tools: [{ type: 'web_search_20250305', name: 'web_search' } as any],
          messages: [{
            role: 'user',
            content: `Search ${providerLabels} for current, real, publicly listed ${t.make} ${t.model} (${yMin}-${yMax}) for sale in the UAE.
Extract up to ${perModel} REAL individual listings you can actually see in the search results (no invented data).
Respond ONLY with a JSON array, no markdown:
[{"source":"dubizzle","make":"${t.make}","model":"${t.model}","year":2023,"trim":"GXR","body_type":"SUV","dealer_name":"Al Futtaim Motors","emirate":"Dubai","price_aed":215000,"url":"https://..."}]
Include only listings where you saw an actual asking price. Empty array [] if none found.`,
          }],
        });
        const textBlock = r.content.find((b: any) => b.type === 'text') as any;
        const clean = (textBlock?.text || '[]').replace(/```json|```/g, '').trim();
        const match = clean.match(/\[[\s\S]*\]/);
        const rows: SampledListing[] = JSON.parse(match ? match[0] : '[]');
        for (const row of Array.isArray(rows) ? rows : []) {
          if (!row?.price_aed || !row.make || !row.model || !row.year) continue;
          const res = await this.upsertListing(runId, row);
          stats.ingested++;
          if (res === 'created') stats.created++;
          else { stats.matched++; if (res === 'price_changed') stats.priceChanges++; }
        }
      } catch (err: any) {
        this.logger.warn(`Listing ingestion failed for ${t.make} ${t.model}: ${err?.message}`);
      }
    }
    return stats;
  }

  // Intelligent listing matching:
  //  1. Exact fingerprint (source+make+model+year+trim+dealer) → same listing.
  //  2. Fuzzy: same source+make+model+year, no/loose trim, price within the
  //     configured tolerance and seen recently → treated as the same vehicle
  //     (price/dealer changes append to its history under the same MI ID).
  //  3. Otherwise → new permanent Market Intelligence ID.
  private async upsertListing(runId: string, row: SampledListing): Promise<'created' | 'seen' | 'price_changed'> {
    const cfg = await this.getConfig();
    const tolerance = Number(cfg.match_price_tolerance || 7) / 100;
    const fingerprint = [norm(row.make), norm(row.model), row.year, norm(row.trim), norm(row.dealer_name)].join('|');
    const price = Math.round(Number(row.price_aed));

    let listing = await this.prisma.marketListing.findUnique({
      where: { source_fingerprint: { source: row.source, fingerprint } },
    });

    if (!listing) {
      const candidates = await this.prisma.marketListing.findMany({
        where: {
          source: row.source, make: row.make, model: row.model, year: row.year,
          last_seen_at: { gt: new Date(Date.now() - 60 * DAY_MS) },
        },
        take: 20,
      });
      listing = candidates.find(c => {
        const p = Number(c.current_price_aed);
        const samePriceBand = p > 0 && Math.abs(p - price) / p <= tolerance;
        const trimCompatible = !row.trim || !c.trim || norm(c.trim) === norm(row.trim);
        const dealerCompatible = !row.dealer_name || !c.dealer_name || norm(c.dealer_name) === norm(row.dealer_name);
        return samePriceBand && trimCompatible && dealerCompatible;
      }) || null;
    }

    if (!listing) {
      const created = await this.prisma.marketListing.create({
        data: {
          source: row.source, fingerprint,
          make: row.make, model: row.model, year: row.year,
          trim: row.trim, body_type: row.body_type, dealer_name: row.dealer_name,
          emirate: row.emirate, source_url: row.url,
          first_price_aed: price, current_price_aed: price,
          lowest_price_aed: price, highest_price_aed: price,
        },
      });
      await this.prisma.marketObservation.create({
        data: { listing_id: created.id, run_id: runId, price_aed: price, source: row.source, dealer_name: row.dealer_name, status: 'active' },
      });
      return 'created';
    }

    const priceChanged = Math.round(Number(listing.current_price_aed)) !== price;
    await this.prisma.marketObservation.create({
      data: { listing_id: listing.id, run_id: runId, price_aed: price, source: row.source, dealer_name: row.dealer_name, status: 'active' },
    });
    await this.prisma.marketListing.update({
      where: { id: listing.id },
      data: {
        last_seen_at: new Date(), status: 'active', delisted_at: null,
        current_price_aed: price,
        lowest_price_aed: Math.min(Number(listing.lowest_price_aed), price),
        highest_price_aed: Math.max(Number(listing.highest_price_aed), price),
        price_changes: priceChanged ? { increment: 1 } : undefined,
        times_seen: { increment: 1 },
        dealer_name: row.dealer_name || listing.dealer_name,
        lifetime_days: Math.max(0, Math.floor((Date.now() - new Date(listing.first_seen_at).getTime()) / DAY_MS)),
      },
    });
    return priceChanged ? 'price_changed' : 'seen';
  }

  // ── Data Lake overview (admin monitoring / health) ──────────────────────────

  async getOverview() {
    const key = 'overview';
    const hit = this.cached<any>(key);
    if (hit) return hit;

    const [listings, active, delisted, observations, snapshots, priceChangesAgg, oldestSnap, latestSnap, lastJob, sources] = await Promise.all([
      this.prisma.marketListing.count(),
      this.prisma.marketListing.count({ where: { status: 'active' } }),
      this.prisma.marketListing.count({ where: { status: 'delisted' } }),
      this.prisma.marketObservation.count(),
      this.prisma.marketSnapshot.count(),
      this.prisma.marketListing.aggregate({ _sum: { price_changes: true } }),
      this.prisma.marketSnapshot.findFirst({ orderBy: { captured_at: 'asc' }, select: { captured_at: true } }),
      this.prisma.marketSnapshot.findFirst({ orderBy: { captured_at: 'desc' }, select: { captured_at: true } }),
      this.prisma.marketSyncJob.findFirst({ orderBy: { queued_at: 'desc' } }),
      this.prisma.marketListing.groupBy({ by: ['source'], _count: { _all: true } }),
    ]);

    const soldSample = await this.prisma.marketListing.aggregate({
      where: { status: 'delisted', lifetime_days: { gt: 0 } }, _avg: { lifetime_days: true }, _count: true,
    });

    const data = {
      listings_tracked: listings,
      active_listings: active,
      delisted_listings: delisted,
      total_observations: observations,
      benchmark_snapshots: snapshots,
      total_price_changes: Number(priceChangesAgg._sum.price_changes || 0),
      avg_observed_selling_days: soldSample._count ? Math.round(Number(soldSample._avg.lifetime_days || 0)) : null,
      history_from: oldestSnap?.captured_at || null,
      history_to: latestSnap?.captured_at || null,
      sources: sources.map(s => ({ source: s.source, listings: s._count._all })),
      last_job: lastJob,
      health: lastJob?.status === 'failed' ? 'degraded' : 'healthy',
    };
    this.setCache(key, data);
    return data;
  }

  // ── Intelligence engine: indicators computed FROM the lake ─────────────────

  async getModelIntelligence(make: string, model: string, year?: number) {
    const key = `intel:${norm(make)}:${norm(model)}:${year || 'all'}`;
    const hit = this.cached<any>(key);
    if (hit) return hit;

    const whereSnap: any = { make: { equals: make, mode: 'insensitive' }, model: { equals: model, mode: 'insensitive' } };
    const whereListing: any = { make: { equals: make, mode: 'insensitive' }, model: { equals: model, mode: 'insensitive' } };
    if (year) { whereSnap.year = year; whereListing.year = year; }

    const [snaps, listings, sold] = await Promise.all([
      this.prisma.marketSnapshot.findMany({ where: whereSnap, orderBy: { captured_at: 'asc' }, take: 500 }),
      this.prisma.marketListing.findMany({ where: whereListing, orderBy: { last_seen_at: 'desc' }, take: 300 }),
      this.prisma.marketListing.findMany({ where: { ...whereListing, status: 'delisted', lifetime_days: { gt: 0 } }, take: 200 }),
    ]);

    if (!snaps.length && !listings.length) {
      const empty = { available: false, make, model, year: year || null, message: 'No historical data in the Market Data Lake yet for this model. Run a Market Sync with this model tracked.' };
      this.setCache(key, empty);
      return empty;
    }

    // Historical trend series (bucketed by sync capture date, sources merged)
    const byDate = new Map<string, { sum: number; w: number; listings: number }>();
    for (const s of snaps) {
      const d = new Date(s.captured_at).toISOString().slice(0, 10);
      const e = byDate.get(d) || { sum: 0, w: 0, listings: 0 };
      const w = Math.max(1, s.listing_count);
      e.sum += Number(s.avg_price_aed) * w; e.w += w; e.listings += s.listing_count;
      byDate.set(d, e);
    }
    const series = [...byDate.entries()].map(([date, e]) => ({
      date, avg_price_aed: Math.round(e.sum / e.w), listing_count: e.listings,
    }));

    const latest = series[series.length - 1];
    const previous = series.length > 1 ? series[series.length - 2] : null;
    const first = series[0];

    const fairValue = latest?.avg_price_aed
      || Math.round(listings.reduce((s, l) => s + Number(l.current_price_aed), 0) / Math.max(1, listings.length));

    const trendPct = previous && previous.avg_price_aed > 0
      ? Math.round(((latest.avg_price_aed - previous.avg_price_aed) / previous.avg_price_aed) * 1000) / 10
      : 0;
    const longTrendPct = first && first.avg_price_aed > 0 && series.length > 2
      ? Math.round(((latest.avg_price_aed - first.avg_price_aed) / first.avg_price_aed) * 1000) / 10
      : trendPct;

    // Supply/demand/velocity from the lake
    const activeCount = listings.filter(l => l.status === 'active').length;
    const supplyEvolution = previous ? latest.listing_count - previous.listing_count : 0;
    const avgSellingDays = sold.length
      ? Math.round(sold.reduce((s, l) => s + l.lifetime_days, 0) / sold.length)
      : Math.round(snaps.reduce((s, r) => s + (r.avg_days_listed || 30), 0) / Math.max(1, snaps.length));
    const priceVolatility = listings.length
      ? Math.round((listings.reduce((s, l) => s + l.price_changes, 0) / listings.length) * 100) / 100
      : 0;

    const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
    const demandScore = clamp(60 + trendPct * 3 - (avgSellingDays - 30) * 0.8);
    const supplyScore = clamp(50 + (latest?.listing_count || activeCount) / 4 + supplyEvolution * 2);
    const liquidityScore = clamp(100 - avgSellingDays * 1.4);
    const marketHeat = clamp(demandScore * 0.6 + liquidityScore * 0.4 + trendPct * 2);
    const buyingOpportunity = clamp(50 - trendPct * 4 + (supplyScore - 50) * 0.5);
    const sellingOpportunity = clamp(50 + trendPct * 4 + (demandScore - 50) * 0.5);
    const volatilityScore = clamp(priceVolatility * 30 + Math.abs(trendPct) * 3);

    // Simple linear forecast on the series (least squares on last ≤8 points)
    const recent = series.slice(-8);
    let forecastNext = fairValue;
    if (recent.length >= 2) {
      const n = recent.length;
      const xs = recent.map((_, i) => i), ys = recent.map(p => p.avg_price_aed);
      const xm = xs.reduce((a, b) => a + b, 0) / n, ym = ys.reduce((a, b) => a + b, 0) / n;
      const slope = xs.reduce((s, x, i) => s + (x - xm) * (ys[i] - ym), 0) / Math.max(1, xs.reduce((s, x) => s + (x - xm) ** 2, 0));
      forecastNext = Math.round(ym + slope * n);
    }

    const dataPoints = snaps.length + listings.length;
    const confidence = clamp(30 + Math.min(40, series.length * 6) + Math.min(30, listings.length));

    const sources = [...new Set([...snaps.map(s => s.source), ...listings.map(l => l.source)])];

    const recommendation =
      sellingOpportunity >= 65 ? { action: 'sell', label: 'Strong selling window', detail: `Demand is ${demandScore >= 60 ? 'high' : 'building'} and prices trend ${trendPct >= 0 ? 'up' : 'down'} ${trendPct}% — favorable to list/sell now around AED ${fairValue.toLocaleString()}.` }
      : buyingOpportunity >= 65 ? { action: 'buy', label: 'Buying opportunity', detail: `Supply is elevated and prices are soft (${trendPct}%) — good window to acquire stock below fair value (AED ${fairValue.toLocaleString()}).` }
      : { action: 'hold', label: 'Balanced market', detail: `Market is stable (trend ${trendPct}%). Price competitively near fair value AED ${fairValue.toLocaleString()} and monitor.` };

    const data = {
      available: true,
      make, model, year: year || null,
      fair_market_value_aed: fairValue,
      ai_price_recommendation_aed: Math.round(fairValue * (trendPct >= 0 ? 1.01 : 0.98)),
      estimated_selling_price_aed: Math.round(fairValue * 0.97),
      price_prediction_next_period_aed: forecastNext,
      price_trend_pct: trendPct,
      long_term_trend_pct: longTrendPct,
      avg_selling_time_days: avgSellingDays,
      scores: {
        demand: demandScore, supply: supplyScore, liquidity: liquidityScore,
        market_heat: marketHeat, volatility: volatilityScore,
        buying_opportunity: buyingOpportunity, selling_opportunity: sellingOpportunity,
      },
      recommendation: { ...recommendation, confidence_pct: confidence, data_sources: sources, expected_impact: `Fair value AED ${fairValue.toLocaleString()} · avg selling time ${avgSellingDays}d` },
      confidence_pct: confidence,
      data_sources: sources,
      data_points: dataPoints,
      historical_trend: series,
      lake: {
        tracked_listings: listings.length,
        active_listings: activeCount,
        observed_sales: sold.length,
        total_price_changes: listings.reduce((s, l) => s + l.price_changes, 0),
      },
    };
    this.setCache(key, data);
    return data;
  }

  // Personalized intelligence for a dealer, computed from their real inventory
  // joined against the lake (competitiveness, per-vehicle fair value, market fit).
  async getDealerIntelligence(dealerId: string) {
    const key = `dealer:${dealerId}`;
    const hit = this.cached<any>(key);
    if (hit) return hit;

    const vehicles = await this.prisma.vehicle.findMany({
      where: { dealer_id: dealerId, status: { in: ['available', 'reserved'] } },
      select: { id: true, make: true, model: true, year: true, trim: true, price_aed: true, view_count: true, export_eligible: true, created_at: true },
      take: 200,
    });

    const perVehicle: any[] = [];
    const modelCache = new Map<string, any>();
    let competitiveSum = 0, scored = 0;

    for (const v of vehicles) {
      const mkey = `${norm(v.make)}:${norm(v.model)}:${v.year}`;
      let intel = modelCache.get(mkey);
      if (intel === undefined) {
        intel = await this.getModelIntelligence(v.make, v.model, v.year);
        modelCache.set(mkey, intel);
      }
      if (!intel?.available) continue;

      const price = Number(v.price_aed);
      const fv = intel.fair_market_value_aed;
      const deltaPct = fv > 0 ? Math.round(((price - fv) / fv) * 1000) / 10 : 0;
      // Competitiveness: 100 when at/below fair value, decays as overpricing grows
      const competitiveness = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, deltaPct) * 6 + Math.min(0, deltaPct) * 1.5)));
      competitiveSum += competitiveness; scored++;

      perVehicle.push({
        vehicle_id: v.id,
        name: `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ''}`,
        price_aed: price,
        fair_market_value_aed: fv,
        delta_vs_market_pct: deltaPct,
        market_trend_pct: intel.price_trend_pct,
        avg_selling_time_days: intel.avg_selling_time_days,
        market_heat: intel.scores.market_heat,
        competitiveness,
        suggested_action: deltaPct > 8 ? 'reduce_price' : deltaPct < -5 ? 'increase_price' : intel.scores.selling_opportunity >= 65 ? 'promote_now' : 'hold',
        confidence_pct: intel.confidence_pct,
        data_sources: intel.data_sources,
      });
    }

    perVehicle.sort((a, b) => a.competitiveness - b.competitiveness);

    const data = {
      dealer_id: dealerId,
      generated_at: new Date().toISOString(),
      coverage: { vehicles_total: vehicles.length, vehicles_with_market_data: perVehicle.length },
      dealer_competitiveness_score: scored ? Math.round(competitiveSum / scored) : null,
      vehicles: perVehicle,
      note: perVehicle.length === 0 ? 'No lake coverage for this inventory yet — track the relevant models and run a Market Sync.' : undefined,
    };
    this.setCache(key, data);
    return data;
  }

  // Trend explorer for the dashboard (brand/model level, from snapshots)
  async getTrends(q: { level?: string; limit?: number }) {
    const key = `trends:${q.level || 'model'}:${q.limit || 12}`;
    const hit = this.cached<any>(key);
    if (hit) return hit;

    const since = new Date(Date.now() - 120 * DAY_MS);
    const snaps = await this.prisma.marketSnapshot.findMany({ where: { captured_at: { gte: since } }, orderBy: { captured_at: 'asc' }, take: 2000 });

    const groupKey = (s: any) => q.level === 'brand' ? s.make : `${s.make} ${s.model}`;
    const groups = new Map<string, any[]>();
    for (const s of snaps) {
      const k = groupKey(s);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(s);
    }

    const rows = [...groups.entries()].map(([name, list]) => {
      const firstAvg = Number(list[0].avg_price_aed), lastAvg = Number(list[list.length - 1].avg_price_aed);
      const trend = firstAvg > 0 ? Math.round(((lastAvg - firstAvg) / firstAvg) * 1000) / 10 : 0;
      return {
        name,
        avg_price_aed: Math.round(lastAvg),
        trend_pct: trend,
        listing_count: list[list.length - 1].listing_count,
        snapshots: list.length,
        demand_level: list[list.length - 1].demand_level,
      };
    }).sort((a, b) => Math.abs(b.trend_pct) - Math.abs(a.trend_pct)).slice(0, Math.min(q.limit || 12, 50));

    const data = { level: q.level || 'model', window_days: 120, rows };
    this.setCache(key, data);
    return data;
  }
}

// ─── Controller ───────────────────────────────────────────────────────────────

@Roles('dealer', 'admin')
@Controller('market-lake')
export class MarketLakeController {
  constructor(private service: MarketLakeService) {}

  private assertDealer(dealerId: string, req: any) {
    if (req.user?.role === 'admin') return;
    if (req.user?.dealerId !== dealerId) throw new ForbiddenException('You can only access your own market intelligence');
  }

  // ── Intelligence reads (dealer + admin) ─────────────────────────────────
  @Get('intelligence')
  intelligence(@Query('make') make: string, @Query('model') model: string, @Query('year') year?: string) {
    if (!make || !model) throw new BadRequestException('make and model are required');
    return this.service.getModelIntelligence(make, model, year ? Number(year) : undefined);
  }

  @Get('trends')
  trends(@Query() q: any) { return this.service.getTrends({ level: q.level, limit: q.limit ? +q.limit : 12 }); }

  @Get('dealer/:dealerId')
  dealerIntel(@Param('dealerId') dealerId: string, @Request() req: any) {
    this.assertDealer(dealerId, req);
    return this.service.getDealerIntelligence(dealerId);
  }

  @Get('overview')
  overview() { return this.service.getOverview(); }

  // ── Admin: Market Sync + configuration + monitoring ─────────────────────
  @Roles('admin')
  @Post('sync')
  sync(@Request() req: any) { return this.service.enqueueSync(req.user?.email || 'admin', 'full_sync'); }

  @Roles('admin')
  @Post('recalculate')
  recalc(@Request() req: any) { return this.service.enqueueSync(req.user?.email || 'admin', 'recalculate'); }

  @Roles('admin')
  @Get('jobs')
  jobs(@Query('limit') limit?: string) { return this.service.getJobs(limit ? +limit : 20); }

  @Roles('admin')
  @Get('jobs/:id')
  job(@Param('id') id: string) { return this.service.getJob(id); }

  @Roles('admin')
  @Get('admin/config')
  getConfig() { return this.service.getConfig(); }

  @Roles('admin')
  @Put('admin/config')
  updateConfig(@Body() body: any, @Request() req: any) { return this.service.updateConfig(body, req.user?.email); }
}

// ─── Module ───────────────────────────────────────────────────────────────────

@Module({
  imports: [MarketAnalysisModule],
  controllers: [MarketLakeController],
  providers: [MarketLakeService],
  exports: [MarketLakeService],
})
export class MarketLakeModule {}
