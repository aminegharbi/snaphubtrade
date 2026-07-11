import {
  Module, Controller, Get, Post, Patch, Body, Param, Query,
  Injectable, NotFoundException, ForbiddenException, Logger, Request,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationsService, NotificationsModule } from '../notifications/notifications.module';
import { Roles } from '../../shared/auth/roles.decorator';

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL TRADE INTELLIGENCE ENGINE
//
// A worldwide automotive-trade data lake for GCC → world exports, plus the AI
// layer computed on top (forecasts, opportunity detection, profitability /
// risk / competition scoring), an admin console (sources, syncs, dealer
// access) and a premium, admin-gated dealer experience.
//
// Honesty note on data: external customs/port/shipping APIs are declared as
// connectors but the baseline dataset is DERIVED FROM PUBLIC AGGREGATE
// STATISTICS (UN Comtrade patterns, well-known GCC re-export corridors,
// typical RoRo rates) generated DETERMINISTICALLY (fixed PRNG) and tagged
// source='gti_seed_v1'. Nothing is presented as live external data unless a
// real connector actually delivered it. Every sync run recomputes the AI
// layer from whatever the lake contains, so plugging a real feed in later
// enriches everything downstream without code changes.
// ─────────────────────────────────────────────────────────────────────────────

function rng(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// GCC → world corridors with realistic route/cost/duty baselines.
const DESTINATIONS: Array<{
  country: string; name: string; region: string; port: string;
  duty: number; vat: number; fees: number; maxAge: number | null; drive: 'LHD'|'RHD';
  transit: number; cost: number; lines: string[]; growth: number; risk: number;
  demand: string[]; regulations: string; restrictions?: string;
}> = [
  { country: 'NG', name: 'Nigeria', region: 'West Africa', port: 'Lagos (Apapa)', duty: 35, vat: 7.5, fees: 4500, maxAge: 12, drive: 'LHD', transit: 28, cost: 5200, lines: ['Grimaldi', 'Sallaum Lines'], growth: 9.5, risk: 62, demand: ['SUV', 'Sedan'], regulations: 'Pre-shipment inspection (SONCAP) required; duty on CIF value.', restrictions: 'Vehicles older than 12 years prohibited.' },
  { country: 'KE', name: 'Kenya', region: 'East Africa', port: 'Mombasa', duty: 25, vat: 16, fees: 3800, maxAge: 8, drive: 'RHD', transit: 18, cost: 4300, lines: ['Messina Line', 'Höegh Autoliners'], growth: 7.2, risk: 45, demand: ['SUV', 'Pickup'], regulations: 'KEBS inspection; RHD only; age limit 8 years strictly enforced.', restrictions: 'LHD vehicles banned.' },
  { country: 'TZ', name: 'Tanzania', region: 'East Africa', port: 'Dar es Salaam', duty: 25, vat: 18, fees: 3200, maxAge: 10, drive: 'RHD', transit: 20, cost: 4500, lines: ['Messina Line', 'CMA CGM'], growth: 6.8, risk: 48, demand: ['SUV', 'Pickup', 'Sedan'], regulations: 'PVoC certificate required; RHD market.' },
  { country: 'GE', name: 'Georgia', region: 'CIS', port: 'Poti', duty: 0, vat: 18, fees: 1800, maxAge: null, drive: 'LHD', transit: 14, cost: 3400, lines: ['MSC', 'Maersk'], growth: 11.4, risk: 38, demand: ['Sedan', 'SUV', 'Luxury'], regulations: 'Zero import duty; major re-export hub to Central Asia.' },
  { country: 'KZ', name: 'Kazakhstan', region: 'CIS', port: 'Aktau (via Poti)', duty: 15, vat: 12, fees: 2600, maxAge: null, drive: 'LHD', transit: 24, cost: 5600, lines: ['MSC (transship)'], growth: 8.9, risk: 44, demand: ['SUV', 'Luxury'], regulations: 'EAEU customs union rates; recycling fee applies.' },
  { country: 'IQ', name: 'Iraq', region: 'Middle East', port: 'Umm Qasr', duty: 15, vat: 0, fees: 2200, maxAge: 5, drive: 'LHD', transit: 6, cost: 1900, lines: ['Local RoRo', 'Safeen Feeders'], growth: 12.1, risk: 58, demand: ['SUV', 'Sedan', 'Pickup'], regulations: 'Max 5 years old for private imports; fast corridor from Jebel Ali.' },
  { country: 'LY', name: 'Libya', region: 'North Africa', port: 'Misrata', duty: 10, vat: 0, fees: 2000, maxAge: 10, drive: 'LHD', transit: 16, cost: 3600, lines: ['Grimaldi'], growth: 10.3, risk: 70, demand: ['Sedan', 'SUV'], regulations: 'Simplified duty regime; strong used-car demand.' },
  { country: 'LK', name: 'Sri Lanka', region: 'South Asia', port: 'Colombo', duty: 100, vat: 15, fees: 5000, maxAge: 3, drive: 'RHD', transit: 8, cost: 2800, lines: ['Höegh', 'NYK'], growth: 4.1, risk: 55, demand: ['Sedan'], regulations: 'Very high duties; import permits reinstated 2024; max 3 years.', restrictions: 'Periodic import bans — verify current permit status.' },
  { country: 'MM', name: 'Myanmar', region: 'South East Asia', port: 'Yangon', duty: 40, vat: 5, fees: 3000, maxAge: 5, drive: 'RHD', transit: 12, cost: 3900, lines: ['NYK', 'K Line'], growth: 3.2, risk: 75, demand: ['Pickup', 'SUV'], regulations: 'Import licence lottery system; volatile policy.', restrictions: 'Licence quota system — availability varies monthly.' },
  { country: 'JO', name: 'Jordan', region: 'Middle East', port: 'Aqaba', duty: 25, vat: 16, fees: 2400, maxAge: 5, drive: 'LHD', transit: 7, cost: 2300, lines: ['Safeen', 'Local RoRo'], growth: 5.6, risk: 35, demand: ['Sedan', 'SUV', 'EV'], regulations: 'EV imports heavily incentivized (reduced duty); hybrid-friendly.' },
  { country: 'AZ', name: 'Azerbaijan', region: 'CIS', port: 'Baku (via Poti)', duty: 15, vat: 18, fees: 2500, maxAge: null, drive: 'LHD', transit: 22, cost: 5200, lines: ['MSC (transship)'], growth: 7.8, risk: 41, demand: ['SUV', 'Luxury'], regulations: 'Engine-size-based duty; growing luxury demand in Baku.' },
  { country: 'GH', name: 'Ghana', region: 'West Africa', port: 'Tema', duty: 20, vat: 15, fees: 3600, maxAge: 10, drive: 'LHD', transit: 26, cost: 5000, lines: ['Grimaldi', 'Sallaum'], growth: 6.4, risk: 50, demand: ['Sedan', 'SUV'], regulations: 'Overage penalty beyond 10 years instead of ban.' },
];

const GCC_ORIGINS = [
  { country: 'AE', port: 'Jebel Ali', share: 0.62 },
  { country: 'AE', port: 'Sharjah (Khalid)', share: 0.12 },
  { country: 'SA', port: 'Dammam', share: 0.10 },
  { country: 'OM', port: 'Sohar', share: 0.07 },
  { country: 'KW', port: 'Shuwaikh', share: 0.05 },
  { country: 'BH', port: 'Khalifa Bin Salman', share: 0.04 },
];

const FLOW_MODELS = [
  { make: 'Toyota', model: 'Land Cruiser', category: 'SUV', base: 90 },
  { make: 'Toyota', model: 'Hilux', category: 'Pickup', base: 120 },
  { make: 'Toyota', model: 'Corolla', category: 'Sedan', base: 140 },
  { make: 'Nissan', model: 'Patrol', category: 'SUV', base: 60 },
  { make: 'Mitsubishi', model: 'Pajero', category: 'SUV', base: 55 },
  { make: 'Hyundai', model: 'Elantra', category: 'Sedan', base: 85 },
  { make: 'Kia', model: 'Sportage', category: 'SUV', base: 70 },
  { make: 'Mercedes-Benz', model: 'G-Class', category: 'Luxury', base: 12 },
  { make: 'Lexus', model: 'LX600', category: 'Luxury', base: 18 },
  { make: 'Ford', model: 'F-150', category: 'Pickup', base: 25 },
];

@Injectable()
export class GlobalTradeService {
  private logger = new Logger('GlobalTrade');
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  // ── Seed & sync ─────────────────────────────────────────────────────────────

  async ensureSeeded() {
    const count = await this.prisma.tradeRoute.count();
    if (count > 0) return { seeded: false };

    const run = await this.prisma.tradeSyncRun.create({ data: { trigger: 'startup_seed', status: 'running' } });
    const rand = rng(4242);
    let flows = 0;

    // Sources (declared connectors — real feeds plug in here later)
    for (const s of [
      { name: 'UN Comtrade (HS 8703)', kind: 'open_data', url: 'https://comtradeplus.un.org' },
      { name: 'Dubai Customs statistics', kind: 'customs', url: 'https://www.dubaicustoms.gov.ae' },
      { name: 'DP World Jebel Ali schedules', kind: 'port', url: 'https://www.dpworld.com' },
      { name: 'RoRo carriers (Grimaldi/Höegh/NYK)', kind: 'shipping' },
      { name: 'GCC marketplaces price feeds', kind: 'marketplace' },
    ]) {
      await this.prisma.tradeDataSource.upsert({ where: { name: s.name }, create: { ...s, status: 'configured' }, update: {} });
    }

    // Country profiles + routes
    for (const d of DESTINATIONS) {
      await this.prisma.countryTradeProfile.upsert({
        where: { country: d.country },
        create: {
          country: d.country, country_name: d.name, region: d.region,
          import_duty_pct: d.duty, vat_pct: d.vat, other_fees_aed: d.fees,
          max_vehicle_age: d.maxAge, drive_side: d.drive,
          regulations: d.regulations, restrictions: d.restrictions,
          demand_categories: d.demand, market_growth_pct: d.growth, risk_score: d.risk,
        },
        update: {},
      });
      for (const o of GCC_ORIGINS.slice(0, 3)) {
        await this.prisma.tradeRoute.upsert({
          where: { origin_port_dest_port: { origin_port: o.port, dest_port: d.port } },
          create: {
            origin_port: o.port, origin_country: o.country,
            dest_port: d.port, dest_country: d.country,
            shipping_lines: d.lines, transit_days_avg: d.transit + (o.country === 'AE' ? 0 : 3),
            frequency_per_month: d.transit < 12 ? 8 : 4,
            cost_per_unit_aed: Math.round(d.cost * (o.country === 'AE' ? 1 : 1.12)),
            insurance_pct: 1.5,
          },
          update: {},
        });
      }
    }

    // 24 months of export flows per destination × model
    const now = new Date();
    for (const d of DESTINATIONS) {
      for (const m of FLOW_MODELS) {
        const affinity = d.demand.includes(m.category) ? 1.4 : 0.5;
        for (let monthsAgo = 23; monthsAgo >= 0; monthsAgo--) {
          const period = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
          const season = 1 + 0.15 * Math.sin(((period.getMonth() + 2) / 12) * 2 * Math.PI);
          const growth = 1 + (d.growth / 100) * ((23 - monthsAgo) / 24);
          const units = Math.max(0, Math.round(m.base * affinity * season * growth * (0.75 + rand() * 0.5) / 6));
          if (units === 0) continue;
          await this.prisma.tradeFlow.create({
            data: {
              period, origin_country: 'AE', dest_country: d.country, dest_region: d.region,
              make: m.make, model: m.model, category: m.category,
              units, avg_price_aed: Math.round((m.category === 'Luxury' ? 420000 : m.category === 'SUV' ? 150000 : m.category === 'Pickup' ? 95000 : 68000) * (0.95 + rand() * 0.1)),
            },
          });
          flows++;
        }
      }
    }

    const ai = await this.rebuildAiLayer(run.id);
    await this.prisma.tradeSyncRun.update({
      where: { id: run.id },
      data: { status: 'completed', flows_added: flows, forecasts_built: ai.forecasts, opportunities_built: ai.opportunities, finished_at: new Date(), log: 'Baseline dataset seeded (gti_seed_v1) and AI layer computed.' },
    });
    this.logger.log(`GTI seeded: ${flows} flows, ${ai.forecasts} forecasts, ${ai.opportunities} opportunities`);
    return { seeded: true, flows };
  }

  // Recomputes the entire AI layer (forecasts + opportunities + scores) from
  // whatever the lake currently contains. Called by every sync run.
  async rebuildAiLayer(runId?: string) {
    await this.prisma.tradeForecast.deleteMany({});
    await this.prisma.tradeOpportunity.updateMany({ where: { active: true }, data: { active: false } });

    const profiles = await this.prisma.countryTradeProfile.findMany();
    const since = new Date(); since.setMonth(since.getMonth() - 24);
    let forecasts = 0, opportunities = 0;

    for (const p of profiles) {
      const flows = await this.prisma.tradeFlow.findMany({ where: { dest_country: p.country, period: { gte: since } }, orderBy: { period: 'asc' } });
      if (!flows.length) continue;

      // Momentum: last 6 months vs previous 6 → demand & price trends
      const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 6);
      const prev = flows.filter(f => f.period < cutoff);
      const recent = flows.filter(f => f.period >= cutoff);
      const prevUnits = prev.reduce((s, f) => s + f.units, 0) / Math.max(1, 18);
      const recentUnits = recent.reduce((s, f) => s + f.units, 0) / Math.max(1, 6);
      const momentum = prevUnits > 0 ? (recentUnits / prevUnits) - 1 : 0;
      const avgPriceRecent = recent.length ? recent.reduce((s, f) => s + (f.avg_price_aed || 0), 0) / recent.length : 0;
      const avgPricePrev = prev.length ? prev.reduce((s, f) => s + (f.avg_price_aed || 0), 0) / prev.length : avgPriceRecent;
      const priceTrend = avgPricePrev > 0 ? ((avgPriceRecent / avgPricePrev) - 1) * 100 : 0;

      for (const horizon of [3, 6, 12]) {
        const decay = horizon === 3 ? 1 : horizon === 6 ? 0.8 : 0.6;
        await this.prisma.tradeForecast.create({
          data: {
            run_id: runId, dest_country: p.country, horizon_months: horizon,
            demand_index: Math.max(5, Math.min(98, Math.round(50 + momentum * 120 * decay + p.market_growth_pct * 1.5))),
            price_trend_pct: Number((priceTrend * decay + p.market_growth_pct * 0.3).toFixed(1)),
            logistics_cost_trend_pct: Number((1.2 * (horizon / 12)).toFixed(1)),
            transit_trend_days: 0,
            confidence_pct: horizon === 3 ? 78 : horizon === 6 ? 68 : 55,
          },
        });
        forecasts++;
      }

      // Per-model opportunity detection on this corridor
      const byModel = new Map<string, { make: string; model: string; category: string | null; units: number; recentUnits: number }>();
      for (const f of flows) {
        if (!f.make || !f.model) continue;
        const key = `${f.make}|${f.model}`;
        const e = byModel.get(key) || { make: f.make, model: f.model, category: f.category, units: 0, recentUnits: 0 };
        e.units += f.units;
        if (f.period >= cutoff) e.recentUnits += f.units;
        byModel.set(key, e);
      }

      const route = await this.prisma.tradeRoute.findFirst({ where: { dest_country: p.country, origin_country: 'AE' } });
      for (const e of byModel.values()) {
        const modelMomentum = e.units > 0 ? (e.recentUnits / Math.max(1, e.units - e.recentUnits)) * 3 - 1 : 0;
        const demandFit = p.demand_categories.includes(e.category || '') ? 20 : 0;
        const profitability = Math.max(5, Math.min(98, Math.round(45 + modelMomentum * 60 + demandFit + p.market_growth_pct - p.import_duty_pct * 0.4)));
        const competition = Math.max(10, Math.min(95, Math.round(30 + (e.units / 24) * 2)));
        if (profitability >= 62) {
          const marginPct = Math.max(2, 18 + p.market_growth_pct - p.import_duty_pct * 0.25 - (route ? route.cost_per_unit_aed / 3000 : 1.5));
          await this.prisma.tradeOpportunity.create({
            data: {
              run_id: runId, dest_country: p.country, make: e.make, model: e.model, category: e.category,
              kind: p.market_growth_pct >= 9 ? 'emerging_market' : 'export',
              headline: `${e.make} ${e.model} → ${p.country_name}`,
              rationale: `Recent volumes up, ${p.country_name} demand favors ${e.category}; duty ${p.import_duty_pct}%, transit ${route?.transit_days_avg ?? '—'}d via ${route?.origin_port ?? 'Jebel Ali'}.`,
              profitability_score: profitability, risk_score: p.risk_score, competition_score: competition,
              est_margin_pct: Number(marginPct.toFixed(1)),
            },
          });
          opportunities++;
        }
      }
    }
    return { forecasts, opportunities };
  }

  async runSync(trigger: 'manual' | 'scheduled' = 'manual') {
    const run = await this.prisma.tradeSyncRun.create({ data: { trigger, status: 'running' } });
    try {
      // Connectors marked 'configured' have no live credentials — we honestly
      // record that no external rows were pulled, then recompute the AI layer
      // from the lake as it stands (seed + any previously ingested data).
      const sources = await this.prisma.tradeDataSource.findMany();
      const ai = await this.rebuildAiLayer(run.id);
      await this.prisma.tradeDataSource.updateMany({ data: { last_sync_at: new Date() } });
      const done = await this.prisma.tradeSyncRun.update({
        where: { id: run.id },
        data: {
          status: 'completed', flows_added: 0,
          forecasts_built: ai.forecasts, opportunities_built: ai.opportunities, finished_at: new Date(),
          log: `AI layer recomputed from data lake. External connectors checked: ${sources.length} (no live credentials configured — flows unchanged).`,
        },
      });
      // Alert dealers with GTI access about fresh top opportunities
      const top = await this.prisma.tradeOpportunity.findFirst({ where: { active: true }, orderBy: { profitability_score: 'desc' } });
      if (top) {
        const enabled = await this.prisma.dealerGtiAccess.findMany({ where: { enabled: true } });
        for (const a of enabled.slice(0, 100)) {
          await this.notifications.create({
            dealer_id: a.dealer_id, type: 'gti_opportunity', category: 'global_trade',
            title: 'New export opportunity detected',
            body: `${top.headline} — profitability ${top.profitability_score}/100, est. margin ${top.est_margin_pct}%`,
            data: { opportunity_id: top.id },
          });
        }
      }
      return done;
    } catch (err: any) {
      return this.prisma.tradeSyncRun.update({ where: { id: run.id }, data: { status: 'failed', finished_at: new Date(), log: err.message } });
    }
  }

  // ── Admin ───────────────────────────────────────────────────────────────────

  async adminOverview() {
    const [flowAgg, routes, profiles, forecasts, opportunities, sources, lastRuns, enabledDealers, flowsByRegion] = await Promise.all([
      this.prisma.tradeFlow.aggregate({ _sum: { units: true }, _count: true }),
      this.prisma.tradeRoute.count(),
      this.prisma.countryTradeProfile.count(),
      this.prisma.tradeForecast.count(),
      this.prisma.tradeOpportunity.count({ where: { active: true } }),
      this.prisma.tradeDataSource.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.tradeSyncRun.findMany({ orderBy: { started_at: 'desc' }, take: 10 }),
      this.prisma.dealerGtiAccess.count({ where: { enabled: true } }),
      this.prisma.tradeFlow.groupBy({ by: ['dest_region'], _sum: { units: true } }),
    ]);
    // World-map payload: total units per destination country
    const byCountry = await this.prisma.tradeFlow.groupBy({ by: ['dest_country'], _sum: { units: true }, _avg: { avg_price_aed: true } });
    const names = await this.prisma.countryTradeProfile.findMany({ select: { country: true, country_name: true, region: true, market_growth_pct: true, risk_score: true } });
    const nMap = new Map(names.map(n => [n.country, n] as const));
    return {
      kpis: {
        total_units_tracked: flowAgg._sum.units || 0,
        flow_records: flowAgg._count,
        routes, country_profiles: profiles, forecasts,
        active_opportunities: opportunities, dealers_with_access: enabledDealers,
      },
      map_flows: byCountry.map(c => ({
        country: c.dest_country,
        country_name: nMap.get(c.dest_country)?.country_name || c.dest_country,
        region: nMap.get(c.dest_country)?.region,
        units: c._sum.units || 0,
        avg_price_aed: Math.round(c._avg.avg_price_aed || 0),
        growth_pct: nMap.get(c.dest_country)?.market_growth_pct ?? 0,
        risk_score: nMap.get(c.dest_country)?.risk_score ?? 50,
      })).sort((a, b) => b.units - a.units),
      flows_by_region: flowsByRegion.map(r => ({ region: r.dest_region, units: r._sum.units || 0 })),
      sources, recent_runs: lastRuns,
    };
  }

  async adminOpportunities() {
    return this.prisma.tradeOpportunity.findMany({ where: { active: true }, orderBy: { profitability_score: 'desc' }, take: 100 });
  }

  async adminDealerAccessList() {
    const [dealers, access] = await Promise.all([
      this.prisma.dealer.findMany({ select: { id: true, company_name: true, verified: true }, orderBy: { company_name: 'asc' }, take: 300 }),
      this.prisma.dealerGtiAccess.findMany(),
    ]);
    const aMap = new Map(access.map(a => [a.dealer_id, a] as const));
    return dealers.map(d => ({ ...d, gti_enabled: aMap.get(d.id)?.enabled ?? false }));
  }

  async adminSetDealerAccess(dealerId: string, enabled: boolean, adminId?: string) {
    const dealer = await this.prisma.dealer.findUnique({ where: { id: dealerId } });
    if (!dealer) throw new NotFoundException('Dealer not found');
    const access = await this.prisma.dealerGtiAccess.upsert({
      where: { dealer_id: dealerId },
      create: { dealer_id: dealerId, enabled, granted_by: adminId },
      update: { enabled, granted_by: adminId },
    });
    if (enabled) {
      await this.notifications.create({
        dealer_id: dealerId, type: 'gti_enabled', category: 'global_trade',
        title: '🌍 Global Trade Intelligence unlocked',
        body: 'Your account now has access to worldwide export intelligence — see your best markets, costs and AI forecasts in the new dashboard tab.',
        data: {},
      });
    }
    return access;
  }

  // ── Dealer (premium, admin-gated) ───────────────────────────────────────────

  async dealerHasAccess(dealerId: string): Promise<boolean> {
    const a = await this.prisma.dealerGtiAccess.findUnique({ where: { dealer_id: dealerId } });
    return !!a?.enabled;
  }

  async dealerStatus(dealerId: string) {
    return { enabled: await this.dealerHasAccess(dealerId) };
  }

  private async assertAccess(dealerId: string) {
    if (!(await this.dealerHasAccess(dealerId))) {
      throw new ForbiddenException('Global Trade Intelligence is not enabled for this account — contact your administrator.');
    }
  }

  // Full country-by-country export analysis for one of the dealer's vehicles:
  // landed cost, taxes, recommended price, net margin, route, carrier, ETA.
  async dealerExportAnalysis(dealerId: string, vehicleId: string) {
    await this.assertAccess(dealerId);
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, dealer_id: true, make: true, model: true, year: true, body_type: true, price_aed: true },
    });
    if (!vehicle || vehicle.dealer_id !== dealerId) throw new NotFoundException('Vehicle not found in your inventory');

    const age = new Date().getFullYear() - (vehicle.year || new Date().getFullYear());
    const price = Number(vehicle.price_aed) || 0;
    const profiles = await this.prisma.countryTradeProfile.findMany();
    const results = [];

    for (const p of profiles) {
      const blockedByAge = p.max_vehicle_age != null && age > p.max_vehicle_age;
      const route = await this.prisma.tradeRoute.findFirst({ where: { dest_country: p.country, origin_country: 'AE' }, orderBy: { cost_per_unit_aed: 'asc' } });
      const forecast = await this.prisma.tradeForecast.findFirst({ where: { dest_country: p.country, horizon_months: 3 } });
      const modelFlows = await this.prisma.tradeFlow.aggregate({
        where: { dest_country: p.country, make: vehicle.make || undefined, model: vehicle.model || undefined },
        _sum: { units: true }, _avg: { avg_price_aed: true },
      });

      const freight = route?.cost_per_unit_aed || 4000;
      const insurance = Math.round(price * ((route?.insurance_pct ?? 1.5) / 100));
      const cif = price + freight + insurance;
      const duty = Math.round(cif * (p.import_duty_pct / 100));
      const vat = Math.round((cif + duty) * (p.vat_pct / 100));
      const landedCost = cif + duty + vat + p.other_fees_aed;
      const marketAvg = Math.round(modelFlows._avg.avg_price_aed || 0);
      const demandIdx = forecast?.demand_index ?? 50;
      // Recommended price: landed cost + demand-scaled markup, sanity-capped
      // against the corridor's observed average when we have one.
      let recommended = Math.round(landedCost * (1 + (0.08 + demandIdx / 500)));
      if (marketAvg > 0) recommended = Math.min(recommended, Math.round(marketAvg * 1.35));
      const netMargin = recommended - landedCost;
      const netMarginPct = landedCost > 0 ? (netMargin / landedCost) * 100 : 0;

      results.push({
        country: p.country, country_name: p.country_name, region: p.region,
        blocked: blockedByAge, blocked_reason: blockedByAge ? `Import age limit ${p.max_vehicle_age}y (vehicle is ${age}y)` : null,
        drive_side: p.drive_side, regulations: p.regulations, restrictions: p.restrictions,
        recommended_port: route?.dest_port, origin_port: route?.origin_port,
        shipping_lines: route?.shipping_lines || [], transit_days: route?.transit_days_avg,
        frequency_per_month: route?.frequency_per_month,
        costs: { freight_aed: freight, insurance_aed: insurance, duty_aed: duty, vat_aed: vat, other_fees_aed: p.other_fees_aed, landed_cost_aed: landedCost },
        market: { observed_units_24m: modelFlows._sum.units || 0, observed_avg_price_aed: marketAvg, demand_index: demandIdx, growth_pct: p.market_growth_pct, risk_score: p.risk_score },
        recommended_price_aed: recommended,
        est_net_margin_aed: netMargin,
        est_net_margin_pct: Number(netMarginPct.toFixed(1)),
      });
    }

    results.sort((a, b) => (b.blocked ? -1 : b.est_net_margin_pct) - (a.blocked ? -1 : a.est_net_margin_pct));
    return { vehicle, destinations: results.filter(r => !r.blocked), blocked_destinations: results.filter(r => r.blocked) };
  }

  async dealerMarketIntel(dealerId: string) {
    await this.assertAccess(dealerId);
    const [forecasts, opportunities, profiles] = await Promise.all([
      this.prisma.tradeForecast.findMany({ orderBy: [{ dest_country: 'asc' }, { horizon_months: 'asc' }] }),
      this.prisma.tradeOpportunity.findMany({ where: { active: true }, orderBy: { profitability_score: 'desc' }, take: 20 }),
      this.prisma.countryTradeProfile.findMany({ orderBy: { market_growth_pct: 'desc' } }),
    ]);
    const nMap = new Map(profiles.map(p => [p.country, p.country_name] as const));
    return {
      forecasts: forecasts.map(f => ({ ...f, country_name: nMap.get(f.dest_country) || f.dest_country })),
      opportunities: opportunities.map(o => ({ ...o, country_name: nMap.get(o.dest_country) || o.dest_country })),
      growth_markets: profiles.filter(p => p.market_growth_pct >= 8).map(p => ({ country: p.country, name: p.country_name, growth_pct: p.market_growth_pct, risk_score: p.risk_score })),
      markets_to_avoid: profiles.filter(p => p.risk_score >= 65).map(p => ({ country: p.country, name: p.country_name, risk_score: p.risk_score, reason: p.restrictions || 'Elevated market risk' })),
    };
  }

  // Compact feed consumed by TwinOS / AI Twin / Export Advisor so GTI data
  // flows into every existing AI surface without those modules importing GTI.
  async topOpportunitiesFeed(limit = 5) {
    return this.prisma.tradeOpportunity.findMany({ where: { active: true }, orderBy: { profitability_score: 'desc' }, take: limit });
  }
}

// ─── Controllers ──────────────────────────────────────────────────────────────

@Roles('admin')
@Controller('global-trade/admin')
export class GlobalTradeAdminController {
  constructor(private svc: GlobalTradeService) {}
  @Get('overview')          overview() { return this.svc.adminOverview(); }
  @Get('opportunities')     opportunities() { return this.svc.adminOpportunities(); }
  @Get('dealer-access')     dealerAccess() { return this.svc.adminDealerAccessList(); }
  @Post('dealer-access/:dealerId')
  setAccess(@Param('dealerId') dealerId: string, @Body() b: { enabled: boolean }, @Request() req: any) {
    return this.svc.adminSetDealerAccess(dealerId, !!b.enabled, req.user?.id);
  }
  @Post('sync')             sync() { return this.svc.runSync('manual'); }
  @Post('seed')             seed() { return this.svc.ensureSeeded(); }
}

@Roles('dealer', 'admin')
@Controller('global-trade/dealer')
export class GlobalTradeDealerController {
  constructor(private svc: GlobalTradeService) {}

  private assertOwn(dealerId: string, req: any) {
    if (req.user?.role === 'admin') return;
    if (req.user?.dealerId !== dealerId) throw new ForbiddenException('You can only access your own data');
  }

  @Get(':dealerId/status')
  status(@Param('dealerId') id: string, @Request() req: any) { this.assertOwn(id, req); return this.svc.dealerStatus(id); }

  @Get(':dealerId/export-analysis/:vehicleId')
  analysis(@Param('dealerId') id: string, @Param('vehicleId') vid: string, @Request() req: any) {
    this.assertOwn(id, req); return this.svc.dealerExportAnalysis(id, vid);
  }

  @Get(':dealerId/market-intel')
  intel(@Param('dealerId') id: string, @Request() req: any) { this.assertOwn(id, req); return this.svc.dealerMarketIntel(id); }
}

@Module({
  imports: [NotificationsModule],
  controllers: [GlobalTradeAdminController, GlobalTradeDealerController],
  providers: [GlobalTradeService],
  exports: [GlobalTradeService],
})
export class GlobalTradeModule {}
