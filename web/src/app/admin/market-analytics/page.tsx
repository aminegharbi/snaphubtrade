'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, Car, Building2, DollarSign, Globe, Sparkles } from 'lucide-react';
import { usePriceFormatter } from '@/components/common/Price';

const COLORS = ['#C1272D','#3B82F6','#007A3D','#F59E0B','#8B5CF6','#EC4899','#06B6D4','#84CC16','#F97316','#6366F1'];

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 18px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <p style={{ fontSize:'0.7rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.06em', margin:0 }}>{label}</p>
        <Icon size={15} style={{ color }} />
      </div>
      <p style={{ fontWeight:800, fontSize:'1.4rem', color, margin:0 }}>{value}</p>
    </div>
  );
}

function BarChartH({ data, labelKey, valueKey, color = '#C1272D' }: { data: any[]; labelKey: string; valueKey: string; color?: string }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ width:90, fontSize:'0.78rem', color:'#374151', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:0 }}>{d[labelKey]}</span>
          <div style={{ flex:1, height:18, background:'#F3F4F6', borderRadius:6, overflow:'hidden' }}>
            <div style={{ width:`${(d[valueKey]/max)*100}%`, height:'100%', background: COLORS[i % COLORS.length], borderRadius:6, transition:'width 0.6s' }} />
          </div>
          <span style={{ width:36, fontSize:'0.78rem', fontWeight:700, color:'#374151', textAlign:'right', flexShrink:0 }}>{d[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data, labelKey, valueKey }: { data: any[]; labelKey: string; valueKey: string }) {
  const total = data.reduce((s, d) => s + d[valueKey], 0) || 1;
  let cumPct = 0;
  const size = 140, r = 56, circ = 2 * Math.PI * r;

  return (
    <div style={{ display:'flex', alignItems:'center', gap:20 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
        {data.map((d, i) => {
          const pct = d[valueKey] / total;
          const dash = pct * circ;
          const offset = cumPct * circ;
          cumPct += pct;
          return (
            <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={18}
              strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={-offset} />
          );
        })}
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {data.slice(0,6).map((d, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:10, height:10, borderRadius:3, background: COLORS[i % COLORS.length], flexShrink:0 }} />
            <span style={{ fontSize:'0.78rem', color:'#374151', textTransform:'capitalize' }}>{d[labelKey] || 'Other'}</span>
            <span style={{ fontSize:'0.78rem', fontWeight:700, color:'#9CA3AF', marginLeft:'auto' }}>{d[valueKey]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MarketAnalyticsPage() {
  const formatPrice = usePriceFormatter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/market-analytics/dashboard')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding:60, textAlign:'center' }}><RefreshCw size={24} style={{ color:'#9CA3AF', animation:'spin 1s linear infinite' }} /><style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style></div>;
  if (!data) return <div style={{ padding:60, textAlign:'center', color:'#9CA3AF' }}>No data available</div>;

  const k = data.kpis;

  return (
    <div style={{ minHeight:'100vh', background:'#F9FAFB', padding:24 }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        <h1 style={{ fontWeight:800, fontSize:'1.2rem', color:'#111827', margin:'0 0 4px' }}>📊 Market Analytics</h1>
        <p style={{ color:'#6B7280', margin:'0 0 24px', fontSize:'0.875rem' }}>Platform-wide insights · Updated in real-time</p>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(170px,1fr))', gap:12, marginBottom:24 }}>
          <StatCard label="Total vehicles"    value={k.total_vehicles.toLocaleString()} icon={Car} color="#374151" />
          <StatCard label="Total dealers"     value={k.total_dealers}                    icon={Building2} color="#3B82F6" />
          <StatCard label="Inventory value"   value={formatPrice(k.total_inventory_value)} icon={DollarSign} color="#007A3D" />
          <StatCard label="Avg price"         value={formatPrice(k.avg_price)} icon={TrendingUp} color="#C1272D" />
          <StatCard label="Export eligible"   value={k.export_eligible_count}            icon={Globe} color="#8B5CF6" />
          <StatCard label="New this week"     value={k.new_this_week}                    icon={Sparkles} color="#F59E0B" />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Top brands */}
          <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 18px' }}>
            <p style={{ fontWeight:700, color:'#111827', margin:'0 0 14px' }}>🚗 Top Brands</p>
            <BarChartH data={data.by_make} labelKey="make" valueKey="count" />
          </div>

          {/* Body type distribution */}
          <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 18px' }}>
            <p style={{ fontWeight:700, color:'#111827', margin:'0 0 14px' }}>🚙 Vehicle Categories</p>
            <DonutChart data={data.by_body_type} labelKey="type" valueKey="count" />
          </div>

          {/* Price distribution */}
          <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 18px' }}>
            <p style={{ fontWeight:700, color:'#111827', margin:'0 0 14px' }}>💰 Price Distribution (AED)</p>
            <BarChartH data={data.price_distribution} labelKey="range" valueKey="count" color="#007A3D" />
          </div>

          {/* Fuel type */}
          <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 18px' }}>
            <p style={{ fontWeight:700, color:'#111827', margin:'0 0 14px' }}>⚡ Fuel Type Mix</p>
            <DonutChart data={data.by_fuel_type} labelKey="fuel" valueKey="count" />
          </div>

          {/* Status breakdown */}
          <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 18px' }}>
            <p style={{ fontWeight:700, color:'#111827', margin:'0 0 14px' }}>📋 Inventory Status</p>
            <BarChartH data={data.by_status} labelKey="status" valueKey="count" color="#3B82F6" />
          </div>

          {/* Deal ratings */}
          {data.deal_ratings?.length > 0 && (
            <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 18px' }}>
              <p style={{ fontWeight:700, color:'#111827', margin:'0 0 14px' }}>🏷️ Deal Rating Distribution</p>
              <DonutChart data={data.deal_ratings} labelKey="rating" valueKey="count" />
            </div>
          )}
        </div>

        {/* Broker activity */}
        <div style={{ background:'linear-gradient(135deg, #FFF1F2, white)', border:'1px solid #FECACA', borderRadius:14, padding:'18px 22px', marginTop:16 }}>
          <p style={{ fontWeight:700, color:'#C1272D', margin:'0 0 4px' }}>🤝 Broker activity this month</p>
          <p style={{ fontWeight:900, fontSize:'1.8rem', color:'#111827', margin:0 }}>{k.broker_deals_this_month} deals closed</p>
        </div>
      </div>
    </div>
  );
}
