import {
  Module, Controller, Get, Post, Put, Body, Param, Query, Injectable,
  Request, ForbiddenException, OnModuleInit, OnModuleDestroy, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Roles } from '../../shared/auth/roles.decorator';
import { getAIClient, aiModel } from '../../shared/ai/ai-client';

// ─────────────────────────────────────────────────────────────────────────────
// AI TWIN DEALER — virtual Sales Director / Business Consultant / Growth Advisor
//
// • Nightly (or lazily on first request of the day) analyses the dealer's real
//   data — inventory, pricing, leads, buyer activity, sales, revenue — and
//   produces a structured Daily Brief + Command Center insights.
// • Deterministic analytics first (always available, never hallucinated numbers);
//   Claude is used to write the narrative brief, the copilot chat and marketing
//   content on top of those real numbers. If the AI call fails, a deterministic
//   fallback brief is stored so the dashboard never breaks.
// ─────────────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
const todayKey = () => new Date().toISOString().slice(0, 10);
const daysSince = (d: Date | string) => Math.floor((Date.now() - new Date(d).getTime()) / DAY_MS);

import { GlobalTradeService, GlobalTradeModule } from '../global-trade/global-trade.module';

interface TwinContext {
  dealer: { id: string; name: string };
  stats: any;
  pricing: { overpriced: any[]; underpriced: any[]; optimal: number; potential_gain_aed: number };
  slowMovers: any[];
  hotVehicles: any[];
  exportCandidates: any[];
  newArrivals: any[];
  drafts: number;
  leads: { total: number; new_7d: number; hot: any[]; inactive: any[]; recent: any[] };
  demandByMake: { make: string; views: number; count: number }[];
  revenue: { collected_30d: number; collected_prev_30d: number; forecast_month: number; mom_pct: number | null };
  promotionsActive: number;
  marketLake: { available: boolean; observations?: number; top_market_trends?: any[] };
  globalTrade: { available: boolean; opportunities?: any[] };
}

@Injectable()
export class AiTwinService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('AiTwin');
  private anthropic = getAIClient();
  private nightlyTimer: NodeJS.Timeout | null = null;
  private lastNightlyRun: string | null = null;

  constructor(private prisma: PrismaService, private globalTrade: GlobalTradeService) {}

  // ── Config ──────────────────────────────────────────────────────────────────

  async getConfig() {
    const existing = await this.prisma.aiTwinConfig.findUnique({ where: { id: 'global' } });
    if (existing) return existing;
    return this.prisma.aiTwinConfig.create({ data: { id: 'global' } });
  }

  async updateConfig(body: any, actor?: string) {
    const data: any = {};
    for (const k of ['enabled', 'model_alias', 'brief_template', 'chat_template', 'rules', 'nightly_hour_utc']) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    data.updated_by = actor || 'admin';
    const cfg = await this.prisma.aiTwinConfig.upsert({
      where: { id: 'global' }, create: { id: 'global', ...data }, update: data,
    });
    await this.log(null, 'config_updated', { changed: Object.keys(data), actor });
    return cfg;
  }

  private async log(dealerId: string | null, action: string, meta: any = {}) {
    try { await this.prisma.aiTwinLog.create({ data: { dealer_id: dealerId, action, meta } }); } catch { /* non-blocking */ }
  }

  async getLogs(q: { dealer_id?: string; limit?: number }) {
    return this.prisma.aiTwinLog.findMany({
      where: q.dealer_id ? { dealer_id: q.dealer_id } : {},
      orderBy: { created_at: 'desc' },
      take: Math.min(q.limit || 100, 500),
    });
  }

  // ── Context collection (real data only) ────────────────────────────────────

  async collectContext(dealerId: string): Promise<TwinContext> {
    const rules = ((await this.getConfig()).rules || {}) as any;
    const overpricedPct = Number(rules.overpriced_pct ?? 8);
    const underpricedPct = Number(rules.underpriced_pct ?? 5);
    const slowDays = Number(rules.slow_days ?? 45);

    const since30 = new Date(Date.now() - 30 * DAY_MS);
    const prev30 = new Date(Date.now() - 60 * DAY_MS);
    const since7 = new Date(Date.now() - 7 * DAY_MS);

    const [dealer, active, drafts, leadsTotal, leadsNew7, recentLeads, invPaid30, invPaidPrev30, promoCount] = await Promise.all([
      this.prisma.dealer.findUnique({ where: { id: dealerId }, select: { id: true, company_name: true } }),
      this.prisma.vehicle.findMany({
        where: { dealer_id: dealerId, status: { in: ['available', 'reserved'] } },
        select: {
          id: true, make: true, model: true, year: true, trim: true, body_type: true,
          price_aed: true, price_suggested_aed: true, view_count: true, favorite_count: true,
          export_eligible: true, created_at: true, status: true, stock_quantity: true,
        },
      }),
      this.prisma.vehicle.count({ where: { dealer_id: dealerId, status: 'draft' } }),
      this.prisma.lead.count({ where: { dealer_id: dealerId } }),
      this.prisma.lead.count({ where: { dealer_id: dealerId, created_at: { gte: since7 } } }),
      this.prisma.lead.findMany({
        where: { dealer_id: dealerId },
        orderBy: { updated_at: 'desc' }, take: 40,
        include: { vehicle: { select: { id: true, make: true, model: true, year: true, price_aed: true } } },
      }),
      this.prisma.invoice.aggregate({ where: { dealer_id: dealerId, status: 'paid', paid_at: { gte: since30 } }, _sum: { total_aed: true } }),
      this.prisma.invoice.aggregate({ where: { dealer_id: dealerId, status: 'paid', paid_at: { gte: prev30, lt: since30 } }, _sum: { total_aed: true } }),
      this.prisma.promotion.count({ where: { vehicle: { dealer_id: dealerId }, active: true } }),
    ]);

    // Pricing analysis (deterministic — same logic as dealer-dashboard pricing intelligence)
    const priced = active.map(v => {
      const current = Number(v.price_aed);
      const suggested = Number(v.price_suggested_aed) || current;
      const delta = suggested > 0 ? ((current - suggested) / suggested) * 100 : 0;
      return {
        id: v.id,
        name: `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ''}`,
        price_aed: current, suggested_aed: suggested,
        delta_pct: Math.round(delta * 10) / 10,
        days_listed: daysSince(v.created_at),
        views: v.view_count, favorites: v.favorite_count,
        export_eligible: v.export_eligible, body_type: v.body_type, make: v.make,
      };
    });

    const overpriced = priced.filter(p => p.delta_pct > overpricedPct)
      .sort((a, b) => b.delta_pct - a.delta_pct).slice(0, 10);
    const underpriced = priced.filter(p => p.delta_pct < -underpricedPct)
      .sort((a, b) => a.delta_pct - b.delta_pct).slice(0, 10);
    const slowMovers = priced.filter(p => p.days_listed > slowDays)
      .sort((a, b) => b.days_listed - a.days_listed).slice(0, 10);
    const hotVehicles = [...priced].sort((a, b) => (b.views + b.favorites * 5) - (a.views + a.favorites * 5)).slice(0, 6);
    const exportCandidates = priced.filter(p => p.export_eligible).slice(0, 8);
    const newArrivals = priced.filter(p => p.days_listed <= 3).slice(0, 8);

    // Demand by make (views on this dealer's stock as a proxy for buyer interest)
    const demandMap = new Map<string, { views: number; count: number }>();
    for (const v of active) {
      const e = demandMap.get(v.make) || { views: 0, count: 0 };
      e.views += v.view_count; e.count += 1;
      demandMap.set(v.make, e);
    }
    const demandByMake = [...demandMap.entries()]
      .map(([make, e]) => ({ make, ...e }))
      .sort((a, b) => b.views - a.views).slice(0, 8);

    // Leads: hot = updated in last 7 days with an engaged stage; inactive = stale > 14 days, not closed
    const engaged = new Set(['contacted', 'negotiating', 'qualified', 'test_drive', 'offer']);
    const closed = new Set(['won', 'lost', 'closed']);
    const hotLeads = recentLeads
      .filter(l => daysSince(l.updated_at) <= 7 && (engaged.has(l.stage) || (l.stage === 'new' && daysSince(l.created_at) <= 3)))
      .slice(0, 8)
      .map(l => ({
        id: l.id, buyer: l.buyer_name || 'Anonymous buyer', stage: l.stage, channel: l.channel,
        vehicle: l.vehicle ? `${l.vehicle.year} ${l.vehicle.make} ${l.vehicle.model}` : null,
        vehicle_id: l.vehicle?.id || null,
        offer_aed: l.offer_price ? Number(l.offer_price) : null,
        days_since_activity: daysSince(l.updated_at),
      }));
    const inactiveLeads = recentLeads
      .filter(l => !closed.has(l.stage) && daysSince(l.updated_at) > 14)
      .slice(0, 8)
      .map(l => ({
        id: l.id, buyer: l.buyer_name || 'Anonymous buyer', stage: l.stage,
        vehicle: l.vehicle ? `${l.vehicle.year} ${l.vehicle.make} ${l.vehicle.model}` : null,
        days_since_activity: daysSince(l.updated_at),
      }));

    const collected30 = Number(invPaid30._sum.total_aed || 0);
    const collectedPrev30 = Number(invPaidPrev30._sum.total_aed || 0);
    const momPct = collectedPrev30 > 0 ? Math.round(((collected30 - collectedPrev30) / collectedPrev30) * 1000) / 10 : null;
    // Simple linear forecast: recent 30-day run-rate, damped by month-over-month trend
    const trendFactor = momPct !== null ? Math.max(0.6, Math.min(1.4, 1 + momPct / 200)) : 1;
    const forecastMonth = Math.round(collected30 * trendFactor);

    const totalUnits = active.reduce((s, v) => s + Math.max(1, Number(v.stock_quantity) || 1), 0);
    const stockValue = active.reduce((s, v) => s + Number(v.price_aed) * Math.max(1, Number(v.stock_quantity) || 1), 0);

    return {
      dealer: { id: dealerId, name: dealer?.company_name || 'Dealer' },
      stats: {
        vehicles_in_stock: totalUnits,
        listings_active: active.length,
        stock_value_aed: Math.round(stockValue),
        drafts,
      },
      pricing: {
        overpriced, underpriced,
        optimal: priced.length - overpriced.length - underpriced.length,
        potential_gain_aed: Math.round(underpriced.reduce((s, p) => s + (p.suggested_aed - p.price_aed), 0)),
      },
      slowMovers, hotVehicles, exportCandidates, newArrivals, drafts,
      leads: { total: leadsTotal, new_7d: leadsNew7, hot: hotLeads, inactive: inactiveLeads, recent: [] },
      demandByMake,
      revenue: { collected_30d: collected30, collected_prev_30d: collectedPrev30, forecast_month: forecastMonth, mom_pct: momPct },
      promotionsActive: promoCount,
      marketLake: await this.getLakeContext(active.map(v => ({ make: v.make, model: v.model, year: v.year }))),
      globalTrade: await this.getGlobalTradeContext(dealerId, [...new Set(active.map(v => v.make))]),
    };
  }

  // Market Data Lake context: recent snapshot-derived trends for the makes/models
  // this dealer actually stocks — the lake is the primary market source for all
  // AI features. Fails soft (available:false) so briefs/chat still work pre-sync.
  // Global Trade Intelligence feed — only pulled for dealers the admin has
  // actually enabled for the premium feature (same gate as the dashboard
  // tab), and filtered to opportunities matching makes the dealer actually
  // stocks so it stays relevant instead of generic.
  private async getGlobalTradeContext(dealerId: string, makes: string[]) {
    try {
      const access = await this.prisma.dealerGtiAccess.findUnique({ where: { dealer_id: dealerId } });
      if (!access?.enabled) return { available: false };
      const all = await this.globalTrade.topOpportunitiesFeed(30);
      const relevant = makes.length ? all.filter(o => !o.make || makes.includes(o.make)) : all;
      const top = (relevant.length ? relevant : all).slice(0, 3);
      if (!top.length) return { available: false };
      return { available: true, opportunities: top };
    } catch {
      return { available: false };
    }
  }

  private async getLakeContext(inventory: { make: string; model: string; year: number }[]) {
    try {
      const since = new Date(Date.now() - 90 * DAY_MS);
      const makes = [...new Set(inventory.map(v => v.make))].slice(0, 8);
      if (!makes.length) return { available: false };
      const [snaps, observations] = await Promise.all([
        this.prisma.marketSnapshot.findMany({
          where: { make: { in: makes }, captured_at: { gte: since } },
          orderBy: { captured_at: 'asc' }, take: 600,
        }),
        this.prisma.marketObservation.count(),
      ]);
      if (!snaps.length) return { available: false, observations };

      const groups = new Map<string, any[]>();
      for (const s of snaps) {
        const k = `${s.make} ${s.model}`;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(s);
      }
      const trends = [...groups.entries()].map(([name, list]) => {
        const firstAvg = Number(list[0].avg_price_aed), lastAvg = Number(list[list.length - 1].avg_price_aed);
        return {
          model: name,
          avg_price_aed: Math.round(lastAvg),
          trend_pct: firstAvg > 0 ? Math.round(((lastAvg - firstAvg) / firstAvg) * 1000) / 10 : 0,
          listing_count: list[list.length - 1].listing_count,
          demand_level: list[list.length - 1].demand_level,
        };
      }).sort((a, b) => Math.abs(b.trend_pct) - Math.abs(a.trend_pct)).slice(0, 6);

      return { available: true, observations, top_market_trends: trends };
    } catch { return { available: false }; }
  }

  // ── Scores (deterministic) ──────────────────────────────────────────────────

  computeScores(ctx: TwinContext) {
    const n = Math.max(1, ctx.stats.listings_active);
    // Inventory health: penalize overpriced + slow movers + drafts
    const inventory = Math.max(0, Math.min(100, Math.round(
      100 - (ctx.pricing.overpriced.length / n) * 120 - (ctx.slowMovers.length / n) * 100 - Math.min(10, ctx.drafts * 2),
    )));
    // Sales performance: lead flow + revenue trend
    let sales = 50;
    sales += Math.min(25, ctx.leads.new_7d * 4);
    sales += Math.min(15, ctx.leads.hot.length * 3);
    if (ctx.revenue.mom_pct !== null) sales += Math.max(-20, Math.min(15, ctx.revenue.mom_pct / 2));
    sales -= Math.min(20, ctx.leads.inactive.length * 2);
    sales = Math.max(0, Math.min(100, Math.round(sales)));
    const business = Math.round(inventory * 0.45 + sales * 0.55);
    return { business_health: business, inventory_health: inventory, sales_performance: sales };
  }

  // ── Recommendation engine (proactive, deterministic, actionable) ───────────

  buildRecommendations(ctx: TwinContext) {
    const recs: any[] = [];
    const add = (r: any) => recs.push(r);

    for (const v of ctx.pricing.overpriced.slice(0, 3)) {
      add({
        type: 'reduce_price', priority: v.days_listed > 45 ? 'high' : 'medium',
        title: `Reduce price on ${v.name}`,
        reason: `${v.delta_pct}% above suggested market price, listed ${v.days_listed} days with ${v.views} views.`,
        impact: `Faster sale — market-aligned price is AED ${v.suggested_aed.toLocaleString()}.`,
        action: { kind: 'apply_price', vehicle_id: v.id, price_aed: v.suggested_aed },
      });
    }
    for (const v of ctx.pricing.underpriced.slice(0, 2)) {
      add({
        type: 'increase_price', priority: 'medium',
        title: `Increase price on ${v.name}`,
        reason: `${Math.abs(v.delta_pct)}% below market value.`,
        impact: `+AED ${(v.suggested_aed - v.price_aed).toLocaleString()} potential on this unit.`,
        action: { kind: 'apply_price', vehicle_id: v.id, price_aed: v.suggested_aed },
      });
    }
    for (const l of ctx.leads.hot.slice(0, 3)) {
      add({
        type: 'contact_buyer', priority: 'high',
        title: `Contact ${l.buyer}${l.vehicle ? ` about the ${l.vehicle}` : ''}`,
        reason: `Active lead (stage: ${l.stage}) with recent activity${l.offer_aed ? `, offer on the table: AED ${l.offer_aed.toLocaleString()}` : ''}.`,
        impact: 'High-intent buyer — direct revenue opportunity today.',
        action: { kind: 'open_lead', lead_id: l.id },
      });
    }
    for (const l of ctx.leads.inactive.slice(0, 2)) {
      add({
        type: 're_engage_lead', priority: 'medium',
        title: `Re-engage ${l.buyer}`,
        reason: `No activity for ${l.days_since_activity} days (stage: ${l.stage}).`,
        impact: 'Recovering dormant leads is cheaper than acquiring new ones.',
        action: { kind: 'open_lead', lead_id: l.id },
      });
    }
    for (const v of ctx.exportCandidates.slice(0, 2)) {
      add({
        type: 'export_vehicle', priority: 'medium',
        title: `Push ${v.name} to export channels`,
        reason: 'Export-eligible with GCC demand for this segment.',
        impact: 'Access international buyers and shorten days-on-lot.',
        action: { kind: 'open_vehicle', vehicle_id: v.id },
      });
    }
    if (ctx.globalTrade?.available) {
      for (const o of (ctx.globalTrade.opportunities || []).slice(0, 2)) {
        add({
          type: 'global_trade_opportunity', priority: o.profitability_score >= 80 ? 'high' : 'medium',
          title: o.headline,
          reason: o.rationale || `Profitability ${o.profitability_score}/100 on this corridor.`,
          impact: o.est_margin_pct != null ? `~${o.est_margin_pct}% estimated net margin after freight, duty and fees.` : 'Strong export corridor for your stock.',
          action: { kind: 'open_global_trade', country: o.dest_country },
        });
      }
    }
    for (const v of ctx.slowMovers.slice(0, 2)) {
      if (recs.some(r => r.action?.vehicle_id === v.id)) continue;
      add({
        type: 'launch_promotion', priority: v.days_listed > 90 ? 'high' : 'medium',
        title: `Launch a promotion on ${v.name}`,
        reason: `Listed ${v.days_listed} days — aging stock ties up capital.`,
        impact: 'A visible promo badge typically lifts views and lead conversion.',
        action: { kind: 'open_vehicle', vehicle_id: v.id },
      });
    }
    if (ctx.drafts > 0) {
      add({
        type: 'publish_drafts', priority: ctx.drafts >= 3 ? 'high' : 'low',
        title: `Publish ${ctx.drafts} draft vehicle${ctx.drafts > 1 ? 's' : ''}`,
        reason: 'Unpublished stock generates zero views and zero leads.',
        impact: 'Instant additional exposure across the marketplace.',
        action: { kind: 'open_inventory', filter: 'draft' },
      });
    }
    if (ctx.demandByMake[0] && ctx.promotionsActive === 0) {
      add({
        type: 'create_campaign', priority: 'low',
        title: `Create a campaign around ${ctx.demandByMake[0].make}`,
        reason: `${ctx.demandByMake[0].make} is your most viewed make (${ctx.demandByMake[0].views.toLocaleString()} views).`,
        impact: 'Ride existing demand — ask the AI Twin to generate the campaign content.',
        action: { kind: 'open_marketing' },
      });
    }

    const order: any = { high: 0, medium: 1, low: 2 };
    return recs.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 12);
  }

  // ── Daily Brief ─────────────────────────────────────────────────────────────

  private deterministicBrief(ctx: TwinContext, scores: any, recs: any[]) {
    const highlights = [
      `${ctx.stats.vehicles_in_stock} vehicles currently in stock (AED ${ctx.stats.stock_value_aed.toLocaleString()} stock value)`,
      ctx.pricing.overpriced.length ? `${ctx.pricing.overpriced.length} vehicle${ctx.pricing.overpriced.length > 1 ? 's are' : ' is'} overpriced vs market` : `Pricing is well aligned with the market`,
      ctx.exportCandidates.length ? `${ctx.exportCandidates.length} vehicles have export potential` : null,
      ctx.demandByMake[0] ? `${ctx.demandByMake[0].make} is drawing the most buyer attention (${ctx.demandByMake[0].views.toLocaleString()} views)` : null,
      `${ctx.leads.new_7d} new lead${ctx.leads.new_7d !== 1 ? 's' : ''} in the last 7 days, ${ctx.leads.hot.length} high-intent`,
      ctx.pricing.potential_gain_aed > 0 ? `Estimated pricing upside: +AED ${ctx.pricing.potential_gain_aed.toLocaleString()}` : null,
      `Monthly revenue forecast: AED ${ctx.revenue.forecast_month.toLocaleString()}`,
    ].filter(Boolean);

    const plan = recs.slice(0, 5).map(r => r.title);
    return {
      greeting: `Good morning. I analyzed ${ctx.dealer.name} overnight — here are today's biggest opportunities.`,
      highlights,
      plan,
      closing: 'Focus on these actions today for maximum impact.',
      forecast_month_aed: ctx.revenue.forecast_month,
      opportunity_today_aed: Math.round(ctx.pricing.potential_gain_aed + ctx.leads.hot.reduce((s, l) => s + (l.offer_aed || 0), 0) * 0.1),
    };
  }

  async generateBrief(dealerId: string, opts: { force?: boolean; trigger?: string } = {}) {
    const cfg = await this.getConfig();
    const date = todayKey();

    if (!opts.force) {
      const existing = await this.prisma.aiTwinBrief.findUnique({
        where: { dealer_id_brief_date: { dealer_id: dealerId, brief_date: date } },
      });
      if (existing) return existing;
    }

    const ctx = await this.collectContext(dealerId);
    const scores = this.computeScores(ctx);
    const recs = this.buildRecommendations(ctx);
    const fallback = this.deterministicBrief(ctx, scores, recs);

    let content: any = fallback;
    let generatedBy = 'fallback';
    let modelUsed: string | null = null;

    if (cfg.enabled) {
      try {
        const model = aiModel((cfg.model_alias as any) || 'sonnet');
        const r = await this.anthropic.messages.create({
          model, max_tokens: 900,
          system:
`You are the AI Twin — the virtual Sales Director of a UAE car dealership on DubaiAuto. You write the dealer's morning Daily Brief.
Rules:
- Use ONLY the numbers provided in the data. Never invent figures.
- Warm, confident, executive tone. Address the dealer directly.
- Respond ONLY with valid JSON, no markdown fences, matching exactly:
{"greeting": string, "highlights": string[5-8 short bullet strings with concrete numbers], "plan": string[3-5 imperative action strings], "closing": string, "forecast_month_aed": number, "opportunity_today_aed": number}
${cfg.brief_template ? `- Additional admin instructions: ${cfg.brief_template}` : ''}`,
          messages: [{
            role: 'user',
            content: `Dealer data (real, computed tonight):\n${JSON.stringify({ dealer: ctx.dealer.name, scores, stats: ctx.stats, pricing_summary: { overpriced: ctx.pricing.overpriced.length, underpriced: ctx.pricing.underpriced.length, potential_gain_aed: ctx.pricing.potential_gain_aed }, top_demand: ctx.demandByMake.slice(0, 3), market_lake_trends: ctx.marketLake?.available ? ctx.marketLake.top_market_trends : undefined, hot_leads: ctx.leads.hot.length, new_leads_7d: ctx.leads.new_7d, inactive_leads: ctx.leads.inactive.length, export_candidates: ctx.exportCandidates.length, slow_movers: ctx.slowMovers.length, drafts: ctx.drafts, revenue: ctx.revenue, top_recommendations: recs.slice(0, 5).map(r => r.title) })}`,
          }],
        });
        const text = r.content[0].type === 'text' ? r.content[0].text : '';
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
        if (parsed?.greeting && Array.isArray(parsed.highlights) && Array.isArray(parsed.plan)) {
          content = {
            ...parsed,
            forecast_month_aed: Number(parsed.forecast_month_aed) || fallback.forecast_month_aed,
            opportunity_today_aed: Number(parsed.opportunity_today_aed) || fallback.opportunity_today_aed,
          };
          generatedBy = opts.trigger || 'auto';
          modelUsed = model;
        }
      } catch (err: any) {
        this.logger.warn(`Brief AI generation failed for ${dealerId}: ${err?.message}`);
        await this.log(dealerId, 'error', { where: 'generateBrief', message: err?.message });
      }
    }

    const brief = await this.prisma.aiTwinBrief.upsert({
      where: { dealer_id_brief_date: { dealer_id: dealerId, brief_date: date } },
      create: { dealer_id: dealerId, brief_date: date, health_score: scores.business_health, content, model_used: modelUsed, generated_by: generatedBy },
      update: { health_score: scores.business_health, content, model_used: modelUsed, generated_by: generatedBy },
    });

    // Smart notification: Daily AI Twin Brief
    try {
      await this.prisma.notification.create({
        data: {
          dealer_id: dealerId, type: 'ai_twin_brief', category: 'general',
          title: '🤖 Your AI Twin Daily Brief is ready',
          body: `Business Health ${scores.business_health}/100 — ${recs.filter(r => r.priority === 'high').length} high-priority actions today.`,
          data: { brief_id: brief.id, date },
        },
      });
    } catch { /* non-blocking */ }

    await this.log(dealerId, 'brief_generated', { date, generated_by: generatedBy, health: scores.business_health });
    return brief;
  }

  // ── Command Center ──────────────────────────────────────────────────────────

  async getCommandCenter(dealerId: string) {
    const ctx = await this.collectContext(dealerId);
    const scores = this.computeScores(ctx);
    const recommendations = this.buildRecommendations(ctx);
    const annotated = await this.annotateRecommendations(dealerId, recommendations);

    const risks: any[] = [];
    if (ctx.slowMovers.length) risks.push({ level: ctx.slowMovers.length > 5 ? 'high' : 'medium', title: `${ctx.slowMovers.length} slow-moving vehicles`, detail: `Oldest: ${ctx.slowMovers[0].name} (${ctx.slowMovers[0].days_listed} days). Capital is tied up in aging stock.` });
    if (ctx.pricing.overpriced.length) risks.push({ level: 'medium', title: `${ctx.pricing.overpriced.length} overpriced listings`, detail: 'Overpriced stock ages faster and erodes buyer trust.' });
    if (ctx.leads.inactive.length) risks.push({ level: 'medium', title: `${ctx.leads.inactive.length} leads going cold`, detail: 'No activity for 14+ days — re-engage before they buy elsewhere.' });
    if (ctx.revenue.mom_pct !== null && ctx.revenue.mom_pct < -15) risks.push({ level: 'high', title: `Revenue down ${Math.abs(ctx.revenue.mom_pct)}% month-over-month`, detail: 'Collected revenue is trending down vs the previous 30 days.' });
    if (ctx.drafts >= 3) risks.push({ level: 'low', title: `${ctx.drafts} unpublished drafts`, detail: 'Draft vehicles generate no visibility.' });

    const growth: any[] = [];
    if (ctx.demandByMake[0]) growth.push({ title: `Double down on ${ctx.demandByMake[0].make}`, detail: `Your ${ctx.demandByMake[0].make} stock leads buyer attention (${ctx.demandByMake[0].views.toLocaleString()} views across ${ctx.demandByMake[0].count} listings). Consider restocking this segment.` });
    if (ctx.exportCandidates.length) growth.push({ title: `${ctx.exportCandidates.length} export opportunities`, detail: 'Export-eligible stock can reach GCC/African buyers with better margins.' });
    if (ctx.pricing.potential_gain_aed > 0) growth.push({ title: `AED ${ctx.pricing.potential_gain_aed.toLocaleString()} pricing upside`, detail: `${ctx.pricing.underpriced.length} vehicles are priced below market value.` });
    if (ctx.newArrivals.length) growth.push({ title: `Promote ${ctx.newArrivals.length} new arrivals`, detail: 'Fresh listings get a marketplace freshness boost — amplify with a campaign.' });

    return {
      generated_at: new Date().toISOString(),
      scores: {
        ...scores,
        revenue_forecast_aed: ctx.revenue.forecast_month,
        inventory_value_aed: ctx.stats.stock_value_aed,
      },
      high_demand_vehicles: ctx.hotVehicles,
      slow_moving_vehicles: ctx.slowMovers,
      hot_buyers: ctx.leads.hot,
      inactive_leads: ctx.leads.inactive,
      export_opportunities: ctx.exportCandidates,
      demand_by_make: ctx.demandByMake,
      growth_opportunities: growth,
      risks,
      recommendations: annotated.items,
      recommendations_summary: annotated.summary,
      revenue: ctx.revenue,
    };
  }

  // ── Recommendation completion tracking ──────────────────────────────────────

  // Deterministic id for a computed (never stored) recommendation, so a
  // "done" mark survives brief regeneration as long as the same underlying
  // opportunity (same vehicle/lead/filter) keeps getting recommended.
  private recKey(r: any): string {
    const a = r.action || {};
    const entity = a.vehicle_id || a.lead_id || a.filter || 'general';
    return `${r.type}:${entity}`;
  }

  async annotateRecommendations(dealerId: string, recommendations: any[]) {
    const keys = recommendations.map(r => this.recKey(r));
    const done = keys.length
      ? await this.prisma.aiRecommendationStatus.findMany({ where: { dealer_id: dealerId, rec_key: { in: keys } } })
      : [];
    const doneSet = new Set(done.map(d => d.rec_key));
    const items = recommendations.map(r => {
      const key = this.recKey(r);
      const match = done.find(d => d.rec_key === key);
      return { ...r, key, done: doneSet.has(key), completed_at: match?.completed_at ?? null };
    });
    const total = items.length;
    const completed = items.filter(i => i.done).length;
    return { items, summary: { total, completed, pending: total - completed } };
  }

  async completeRecommendation(dealerId: string, key: string) {
    await this.prisma.aiRecommendationStatus.upsert({
      where: { dealer_id_rec_key: { dealer_id: dealerId, rec_key: key } },
      create: { dealer_id: dealerId, rec_key: key },
      update: { completed_at: new Date() },
    });
    return { key, done: true };
  }

  async reopenRecommendation(dealerId: string, key: string) {
    await this.prisma.aiRecommendationStatus.deleteMany({ where: { dealer_id: dealerId, rec_key: key } });
    return { key, done: false };
  }

  // ── Copilot chat ────────────────────────────────────────────────────────────

  async chat(dealerId: string, message: string, history: any[] = []) {
    const cfg = await this.getConfig();
    if (!cfg.enabled) return { reply: 'The AI Twin is currently disabled by your administrator.' };

    const ctx = await this.collectContext(dealerId);
    const scores = this.computeScores(ctx);
    const recs = this.buildRecommendations(ctx);

    const system =
`You are the AI Twin — the dealer's virtual Sales Director, Business Consultant and Growth Advisor on DubaiAuto (UAE marketplace).
You have tonight's real business data below. Answer ONLY from this data; if something isn't in the data, say so honestly.
Be concise (2-6 sentences or a short list), concrete, numbers-first, always in AED. Give actionable advice like a trusted business partner.
${cfg.chat_template ? `Admin instructions: ${cfg.chat_template}` : ''}

DEALER DATA (real):
${JSON.stringify({
  dealer: ctx.dealer.name, scores, stats: ctx.stats,
  revenue: ctx.revenue,
  overpriced: ctx.pricing.overpriced, underpriced: ctx.pricing.underpriced,
  slow_movers: ctx.slowMovers, hot_vehicles: ctx.hotVehicles,
  export_candidates: ctx.exportCandidates, demand_by_make: ctx.demandByMake,
  market_lake: ctx.marketLake?.available ? { historical_observations: ctx.marketLake.observations, top_market_trends: ctx.marketLake.top_market_trends } : 'no lake data yet',
  hot_buyers: ctx.leads.hot, inactive_leads: ctx.leads.inactive,
  new_leads_7d: ctx.leads.new_7d, total_leads: ctx.leads.total,
  drafts: ctx.drafts, active_promotions: ctx.promotionsActive,
  today_recommendations: recs,
})}`;

    try {
      const r = await this.anthropic.messages.create({
        model: aiModel((cfg.model_alias as any) || 'sonnet'), max_tokens: 700, system,
        messages: [
          ...history.slice(-10).map((h: any) => ({ role: h.role, content: String(h.content || '') })),
          { role: 'user' as const, content: message },
        ],
      });
      const reply = r.content[0].type === 'text' ? r.content[0].text : '';
      await this.log(dealerId, 'chat', { chars_in: message.length, chars_out: reply.length });
      return { reply };
    } catch (err: any) {
      await this.log(dealerId, 'error', { where: 'chat', message: err?.message });
      return { reply: "I'm having trouble connecting to my analysis engine right now. Your Command Center below still shows today's live insights — try again in a moment." };
    }
  }

  // ── Marketing Director ──────────────────────────────────────────────────────

  async generateMarketing(dealerId: string, body: { type: string; vehicle_ids?: string[]; instructions?: string }) {
    const cfg = await this.getConfig();
    if (!cfg.enabled) return { content: 'The AI Twin is currently disabled by your administrator.', type: body.type };

    const type = (body.type || 'social_post').toLowerCase();
    const vehicles = await this.prisma.vehicle.findMany({
      where: body.vehicle_ids?.length
        ? { id: { in: body.vehicle_ids.slice(0, 10) }, dealer_id: dealerId }
        : { dealer_id: dealerId, status: 'available' },
      orderBy: { view_count: 'desc' }, take: 6,
      select: { make: true, model: true, year: true, trim: true, price_aed: true, mileage_km: true, body_type: true, fuel_type: true, export_eligible: true, color_exterior: true },
    });
    const dealer = await this.prisma.dealer.findUnique({ where: { id: dealerId }, select: { company_name: true } });

    const formats: Record<string, string> = {
      email: 'a marketing email (subject line + body, ~150 words)',
      whatsapp: 'a WhatsApp broadcast message (short, emoji-friendly, with a clear CTA, under 500 characters)',
      sms: 'an SMS campaign message (max 160 characters, one CTA)',
      social_post: 'a social media post (Instagram/Facebook style, with hashtags)',
      promo_offer: 'a promotional offer announcement (headline + 3 bullet points + CTA)',
      vehicle_description: 'a compelling marketplace listing description per vehicle (60-100 words each)',
      seo: 'SEO content: a meta title (≤60 chars), meta description (≤155 chars) and 8 keywords',
      landing_page: 'landing page copy: hero headline, subheadline, 3 benefit blocks, CTA',
    };

    try {
      const r = await this.anthropic.messages.create({
        model: aiModel((cfg.model_alias as any) || 'sonnet'), max_tokens: 900,
        system: `You are the AI Marketing Director for "${dealer?.company_name || 'a UAE dealership'}" on DubaiAuto. Write ${formats[type] || formats.social_post}. Use only the vehicle data provided (real inventory, prices in AED). Professional, persuasive, UAE market tone. Output the content directly, no preamble.`,
        messages: [{ role: 'user', content: `Inventory to promote:\n${JSON.stringify(vehicles)}\n${body.instructions ? `Extra instructions: ${body.instructions}` : ''}` }],
      });
      const content = r.content[0].type === 'text' ? r.content[0].text : '';
      await this.log(dealerId, 'marketing', { type, vehicles: vehicles.length });
      return { type, content, vehicles_used: vehicles.length };
    } catch (err: any) {
      await this.log(dealerId, 'error', { where: 'marketing', message: err?.message });
      return { type, content: 'Generation failed — please try again in a moment.', error: true };
    }
  }

  // ── Nightly job (no external scheduler dependency) ─────────────────────────
  // Checks hourly; when the configured UTC hour is reached, regenerates the
  // brief for every dealer that has active stock. Runs at most once per day.

  onModuleInit() {
    this.nightlyTimer = setInterval(() => this.nightlyTick().catch(() => {}), 30 * 60 * 1000);
  }
  onModuleDestroy() { if (this.nightlyTimer) clearInterval(this.nightlyTimer); }

  private async nightlyTick() {
    const cfg = await this.getConfig();
    if (!cfg.enabled) return;
    const now = new Date();
    const date = todayKey();
    if (this.lastNightlyRun === date) return;
    if (now.getUTCHours() !== Number(cfg.nightly_hour_utc ?? 3)) return;

    this.lastNightlyRun = date;
    const dealers = await this.prisma.vehicle.groupBy({
      by: ['dealer_id'], where: { status: { in: ['available', 'reserved'] } },
    });
    this.logger.log(`Nightly AI Twin run — ${dealers.length} dealers`);
    for (const d of dealers) {
      try { await this.generateBrief(d.dealer_id, { force: true, trigger: 'auto' }); }
      catch (err: any) { this.logger.warn(`Nightly brief failed for ${d.dealer_id}: ${err?.message}`); }
    }
  }
}

// ─── Controller ───────────────────────────────────────────────────────────────

@Roles('dealer', 'admin')
@Controller('ai-twin')
export class AiTwinController {
  constructor(private service: AiTwinService) {}

  // Anti-IDOR: same ownership rule as the rest of the dealer dashboard.
  private assertOwnership(dealerId: string, req: any) {
    if (req.user?.role === 'admin') return;
    if (req.user?.dealerId !== dealerId) {
      throw new ForbiddenException('You can only access your own AI Twin');
    }
  }

  @Get(':dealerId/brief')
  getBrief(@Param('dealerId') dealerId: string, @Request() req: any) {
    this.assertOwnership(dealerId, req);
    return this.service.generateBrief(dealerId); // lazy: generates today's brief if missing
  }

  @Post(':dealerId/brief/regenerate')
  regenerate(@Param('dealerId') dealerId: string, @Request() req: any) {
    this.assertOwnership(dealerId, req);
    return this.service.generateBrief(dealerId, { force: true, trigger: 'manual' });
  }

  @Get(':dealerId/command-center')
  commandCenter(@Param('dealerId') dealerId: string, @Request() req: any) {
    this.assertOwnership(dealerId, req);
    return this.service.getCommandCenter(dealerId);
  }

  // Mark / unmark a recommendation as done — the "check to validate the
  // action was taken" control on the AI Twin panel.
  @Post(':dealerId/recommendations/:key/complete')
  completeRecommendation(@Param('dealerId') dealerId: string, @Param('key') key: string, @Request() req: any) {
    this.assertOwnership(dealerId, req);
    return this.service.completeRecommendation(dealerId, key);
  }

  @Post(':dealerId/recommendations/:key/reopen')
  reopenRecommendation(@Param('dealerId') dealerId: string, @Param('key') key: string, @Request() req: any) {
    this.assertOwnership(dealerId, req);
    return this.service.reopenRecommendation(dealerId, key);
  }

  @Post(':dealerId/chat')
  chat(@Param('dealerId') dealerId: string, @Body() body: { message: string; history?: any[] }, @Request() req: any) {
    this.assertOwnership(dealerId, req);
    return this.service.chat(dealerId, String(body.message || '').slice(0, 2000), body.history || []);
  }

  @Post(':dealerId/marketing')
  marketing(@Param('dealerId') dealerId: string, @Body() body: any, @Request() req: any) {
    this.assertOwnership(dealerId, req);
    return this.service.generateMarketing(dealerId, body);
  }

  // ── Super Admin configuration ────────────────────────────────────────────
  @Roles('admin')
  @Get('admin/config')
  getConfig() { return this.service.getConfig(); }

  @Roles('admin')
  @Put('admin/config')
  updateConfig(@Body() body: any, @Request() req: any) {
    return this.service.updateConfig(body, req.user?.email || req.user?.sub);
  }

  @Roles('admin')
  @Get('admin/logs')
  logs(@Query() q: any) {
    return this.service.getLogs({ dealer_id: q.dealer_id, limit: q.limit ? +q.limit : 100 });
  }
}

// ─── Module ───────────────────────────────────────────────────────────────────

@Module({
  imports: [GlobalTradeModule],
  controllers: [AiTwinController],
  providers: [AiTwinService],
  exports: [AiTwinService],
})
export class AiTwinModule {}
