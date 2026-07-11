'use client';
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Award, Globe, Zap, Clock } from 'lucide-react';
import { usePriceFormatter } from '@/components/common/Price';

interface ChartData { month: string; value: number; }

function buildProjection(currentPrice: number, trendPct: number): ChartData[] {
  const months = ['Now', '+3mo', '+6mo', '+9mo', '+12mo'];
  let price = currentPrice;
  return months.map((m, i) => {
    if (i > 0) price = price * (1 + (trendPct / 100) * 0.85); // damped projection
    return { month: m, value: Math.round(price) };
  });
}

function MiniBarChart({ data, color = '#8B5CF6' }: { data: ChartData[]; color?: string }) {
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90, padding: '0 4px' }}>
      {data.map((d, i) => {
        const h = 20 + ((d.value - min) / range) * 60;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#6B7280' }}>{(d.value/1000).toFixed(0)}K</span>
            <div style={{ width: '100%', height: h, background: i === 0 ? '#E5E7EB' : `${color}cc`, borderRadius: '4px 4px 0 0', transition: 'height 0.6s ease' }} />
            <span style={{ fontSize: '0.62rem', color: '#9CA3AF', fontWeight: 600 }}>{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

export function InvestmentScoreCard({ vehicleId }: { vehicleId: string }) {
  const formatPrice = usePriceFormatter();
  const [val, setVal] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/v1/valuations/vehicle/${vehicleId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setVal(d); })
      .catch(() => {});
  }, [vehicleId]);

  if (!val) return null;

  const projection = buildProjection(val.estimated_value_aed, val.price_trend_pct || 0);
  const score = val.investment_score || 50;
  const grade = score >= 85 ? 'A+' : score >= 75 ? 'A' : score >= 65 ? 'B+' : score >= 50 ? 'B' : score >= 35 ? 'C' : 'D';
  const gradeColor = score >= 75 ? '#007A3D' : score >= 50 ? '#3B82F6' : score >= 35 ? '#F59E0B' : '#C1272D';

  const factors = [
    { label: 'Price Trend',     value: val.price_trend_direction === 'rising' ? 'Rising' : val.price_trend_direction === 'falling' ? 'Falling' : 'Stable', icon: val.price_trend_direction === 'rising' ? TrendingUp : TrendingDown, color: val.price_trend_direction === 'rising' ? '#007A3D' : '#C1272D', good: val.price_trend_direction === 'rising' },
    { label: 'Market Demand',   value: (val.market_demand || 'medium').replace('_',' '), icon: Zap, color: val.demand_score >= 70 ? '#007A3D' : '#92400E', good: val.demand_score >= 70 },
    { label: 'Export Demand',   value: val.export_score >= 70 ? 'Strong' : val.export_score >= 40 ? 'Moderate' : 'Limited', icon: Globe, color: val.export_score >= 70 ? '#007A3D' : '#6B7280', good: val.export_score >= 70 },
    { label: 'Liquidity',       value: `${val.avg_days_to_sell}d avg`, icon: Clock, color: val.avg_days_to_sell <= 20 ? '#007A3D' : val.avg_days_to_sell <= 35 ? '#92400E' : '#C1272D', good: val.avg_days_to_sell <= 20 },
  ];

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Award size={16} style={{ color: '#8B5CF6' }} />
          <p style={{ fontWeight: 700, color: '#111827', margin: 0 }}>Investment Score</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: gradeColor }}>{grade}</span>
          <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>({score}/100)</span>
        </div>
      </div>

      <div style={{ padding: '16px 18px' }}>
        {/* Projection chart */}
        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
          12-month value projection (estimated)
        </p>
        <MiniBarChart data={projection} color={gradeColor} />

        {/* Factors grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
          {factors.map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: '#F9FAFB' }}>
              <f.icon size={14} style={{ color: f.color, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '0.68rem', color: '#9CA3AF', margin: 0 }}>{f.label}</p>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: f.color, margin: 0, textTransform: 'capitalize' }}>{f.value}</p>
              </div>
            </div>
          ))}
        </div>

        {projection[4].value > projection[0].value && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
            <p style={{ fontSize: '0.78rem', color: '#065F46', margin: 0, fontWeight: 600 }}>
              📈 Projected +{formatPrice(projection[4].value - projection[0].value)} value increase over 12 months
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
