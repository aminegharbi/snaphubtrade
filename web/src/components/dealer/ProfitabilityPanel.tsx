'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, DollarSign, Percent, Wallet, PiggyBank } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { api } from '@/lib/api';
import { usePriceFormatter } from '@/components/common/Price';

interface ProfitabilityTrendPoint {
  month: string;
  label: string;
  revenue_collected_aed: number;
  commission_paid_aed: number;
  net_revenue_aed: number;
  units_sold: number;
}

interface ProfitabilityTrend {
  period_months: number;
  series: ProfitabilityTrendPoint[];
  totals: {
    revenue_collected_aed: number;
    commission_paid_aed: number;
    net_revenue_aed: number;
    units_sold: number;
  };
  month_over_month_change_pct: number | null;
}

const PERIOD_OPTIONS = [
  { label: '6 months', months: 6 },
  { label: '12 months', months: 12 },
  { label: '24 months', months: 24 },
];

export function ProfitabilityPanel({ dealerId, stats }: { dealerId: string; stats: any }) {
  const formatPrice = usePriceFormatter();
  const [trend, setTrend] = useState<ProfitabilityTrend | null>(null);
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get<ProfitabilityTrend>(`/dealer-dashboard/${dealerId}/profitability?months=${months}`)
      .then((d) => { if (!cancelled) setTrend(d); })
      .catch(() => { if (!cancelled) setTrend(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dealerId, months]);

  const momPct = trend?.month_over_month_change_pct;

  const KPI_CARDS = [
    {
      label: 'Revenue collected', icon: DollarSign, color: '#007A3D',
      value: formatPrice(Number(stats.revenue_collected_aed || 0)),
      sub: `${stats.revenue_collected_invoices ?? 0} paid invoice(s)`,
    },
    {
      label: 'Outstanding', icon: Wallet, color: '#92400E',
      value: formatPrice(Number(stats.revenue_outstanding_aed || 0)),
      sub: `${stats.revenue_outstanding_invoices ?? 0} unpaid invoice(s)`,
    },
    {
      label: 'Commission paid', icon: Percent, color: '#B8860B',
      value: formatPrice(Number(stats.commission_paid_aed || 0)),
      sub: `${stats.commission_paid_deals ?? 0} broker deal(s) settled`,
    },
    {
      label: 'Commission pending', icon: Percent, color: '#C1272D',
      value: formatPrice(Number(stats.commission_pending_aed || 0)),
      sub: `${stats.commission_pending_deals ?? 0} deal(s) to settle`,
    },
    {
      label: 'Net revenue', icon: PiggyBank, color: '#1E40AF',
      value: formatPrice(Number(stats.net_revenue_aed || 0)),
      sub: 'Revenue collected − commissions paid',
    },
    {
      label: 'Stock turnover', icon: TrendingUp, color: '#5B21B6',
      value: stats.stock_turnover_ratio != null ? `${stats.stock_turnover_ratio}×` : '—',
      sub: 'Revenue collected / current stock value',
    },
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Profitability KPI row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 18,
      }}>
        {KPI_CARDS.map((c) => (
          <div key={c.label} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280', margin: 0 }}>{c.label}</p>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: c.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <c.icon size={13} style={{ color: c.color }} />
              </div>
            </div>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: '0 0 2px' }}>{c.value}</p>
            <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: 0 }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Evolution chart */}
      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.95rem' }}>Profitability evolution</p>
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF', margin: '2px 0 0' }}>
              Revenue collected, commissions paid and net revenue, month by month
              {momPct != null && (
                <span style={{ marginLeft: 8, fontWeight: 700, color: momPct >= 0 ? '#007A3D' : '#C1272D', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  {momPct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {momPct >= 0 ? '+' : ''}{momPct}% vs previous month
                </span>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 4, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 9, padding: 3 }}>
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.months}
                onClick={() => setMonths(p.months)}
                style={{
                  padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontSize: '0.75rem', fontWeight: 700,
                  background: months === p.months ? '#C1272D' : 'transparent',
                  color: months === p.months ? 'white' : '#6B7280',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={20} style={{ color: '#9CA3AF', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : !trend || trend.series.every(s => s.revenue_collected_aed === 0 && s.commission_paid_aed === 0) ? (
          <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
            <p style={{ color: '#9CA3AF', fontSize: '0.85rem', margin: 0 }}>No paid invoices yet for this period.</p>
            <p style={{ color: '#D1D5DB', fontSize: '0.75rem', margin: 0 }}>The chart fills in as soon as an invoice moves to "paid" status.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trend.series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#007A3D" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#007A3D" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1E40AF" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#1E40AF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
              />
              <Tooltip
                formatter={(value: number, name: string) => [formatPrice(value), name]}
                labelStyle={{ fontWeight: 700, color: '#111827' }}
                contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: '0.8rem' }}
              />
              <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
              <Area type="monotone" dataKey="revenue_collected_aed" name="Revenue collected" stroke="#007A3D" fill="url(#revenueGradient)" strokeWidth={2} />
              <Area type="monotone" dataKey="commission_paid_aed" name="Commission paid" stroke="#C1272D" fill="none" strokeWidth={2} strokeDasharray="4 3" />
              <Area type="monotone" dataKey="net_revenue_aed" name="Net revenue" stroke="#1E40AF" fill="url(#netGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
