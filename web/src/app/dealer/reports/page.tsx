'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import Link from 'next/link';
import {
  Brain, TrendingUp, TrendingDown, BarChart3, RefreshCw,
  Zap, AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Calendar, Eye, Car, DollarSign, Award, Download, ChevronDown, ChevronUp
} from 'lucide-react';
import { usePriceFormatter } from '@/components/common/Price';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Report {
  id: string; week_start: string; week_end: string; status: string;
  total_units: number; available_units: number; sold_this_week: number;
  total_views: number; avg_price_aed: number; market_avg_price: number;
  price_position: string; price_diff_pct: number;
  ai_summary: string; ai_recommendations: Rec[]; ai_alerts: Alert[];
  market_data: { vehicle_analysis?: VehicleAnalysis[]; top_brokers?: Broker[] };
  generated_at: string; created_at: string;
}

interface Rec {
  type: string; vehicle: string; current: number; target: number;
  gain?: number; priority: string;
}

interface Alert {
  type: string; message: string;
}

interface VehicleAnalysis {
  vehicle: string; my_price: number; qty: number;
  dubizzle_avg: number; dubizzle_min: number; dubizzle_max: number; dubizzle_count: number;
  dubicars_avg: number; dubicars_min: number; dubicars_max: number; dubicars_count: number;
  demand: string; trend_pct: number; avg_days_listed: number;
  price_vs_dubizzle_pct: number; recommendation: string; potential_gain: number;
}

interface Broker { name: string; tier: string; country: string; deals: number; revenue: number; commission: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEMAND_CFG: Record<string, { label: string; color: string; bg: string }> = {
  very_high: { label: 'Very High', color: '#065F46', bg: '#D1FAE5' },
  high:      { label: 'High',      color: '#1E40AF', bg: '#DBEAFE' },
  medium:    { label: 'Medium',    color: '#92400E', bg: '#FEF3C7' },
  low:       { label: 'Low',       color: '#991B1B', bg: '#FEE2E2' },
};

const POSITION_CFG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  above_market: { label: 'Above market', color: '#C1272D', bg: '#FEE2E2', icon: ArrowUpRight },
  at_market:    { label: 'At market',    color: '#007A3D', bg: '#D1FAE5', icon: CheckCircle2 },
  below_market: { label: 'Below market', color: '#3B82F6', bg: '#DBEAFE', icon: ArrowDownRight },
};

const TIER_COLORS: Record<string, string> = { Elite: '#C1272D', Pro: '#007A3D', Active: '#3B82F6', Starter: '#6B7280' };
const MEDALS = ['🥇', '🥈', '🥉'];

function fmtPct(n: number) { return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }

// ─── Price bar ────────────────────────────────────────────────────────────────

function PriceBar({ min, max, mine, avg, label }: { min: number; max: number; mine: number; avg: number; label: string }) {
  const formatPrice = usePriceFormatter();
  const range = max - min || 1;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / range) * 100));
  return (
    <div>
      <p style={{ fontSize: '0.68rem', color: '#9CA3AF', margin: '0 0 3px', fontWeight: 600 }}>{label}</p>
      <div style={{ position: 'relative', height: 10, background: '#F3F4F6', borderRadius: 5, marginBottom: 4 }}>
        <div style={{ position: 'absolute', left: `${pct(min)}%`, right: `${100-pct(max)}%`, top: 0, bottom: 0, background: '#DBEAFE', borderRadius: 5 }} />
        <div style={{ position: 'absolute', left: `${pct(avg)}%`, top: -2, width: 2, height: 14, background: '#3B82F6', borderRadius: 1, transform: 'translateX(-50%)' }} />
        <div style={{ position: 'absolute', left: `${pct(mine)}%`, top: -3, width: 16, height: 16, background: mine > avg ? '#C1272D' : '#007A3D', borderRadius: '50%', transform: 'translateX(-50%)', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#9CA3AF' }}>
        <span>Min {formatPrice(min)}</span>
        <span style={{ color: '#3B82F6' }}>Avg {formatPrice(avg)}</span>
        <span>Max {formatPrice(max)}</span>
      </div>
    </div>
  );
}

// ─── Report card (summary) ────────────────────────────────────────────────────

function ReportCard({ report, selected, onSelect }: { report: Report; selected: boolean; onSelect: () => void }) {
  const pos = POSITION_CFG[report.price_position] || POSITION_CFG.at_market;
  const PosIcon = pos.icon;
  return (
    <button onClick={onSelect}
      style={{ width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 12, border: `2px solid ${selected ? '#C1272D' : '#E5E7EB'}`, background: selected ? '#FFF1F2' : 'white', cursor: 'pointer', transition: 'all 0.15s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 2px', fontSize: '0.875rem' }}>
            {fmtDate(report.week_start)} – {fmtDate(report.week_end)}
          </p>
          <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.75rem' }}>
            Generated {fmtDate(report.generated_at || report.created_at)}
          </p>
        </div>
        <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 20, fontWeight: 600, background: pos.bg, color: pos.color, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <PosIcon size={11} /> {pos.label}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { label: 'Units in stock', value: report.total_units },
          { label: 'Sold', value: report.sold_this_week },
          { label: 'Views', value: report.total_views?.toLocaleString() },
        ].map(s => (
          <div key={s.label}>
            <p style={{ fontSize: '0.68rem', color: '#9CA3AF', margin: '0 0 1px' }}>{s.label}</p>
            <p style={{ fontWeight: 700, color: '#374151', margin: 0, fontSize: '0.875rem' }}>{s.value}</p>
          </div>
        ))}
      </div>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { t } = useLocale();
  const formatPrice = usePriceFormatter();
  const [reports, setReports]         = useState<Report[]>([]);
  const [selected, setSelected]       = useState<Report | null>(null);
  const [loading, setLoading]         = useState(true);
  const [generating, setGenerating]   = useState(false);
  const [dealerId, setDealerId]       = useState('');
  const [expandedVehicle, setExpanded]= useState<string | null>(null);
  const [toast, setToast]             = useState('');

  useEffect(() => {
    const did = localStorage.getItem('dealer_id') || '';
    setDealerId(did);
    fetch(`/api/v1/reports/dealer/${did}`)
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setReports(arr);
        if (arr.length > 0) setSelected(arr[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const generate = async () => {
    setGenerating(true);
    setToast('');
    try {
      const res = await fetch(`/api/v1/reports/dealer/${dealerId}/generate`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const report: Report = await res.json();
      setReports(prev => [report, ...prev]);
      setSelected(report);
      setToast('✓ Report generated');
      setTimeout(() => setToast(''), 3000);
    } catch {
      setToast('Generation failed — check API key');
      setTimeout(() => setToast(''), 3000);
    } finally { setGenerating(false); }
  };

  const formatSummary = (text: string) =>
    text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');

  const va: VehicleAnalysis[] = selected?.market_data?.vehicle_analysis || [];
  const topBrokers: Broker[] = selected?.market_data?.top_brokers || [];
  const recs: Rec[] = selected?.ai_recommendations || [];
  const alerts: Alert[] = selected?.ai_alerts || [];
  const pos = selected ? (POSITION_CFG[selected.price_position] || POSITION_CFG.at_market) : null;

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      {toast && <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 50, background: '#111827', color: 'white', padding: '10px 18px', borderRadius: 12, fontSize: '0.875rem', fontWeight: 500 }}>{toast}</div>}

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '16px 24px' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', margin: '0 0 2px' }}>{t('dealer.reports.title')}</h1>
            <p style={{ color: '#6B7280', margin: 0, fontSize: '0.8rem' }}>Positioning vs Dubizzle UAE · DubiCars UAE · Broker performance · AI recommendations</p>
          </div>
          <button onClick={generate} disabled={generating}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: generating ? '#E5E7EB' : 'linear-gradient(135deg, #C1272D, #9B1B23)', color: generating ? '#9CA3AF' : 'white', border: 'none', borderRadius: 12, cursor: generating ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.875rem', boxShadow: generating ? 'none' : '0 4px 12px rgba(193,39,45,0.3)' }}>
            {generating ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Generating with AI…</> : <><Brain size={15} /> Generate this week's report</>}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '24px', display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Left: report history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'sticky', top: 20 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Report history</p>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#9CA3AF' }}>
              <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 8px' }} />
              <p style={{ fontSize: '0.8rem' }}>Loading…</p>
            </div>
          ) : reports.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', background: 'white', borderRadius: 12, border: '1px solid #E5E7EB' }}>
              <Brain size={24} style={{ color: '#D1D5DB', display: 'block', margin: '0 auto 8px' }} />
              <p style={{ fontSize: '0.82rem', color: '#9CA3AF', margin: '0 0 12px' }}>No reports yet</p>
              <button onClick={generate} style={{ padding: '7px 14px', background: '#C1272D', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>
                Generate first report
              </button>
            </div>
          ) : (
            reports.map(r => (
              <ReportCard key={r.id} report={r} selected={selected?.id === r.id} onSelect={() => setSelected(r)} />
            ))
          )}
        </div>

        {/* Right: report detail */}
        {!selected ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, background: 'white', borderRadius: 16, border: '1px solid #E5E7EB' }}>
            <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
              <Brain size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontWeight: 500 }}>Select a report or generate a new one</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* KPI strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {[
                { label: 'Units in stock', value: selected.total_units, icon: Car, color: '#374151' },
                { label: 'Sold this week', value: selected.sold_this_week, icon: CheckCircle2, color: '#007A3D' },
                { label: 'Total views', value: (selected.total_views || 0).toLocaleString(), icon: Eye, color: '#3B82F6' },
                { label: 'Your avg price', value: `AED ${Math.round(selected.avg_price_aed || 0).toLocaleString()}`, icon: DollarSign, color: '#C1272D' },
                {
                  label: 'vs Market avg',
                  value: selected.price_diff_pct ? fmtPct(selected.price_diff_pct) : '—',
                  icon: pos?.icon || BarChart3,
                  color: pos?.color || '#374151',
                  bg: pos?.bg,
                },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg || 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9CA3AF', margin: 0 }}>{s.label}</p>
                    <s.icon size={14} style={{ color: s.color }} />
                  </div>
                  <p style={{ fontWeight: 800, fontSize: '1.1rem', color: s.color, margin: 0 }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1px solid', alignItems: 'flex-start',
                    background: a.type === 'opportunity' ? '#D1FAE5' : a.type === 'warning' ? '#FEF3C7' : '#DBEAFE',
                    borderColor: a.type === 'opportunity' ? '#6EE7B7' : a.type === 'warning' ? '#FDE68A' : '#93C5FD',
                  }}>
                    <span style={{ flexShrink: 0, marginTop: 1 }}>{a.type === 'opportunity' ? '💰' : a.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500,
                      color: a.type === 'opportunity' ? '#065F46' : a.type === 'warning' ? '#92400E' : '#1E40AF' }}>
                      {a.message}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* AI Report */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Brain size={16} style={{ color: '#8B5CF6' }} />
                <p style={{ fontWeight: 700, color: '#111827', margin: 0 }}>AI Market Intelligence Report</p>
                <span style={{ fontSize: '0.72rem', background: '#EDE9FE', color: '#5B21B6', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                  Dubizzle + DubiCars · {fmtDate(selected.generated_at || selected.created_at)}
                </span>
              </div>
              <div style={{ padding: '20px 24px', fontSize: '0.875rem', lineHeight: 1.75, color: '#374151' }}
                dangerouslySetInnerHTML={{ __html: formatSummary(selected.ai_summary || 'Report not yet generated.') }} />
            </div>

            {/* Recommendations */}
            {recs.length > 0 && (
              <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
                  <p style={{ fontWeight: 700, color: '#111827', margin: 0 }}>💡 AI Price Recommendations</p>
                </div>
                <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recs.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 12, background: r.type === 'raise_price' ? '#F0FDF4' : '#FFF1F2', border: `1px solid ${r.type === 'raise_price' ? '#BBF7D0' : '#FECACA'}` }}>
                      {r.type === 'raise_price' ? <ArrowUpRight size={18} style={{ color: '#007A3D', flexShrink: 0 }} /> : <ArrowDownRight size={18} style={{ color: '#C1272D', flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, color: '#111827', margin: '0 0 2px', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.vehicle}</p>
                        <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.78rem' }}>
                          {r.type === 'raise_price' ? '↑ Raise' : '↓ Lower'} from {formatPrice(r.current)} → {formatPrice(r.target)}
                        </p>
                      </div>
                      {r.gain && r.gain > 0 && (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontWeight: 800, color: '#007A3D', margin: 0, fontSize: '0.875rem' }}>+{formatPrice(r.gain)}</p>
                          <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.72rem' }}>potential gain</p>
                        </div>
                      )}
                      <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 10, fontWeight: 700, background: r.priority === 'high' ? '#FEE2E2' : '#FEF3C7', color: r.priority === 'high' ? '#C1272D' : '#92400E', flexShrink: 0 }}>{r.priority}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Competitive analysis table */}
            {va.length > 0 && (
              <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
                  <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>📊 Competitive Price Analysis</p>
                  <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.78rem' }}>Your prices vs Dubizzle UAE + DubiCars UAE live market data</p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                    <thead>
                      <tr style={{ background: '#F9FAFB' }}>
                        {['Vehicle', 'Qty', 'Your price', 'Dubizzle avg', 'DubiCars avg', 'Vs market', 'Demand', 'Trend', 'Action'].map(h => (
                          <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {va.map((v, i) => {
                        const demand = DEMAND_CFG[v.demand] || DEMAND_CFG.medium;
                        const isOver = v.price_vs_dubizzle_pct > 0;
                        const isExpanded = expandedVehicle === String(i);
                        return (
                          <>
                            <tr key={`row-${i}`} style={{ borderTop: '1px solid #F9FAFB', cursor: 'pointer' }}
                              onClick={() => setExpanded(isExpanded ? null : String(i))}>
                              <td style={{ padding: '11px 14px' }}>
                                <p style={{ fontWeight: 600, color: '#111827', margin: 0, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{v.vehicle}</p>
                              </td>
                              <td style={{ padding: '11px 14px' }}>
                                <span style={{ fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>×{v.qty}</span>
                              </td>
                              <td style={{ padding: '11px 14px' }}>
                                <span style={{ fontWeight: 700, color: '#111827', fontSize: '0.875rem' }}>{formatPrice(v.my_price)}</span>
                              </td>
                              <td style={{ padding: '11px 14px' }}>
                                <span style={{ color: '#374151', fontSize: '0.875rem' }}>{formatPrice(v.dubizzle_avg)}</span>
                                <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.72rem' }}>{v.dubizzle_count} listings</p>
                              </td>
                              <td style={{ padding: '11px 14px' }}>
                                <span style={{ color: '#374151', fontSize: '0.875rem' }}>{formatPrice(v.dubicars_avg)}</span>
                                <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.72rem' }}>{v.dubicars_count} listings</p>
                              </td>
                              <td style={{ padding: '11px 14px' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: isOver ? '#C1272D' : '#007A3D' }}>
                                  {isOver ? '▲' : '▼'} {Math.abs(v.price_vs_dubizzle_pct).toFixed(1)}%
                                </span>
                              </td>
                              <td style={{ padding: '11px 14px' }}>
                                <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: demand.bg, color: demand.color, whiteSpace: 'nowrap' }}>{demand.label}</span>
                              </td>
                              <td style={{ padding: '11px 14px' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: v.trend_pct > 0 ? '#007A3D' : '#C1272D' }}>
                                  {v.trend_pct > 0 ? <TrendingUp size={12} style={{ display: 'inline', marginRight: 3 }} /> : <TrendingDown size={12} style={{ display: 'inline', marginRight: 3 }} />}
                                  {fmtPct(v.trend_pct)}/mo
                                </span>
                              </td>
                              <td style={{ padding: '11px 14px' }}>
                                <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: 20, fontWeight: 700, whiteSpace: 'nowrap',
                                  background: v.recommendation === 'raise' ? '#D1FAE5' : v.recommendation === 'lower' ? '#FEE2E2' : '#F3F4F6',
                                  color: v.recommendation === 'raise' ? '#065F46' : v.recommendation === 'lower' ? '#991B1B' : '#374151' }}>
                                  {v.recommendation === 'raise' ? '↑ Raise' : v.recommendation === 'lower' ? '↓ Lower' : '✓ Hold'}
                                </span>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`detail-${i}`}>
                                <td colSpan={9} style={{ padding: '16px 20px', background: '#FAFAFA', borderTop: '1px solid #F3F4F6' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                    <PriceBar min={v.dubizzle_min} max={v.dubizzle_max} mine={v.my_price} avg={v.dubizzle_avg} label="vs Dubizzle UAE" />
                                    <PriceBar min={v.dubicars_min} max={v.dubicars_max} mine={v.my_price} avg={v.dubicars_avg} label="vs DubiCars UAE" />
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 12 }}>
                                    {[
                                      { label: 'Avg days listed (market)', value: `${v.avg_days_listed} days` },
                                      { label: 'Dubizzle listings', value: `${v.dubizzle_count} active` },
                                      { label: 'DubiCars listings', value: `${v.dubicars_count} active` },
                                      { label: 'Potential gain if raised', value: v.potential_gain > 0 ? formatPrice(v.potential_gain) : '—' },
                                    ].map(s => (
                                      <div key={s.label} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px' }}>
                                        <p style={{ fontSize: '0.68rem', color: '#9CA3AF', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</p>
                                        <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.875rem' }}>{s.value}</p>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top brokers this week */}
            {topBrokers.length > 0 && (
              <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
                  <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>🏆 Top Brokers This Week</p>
                  <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.78rem' }}>Brokers who generated revenue for your dealership this week</p>
                </div>
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {topBrokers.map((b, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, background: i === 0 ? '#FFFBEB' : '#F9FAFB', border: `1px solid ${i === 0 ? '#FDE68A' : '#E5E7EB'}` }}>
                      <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{MEDALS[i]}</span>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: (TIER_COLORS[b.tier] || '#6B7280') + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', color: TIER_COLORS[b.tier] || '#6B7280', flexShrink: 0 }}>
                        {b.name?.charAt(0) || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.875rem' }}>{b.name}</p>
                          <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: 10, background: (TIER_COLORS[b.tier] || '#6B7280') + '15', color: TIER_COLORS[b.tier] || '#6B7280', fontWeight: 700 }}>{b.tier}</span>
                        </div>
                        <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.75rem' }}>🌍 {b.country} · {b.deals} deal{b.deals !== 1 ? 's' : ''} this week</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontWeight: 800, color: '#007A3D', margin: 0, fontSize: '0.95rem' }}>{formatPrice(b.revenue)}</p>
                        <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.72rem' }}>Commission: {formatPrice(b.commission)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
