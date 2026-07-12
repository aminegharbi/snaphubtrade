'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { Brain, TrendingUp, TrendingDown, BarChart3, Target, Zap, RefreshCw,
         ArrowUpRight, ArrowDownRight, Car, CheckCircle2, AlertTriangle, Globe,
         Database, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { usePriceFormatter } from '@/components/common/Price';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PriceAlert {
  vehicle_id: string; vehicle_name: string;
  current_price_aed: number; suggested_price_aed: number;
  delta_pct: number; status: 'overpriced' | 'underpriced' | 'optimal';
  urgency: 'high' | 'medium' | 'low';
  recommendation: string;
  days_listed: number; view_count: number;
}

interface PriceSummary {
  total_vehicles: number; optimal: number; overpriced: number; underpriced: number;
  high_urgency: number; potential_revenue_gain_aed: number;
}

interface Benchmark {
  id: string; make: string; model: string; year: number; source: string;
  avg_price_aed: string; min_price_aed: string; max_price_aed: string;
  listing_count: number; demand_level: string; trend_pct: string; confidence_pct: number;
  fetched_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchBenchmark(alert: PriceAlert, benchmarks: Benchmark[]): Benchmark | null {
  const nameParts = alert.vehicle_name.split(' ');
  const year  = parseInt(nameParts[0]);
  const make  = nameParts[1] || '';
  const model = nameParts.slice(2).join(' ');
  return benchmarks.find(b =>
    b.make.toLowerCase() === make.toLowerCase() &&
    b.model.toLowerCase().includes(model.split(' ')[0].toLowerCase()) &&
    Math.abs(b.year - year) <= 2
  ) || null;
}

const DEMAND_CFG: Record<string, { label: string; color: string; bg: string }> = {
  very_high: { label: 'Very high',  color: '#065F46', bg: '#D1FAE5' },
  high:      { label: 'High',       color: '#1E40AF', bg: '#DBEAFE' },
  medium:    { label: 'Medium',     color: '#92400E', bg: '#FEF3C7' },
  low:       { label: 'Low',        color: '#991B1B', bg: '#FEE2E2' },
};

// ─── Price Bar ────────────────────────────────────────────────────────────────
function PriceBar({ min, max, avg, mine }: { min:number; max:number; avg:number; mine:number }) {
  const formatPrice = usePriceFormatter();
  const range = max - min || 1;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / range) * 100));
  return (
    <div style={{ position:'relative', height:8, background:'#F3F4F6', borderRadius:4, margin:'10px 0' }}>
      <div style={{ position:'absolute', left:`${pct(min)}%`, right:`${100-pct(max)}%`, top:0, bottom:0, background:'#DBEAFE', borderRadius:4 }} />
      <div style={{ position:'absolute', left:`${pct(avg)}%`, top:-3, width:2, height:14, background:'#3B82F6', borderRadius:1, transform:'translateX(-50%)' }} title={`Market avg ${formatPrice(avg)}`} />
      <div style={{ position:'absolute', left:`${pct(mine)}%`, top:-4, width:14, height:14, background:mine>avg?'#C1272D':'#007A3D', borderRadius:'50%', transform:'translateX(-50%)', border:'2px solid white', boxShadow:'0 1px 4px rgba(0,0,0,0.15)' }} title={`Your price ${formatPrice(mine)}`} />
    </div>
  );
}

// ─── AI Report Panel ──────────────────────────────────────────────────────────
function AIReportPanel({ alerts, benchmarks, dealerId }: { alerts:PriceAlert[]; benchmarks:Benchmark[]; dealerId:string }) {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true); setReport('');
    try {
      // Build portfolio with real benchmark cross-reference
      const portfolio = alerts.map(a => {
        const bench = matchBenchmark(a, benchmarks);
        return {
          ...a,
          benchmark: bench ? {
            market_avg: Number(bench.avg_price_aed),
            source: bench.source,
            listings: bench.listing_count,
            trend: Number(bench.trend_pct),
            demand: bench.demand_level,
          } : null,
        };
      });

      const res = await fetch('/api/v1/ai/pricing-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio, benchmarks, dealer_id: dealerId }),
      });
      const data = await res.json();
      if (data.report) {
        // Stream character by character
        let i = 0;
        const iv = setInterval(() => {
          setReport(t => t + (data.report[i] || ''));
          i++;
          if (i >= data.report.length) { clearInterval(iv); setLoading(false); }
        }, 7);
        return;
      }
    } catch { /* fall through */ }
    setReport('Could not generate report — check that the AI service is running.');
    setLoading(false);
  };

  const formatted = report.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#111827">$1</strong>');

  return (
    <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:16, overflow:'hidden' }}>
      <div style={{ padding:'14px 18px', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#FAFAFA' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Brain size={17} style={{ color:'#8B5CF6' }} />
          <p style={{ fontWeight:700, color:'#111827', margin:0, fontSize:'0.9rem' }}>AI Portfolio Intelligence</p>
          {benchmarks.length > 0 && (
            <span style={{ fontSize:'0.7rem', background:'#EDE9FE', color:'#5B21B6', padding:'2px 8px', borderRadius:20, fontWeight:600 }}>
              {benchmarks.length} live benchmarks
            </span>
          )}
        </div>
        <button onClick={generate} disabled={loading}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:loading?'#E5E7EB':'#8B5CF6', color:loading?'#9CA3AF':'white', border:'none', borderRadius:8, cursor:loading?'default':'pointer', fontWeight:600, fontSize:'0.8rem' }}>
          {loading ? <RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }} /> : <Zap size={13} />}
          {loading ? 'Analysing…' : 'Generate AI report'}
        </button>
      </div>
      <div style={{ padding:18, minHeight:160 }}>
        {!report && !loading && (
          <div style={{ textAlign:'center', padding:'28px 0', color:'#9CA3AF' }}>
            <Brain size={28} style={{ margin:'0 auto 10px', display:'block', opacity:0.3 }} />
            <p style={{ fontWeight:500, marginBottom:4 }}>AI Portfolio Intelligence</p>
            <p style={{ fontSize:'0.82rem' }}>
              {benchmarks.length > 0
                ? `${benchmarks.length} live market benchmarks loaded from Dubizzle/DubiCars. Click to generate your personalized pricing report.`
                : 'Generate a report based on your portfolio. Run the AI market refresh (Admin → AI Market Analysis) to load live Dubizzle/DubiCars benchmarks.'}
            </p>
          </div>
        )}
        {report && (
          <div style={{ fontSize:'0.875rem', color:'#374151', lineHeight:1.75 }}
            dangerouslySetInnerHTML={{ __html: formatted.replace(/\n/g, '<br/>') }} />
        )}
        {loading && !report && (
          <div style={{ textAlign:'center', padding:'28px 0', color:'#9CA3AF' }}>
            <RefreshCw size={18} style={{ animation:'spin 1s linear infinite', display:'block', margin:'0 auto 8px' }} />
            <p style={{ fontSize:'0.82rem' }}>AI is analysing your portfolio vs live market data…</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const { t } = useLocale();
  const formatPrice = usePriceFormatter();
  const [alerts, setAlerts]         = useState<PriceAlert[]>([]);
  const [summary, setSummary]       = useState<PriceSummary | null>(null);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<string | null>(null);
  const [applying, setApplying]     = useState<string | null>(null);
  const [toast, setToast]           = useState('');
  const [filter, setFilter]         = useState<'all'|'overpriced'|'underpriced'|'optimal'>('all');
  const [dealerId, setDealerId]     = useState('');

  const load = useCallback(async (did: string) => {
    setLoading(true);
    try {
      // Fetch real price analysis from backend + live market benchmarks in parallel
      const [analysis, benchRes] = await Promise.all([
        api.get<any>(`/dealer-dashboard/${did}/price-analysis`).catch(() => null),
        fetch('/api/v1/market-analysis/benchmarks').then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      if (analysis) {
        setAlerts(analysis.alerts || analysis.vehicles || []);
        setSummary(analysis.summary || null);
      }
      setBenchmarks(Array.isArray(benchRes) ? benchRes : []);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, []);

  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [gtiOpportunities, setGtiOpportunities] = useState<any[]>([]);

  useEffect(() => {
    const did = localStorage.getItem('dealer_id') || '';
    setDealerId(did);
    if (!did) { setNotLoggedIn(true); setLoading(false); return; }
    load(did);
    // Global Trade Intelligence cross-sell — silently no-ops with a 403 if
    // the admin hasn't enabled the premium feature for this dealer, so this
    // never breaks the pricing page for accounts without access.
    api.get<any>(`/global-trade/dealer/${did}/market-intel`)
      .then(intel => setGtiOpportunities(intel.opportunities || []))
      .catch(() => setGtiOpportunities([]));
  }, [load]);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const applyPrice = async (vehicleId: string, price: number) => {
    setApplying(vehicleId);
    try {
      await api.patch(`/vehicles/${vehicleId}`, { price_aed: price });
      setAlerts(as => as.map(a => a.vehicle_id === vehicleId ? { ...a, current_price_aed: price } : a));
      showToast(`Price updated to ${formatPrice(price)}`);
    } catch { showToast('Update failed'); }
    finally { setApplying(null); }
  };

  const applyAll = async () => {
    const toApply = filtered.filter(a => a.status !== 'optimal');
    for (const a of toApply) {
      try {
        await api.post(`/dealer-dashboard/${dealerId}/price-analysis/${a.vehicle_id}/apply`, {});
        setAlerts(as => as.map(x => x.vehicle_id === a.vehicle_id ? { ...x, current_price_aed: a.suggested_price_aed } : x));
      } catch { /* non-fatal */ }
    }
    await load(dealerId);
    showToast(`${toApply.length} prices updated`);
  };

  const filtered = alerts.filter(a => filter === 'all' || a.status === filter);
  const overpricedCount  = alerts.filter(a => a.status === 'overpriced').length;
  const underpricedCount = alerts.filter(a => a.status === 'underpriced').length;
  const optimalCount     = alerts.filter(a => a.status === 'optimal').length;
  const potentialGain    = summary?.potential_revenue_gain_aed || alerts.filter(a => a.status === 'underpriced')
    .reduce((s, a) => s + (a.suggested_price_aed - a.current_price_aed), 0);

  if (notLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'50vh', gap:12, padding:24, textAlign:'center' }}>
      <AlertTriangle size={28} style={{ color:'#C1272D' }} />
      <p style={{ fontWeight:700, color:'#111827', margin:0 }}>You need to be signed in as a dealer to view Pricing AI.</p>
      <a href="/login" style={{ padding:'9px 20px', background:'#C1272D', color:'white', borderRadius:9, textDecoration:'none', fontWeight:600, fontSize:'0.875rem' }}>Sign in</a>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#F9FAFB' }}>
      {toast && (
        <div style={{ position:'fixed', top:16, right:16, zIndex:50, background:'#111827', color:'white', padding:'10px 16px', borderRadius:10, fontSize:'0.875rem', fontWeight:500 }}>{toast}</div>
      )}

      <div style={{ background:'white', borderBottom:'1px solid #E5E7EB', padding:'16px 24px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontWeight:700, fontSize:'1.1rem', color:'#111827', margin:0 }}>{t('dealer.pricing.title')}</h1>
            <p style={{ fontSize:'0.8rem', color:'#6B7280', margin:0 }}>
              {benchmarks.length > 0
                ? `${benchmarks.length} live Dubizzle/DubiCars benchmarks · ${alerts.length} vehicles analysed`
                : `${alerts.length} vehicles analysed · Add AI benchmarks via Admin → AI Market Analysis`}
            </p>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {potentialGain > 0 && (
              <div style={{ background:'#D1FAE5', border:'1px solid #A7F3D0', borderRadius:10, padding:'8px 14px', fontSize:'0.82rem', color:'#065F46', fontWeight:600 }}>
                ↑ +{formatPrice(potentialGain)} potential if repriced
              </div>
            )}
            {filtered.some(a => a.status !== 'optimal') && (
              <button onClick={applyAll}
                style={{ padding:'8px 16px', background:'#C1272D', color:'white', border:'none', borderRadius:10, fontWeight:600, fontSize:'0.82rem', cursor:'pointer' }}>
                Apply all recommendations
              </button>
            )}
          </div>
        </div>
      </div>

      {gtiOpportunities.length > 0 && (
        <div style={{ maxWidth: 1280, margin: '16px auto 0', padding: '0 16px' }}>
          <a href="/dealer/global-trade" style={{ display: 'block', textDecoration: 'none' }}>
            <div style={{ background: 'linear-gradient(135deg, #ECFEFF, #FFFFFF)', border: '1px solid #A5F3FC', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.3rem' }}>🌍</span>
              <div style={{ flex: 1, minWidth: 220 }}>
                <p style={{ fontWeight: 700, color: '#0E7490', margin: 0, fontSize: '0.88rem' }}>
                  {gtiOpportunities.length} export {gtiOpportunities.length > 1 ? 'opportunities' : 'opportunity'} for your stock — Global Trade Intelligence
                </p>
                <p style={{ fontSize: '0.78rem', color: '#155E75', margin: '2px 0 0' }}>{gtiOpportunities[0].headline} · ~{gtiOpportunities[0].est_margin_pct ?? '—'}% est. margin</p>
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0E7490' }}>View all →</span>
            </div>
          </a>
        </div>
      )}

      <div style={{ maxWidth:1280, margin:'0 auto', padding:'24px 16px', display:'flex', flexDirection:'column', gap:20 }}>
        {/* AI Report */}
        <AIReportPanel alerts={alerts} benchmarks={benchmarks} dealerId={dealerId} />

        {/* Benchmark status banner */}
        {benchmarks.length === 0 && (
          <div style={{ background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
            <Database size={18} style={{ color:'#C2410C', flexShrink:0 }} />
            <div>
              <p style={{ fontWeight:600, color:'#9A3412', margin:'0 0 2px', fontSize:'0.875rem' }}>No live market benchmarks yet</p>
              <p style={{ color:'#C2410C', fontSize:'0.8rem', margin:0 }}>
                Go to <a href="/admin/market-analysis" style={{ fontWeight:700, color:'#C1272D' }}>Admin → AI Market Analysis</a> and run a refresh to pull live Dubizzle & DubiCars prices. The pricing analysis below uses your own DB data in the meantime.
              </p>
            </div>
          </div>
        )}

        {/* KPI cards */}
        <div className="da-kpi-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12 }}>
          {[
            { label:'Vehicles analysed', value:alerts.length, icon:Car,           color:'#374151' },
            { label:'Underpriced',       value:underpricedCount, icon:ArrowUpRight, color:'#065F46', sub:`+${formatPrice(potentialGain)} potential` },
            { label:'Overpriced',        value:overpricedCount,  icon:ArrowDownRight, color:'#C1272D', sub:'above market estimate' },
            { label:'Optimal',           value:optimalCount,     icon:CheckCircle2, color:'#3B82F6', sub:'no change needed' },
          ].map(s => (
            <div key={s.label} style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 18px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <p style={{ fontSize:'0.68rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.06em', margin:0 }}>{s.label}</p>
                <s.icon size={14} style={{ color:s.color }} />
              </div>
              <p style={{ fontSize:'1.6rem', fontWeight:800, color:s.color, margin:'0 0 2px' }}>{s.value}</p>
              {s.sub && <p style={{ fontSize:'0.72rem', color:'#9CA3AF', margin:0 }}>{s.sub}</p>}
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {[
            { v:'all',        l:`All (${alerts.length})` },
            { v:'underpriced',l:`↑ Underpriced (${underpricedCount})` },
            { v:'overpriced', l:`↓ Overpriced (${overpricedCount})` },
            { v:'optimal',    l:`✓ Optimal (${optimalCount})` },
          ].map(opt => (
            <button key={opt.v} onClick={() => setFilter(opt.v as any)}
              style={{ padding:'7px 14px', borderRadius:8, fontSize:'0.8rem', fontWeight:500, cursor:'pointer', border:'1.5px solid', borderColor:filter===opt.v?'#C1272D':'#E5E7EB', background:filter===opt.v?'#FFF1F2':'white', color:filter===opt.v?'#C1272D':'#6B7280' }}>
              {opt.l}
            </button>
          ))}
        </div>

        {/* Vehicle cards */}
        {loading ? (
          <div style={{ textAlign:'center', padding:48, color:'#9CA3AF' }}>
            <RefreshCw size={22} style={{ animation:'spin 1s linear infinite', display:'block', margin:'0 auto 12px' }} />
            <p>Loading pricing analysis…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:48, color:'#9CA3AF' }}>
            <CheckCircle2 size={32} style={{ margin:'0 auto 12px', display:'block', color:'#34D399' }} />
            <p style={{ fontWeight:500 }}>All vehicles are optimally priced</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filtered.map(a => {
              const bench = matchBenchmark(a, benchmarks);
              const marketAvg = bench ? Number(bench.avg_price_aed) : a.suggested_price_aed;
              const marketMin = bench ? Number(bench.min_price_aed) : Math.round(marketAvg * 0.92);
              const marketMax = bench ? Number(bench.max_price_aed) : Math.round(marketAvg * 1.09);
              const diff = ((a.current_price_aed - marketAvg) / marketAvg * 100);
              const isOver = a.current_price_aed > marketAvg;
              const urgColor = a.urgency==='high'?'#C1272D':a.urgency==='medium'?'#92400E':'#374151';
              const urgBg   = a.urgency==='high'?'#FEE2E2':a.urgency==='medium'?'#FEF3C7':'#F3F4F6';
              const demand = bench ? DEMAND_CFG[bench.demand_level] || DEMAND_CFG.medium : null;

              return (
                <div key={a.vehicle_id}
                  onClick={() => setSelected(selected === a.vehicle_id ? null : a.vehicle_id)}
                  style={{ background:'white', border:`2px solid ${selected===a.vehicle_id?'#C1272D':'#E5E7EB'}`, borderRadius:14, overflow:'hidden', cursor:'pointer', transition:'border-color 0.15s' }}>

                  <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                    {/* Name */}
                    <div style={{ flex:1, minWidth:160 }}>
                      <p style={{ fontWeight:700, color:'#111827', margin:'0 0 2px', fontSize:'0.9rem' }}>{a.vehicle_name}</p>
                      <p style={{ color:'#9CA3AF', margin:0, fontSize:'0.75rem' }}>
                        {a.days_listed}d listed · {a.view_count} views
                        {bench && <span style={{ marginLeft:6, color:'#3B82F6' }}>· {bench.source} data</span>}
                      </p>
                    </div>

                    {/* My price */}
                    <div style={{ textAlign:'center', minWidth:120 }}>
                      <p style={{ fontSize:'0.65rem', color:'#9CA3AF', margin:'0 0 1px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Your price</p>
                      <p style={{ fontWeight:800, fontSize:'1.05rem', color:'#111827', margin:0 }}>{formatPrice(a.current_price_aed)}</p>
                    </div>

                    {/* Market */}
                    <div style={{ textAlign:'center', minWidth:130 }}>
                      <p style={{ fontSize:'0.65rem', color:'#9CA3AF', margin:'0 0 1px', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                        {bench ? `${bench.source} avg` : 'Estimated avg'}
                      </p>
                      <p style={{ fontWeight:700, fontSize:'1rem', color:'#374151', margin:0 }}>{formatPrice(marketAvg)}</p>
                      <p style={{ fontSize:'0.72rem', fontWeight:600, color:isOver?'#C1272D':'#007A3D', margin:0 }}>
                        {isOver?'▲':'▼'} {Math.abs(diff).toFixed(1)}% {isOver?'above':'below'}
                      </p>
                    </div>

                    {/* Demand (only when benchmark exists) */}
                    {demand && (
                      <span style={{ fontSize:'0.72rem', padding:'3px 10px', borderRadius:20, fontWeight:600, background:demand.bg, color:demand.color, whiteSpace:'nowrap' }}>
                        {demand.label}
                      </span>
                    )}

                    {/* Trend */}
                    {bench && (
                      <div style={{ display:'flex', alignItems:'center', gap:4, minWidth:55 }}>
                        {Number(bench.trend_pct)>=0 ? <TrendingUp size={13} color="#007A3D" /> : <TrendingDown size={13} color="#C1272D" />}
                        <span style={{ fontSize:'0.78rem', fontWeight:600, color:Number(bench.trend_pct)>=0?'#007A3D':'#C1272D' }}>
                          {Number(bench.trend_pct)>=0?'+':''}{Number(bench.trend_pct).toFixed(1)}%
                        </span>
                      </div>
                    )}

                    {/* Urgency + status */}
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      {a.status !== 'optimal' && (
                        <span style={{ fontSize:'0.68rem', padding:'2px 8px', borderRadius:10, fontWeight:700, background:urgBg, color:urgColor }}>{a.urgency}</span>
                      )}
                      <span style={{ fontSize:'0.75rem', padding:'4px 12px', borderRadius:20, fontWeight:600,
                        background: a.status==='underpriced'?'#D1FAE5': a.status==='overpriced'?'#FEE2E2':'#F3F4F6',
                        color:      a.status==='underpriced'?'#065F46': a.status==='overpriced'?'#991B1B':'#374151' }}>
                        {a.status === 'underpriced' ? '↑ Raise' : a.status === 'overpriced' ? '↓ Lower' : '✓ Hold'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded */}
                  {selected === a.vehicle_id && (
                    <div style={{ borderTop:'1px solid #F3F4F6', padding:'16px 18px', background:'#FAFAFA' }}>
                      <PriceBar min={marketMin} max={marketMax} avg={marketAvg} mine={a.current_price_aed} />
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.72rem', color:'#9CA3AF', marginBottom:14 }}>
                        <span>{formatPrice(marketMin)} min</span>
                        <span style={{ color:'#3B82F6' }}>● {formatPrice(marketAvg)} avg</span>
                        <span>{formatPrice(marketMax)} max</span>
                      </div>

                      {/* Details grid */}
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:10, marginBottom:14 }}>
                        {bench && [
                          { label:'Active listings', value:`${bench.listing_count} on ${bench.source}` },
                          { label:'AI confidence',   value:`${bench.confidence_pct}%` },
                          { label:'Data freshness',  value:new Date(bench.fetched_at).toLocaleDateString() },
                        ].map(s => (
                          <div key={s.label} style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:8, padding:'8px 12px' }}>
                            <p style={{ fontSize:'0.65rem', color:'#9CA3AF', margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'0.04em' }}>{s.label}</p>
                            <p style={{ fontWeight:700, color:'#111827', margin:0, fontSize:'0.82rem' }}>{s.value}</p>
                          </div>
                        ))}
                        <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:8, padding:'8px 12px' }}>
                          <p style={{ fontSize:'0.65rem', color:'#9CA3AF', margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'0.04em' }}>Suggested price</p>
                          <p style={{ fontWeight:700, color:'#111827', margin:0, fontSize:'0.82rem' }}>{formatPrice(a.suggested_price_aed)}</p>
                        </div>
                      </div>

                      {/* Recommendation text */}
                      {a.recommendation && (
                        <p style={{ fontSize:'0.82rem', color:'#374151', margin:'0 0 14px', padding:'10px 14px', background:'#F9FAFB', borderRadius:8, borderLeft:'3px solid #C1272D' }}>
                          {a.recommendation}
                        </p>
                      )}

                      {a.status !== 'optimal' && (
                        <button
                          onClick={e => { e.stopPropagation(); applyPrice(a.vehicle_id, a.suggested_price_aed); }}
                          disabled={applying === a.vehicle_id}
                          style={{ padding:'9px 20px', background:a.status==='underpriced'?'#007A3D':'#C1272D', color:'white', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer', fontSize:'0.875rem', display:'flex', alignItems:'center', gap:8, opacity:applying===a.vehicle_id?0.7:1 }}>
                          {applying === a.vehicle_id ? <RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }} /> : <Target size={13} />}
                          Apply: {formatPrice(a.suggested_price_aed)}
                          {a.status==='underpriced'
                            ? ` (+${formatPrice(a.suggested_price_aed - a.current_price_aed)})`
                            : ` (-${formatPrice(a.current_price_aed - a.suggested_price_aed)})`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
