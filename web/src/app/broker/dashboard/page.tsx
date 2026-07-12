'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, Users, DollarSign, Award, Copy, Check, MessageCircle, ChevronRight, RefreshCw, Car, Globe, Clock, Bookmark, X as XIcon, BarChart2, Brain, Database, TrendingDown, Target, ArrowUpRight, ArrowDownRight, Zap, HeartHandshake } from 'lucide-react';
import { api } from '@/lib/api';
import { useSession } from '@/contexts/SessionContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { CurrencySelector } from '@/components/common/CurrencySelector';
import { usePriceFormatter } from '@/components/common/Price';

const TIER_CFG: Record<string, { color: string; bg: string; next: string | null; target: number }> = {
  Starter: { color:'#6B7280', bg:'#F3F4F6', next:'Active',  target:6  },
  Active:  { color:'#3B82F6', bg:'#DBEAFE', next:'Pro',     target:16 },
  Pro:     { color:'#007A3D', bg:'#D1FAE5', next:'Elite',   target:31 },
  Elite:   { color:'#C1272D', bg:'#FEE2E2', next:null,      target:999 },
};

const STATUS_CFG: Record<string, { label:string; color:string; bg:string }> = {
  paid:       { label:'Paid',            color:'#065F46', bg:'#D1FAE5' },
  pending:    { label:'Pending',         color:'#92400E', bg:'#FEF3C7' },
  processing: { label:'Sale confirmed',  color:'#1E40AF', bg:'#DBEAFE' },
  cancelled:  { label:'Cancelled',       color:'#374151', bg:'#F3F4F6' },
};

const COLORS = ['#C1272D','#3B82F6','#007A3D','#F59E0B','#8B5CF6','#EC4899','#06B6D4','#84CC16'];

function StatCard({ label, value, sub, icon: Icon, color, trend }: any) {
  return (
    <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'18px 20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <p style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'#9CA3AF', margin:0 }}>{label}</p>
        <div style={{ width:34, height:34, borderRadius:9, background:color+'15', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <p style={{ fontSize:'1.5rem', fontWeight:800, color:'#111827', margin:'0 0 3px' }}>{value}</p>
      {sub   && <p style={{ fontSize:'0.78rem', color:'#9CA3AF', margin:0 }}>{sub}</p>}
      {trend && <p style={{ fontSize:'0.78rem', color:'#007A3D', margin:0, fontWeight:600 }}>{trend}</p>}
    </div>
  );
}

function BarH({ data, labelKey, valueKey }: { data:any[]; labelKey:string; valueKey:string }) {
  const max = Math.max(...data.map(d=>d[valueKey]),1);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
      {data.slice(0,6).map((d,i)=>(
        <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:80, fontSize:'0.72rem', color:'#374151', fontWeight:600, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d[labelKey]}</span>
          <div style={{ flex:1, height:16, background:'#F3F4F6', borderRadius:4, overflow:'hidden' }}>
            <div style={{ width:`${(d[valueKey]/max)*100}%`, height:'100%', background:COLORS[i%COLORS.length], borderRadius:4, transition:'width 0.6s' }} />
          </div>
          <span style={{ width:28, fontSize:'0.72rem', fontWeight:700, color:'#374151', textAlign:'right', flexShrink:0 }}>{d[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}

function Donut({ data, labelKey, valueKey }: { data:any[]; labelKey:string; valueKey:string }) {
  const total = data.reduce((s,d)=>s+d[valueKey],0)||1;
  let cum=0; const r=52, c=2*Math.PI*r;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:16 }}>
      <svg width={120} height={120} style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
        {data.map((d,i)=>{ const pct=d[valueKey]/total, dash=pct*c, off=cum*c; cum+=pct;
          return <circle key={i} cx={60} cy={60} r={r} fill="none" stroke={COLORS[i%COLORS.length]} strokeWidth={16}
            strokeDasharray={`${dash} ${c-dash}`} strokeDashoffset={-off} />;
        })}
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {data.slice(0,5).map((d,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ width:8, height:8, borderRadius:2, background:COLORS[i%COLORS.length], flexShrink:0 }} />
            <span style={{ fontSize:'0.72rem', color:'#374151', textTransform:'capitalize' }}>{d[labelKey]||'Other'}</span>
            <span style={{ fontSize:'0.72rem', fontWeight:700, color:'#9CA3AF', marginLeft:'auto' }}>{d[valueKey]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Broker Market Analytics Panel ────────────────────────────────────────────
function BrokerMarketPanel({ broker, stats }: { broker:any; stats:any }) {
  const formatPrice = usePriceFormatter();
  const [market, setMarket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    fetch('/api/v1/market-analytics/dashboard').then(r=>r.ok?r.json():null).catch(()=>null).then(m=>{
      setMarket(m); setLoading(false);
    });
  },[]);

  if (loading) return <div style={{ padding:60, textAlign:'center' }}><RefreshCw size={20} style={{ color:'#9CA3AF', animation:'spin 1s linear infinite', display:'block', margin:'0 auto' }} /></div>;
  if (!market) return <div style={{ padding:40, textAlign:'center', color:'#9CA3AF' }}>No market data available</div>;

  const k = market.kpis;
  const commissionRate = Number(broker?.commission_rate || 0.015);
  const avgCommission = k.avg_price ? Math.round(k.avg_price * commissionRate) : 0;
  const opportunityValue = k.total_inventory_value ? Math.round(k.total_inventory_value * commissionRate) : 0;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Broker-specific KPIs derived from market data */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px,1fr))', gap:12 }}>
        {[
          { label:'Vehicles available', value:(k.total_vehicles||0).toLocaleString(), sub:'market opportunity', color:'#374151', icon:Car },
          { label:'Market avg price', value:formatPrice(k.avg_price||0), sub:'per vehicle UAE', color:'#C1272D', icon:DollarSign },
          { label:'Your avg commission', value:formatPrice(avgCommission), sub:`at ${(commissionRate*100).toFixed(1)}% (${broker?.tier} tier)`, color:'#007A3D', icon:Award },
          { label:'Total mkt opportunity', value:formatPrice(opportunityValue), sub:'if all vehicles closed', color:'#8B5CF6', icon:Target },
          { label:'Export eligible', value:(k.export_eligible_count||0).toLocaleString(), sub:'cross-border opportunity', color:'#3B82F6', icon:Globe },
          { label:'New this week', value:(k.new_this_week||0).toLocaleString(), sub:'fresh listings', color:'#F59E0B', icon:Zap },
          { label:'Vehicles sold', value:(k.total_sold_units||0).toLocaleString(), sub:'platform-wide all time', color:'#065F46', icon:TrendingUp },
          { label:'Active reservations', value:(k.active_reservations||0).toLocaleString(), sub:`${k.reservation_conversion_rate_pct||0}% conversion rate`, color:'#1E40AF', icon:BarChart2 },
          { label:'Platform revenue', value:formatPrice(k.total_revenue_aed||0), sub:`${formatPrice(k.revenue_this_month_aed||0)} ce mois`, color:'#C1272D', icon:DollarSign },
        ].map(c=>(
          <div key={c.label} style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:12, padding:'14px 16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <p style={{ fontSize:'0.68rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.06em', margin:0 }}>{c.label}</p>
              <c.icon size={14} style={{ color:c.color }} />
            </div>
            <p style={{ fontWeight:800, fontSize:'1.2rem', color:c.color, margin:'0 0 2px' }}>{c.value}</p>
            <p style={{ fontSize:'0.7rem', color:'#9CA3AF', margin:0 }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Commission opportunity by tier */}
      <div style={{ background:'linear-gradient(135deg, #111827, #1F2937)', borderRadius:14, padding:'18px 22px' }}>
        <p style={{ fontWeight:700, color:'white', margin:'0 0 16px', fontSize:'0.95rem' }}>💰 Commission opportunity by tier — what closing 1 more deal would earn you</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(110px, 1fr))', gap:10 }}>
          {[
            { tier:'Starter', rate:0.015, color:'#6B7280' },
            { tier:'Active',  rate:0.020, color:'#3B82F6' },
            { tier:'Pro',     rate:0.025, color:'#007A3D' },
            { tier:'Elite',   rate:0.030, color:'#C1272D' },
          ].map(t=>{
            const earn = Math.round(k.avg_price * t.rate);
            const isMine = broker?.tier === t.tier;
            return (
              <div key={t.tier} style={{ padding:'12px 14px', borderRadius:12, background:isMine?t.color:'rgba(255,255,255,0.06)', border:`1.5px solid ${isMine?t.color:'rgba(255,255,255,0.1)'}` }}>
                <p style={{ fontSize:'0.72rem', fontWeight:700, color:isMine?'white':'rgba(255,255,255,0.5)', margin:'0 0 6px' }}>{t.tier} {isMine&&'← YOU'}</p>
                <p style={{ fontWeight:800, fontSize:'1rem', color:'white', margin:'0 0 2px' }}>{formatPrice(earn)}</p>
                <p style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.55)', margin:0 }}>{(t.rate*100).toFixed(1)}% / deal</p>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {/* Top brands in UAE market */}
        <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 18px' }}>
          <p style={{ fontWeight:700, color:'#111827', margin:'0 0 4px', fontSize:'0.9rem' }}>🚗 Most listed brands — UAE market</p>
          <p style={{ fontSize:'0.72rem', color:'#9CA3AF', margin:'0 0 14px' }}>High inventory = more buyers to match with</p>
          <BarH data={market.by_make} labelKey="make" valueKey="count" />
        </div>

        {/* Price distribution = commission tiers */}
        <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 18px' }}>
          <p style={{ fontWeight:700, color:'#111827', margin:'0 0 4px', fontSize:'0.9rem' }}>💎 Price tiers — your commission range</p>
          <p style={{ fontSize:'0.72rem', color:'#9CA3AF', margin:'0 0 14px' }}>Based on {(commissionRate*100).toFixed(1)}% {broker?.tier} rate</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {(market.price_distribution||[]).slice(0,5).map((d:any,i:number)=>{
              const priceMatch = d.range?.match(/[\d,]+/g);
              const avgInRange = priceMatch ? Math.round(Number(priceMatch[0].replace(/,/g,'')) * 1.5) : 0;
              const earn = Math.round(avgInRange * commissionRate);
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ flex:1, fontSize:'0.72rem', color:'#374151', fontWeight:600 }}>{d.range}</span>
                  <span style={{ fontSize:'0.72rem', color:'#9CA3AF' }}>{d.count} vehicles</span>
                  {earn>0&&<span style={{ fontSize:'0.72rem', fontWeight:700, color:'#007A3D', background:'#D1FAE5', padding:'2px 7px', borderRadius:8, flexShrink:0 }}>≈{formatPrice(earn)}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Vehicle categories */}
        <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 18px' }}>
          <p style={{ fontWeight:700, color:'#111827', margin:'0 0 14px', fontSize:'0.9rem' }}>🚙 Market by category</p>
          <Donut data={market.by_body_type} labelKey="type" valueKey="count" />
        </div>

        {/* Fuel type */}
        <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 18px' }}>
          <p style={{ fontWeight:700, color:'#111827', margin:'0 0 14px', fontSize:'0.9rem' }}>⚡ Fuel type mix</p>
          <Donut data={market.by_fuel_type} labelKey="fuel" valueKey="count" />
        </div>
      </div>

      {/* CTA */}
      <div style={{ background:'white', border:'1.5px solid #C1272D30', borderRadius:14, padding:'18px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
        <div>
          <p style={{ fontWeight:700, color:'#111827', margin:'0 0 3px' }}>Ready to close a deal?</p>
          <p style={{ color:'#9CA3AF', fontSize:'0.82rem', margin:0 }}>Browse {k.total_vehicles?.toLocaleString()} vehicles and share them with your buyers via your affiliate link.</p>
        </div>
        <a href="/marketplace" style={{ padding:'10px 22px', background:'#C1272D', color:'white', borderRadius:10, fontWeight:700, textDecoration:'none', fontSize:'0.875rem', flexShrink:0 }}>
          Browse marketplace →
        </a>
      </div>
    </div>
  );
}

// ─── Broker AI Market Intelligence Panel ──────────────────────────────────────
function BrokerAIPanel({ broker }: { broker:any }) {
  const formatPrice = usePriceFormatter();
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  const [market, setMarket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    Promise.all([
      fetch('/api/v1/market-analysis/benchmarks').then(r=>r.ok?r.json():[]).catch(()=>[]),
      fetch('/api/v1/market-analytics/dashboard').then(r=>r.ok?r.json():null).catch(()=>null),
    ]).then(([b, m])=>{
      setBenchmarks(Array.isArray(b)?b:[]); setMarket(m); setLoading(false);
    });
  },[]);

  if (loading) return <div style={{ padding:60, textAlign:'center' }}><RefreshCw size={20} style={{ color:'#9CA3AF', animation:'spin 1s linear infinite', display:'block', margin:'0 auto' }} /></div>;

  const commissionRate = Number(broker?.commission_rate || 0.015);
  const k = market?.kpis || {};

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Banner */}
      <div style={{ background:'linear-gradient(135deg, #1F2937, #111827)', borderRadius:14, padding:'18px 22px', display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ width:44, height:44, borderRadius:10, background:'rgba(193,39,45,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Brain size={20} style={{ color:'#C1272D' }} />
        </div>
        <div>
          <p style={{ fontWeight:700, color:'white', margin:'0 0 3px', fontSize:'0.95rem' }}>🔍 AI Price Intelligence — live Dubizzle & DubiCars data</p>
          <p style={{ color:'rgba(255,255,255,0.55)', margin:0, fontSize:'0.8rem' }}>
            Use these benchmarks to advise buyers on fair market prices and close deals faster.
          </p>
        </div>
      </div>
      {/* Real-time platform activity — always shown */}
      {market && (
        <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 18px' }}>
          <p style={{ fontWeight:700, color:'#111827', margin:'0 0 14px', fontSize:'0.9rem' }}>📊 Real-time platform — activity &amp; revenue</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
            {[
              { label:'Vehicles sold', value:(k.total_sold_units||0).toLocaleString(), color:'#065F46', icon:TrendingUp },
              { label:'Active reservations', value:(k.active_reservations||0).toLocaleString(), color:'#1E40AF', icon:BarChart2 },
              { label:'Reservation conversion rate', value:`${k.reservation_conversion_rate_pct||0}%`, color:(k.reservation_conversion_rate_pct||0)>=50?'#007A3D':'#92400E', icon:Target },
              { label:'Revenu plateforme', value:formatPrice(k.total_revenue_aed||0), color:'#C1272D', icon:DollarSign },
              { label:'Commissions totales', value:formatPrice(k.total_commissions_aed||0), color:'#007A3D', icon:Award },
              { label:'Deals broker / mois', value:(k.broker_deals_this_month||0).toLocaleString(), color:'#8B5CF6', icon:Users },
            ].map(c=>(
              <div key={c.label} style={{ padding:'12px 14px', borderRadius:10, background:'#F9FAFB', border:'1px solid #E5E7EB' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <p style={{ fontSize:'0.65rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em', margin:0 }}>{c.label}</p>
                  <c.icon size={12} style={{ color:c.color }} />
                </div>
                <p style={{ fontWeight:800, fontSize:'1.1rem', color:c.color, margin:0 }}>{c.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {benchmarks.length === 0 ? (
        <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'48px', textAlign:'center' }}>
          <Database size={32} style={{ color:'#D1D5DB', margin:'0 auto 12px', display:'block' }} />
          <p style={{ fontWeight:600, color:'#374151', margin:'0 0 4px' }}>No AI benchmarks yet</p>
          <p style={{ color:'#9CA3AF', fontSize:'0.82rem' }}>The platform admin runs periodic AI refreshes to pull live pricing from Dubizzle & DubiCars. Data will appear here after the next refresh.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Broker-angle: commission estimate per benchmark */}
          <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid #F3F4F6', background:'#F9FAFB', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <p style={{ fontWeight:700, color:'#111827', margin:0, fontSize:'0.9rem' }}>📡 Live market benchmarks + your estimated commission</p>
              <span style={{ fontSize:'0.72rem', color:'#9CA3AF' }}>{benchmarks.length} tracked models</span>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#F9FAFB' }}>
                    {['Vehicle','Source','Market avg','Demand','Trend','Conf.','Your commission','Action'].map(h=>(
                      <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:'0.65rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {benchmarks.map((b:any)=>{
                    const srcColor = b.source==='dubizzle'?'#C1272D':'#1E40AF';
                    const commission = Math.round(Number(b.avg_price_aed) * commissionRate);
                    const trend = Number(b.trend_pct);
                    return (
                      <tr key={b.id} style={{ borderTop:'1px solid #F9FAFB' }}>
                        <td style={{ padding:'10px 14px', fontWeight:600, fontSize:'0.82rem', color:'#111827', whiteSpace:'nowrap' }}>{b.year} {b.make} {b.model}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ fontSize:'0.68rem', padding:'2px 7px', borderRadius:20, fontWeight:700, background:srcColor+'15', color:srcColor }}>{b.source}</span>
                        </td>
                        <td style={{ padding:'10px 14px', fontWeight:700, fontSize:'0.82rem', color:'#374151' }}>{formatPrice(Number(b.avg_price_aed))}</td>
                        <td style={{ padding:'10px 14px', fontSize:'0.75rem', color:'#6B7280', textTransform:'capitalize' }}>{(b.demand_level||'').replace('_',' ')}</td>
                        <td style={{ padding:'10px 14px', fontSize:'0.82rem', fontWeight:600, color:trend>0?'#007A3D':'#C1272D' }}>
                          {trend>0?'↑':'↓'} {Math.abs(trend).toFixed(1)}%
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ fontSize:'0.75rem', fontWeight:700, color:b.confidence_pct>=80?'#065F46':b.confidence_pct>=60?'#92400E':'#991B1B' }}>{b.confidence_pct}%</span>
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ fontSize:'0.8rem', fontWeight:800, color:'#007A3D' }}>{formatPrice(commission)}</span>
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <a href={`/marketplace?make=${b.make}&model=${b.model}`}
                            style={{ fontSize:'0.72rem', fontWeight:700, color:'#C1272D', textDecoration:'none', whiteSpace:'nowrap' }}>
                            Find → share
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top commission opportunities */}
          <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 18px' }}>
            <p style={{ fontWeight:700, color:'#111827', margin:'0 0 14px', fontSize:'0.9rem' }}>🎯 Top commission opportunities — ranked by your earnings potential</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[...benchmarks].sort((a,b)=>Number(b.avg_price_aed)-Number(a.avg_price_aed)).slice(0,5).map((b:any,i:number)=>{
                const commission = Math.round(Number(b.avg_price_aed) * commissionRate);
                const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
                return (
                  <div key={b.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10, background:i===0?'#FFFBEB':'#F9FAFB', border:`1px solid ${i===0?'#FDE68A':'#E5E7EB'}` }}>
                    <span style={{ fontSize:'1.1rem', flexShrink:0 }}>{medals[i]}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontWeight:600, color:'#111827', margin:0, fontSize:'0.85rem' }}>{b.year} {b.make} {b.model}</p>
                      <p style={{ color:'#9CA3AF', margin:0, fontSize:'0.72rem' }}>Market: {formatPrice(Number(b.avg_price_aed))} · {b.listing_count} listings on {b.source}</p>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <p style={{ fontWeight:800, color:'#007A3D', margin:0 }}>{formatPrice(commission)}</p>
                      <p style={{ color:'#9CA3AF', margin:0, fontSize:'0.72rem' }}>your commission</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Broker Dashboard ─────────────────────────────────────────────────────
export default function BrokerDashboardPage() {
  const formatPrice = usePriceFormatter();
  const [broker, setBroker]   = useState<any>(null);
  const [stats,  setStats]    = useState<any>(null);
  const [deals,  setDeals]    = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [billingStats, setBillingStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState<string | null>(null);
  const { signIn } = useSession();
  const [tab, setTab] = useState<'deals' | 'reservations' | 'shared'>('deals');
  const [mainTab, setMainTab] = useState<'activity'|'market'|'ai'>('activity');
  const [code, setCode] = useState('');
  const [brokerId, setBrokerId] = useState('');

  useEffect(()=>{
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab')==='reservations') setTab('reservations');
  },[]);

  const [sharedVehicles, setSharedVehicles] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [aiMatching, setAiMatching] = useState<{ unlocked: boolean; referrals_count: number; required: number; matches: any[] } | null>(null);

  const loadBrokerData = async (id: string, silent = false) => {
    try {
      const [st, d, res, billing, shared, requests, matching] = await Promise.all([
        fetch(`/api/v1/broker/${id}/stats`).then(r=>r.json()),
        fetch(`/api/v1/broker/${id}/deals?limit=20`).then(r=>r.json()),
        fetch(`/api/v1/reservations/broker/${id}`).then(r=>r.ok?r.json():[]),
        fetch(`/api/v1/billing/stats/broker/${id}`).then(r=>r.ok?r.json():null).catch(()=>null),
        fetch(`/api/v1/collaborative/broker/${id}/shared-with-me`).then(r=>r.ok?r.json():[]).catch(()=>[]),
        fetch(`/api/v1/collaborative/broker/${id}/requests`).then(r=>r.ok?r.json():[]).catch(()=>[]),
        fetch(`/api/v1/broker/${id}/ai-matching`).then(r=>r.ok?r.json():null).catch(()=>null),
      ]);
      setStats(st); setDeals(d.items||[]); setReservations(Array.isArray(res)?res:[]);
      setBillingStats(billing);
      setSharedVehicles(Array.isArray(shared)?shared:[]);
      setMyRequests(Array.isArray(requests)?requests:[]);
      setAiMatching(matching);
    } catch {}
    finally { if (!silent) setLoading(false); }
  };

  const requestTransfer = async (vehicleId: string) => {
    if (!brokerId) return;
    setRequestingId(vehicleId);
    try {
      await fetch(`/api/v1/collaborative/vehicles/${vehicleId}/request-transfer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broker_id: brokerId }),
      });
      await loadBrokerData(brokerId, true);
    } catch {}
    finally { setRequestingId(null); }
  };

  const requestReserve = async (vehicleId: string) => {
    if (!brokerId) return;
    setRequestingId(vehicleId);
    try {
      await fetch(`/api/v1/collaborative/vehicles/${vehicleId}/request-reserve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broker_id: brokerId }),
      });
      await loadBrokerData(brokerId, true);
    } catch {}
    finally { setRequestingId(null); }
  };

  useEffect(()=>{
    const loggedInBrokerId = localStorage.getItem('broker_id');
    const loggedInCode     = localStorage.getItem('affiliate_code') || localStorage.getItem('broker_code');

    // No credentials — don't load demo data, show login prompt
    if (!loggedInBrokerId && !loggedInCode) { setLoading(false); return; }

    const resolveBroker = loggedInBrokerId
      ? fetch(`/api/v1/broker/${loggedInBrokerId}`).then(r=>r.ok?r.json():null)
      : fetch(`/api/v1/broker/code/${loggedInCode}`).then(r=>r.ok?r.json():null);

    resolveBroker.then(b=>{
      if (b?.id) {
        setBroker(b);
        setCode(b.affiliate_code); setBrokerId(b.id);
        signIn({ profile_type:'broker', profile_id:b.id, display_name:b.full_name, email:b.email, broker_id:b.id, affiliate_code:b.affiliate_code });
        loadBrokerData(b.id);
      } else {
        // Stale broker_id in storage — clear it and show login
        localStorage.removeItem('broker_id');
        setLoading(false);
      }
    }).catch(()=>setLoading(false));
  },[]);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(()=>{ setCopied(key); setTimeout(()=>setCopied(null),2000); });
  };

  const cancelReservation = async (id: string) => {
    try {
      await fetch(`/api/v1/reservations/${id}/cancel`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:'{}' });
      setReservations(rs=>rs.map(r=>r.id===id?{...r,status:'cancelled'}:r));
      if (brokerId) loadBrokerData(brokerId, true);
    } catch {}
  };

  // Auto-refresh every 30s so converted reservations and new broker deals appear without a manual reload
  useEffect(() => {
    if (!brokerId) return;
    const t = setInterval(() => loadBrokerData(brokerId, true), 30_000);
    return () => clearInterval(t);
  }, [brokerId]);

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#F9FAFB', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <RefreshCw size={24} style={{ color:'#9CA3AF', animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!broker) return (
    <div style={{ minHeight:'100vh', background:'#F9FAFB', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <p style={{ color:'#374151', fontWeight:600 }}>Broker account not found</p>
      <p style={{ color:'#9CA3AF', fontSize:'0.875rem' }}>Please sign in to access your broker dashboard.</p>
      <div style={{ display:'flex', gap:10 }}>
        <Link href="/login?profile=broker" style={{ padding:'10px 20px', background:'#111827', color:'white', borderRadius:10, textDecoration:'none', fontWeight:600 }}>Sign in</Link>
        <Link href="/broker" style={{ padding:'10px 20px', background:'#C1272D', color:'white', borderRadius:10, textDecoration:'none', fontWeight:600 }}>Apply to programme</Link>
      </div>
    </div>
  );

  const tierCfg = TIER_CFG[broker.tier] || TIER_CFG.Starter;
  const dealsPct = Math.min(100, Math.round(((stats?.deals_this_month||0)/tierCfg.target)*100));
  const referralLink = `${typeof window!=='undefined'?window.location.origin:'https://snaphubtrade.com'}/join?ref=${broker.affiliate_code}`;
  const dealerLink   = `${typeof window!=='undefined'?window.location.origin:'https://snaphubtrade.com'}/register-dealer?ref=${broker.affiliate_code}`;
  const brokerLink   = `${typeof window!=='undefined'?window.location.origin:'https://snaphubtrade.com'}/broker?ref=${broker.affiliate_code}`;

  return (
    <div style={{ minHeight:'100vh', background:'#F9FAFB' }}>
      {/* Header */}
      <div style={{ background:'white', borderBottom:'1px solid #E5E7EB', padding:'16px 24px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <Link href="/" style={{ fontWeight:800, fontSize:'1rem', color:'#111827', textDecoration:'none' }}>SnapHub<span style={{ color:'#C1272D' }}>Trade.com</span></Link>
              <span style={{ color:'#D1D5DB' }}>/</span>
              <span style={{ fontWeight:600, color:'#374151', fontSize:'0.9rem' }}>Broker Dashboard</span>
            </div>
            <p style={{ fontSize:'0.78rem', color:'#9CA3AF', margin:0 }}>Welcome, {broker.full_name} · {broker.country}</p>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <span style={{ fontSize:'0.75rem', fontWeight:700, padding:'4px 12px', borderRadius:20, background:tierCfg.bg, color:tierCfg.color }}>
              ⭐ {broker.tier} · {(Number(broker.commission_rate)*100).toFixed(1)}%
            </span>
            <NotificationBell recipient={{ type:'broker', id:broker.id }} />
            <CurrencySelector compact theme="light" />
            <Link href="/broker" style={{ padding:'7px 14px', border:'1px solid #E5E7EB', borderRadius:9, color:'#374151', textDecoration:'none', fontSize:'0.8rem' }}>Edit profile</Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1280, margin:'0 auto', padding:'24px' }}>
        {/* Tier progress */}
        {tierCfg.next && (
          <div style={{ background:'white', border:`2px solid ${tierCfg.color}30`, borderRadius:14, padding:'14px 20px', marginBottom:22, display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:'0.8rem', fontWeight:700, color:tierCfg.color }}>{broker.tier} tier</span>
                <span style={{ fontSize:'0.8rem', color:'#9CA3AF' }}>{stats?.deals_this_month||0}/{tierCfg.target} deals → {tierCfg.next}</span>
              </div>
              <div style={{ height:8, background:'#F3F4F6', borderRadius:4, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${dealsPct}%`, background:tierCfg.color, borderRadius:4, transition:'width 0.6s' }} />
              </div>
            </div>
            <span style={{ fontSize:'0.8rem', color:'#6B7280' }}>{tierCfg.target-(stats?.deals_this_month||0)} more deals → {tierCfg.next} tier</span>
          </div>
        )}

        {/* KPI cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px, 1fr))', gap:14, marginBottom:24 }}>
          <StatCard label="Earnings this month" value={formatPrice(stats?.earnings_this_month||0)} sub={`${stats?.deals_this_month||0} deals closed`} icon={DollarSign} color="#007A3D" />
          <StatCard label="Pending payout"       value={formatPrice(stats?.pending_payout||0)}    sub="Processing"              icon={Clock}      color="#F59E0B" />
          <StatCard label="Total earned"          value={formatPrice(stats?.earnings_total||0)}    sub="All time"                icon={TrendingUp} color="#C1272D" />
          <StatCard label="Total deals"           value={stats?.deals_total||0}                                   sub="All time"                icon={Car}        color="#374151" />
          <StatCard label="Active referrals"      value={stats?.referrals_active||0}                              sub="Brokers + dealers"       icon={Users}      color="#3B82F6" />
          <StatCard label="Commission rate"       value={`${(Number(broker.commission_rate)*100).toFixed(1)}%`}   sub={`${broker.tier} tier`}   icon={Award}      color={tierCfg.color} />
        </div>

        {/* Main tab nav */}
        <div style={{ display:'flex', gap:4, marginBottom:20, background:'white', border:'1px solid #E5E7EB', borderRadius:12, padding:4, width:'fit-content' }}>
          {([
            { key:'activity', label:'📋 My Activity' },
            { key:'market',   label:'📊 Market Analytics' },
            { key:'ai',       label:'🔍 AI Price Intelligence' },
          ] as const).map(t=>(
            <button key={t.key} onClick={()=>setMainTab(t.key)}
              style={{ padding:'8px 18px', borderRadius:9, border:'none', cursor:'pointer', fontWeight:700, fontSize:'0.8rem',
                background:mainTab===t.key?'#C1272D':'transparent',
                color:mainTab===t.key?'white':'#6B7280' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── ACTIVITY TAB ── */}
        {mainTab === 'activity' && (
          <div className="da-form-sidebar-layout" style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:24 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              {/* Sub-tabs */}
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={()=>setTab('deals')}
                  style={{ padding:'7px 16px', borderRadius:9, border:`1.5px solid ${tab==='deals'?'#C1272D':'#E5E7EB'}`, background:tab==='deals'?'#FFF1F2':'white', color:tab==='deals'?'#C1272D':'#6B7280', cursor:'pointer', fontWeight:700, fontSize:'0.82rem' }}>
                  Deals ({deals.length})
                </button>
                <button onClick={()=>setTab('reservations')}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:9, border:`1.5px solid ${tab==='reservations'?'#C1272D':'#E5E7EB'}`, background:tab==='reservations'?'#FFF1F2':'white', color:tab==='reservations'?'#C1272D':'#6B7280', cursor:'pointer', fontWeight:700, fontSize:'0.82rem' }}>
                  <Bookmark size={12} /> Reservations ({reservations.filter(r=>r.status==='active').length})
                </button>
                <button onClick={()=>setTab('shared')}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:9, border:`1.5px solid ${tab==='shared'?'#C1272D':'#E5E7EB'}`, background:tab==='shared'?'#FFF1F2':'white', color:tab==='shared'?'#C1272D':'#6B7280', cursor:'pointer', fontWeight:700, fontSize:'0.82rem' }}>
                  🔗 Shared inventory ({sharedVehicles.length})
                </button>
              </div>

              {tab === 'shared' ? (
                <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                  {/* Vehicles shared with me */}
                  <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
                    <div style={{ padding:'14px 20px', borderBottom:'1px solid #F3F4F6' }}>
                      <p style={{ fontWeight:700, color:'#111827', margin:0 }}>Shared with me</p>
                      <p style={{ fontSize:'0.78rem', color:'#9CA3AF', margin:'2px 0 0' }}>Vehicles dealers in your network have shared — request a transfer to work the deal.</p>
                    </div>
                    {sharedVehicles.length === 0 ? (
                      <div style={{ padding:'32px 20px', textAlign:'center', color:'#9CA3AF' }}>
                        <p style={{ margin:0, fontSize:'0.85rem' }}>No vehicles shared with you yet — ask a dealer in your network to share their stock.</p>
                      </div>
                    ) : sharedVehicles.map((v:any) => {
                      const alreadyReserved = myRequests.some((r:any) => r.vehicle?.id === v.id && r.status === 'pending' && r.msg_type === 'reserve_request');
                      const alreadyTransferred = myRequests.some((r:any) => r.vehicle?.id === v.id && r.status === 'pending' && r.msg_type === 'transfer_request');
                      return (
                        <div key={v.share_id} style={{ padding:'14px 20px', borderTop:'1px solid #F9FAFB', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                          <div style={{ flex:1, minWidth:180 }}>
                            <p style={{ fontWeight:700, color:'#111827', margin:'0 0 2px', fontSize:'0.88rem' }}>{v.year} {v.make} {v.model}{v.trim ? ` ${v.trim}` : ''}</p>
                            <p style={{ fontSize:'0.76rem', color:'#9CA3AF', margin:0 }}>{v.dealer?.company_name} · {formatPrice(v.price_aed)}</p>
                          </div>
                          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                            {v.my_permissions?.can_view && <span style={{ fontSize:'0.68rem', padding:'3px 9px', borderRadius:20, background:'#F3F4F6', color:'#374151', fontWeight:600 }}>View</span>}
                            {v.my_permissions?.can_propose && <span style={{ fontSize:'0.68rem', padding:'3px 9px', borderRadius:20, background:'#EFF6FF', color:'#1E40AF', fontWeight:600 }}>Propose</span>}
                            {v.my_permissions?.can_negotiate && <span style={{ fontSize:'0.68rem', padding:'3px 9px', borderRadius:20, background:'#F5F3FF', color:'#5B21B6', fontWeight:600 }}>Negotiate</span>}
                          </div>
                          {v.my_permissions?.can_reserve && (
                            <button onClick={() => requestReserve(v.id)} disabled={requestingId === v.id || alreadyReserved}
                              style={{ padding:'7px 14px', borderRadius:9, border:'1px solid #FDE68A', background: alreadyReserved ? '#F3F4F6' : '#FEF3C7', color: alreadyReserved ? '#9CA3AF' : '#92400E', fontWeight:700, fontSize:'0.78rem', cursor: alreadyReserved ? 'default' : 'pointer', whiteSpace:'nowrap' }}>
                              {requestingId === v.id ? 'Requesting…' : alreadyReserved ? 'Reserve pending' : 'Reserve'}
                            </button>
                          )}
                          {v.my_permissions?.can_transfer && (
                            <button onClick={() => requestTransfer(v.id)} disabled={requestingId === v.id || alreadyTransferred}
                              style={{ padding:'7px 14px', borderRadius:9, border:'none', background: alreadyTransferred ? '#F3F4F6' : '#C1272D', color: alreadyTransferred ? '#9CA3AF' : 'white', fontWeight:700, fontSize:'0.78rem', cursor: alreadyTransferred ? 'default' : 'pointer', whiteSpace:'nowrap' }}>
                              {requestingId === v.id ? 'Requesting…' : alreadyTransferred ? 'Request pending' : 'Request transfer'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Recap — status of every request this broker has made, in the same tab */}
                  <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
                    <div style={{ padding:'14px 20px', borderBottom:'1px solid #F3F4F6' }}>
                      <p style={{ fontWeight:700, color:'#111827', margin:0 }}>My requests — status recap</p>
                      <p style={{ fontSize:'0.78rem', color:'#9CA3AF', margin:'2px 0 0' }}>Every transfer/proposal you've sent, and what happened to it.</p>
                    </div>
                    {myRequests.length === 0 ? (
                      <div style={{ padding:'24px 20px', textAlign:'center', color:'#9CA3AF' }}>
                        <p style={{ margin:0, fontSize:'0.85rem' }}>You haven't requested anything yet.</p>
                      </div>
                    ) : myRequests.map((r:any) => {
                      const statusCfg: Record<string, {bg:string; color:string; label:string}> = {
                        pending:  { bg:'#FEF3C7', color:'#92400E', label:'Pending' },
                        accepted: { bg:'#D1FAE5', color:'#065F46', label:'Accepted' },
                        declined: { bg:'#FEE2E2', color:'#991B1B', label:'Declined' },
                        rejected: { bg:'#FEE2E2', color:'#991B1B', label:'Declined' },
                      };
                      const cfg = statusCfg[r.status] || statusCfg.pending;
                      return (
                        <div key={r.id} style={{ padding:'12px 20px', borderTop:'1px solid #F9FAFB', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                          <div style={{ flex:1, minWidth:180 }}>
                            <p style={{ fontWeight:600, color:'#111827', margin:'0 0 2px', fontSize:'0.84rem' }}>
                              {r.vehicle ? `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model}` : 'Vehicle'}
                            </p>
                            <p style={{ fontSize:'0.74rem', color:'#9CA3AF', margin:0 }}>
                              {r.msg_type === 'transfer_request' ? 'Transfer request' : r.msg_type} to {r.dealer?.company_name || 'dealer'} · {new Date(r.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span style={{ fontSize:'0.72rem', padding:'4px 12px', borderRadius:20, fontWeight:700, background:cfg.bg, color:cfg.color, whiteSpace:'nowrap' }}>{cfg.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : tab === 'deals' ? (
                <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
                  <div style={{ padding:'14px 20px', borderBottom:'1px solid #F3F4F6', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <p style={{ fontWeight:700, color:'#111827', margin:0 }}>My deals</p>
                    <Link href="/marketplace" style={{ fontSize:'0.8rem', color:'#C1272D', textDecoration:'none', fontWeight:600 }}>Find vehicles →</Link>
                  </div>
                  {deals.length === 0 ? (
                    <div style={{ padding:'40px', textAlign:'center', color:'#9CA3AF' }}>
                      <Car size={32} style={{ margin:'0 auto 12px', display:'block', opacity:0.3 }} />
                      <p style={{ fontWeight:500 }}>No deals yet</p>
                      <p style={{ fontSize:'0.875rem' }}>Browse vehicles and start referring buyers</p>
                    </div>
                  ) : (
                    <div style={{ overflowX:'auto' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
                        <thead>
                          <tr style={{ background:'#F9FAFB' }}>
                            {['Dealer','Buyer','Deal price','Commission','Status','Date'].map(h=>(
                              <th key={h} style={{ padding:'9px 16px', textAlign:'left', fontSize:'0.7rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {deals.map((d:any)=>{
                            const st = STATUS_CFG[d.status]||STATUS_CFG.pending;
                            return (
                              <tr key={d.id} style={{ borderTop:'1px solid #F9FAFB' }}>
                                <td style={{ padding:'12px 16px' }}><p style={{ fontWeight:600, color:'#111827', margin:0, fontSize:'0.85rem' }}>{d.dealer?.company_name}</p></td>
                                <td style={{ padding:'12px 16px' }}>
                                  <p style={{ color:'#374151', margin:0, fontSize:'0.82rem' }}>{d.buyer_name}</p>
                                  <p style={{ color:'#9CA3AF', margin:0, fontSize:'0.75rem' }}>🌍 {d.buyer_country}</p>
                                </td>
                                <td style={{ padding:'12px 16px' }}><span style={{ fontWeight:600, color:'#374151', fontSize:'0.875rem' }}>{formatPrice(Number(d.deal_price_aed))}</span></td>
                                <td style={{ padding:'12px 16px' }}>
                                  <span style={{ fontWeight:800, color:'#007A3D', fontSize:'0.9rem' }}>{formatPrice(Number(d.commission_aed))}</span>
                                  <p style={{ color:'#9CA3AF', margin:0, fontSize:'0.72rem' }}>{(Number(d.commission_rate)*100).toFixed(1)}%</p>
                                </td>
                                <td style={{ padding:'12px 16px' }}><span style={{ fontSize:'0.72rem', padding:'3px 10px', borderRadius:20, fontWeight:600, background:st.bg, color:st.color }}>{st.label}</span></td>
                                <td style={{ padding:'12px 16px' }}><span style={{ fontSize:'0.8rem', color:'#9CA3AF' }}>{new Date(d.created_at).toLocaleDateString()}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
                  <div style={{ padding:'14px 20px', borderBottom:'1px solid #F3F4F6', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <p style={{ fontWeight:700, color:'#111827', margin:0 }}>My reservations</p>
                    <span style={{ fontSize:'0.75rem', color:'#9CA3AF' }}>Reservations expire after 24h</span>
                  </div>
                  {reservations.length === 0 ? (
                    <div style={{ padding:'40px', textAlign:'center', color:'#9CA3AF' }}>
                      <Bookmark size={32} style={{ margin:'0 auto 12px', display:'block', opacity:0.3 }} />
                      <p style={{ fontWeight:500 }}>No reservations yet</p>
                      <p style={{ fontSize:'0.875rem' }}>Reserve a vehicle from the marketplace to hold it 24h</p>
                    </div>
                  ) : (
                    <div>
                      {reservations.map((r:any)=>{
                        const isActive = r.status==='active';
                        const expiresIn = isActive?Math.max(0,Math.round((new Date(r.expires_at).getTime()-Date.now())/3600000)):0;
                        const rSC: Record<string,{color:string;bg:string;label:string}> = {
                          active:{color:'#1E40AF',bg:'#DBEAFE',label:'Active'},
                          expired:{color:'#92400E',bg:'#FEF3C7',label:'Expired'},
                          cancelled:{color:'#6B7280',bg:'#F3F4F6',label:'Cancelled'},
                          converted:{color:'#065F46',bg:'#D1FAE5',label:'Converted'},
                        };
                        const sc = rSC[r.status]||rSC.active;
                        return (
                          <div key={r.id} style={{ padding:'14px 20px', borderTop:'1px solid #F9FAFB', display:'flex', alignItems:'center', gap:14 }}>
                            <div style={{ width:56, height:42, borderRadius:8, background:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              {r.vehicle?.vehicle_images?.[0]?.cdn_url?<img src={r.vehicle.vehicle_images[0].cdn_url} alt="" style={{ width:'100%', height:'100%', borderRadius:8, objectFit:'cover' }} />:<Car size={16} style={{ color:'#D1D5DB' }} />}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={{ fontWeight:700, color:'#111827', margin:0, fontSize:'0.85rem' }}>{r.vehicle?.year} {r.vehicle?.make} {r.vehicle?.model}</p>
                              <p style={{ color:'#9CA3AF', margin:0, fontSize:'0.75rem' }}>{formatPrice(Number(r.vehicle?.price_aed||0))} · {r.dealer?.company_name}</p>
                            </div>
                            <div style={{ textAlign:'right', flexShrink:0 }}>
                              <span style={{ fontSize:'0.72rem', padding:'3px 10px', borderRadius:20, fontWeight:600, background:sc.bg, color:sc.color }}>{sc.label}</span>
                              {isActive&&<p style={{ color:'#9CA3AF', margin:'4px 0 0', fontSize:'0.72rem' }}><Clock size={10} style={{ display:'inline', marginRight:3 }} />{expiresIn}h left</p>}
                            </div>
                            {isActive ? (
                              <button onClick={()=>cancelReservation(r.id)}
                                style={{ width:28, height:28, borderRadius:8, border:'1px solid #FECACA', background:'#FFF1F2', color:'#C1272D', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                <XIcon size={13} />
                              </button>
                            ) : r.status==='converted' ? (
                              <button onClick={()=>setTab('deals')}
                                style={{ padding:'4px 10px', borderRadius:8, border:'1px solid #D1FAE5', background:'#F0FDF4', color:'#065F46', cursor:'pointer', fontSize:'0.7rem', fontWeight:700, flexShrink:0, whiteSpace:'nowrap' }}>
                                View deal →
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {/* AI Matching — unlocked at 5 active referrals */}
              {aiMatching && !aiMatching.unlocked && (
                <div style={{ background:'#F3F4F6', border:'1px dashed #D1D5DB', borderRadius:16, padding:20, textAlign:'center' }}>
                  <div style={{ width:40, height:40, borderRadius:11, background:'#E5E7EB', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px' }}>
                    <span style={{ fontSize:'1.1rem', filter:'grayscale(1)', opacity:0.6 }}>🔒</span>
                  </div>
                  <p style={{ fontWeight:700, color:'#6B7280', margin:'0 0 4px', fontSize:'0.88rem' }}>AI Matching</p>
                  <p style={{ fontSize:'0.78rem', color:'#9CA3AF', margin:'0 0 12px', lineHeight:1.4 }}>
                    Unlocks after {aiMatching.required} successful referrals — invite dealers, brokers or buyers with your code to activate it.
                  </p>
                  <div style={{ height:6, borderRadius:99, background:'#E5E7EB', overflow:'hidden', marginBottom:6 }}>
                    <div style={{ height:'100%', width:`${Math.min(100, (aiMatching.referrals_count/aiMatching.required)*100)}%`, background:'#9CA3AF', borderRadius:99 }} />
                  </div>
                  <p style={{ fontSize:'0.72rem', color:'#9CA3AF', fontWeight:600, margin:0 }}>{aiMatching.referrals_count}/{aiMatching.required} referrals</p>
                </div>
              )}

              {aiMatching?.unlocked && (
                <div style={{ background:'linear-gradient(135deg, #F5F3FF, #FFFFFF)', border:'1px solid #DDD6FE', borderRadius:16, padding:18 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <span style={{ fontSize:'1.1rem' }}>✨</span>
                    <p style={{ fontWeight:800, color:'#5B21B6', margin:0, fontSize:'0.88rem' }}>AI Matching</p>
                    <span style={{ fontSize:'0.65rem', fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#EDE9FE', color:'#5B21B6' }}>Unlocked</span>
                  </div>
                  {aiMatching.matches.length === 0 ? (
                    <p style={{ fontSize:'0.78rem', color:'#6B7280', margin:0 }}>No shared vehicles to match against yet — once dealers share stock with you, your best-fit matches will appear here.</p>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {aiMatching.matches.map((v:any) => (
                        <div key={v.id} style={{ background:'white', border:'1px solid #EDE9FE', borderRadius:10, padding:'8px 10px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', gap:6 }}>
                            <p style={{ fontWeight:700, color:'#111827', margin:0, fontSize:'0.78rem' }}>{v.year} {v.make} {v.model}</p>
                            <span style={{ fontSize:'0.68rem', fontWeight:800, color:'#5B21B6' }}>{v.match_score}%</span>
                          </div>
                          <p style={{ fontSize:'0.7rem', color:'#9CA3AF', margin:0 }}>{v.dealer?.company_name || 'Shared vehicle'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Affiliate code card */}
              <div style={{ background:'linear-gradient(135deg, #111827, #1F2937)', borderRadius:16, padding:22 }}>
                <p style={{ fontSize:'0.7rem', fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 6px' }}>Your affiliate code</p>
                <p style={{ fontFamily:'monospace', fontSize:'1.4rem', fontWeight:900, color:'#C1272D', margin:'0 0 14px', letterSpacing:'0.1em' }}>{broker.affiliate_code}</p>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    { label:'Buyer signup', val:referralLink, key:'buyer' },
                    { label:'Dealer signup', val:dealerLink,  key:'dealer' },
                    { label:'Broker signup', val:brokerLink,  key:'broker' },
                  ].map(l=>(
                    <div key={l.key} style={{ background:'rgba(255,255,255,0.08)', borderRadius:9, padding:'9px 12px' }}>
                      <p style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.4)', margin:'0 0 3px', textTransform:'uppercase' }}>{l.label}</p>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <p style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.7)', margin:0, fontFamily:'monospace', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.val}</p>
                        <button onClick={()=>copy(l.val,l.key)} style={{ background:copied===l.key?'#007A3D':'#C1272D', border:'none', borderRadius:7, padding:'4px 10px', cursor:'pointer', color:'white', fontSize:'0.7rem', fontWeight:700, display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                          {copied===l.key?<Check size={11}/>:<Copy size={11}/>} {copied===l.key?'OK':'Copy'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <a href={`https://wa.me/?text=${encodeURIComponent('Find your next car in Dubai — use my code '+broker.affiliate_code+': '+referralLink)}`} target="_blank"
                  style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:14, padding:'10px 0', background:'#25D366', borderRadius:10, color:'white', textDecoration:'none', fontWeight:700, fontSize:'0.875rem' }}>
                  <MessageCircle size={15} /> Share on WhatsApp
                </a>
              </div>

              {/* Quick actions */}
              <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
                <p style={{ fontWeight:700, color:'#111827', margin:0, padding:'12px 16px', borderBottom:'1px solid #F3F4F6', fontSize:'0.875rem' }}>Quick actions</p>
                {[
                  { icon:Car,   color:'#C1272D', label:'Browse & share vehicles', href:'/marketplace' },
                  { icon:Users, color:'#3B82F6', label:'Refer a new dealer',       href:dealerLink },
                  { icon:HeartHandshake, color:'#10B981', label:'Refer a new broker', href:brokerLink },
                  { icon:Award, color:'#8B5CF6', label:'Programme details',        href:'/broker' },
                ].map(a=>(
                  <Link key={a.label} href={a.href} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid #F9FAFB', textDecoration:'none' }}>
                    <div style={{ width:30, height:30, borderRadius:7, background:a.color+'12', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><a.icon size={14} style={{ color:a.color }} /></div>
                    <span style={{ fontSize:'0.875rem', color:'#374151', flex:1 }}>{a.label}</span>
                    <ChevronRight size={13} style={{ color:'#D1D5DB' }} />
                  </Link>
                ))}
              </div>

              {broker.specialties?.length > 0 && (
                <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:16 }}>
                  <p style={{ fontWeight:700, color:'#111827', margin:'0 0 10px', fontSize:'0.875rem' }}>Your specialties</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {broker.specialties.map((s:string)=><span key={s} style={{ fontSize:'0.78rem', padding:'4px 10px', borderRadius:20, background:'#FFF1F2', color:'#C1272D', fontWeight:500 }}>{s}</span>)}
                  </div>
                </div>
              )}

              {/* Billing conversion stats */}
              {billingStats && (
                <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:'1rem' }}>📄</span>
                    <p style={{ fontWeight:700, color:'#111827', margin:0, fontSize:'0.875rem' }}>Quotes &amp; Invoices</p>
                  </div>
                  <div style={{ padding:'10px 16px', display:'flex', flexDirection:'column', gap:8 }}>
                    {[
                      { label:'Quotes originated',     value:billingStats.quotes_originated,                              color:'#374151' },
                      { label:'Taux de conversion', value:`${billingStats.conversion_rate_pct}%`,                      color:billingStats.conversion_rate_pct>=50?'#007A3D':billingStats.conversion_rate_pct>=25?'#92400E':'#C1272D' },
                      { label:'Invoices generated',  value:billingStats.invoices_total,                                 color:'#374151' },
                      { label:'Revenue generated (paid)',   value:formatPrice(Number(billingStats.revenue_generated_aed||0)), color:'#007A3D' },
                      { label:'En attente paiement',value:formatPrice(Number(billingStats.revenue_outstanding_aed||0)), color:'#92400E' },
                    ].map(row=>(
                      <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 0', borderBottom:'1px solid #F9FAFB' }}>
                        <span style={{ fontSize:'0.75rem', color:'#6B7280' }}>{row.label}</span>
                        <span style={{ fontSize:'0.82rem', fontWeight:800, color:row.color }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MARKET ANALYTICS TAB ── */}
        {mainTab === 'market' && <BrokerMarketPanel broker={broker} stats={stats} />}

        {/* ── AI PRICE INTELLIGENCE TAB ── */}
        {mainTab === 'ai' && <BrokerAIPanel broker={broker} />}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
