'use client';
import { useState, useEffect } from 'react';
import {
  Globe2, Lock, RefreshCw, Ship, Clock, TrendingUp, TrendingDown, AlertTriangle,
  ShieldAlert, DollarSign, Zap, ChevronDown, ChevronUp, Bell,
} from 'lucide-react';
import { api } from '@/lib/api';
import { usePriceFormatter } from '@/components/common/Price';
import { useLocale } from '@/contexts/LocaleContext';

type Vehicle = { id: string; make: string; model: string; year: number; price_aed: number; status: string };

type Destination = {
  country: string; country_name: string; region: string;
  drive_side: string; regulations: string; restrictions?: string | null;
  recommended_port?: string; origin_port?: string; shipping_lines: string[];
  transit_days?: number; frequency_per_month?: number;
  costs: { freight_aed: number; insurance_aed: number; duty_aed: number; vat_aed: number; other_fees_aed: number; landed_cost_aed: number };
  market: { observed_units_24m: number; observed_avg_price_aed: number; demand_index: number; growth_pct: number; risk_score: number };
  recommended_price_aed: number; est_net_margin_aed: number; est_net_margin_pct: number;
};

type MarketIntel = {
  forecasts: { dest_country: string; country_name: string; horizon_months: number; demand_index: number; price_trend_pct: number; confidence_pct: number }[];
  opportunities: { id: string; dest_country: string; country_name: string; headline: string; rationale: string | null; profitability_score: number; risk_score: number; est_margin_pct: number | null }[];
  growth_markets: { country: string; name: string; growth_pct: number; risk_score: number }[];
  markets_to_avoid: { country: string; name: string; risk_score: number; reason: string }[];
};

export default function DealerGlobalTradePage() {
  const { t } = useLocale();
  const formatPrice = usePriceFormatter();
  const [dealerId, setDealerId] = useState('');
  const [checking, setChecking] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [analysis, setAnalysis] = useState<{ vehicle: Vehicle; destinations: Destination[]; blocked_destinations: any[] } | null>(null);
  const [intel, setIntel] = useState<MarketIntel | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const did = localStorage.getItem('dealer_id') || '';
    setDealerId(did);
    if (!did) { setChecking(false); return; }
    api.get<{ enabled: boolean }>(`/global-trade/dealer/${did}/status`)
      .then(s => setEnabled(s.enabled))
      .catch(() => setEnabled(false))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!enabled || !dealerId) return;
    api.get<MarketIntel>(`/global-trade/dealer/${dealerId}/market-intel`).then(setIntel).catch(() => {});
    api.get<{ items: Vehicle[] }>(`/vehicles?dealer_id=${dealerId}&status=available&limit=100`)
      .then(r => setVehicles(r.items || []))
      .catch(() => {});
  }, [enabled, dealerId]);

  const runAnalysis = async (vehicleId: string) => {
    if (!vehicleId) return;
    setSelectedVehicle(vehicleId);
    setLoadingAnalysis(true);
    try {
      const res = await api.get<any>(`/global-trade/dealer/${dealerId}/export-analysis/${vehicleId}`);
      setAnalysis(res);
    } catch { setAnalysis(null); }
    finally { setLoadingAnalysis(false); }
  };

  if (checking) return (
    <div style={{ padding: 60, textAlign: 'center' }}><RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', color: '#9CA3AF' }} /></div>
  );

  if (!dealerId) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 12, padding: 24, textAlign: 'center' }}>
      <AlertTriangle size={28} style={{ color: '#C1272D' }} />
      <p style={{ fontWeight: 700, color: '#111827', margin: 0 }}>You need to be signed in as a dealer to view this page.</p>
      <a href="/login" style={{ padding: '9px 20px', background: '#C1272D', color: 'white', borderRadius: 9, textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>Sign in</a>
    </div>
  );

  if (!enabled) return (
    <div style={{ maxWidth: 560, margin: '60px auto', padding: 24, textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
        <Lock size={26} style={{ color: '#9CA3AF' }} />
      </div>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>Global Trade Intelligence — Premium</h1>
      <p style={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 4px' }}>
        See the best countries to export each of your vehicles, landed costs, taxes, recommended pricing, net margins, and AI demand forecasts across the world — powered by SnapHubTrade.com's global automotive trade data lake.
      </p>
      <p style={{ color: '#9CA3AF', fontSize: '0.82rem', margin: '14px 0 0' }}>
        This feature is not yet enabled for your account. Contact your account administrator to activate it as part of your subscription.
      </p>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe2 size={20} style={{ color: '#0E7490' }} /> Global Trade Intelligence
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0' }}>Find the best markets to export your stock, with real landed-cost and margin estimates.</p>
      </div>

      {/* Vehicle picker + per-country analysis */}
      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, padding: 18, marginBottom: 24 }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Analyze a vehicle</p>
        <select value={selectedVehicle} onChange={e => runAnalysis(e.target.value)} className="input-white" style={{ maxWidth: 420 }}>
          <option value="">Select a vehicle from your stock…</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model} — {formatPrice(v.price_aed)}</option>)}
        </select>

        {loadingAnalysis && <div style={{ marginTop: 16 }}><RefreshCw size={18} style={{ animation: 'spin 1s linear infinite', color: '#9CA3AF' }} /></div>}

        {analysis && !loadingAnalysis && (
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {analysis.destinations.slice(0, 15).map(d => {
              const isOpen = expanded === d.country;
              return (
                <div key={d.country} style={{ border: '1px solid #F3F4F6', borderRadius: 12, overflow: 'hidden' }}>
                  <button onClick={() => setExpanded(isOpen ? null : d.country)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#FAFAFA', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.88rem' }}>{d.country_name}</p>
                      <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: 0 }}>{d.region}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 800, color: '#059669', margin: 0, fontSize: '0.88rem' }}>{d.est_net_margin_pct}% margin</p>
                      <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: 0 }}>{formatPrice(d.est_net_margin_aed)} net</p>
                    </div>
                    <span style={{ fontSize: '0.68rem', padding: '3px 9px', borderRadius: 20, fontWeight: 700, background: d.market.risk_score >= 65 ? '#FEE2E2' : d.market.risk_score >= 45 ? '#FEF3C7' : '#D1FAE5', color: d.market.risk_score >= 65 ? '#991B1B' : d.market.risk_score >= 45 ? '#92400E' : '#065F46' }}>
                      risk {d.market.risk_score}
                    </span>
                    {isOpen ? <ChevronUp size={16} color="#9CA3AF" /> : <ChevronDown size={16} color="#9CA3AF" />}
                  </button>
                  {isOpen && (
                    <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                      <div>
                        <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', margin: '0 0 6px' }}>Recommended price</p>
                        <p style={{ fontWeight: 800, color: '#111827', margin: 0, fontSize: '1rem' }}>{formatPrice(d.recommended_price_aed)}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', margin: '0 0 6px' }}>Landed cost breakdown</p>
                        <p style={{ fontSize: '0.78rem', color: '#374151', margin: '2px 0' }}>Freight: {formatPrice(d.costs.freight_aed)}</p>
                        <p style={{ fontSize: '0.78rem', color: '#374151', margin: '2px 0' }}>Duty: {formatPrice(d.costs.duty_aed)}</p>
                        <p style={{ fontSize: '0.78rem', color: '#374151', margin: '2px 0' }}>VAT/fees: {formatPrice(d.costs.vat_aed + d.costs.other_fees_aed)}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', margin: '0 0 6px' }}>Logistics</p>
                        <p style={{ fontSize: '0.78rem', color: '#374151', margin: '2px 0', display: 'flex', alignItems: 'center', gap: 5 }}><Ship size={12} /> {d.recommended_port}</p>
                        <p style={{ fontSize: '0.78rem', color: '#374151', margin: '2px 0', display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={12} /> {d.transit_days}d transit</p>
                        <p style={{ fontSize: '0.74rem', color: '#9CA3AF', margin: '2px 0' }}>{d.shipping_lines.join(', ')}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', margin: '0 0 6px' }}>Regulations</p>
                        <p style={{ fontSize: '0.76rem', color: '#374151', margin: 0, lineHeight: 1.5 }}>{d.regulations}</p>
                        {d.restrictions && <p style={{ fontSize: '0.74rem', color: '#B91C1C', margin: '4px 0 0' }}>⚠ {d.restrictions}</p>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {intel && (
        <>
          {/* AI forecasts 3/6/12 months */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 10px', fontSize: '1rem' }}>AI demand forecasts</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {[3, 6, 12].map(h => {
                const top = intel.forecasts.filter(f => f.horizon_months === h).sort((a, b) => b.demand_index - a.demand_index).slice(0, 3);
                return (
                  <div key={h} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: 14 }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', margin: '0 0 8px' }}>{h}-month outlook</p>
                    {top.map(f => (
                      <div key={f.dest_country} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                        <span style={{ fontSize: '0.8rem', color: '#374151' }}>{f.country_name}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0E7490' }}>{f.demand_index}/100</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Growth markets vs markets to avoid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 14, padding: 16 }}>
              <p style={{ fontWeight: 700, color: '#065F46', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={15} /> Markets in strong growth</p>
              {intel.growth_markets.slice(0, 6).map(m => (
                <div key={m.country} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.82rem' }}>
                  <span style={{ color: '#065F46' }}>{m.name}</span>
                  <span style={{ fontWeight: 700, color: '#059669' }}>+{m.growth_pct}%</span>
                </div>
              ))}
            </div>
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: 16 }}>
              <p style={{ fontWeight: 700, color: '#991B1B', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}><ShieldAlert size={15} /> Markets to approach with caution</p>
              {intel.markets_to_avoid.slice(0, 6).map(m => (
                <div key={m.country} style={{ padding: '4px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span style={{ color: '#991B1B' }}>{m.name}</span>
                    <span style={{ fontWeight: 700 }}>risk {m.risk_score}</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#B91C1C', margin: 0 }}>{m.reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Live opportunities */}
          <div>
            <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 10px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={16} style={{ color: '#7C3AED' }} /> Export opportunities right now
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {intel.opportunities.slice(0, 9).map(o => (
                <div key={o.id} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: 14 }}>
                  <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 4px', fontSize: '0.86rem' }}>{o.headline}</p>
                  <p style={{ fontSize: '0.74rem', color: '#6B7280', margin: '0 0 8px', lineHeight: 1.4 }}>{o.rationale}</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: 20, background: '#D1FAE5', color: '#065F46', fontWeight: 700 }}>Profit {o.profitability_score}</span>
                    {o.est_margin_pct != null && <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: 20, background: '#ECFEFF', color: '#0E7490', fontWeight: 700 }}>~{o.est_margin_pct}% margin</span>}
                  </div>
                </div>
              ))}
              {!intel.opportunities.length && <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>No live opportunities right now — check back soon.</p>}
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
