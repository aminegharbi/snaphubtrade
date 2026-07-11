'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { BarChart3, Package, TrendingUp, AlertTriangle, CheckCircle2, Plus, Edit3, Trash2, Eye, Tag, Zap, RefreshCw, Search, X, Check, Clock, DollarSign, Car, Filter, ArrowUpRight, ArrowDownRight, MessageCircle, Copy, Star, Globe, ChevronRight, Activity, Target, Brain, Sparkles, AlertCircle, BarChart2, Database, TrendingDown, FileText, Send, Receipt } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { MobileNav } from '@/components/layout/MobileNav';
import { VehicleFullEditModal } from '@/components/vehicles/VehicleFullEditModal';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { CurrencySelector } from '@/components/common/CurrencySelector';
import { ProfitabilityPanel } from '@/components/dealer/ProfitabilityPanel';
import { AiTwinPanel } from '@/components/dealer/AiTwinPanel';
import { usePriceFormatter } from '@/components/common/Price';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Vehicle {
  id: string; make: string; model: string; year: number; trim?: string;
  body_type?: string; fuel_type?: string; mileage_km: number; color_exterior?: string;
  price_aed: number; price_suggested_aed?: number; status: string; currency?: string;
  export_eligible: boolean; view_count: number; favorite_count: number;
  stock_quantity?: number; sold_units?: number;
  created_at: string; vehicle_images?: { cdn_url: string; is_primary: boolean }[];
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  available:      { label: 'Available',  color: '#065F46', bg: '#D1FAE5' },
  reserved:       { label: 'Reserved',   color: '#92400E', bg: '#FEF3C7' },
  sold:           { label: 'Sold',       color: '#374151', bg: '#F3F4F6' },
  draft:          { label: 'Draft',      color: '#5B21B6', bg: '#EDE9FE' },
  pending_payment:{ label: 'Pending',    color: '#1E40AF', bg: '#DBEAFE' },
  exported:       { label: 'Exported',   color: '#065F46', bg: '#D1FAE5' },
};

const COLORS = ['#C1272D','#3B82F6','#007A3D','#F59E0B','#8B5CF6','#EC4899','#06B6D4','#84CC16'];

function daysAgo(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position:'fixed', top:16, right:16, zIndex:50, display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:12, fontSize:'0.85rem', fontWeight:500, boxShadow:'0 8px 24px rgba(0,0,0,0.15)', background:'#111827', color:'white' }}>
      <Check size={14} style={{ color: '#34D399' }} /> {msg}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || STATUS_CFG.available;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'2px 10px', borderRadius:20, fontSize:'0.72rem', fontWeight:600, background:c.bg, color:c.color }}>{c.label}</span>
  );
}

// ─── Mini charts ─────────────────────────────────────────────────────────────
function BarH({ data, labelKey, valueKey }: { data:any[]; labelKey:string; valueKey:string }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
      {data.slice(0,6).map((d, i) => (
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
  let cum = 0; const r=52, c=2*Math.PI*r;
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

// ─── Quick Edit Modal ─────────────────────────────────────────────────────────
function QuickEditModal({ vehicle: v, onClose, onSave }: { vehicle: Vehicle; onClose:()=>void; onSave:(v:Vehicle)=>void }) {
  const formatPrice = usePriceFormatter();
  const [data, setData] = useState({ ...v });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.patch<Vehicle>(`/vehicles/${v.id}`, {
        price_aed: Number(data.price_aed), status: data.status,
        export_eligible: data.export_eligible, mileage_km: Number(data.mileage_km),
        color_exterior: data.color_exterior,
      });
      onSave({ ...data, ...updated }); onClose();
    } catch (e:any) { setErr(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16, background:'rgba(0,0,0,0.45)' }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:440, overflow:'hidden', boxShadow:'0 24px 48px rgba(0,0,0,0.18)' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <p style={{ fontWeight:700, color:'#111827', margin:0 }}>Quick edit</p>
            <p style={{ fontSize:'0.75rem', color:'#9CA3AF', margin:0 }}>{data.year} {data.make} {data.model}</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={16} color="#9CA3AF" /></button>
        </div>
        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16 }}>
          {err && <div style={{ background:'#FEE2E2', color:'#991B1B', padding:'10px 14px', borderRadius:8, fontSize:'0.875rem' }}>{err}</div>}
          <div>
            <label style={{ fontSize:'0.75rem', color:'#6B7280', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:6 }}>Price ({v.currency||'AED'})</label>
            <input type="number" value={data.price_aed} onChange={e=>setData(d=>({...d,price_aed:+e.target.value}))}
              style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'1.1rem', fontWeight:700, outline:'none' }} />
          </div>
          <div>
            <label style={{ fontSize:'0.75rem', color:'#6B7280', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:6 }}>Status</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {Object.entries(STATUS_CFG).map(([s,c])=>(
                <button key={s} onClick={()=>setData(d=>({...d,status:s}))}
                  style={{ padding:'6px 12px', borderRadius:8, fontSize:'0.75rem', fontWeight:500, cursor:'pointer', border:'1.5px solid', borderColor:data.status===s?c.color:'#E5E7EB', background:data.status===s?c.bg:'white', color:data.status===s?c.color:'#6B7280' }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:'0.75rem', color:'#6B7280', fontWeight:600, display:'block', marginBottom:4 }}>Mileage (km)</label>
              <input type="number" value={data.mileage_km} onChange={e=>setData(d=>({...d,mileage_km:+e.target.value}))}
                style={{ width:'100%', padding:'8px 12px', border:'1.5px solid #E5E7EB', borderRadius:8, fontSize:'0.85rem', outline:'none' }} />
            </div>
            <div>
              <label style={{ fontSize:'0.75rem', color:'#6B7280', fontWeight:600, display:'block', marginBottom:4 }}>Color</label>
              <input type="text" value={data.color_exterior||''} onChange={e=>setData(d=>({...d,color_exterior:e.target.value}))}
                style={{ width:'100%', padding:'8px 12px', border:'1.5px solid #E5E7EB', borderRadius:8, fontSize:'0.85rem', outline:'none' }} />
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderRadius:10, background:'#F9FAFB', border:'1px solid #E5E7EB' }}>
            <div>
              <p style={{ fontSize:'0.875rem', color:'#111827', fontWeight:500, margin:0 }}>Export eligible</p>
              <p style={{ fontSize:'0.75rem', color:'#6B7280', margin:0 }}>Visible to international buyers</p>
            </div>
            <button onClick={()=>setData(d=>({...d,export_eligible:!d.export_eligible}))}
              style={{ width:42, height:24, borderRadius:12, border:'none', cursor:'pointer', position:'relative', background:data.export_eligible?'#C1272D':'#D1D5DB', transition:'background 0.2s' }}>
              <span style={{ position:'absolute', top:3, width:18, height:18, borderRadius:'50%', background:'white', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 0.2s', left:data.export_eligible?21:3 }} />
            </button>
          </div>
        </div>
        <div style={{ padding:'14px 20px', borderTop:'1px solid #F3F4F6', display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px 0', borderRadius:10, border:'1px solid #E5E7EB', background:'white', color:'#374151', cursor:'pointer', fontWeight:600 }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex:2, padding:'10px 0', borderRadius:10, border:'none', background:'#C1272D', color:'white', cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {saving ? <RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }} /> : <Check size={14} />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sell Modal ───────────────────────────────────────────────────────────────
function SellModal({ vehicle: v, dealerId, onClose, onDone }: { vehicle:Vehicle; dealerId:string; onClose:()=>void; onDone:(result?:any)=>void }) {
  const formatPrice = usePriceFormatter();
  const [brokers, setBrokers] = useState<any[]>([]);
  const [brokerId, setBrokerId] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerCountry, setBuyerCountry] = useState('');
  const [dealPrice, setDealPrice] = useState(String(v.price_aed));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/v1/broker/all?status=active&limit=100').then(r=>r.json()).then(d=>setBrokers(d.items||[])).catch(()=>{});
  }, []);

  const complete = async () => {
    setSaving(true); setErr('');
    try {
      const res = await fetch('/api/v1/broker/complete-sale', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ vehicle_id:v.id, dealer_id:dealerId, broker_id:brokerId||undefined, buyer_name:buyerName||undefined, buyer_country:buyerCountry||undefined, deal_price_aed:Number(dealPrice)||v.price_aed }),
      });
      if (!res.ok) { const d=await res.json(); throw new Error(d.message||'Failed'); }
      const result = await res.json();
      onDone(result);
    } catch (e:any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16, background:'rgba(0,0,0,0.5)' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'white', borderRadius:18, width:'100%', maxWidth:440, overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #F3F4F6' }}>
          <p style={{ fontWeight:700, color:'#111827', margin:'0 0 2px', fontSize:'1rem' }}>Mark as sold</p>
          <p style={{ color:'#9CA3AF', fontSize:'0.8rem', margin:0 }}>{v.year} {v.make} {v.model}</p>
        </div>
        <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ fontSize:'0.75rem', color:'#6B7280', fontWeight:600, display:'block', marginBottom:6 }}>Designate broker (optional)</label>
            <select value={brokerId} onChange={e=>setBrokerId(e.target.value)}
              style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'0.85rem', color:'#111827', background:'white' }}>
              <option value="">No broker — direct sale</option>
              {brokers.map(b=><option key={b.id} value={b.id}>{b.full_name} · {b.tier} · {b.affiliate_code}</option>)}
            </select>
            {brokerId && <p style={{ fontSize:'0.72rem', color:'#007A3D', margin:'6px 0 0' }}>A commission record will be created automatically for this broker.</p>}
          </div>
          {brokerId && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={{ fontSize:'0.75rem', color:'#6B7280', fontWeight:600, display:'block', marginBottom:4 }}>Buyer name</label>
                <input value={buyerName} onChange={e=>setBuyerName(e.target.value)} style={{ width:'100%', padding:'8px 12px', border:'1.5px solid #E5E7EB', borderRadius:8, fontSize:'0.85rem', outline:'none' }} placeholder="Optional" />
              </div>
              <div>
                <label style={{ fontSize:'0.75rem', color:'#6B7280', fontWeight:600, display:'block', marginBottom:4 }}>Buyer country</label>
                <input value={buyerCountry} onChange={e=>setBuyerCountry(e.target.value)} style={{ width:'100%', padding:'8px 12px', border:'1.5px solid #E5E7EB', borderRadius:8, fontSize:'0.85rem', outline:'none' }} placeholder="Optional" />
              </div>
            </div>
          )}
          <div>
            <label style={{ fontSize:'0.75rem', color:'#6B7280', fontWeight:600, display:'block', marginBottom:4 }}>Final deal price</label>
            <input type="number" value={dealPrice} onChange={e=>setDealPrice(e.target.value)} style={{ width:'100%', padding:'8px 12px', border:'1.5px solid #E5E7EB', borderRadius:8, fontSize:'0.875rem', outline:'none' }} />
          </div>
          {err && <div style={{ padding:'8px 12px', background:'#FEF2F2', borderRadius:8, fontSize:'0.78rem', color:'#C1272D' }}>{err}</div>}
        </div>
        <div style={{ padding:'14px 20px', borderTop:'1px solid #F3F4F6', display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px 0', borderRadius:10, border:'1px solid #E5E7EB', background:'white', color:'#374151', cursor:'pointer', fontWeight:600 }}>Cancel</button>
          <button onClick={complete} disabled={saving} style={{ flex:2, padding:'10px 0', borderRadius:10, border:'none', background:'#374151', color:'white', cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {saving ? <RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }} /> : <Check size={14} />}
            {saving ? 'Completing…' : 'Confirm sale'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reservation Sell Modal ─────────────────────────────────────────────────
function ReservationSellModal({ reservation: r, onClose, onDone }: { reservation:any; onClose:()=>void; onDone:(result?:any)=>void }) {
  const formatPrice = usePriceFormatter();
  const [dealPrice, setDealPrice] = useState(String(Number(r.vehicle?.price_aed||0)));
  const [buyerName, setBuyerName] = useState('');
  const [buyerCountry, setBuyerCountry] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const broker = r.broker;

  const doSell = async () => {
    setSaving(true); setErr('');
    try {
      const res = await fetch(`/api/v1/reservations/${r.id}/sell`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_price_aed: Number(dealPrice), buyer_name: buyerName||undefined, buyer_country: buyerCountry||undefined, notes: notes||undefined }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message||'Failed'); }
      const result = await res.json();
      onDone(result);
    } catch (e:any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16, background:'rgba(0,0,0,0.5)' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'white', borderRadius:18, width:'100%', maxWidth:460, overflow:'hidden', boxShadow:'0 24px 64px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #F3F4F6', background:'linear-gradient(135deg,#F0FDF4,white)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <p style={{ fontWeight:700, color:'#111827', margin:'0 0 2px', fontSize:'1rem' }}>✅ Confirm sale from reservation</p>
            <p style={{ color:'#9CA3AF', fontSize:'0.78rem', margin:0 }}>{r.vehicle?.year} {r.vehicle?.make} {r.vehicle?.model}</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}><X size={16} color="#9CA3AF" /></button>
        </div>
        <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
          {broker && (
            <div style={{ padding:'10px 14px', borderRadius:10, background:'#EFF6FF', border:'1px solid #BFDBFE', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:'1rem' }}>🤝</span>
              <div>
                <p style={{ margin:0, fontWeight:700, color:'#1E40AF', fontSize:'0.85rem' }}>{broker.full_name}</p>
                <p style={{ margin:0, color:'#6B7280', fontSize:'0.72rem' }}>{broker.tier} broker · {broker.affiliate_code}</p>
              </div>
              <span style={{ marginLeft:'auto', fontSize:'0.7rem', background:'#DBEAFE', color:'#1E40AF', padding:'2px 8px', borderRadius:20, fontWeight:700, flexShrink:0 }}>Commission auto-calc.</span>
            </div>
          )}
          <div>
            <label style={{ fontSize:'0.75rem', color:'#6B7280', fontWeight:600, display:'block', marginBottom:4 }}>Final deal price</label>
            <input type="number" value={dealPrice} onChange={e=>setDealPrice(e.target.value)}
              style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'1rem', fontWeight:700, color:'#111827', outline:'none' }} />
            {broker && Number(dealPrice) > 0 && (
              <p style={{ fontSize:'0.72rem', color:'#007A3D', margin:'5px 0 0', fontWeight:600 }}>
                ≈ {formatPrice(Math.round(Number(dealPrice) * Number(broker.commission_rate||0.015)))} commission for {broker.full_name}
              </p>
            )}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={{ fontSize:'0.75rem', color:'#6B7280', fontWeight:600, display:'block', marginBottom:4 }}>Buyer name</label>
              <input value={buyerName} onChange={e=>setBuyerName(e.target.value)} placeholder="Optional"
                style={{ width:'100%', padding:'8px 12px', border:'1.5px solid #E5E7EB', borderRadius:8, fontSize:'0.85rem', outline:'none' }} />
            </div>
            <div>
              <label style={{ fontSize:'0.75rem', color:'#6B7280', fontWeight:600, display:'block', marginBottom:4 }}>Buyer country</label>
              <input value={buyerCountry} onChange={e=>setBuyerCountry(e.target.value)} placeholder="Optional"
                style={{ width:'100%', padding:'8px 12px', border:'1.5px solid #E5E7EB', borderRadius:8, fontSize:'0.85rem', outline:'none' }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize:'0.75rem', color:'#6B7280', fontWeight:600, display:'block', marginBottom:4 }}>Notes (optional)</label>
            <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any notes about this sale…"
              style={{ width:'100%', padding:'8px 12px', border:'1.5px solid #E5E7EB', borderRadius:8, fontSize:'0.85rem', outline:'none' }} />
          </div>
          {err && <div style={{ padding:'8px 12px', background:'#FEF2F2', borderRadius:8, fontSize:'0.78rem', color:'#C1272D' }}>{err}</div>}
        </div>
        <div style={{ padding:'14px 20px', borderTop:'1px solid #F3F4F6', display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px 0', borderRadius:10, border:'1px solid #E5E7EB', background:'white', color:'#374151', cursor:'pointer', fontWeight:600 }}>Cancel</button>
          <button onClick={doSell} disabled={saving}
            style={{ flex:2, padding:'10px 0', borderRadius:10, border:'none', background:'#374151', color:'white', cursor:'pointer', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {saving ? <RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }} /> : <Check size={14} />}
            {saving ? 'Processing…' : 'Confirm sale'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── Market Analytics Panel ───────────────────────────────────────────────────
function MarketAnalyticsPanel({ dealerId, stats }: { dealerId:string; stats:any }) {
  const formatPrice = usePriceFormatter();
  const [market, setMarket] = useState<any>(null);
  const [priceAnalysis, setPriceAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealerId) return;
    Promise.all([
      fetch('/api/v1/market-analytics/dashboard').then(r=>r.ok?r.json():null).catch(()=>null),
      fetch(`/api/v1/dealer-dashboard/${dealerId}/price-analysis`).then(r=>r.ok?r.json():null).catch(()=>null),
    ]).then(([m, pa]) => { setMarket(m); setPriceAnalysis(pa); setLoading(false); });
  }, [dealerId]);

  if (loading) return <div style={{ padding:60, textAlign:'center' }}><RefreshCw size={20} style={{ color:'#9CA3AF', animation:'spin 1s linear infinite', display:'block', margin:'0 auto' }} /></div>;

  // Build dealer-specific breakdown from price analysis
  const makeMap: Record<string,number> = {};
  const fuelMap: Record<string,number> = {};
  const statusMap: Record<string,number> = {};

  (priceAnalysis?.vehicles || []).forEach((v:any) => {
    // We only have make from vehicle_name "2023 Toyota Land Cruiser"
    const parts = v.vehicle_name.split(' ');
    if (parts.length >= 2) { const make = parts[1]; makeMap[make] = (makeMap[make]||0)+1; }
  });

  const myMakes = Object.entries(makeMap).map(([make,count])=>({make,count})).sort((a,b)=>b.count-a.count);

  const myAvgPrice = stats?.stock_value_aed && stats?.available_listings
    ? Math.round(Number(stats.stock_value_aed) / Number(stats.available_listings))
    : 0;
  const marketAvgPrice = market?.kpis?.avg_price || 0;
  const priceDiff = marketAvgPrice ? Math.round(((myAvgPrice - marketAvgPrice) / marketAvgPrice) * 100) : 0;

  const summary = priceAnalysis?.summary;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Position vs market */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:12 }}>
        {[
          { label:'My avg price', value: myAvgPrice ? formatPrice(myAvgPrice) : '—', sub:'available stock', color:'#C1272D', icon:DollarSign },
          { label:'Market avg price', value: marketAvgPrice ? formatPrice(marketAvgPrice) : '—', sub:'platform-wide', color:'#374151', icon:BarChart2 },
          { label:'My vs market', value: priceDiff ? `${priceDiff>0?'+':''}${priceDiff}%` : '—', sub:priceDiff>0?'above market':priceDiff<0?'below market':'on market', color:priceDiff>5?'#C1272D':priceDiff<-5?'#007A3D':'#374151', icon:priceDiff>=0?ArrowUpRight:ArrowDownRight },
          { label:'Vehicles sold', value: (stats?.sold||0).toString(), sub:'total units sold', color:'#007A3D', icon:Check },
          { label:'Optimal pricing', value: summary ? `${summary.optimal}/${summary.total_vehicles}` : '—', sub:'vehicles at market price', color:'#3B82F6', icon:Target },
          { label:'Potential gain', value: summary?.potential_revenue_gain_aed ? formatPrice(summary.potential_revenue_gain_aed) : '—', sub:'if repriced', color:'#8B5CF6', icon:TrendingUp },
        ].map(c=>(
          <div key={c.label} style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:12, padding:'14px 16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <p style={{ fontSize:'0.68rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.06em', margin:0 }}>{c.label}</p>
              <c.icon size={14} style={{ color:c.color }} />
            </div>
            <p style={{ fontWeight:800, fontSize:'1.3rem', color:c.color, margin:'0 0 2px' }}>{c.value}</p>
            <p style={{ fontSize:'0.72rem', color:'#9CA3AF', margin:0 }}>{c.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {/* My stock by make */}
        {myMakes.length > 0 && (
          <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 18px' }}>
            <p style={{ fontWeight:700, color:'#111827', margin:'0 0 14px', fontSize:'0.9rem' }}>🚗 My stock by make</p>
            <BarH data={myMakes} labelKey="make" valueKey="count" />
          </div>
        )}

        {/* Market top makes */}
        {market?.by_make?.length > 0 && (
          <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 18px' }}>
            <p style={{ fontWeight:700, color:'#111827', margin:'0 0 14px', fontSize:'0.9rem' }}>📊 Market top brands (UAE)</p>
            <BarH data={market.by_make} labelKey="make" valueKey="count" />
          </div>
        )}

        {/* Price alerts */}
        {priceAnalysis?.alerts?.length > 0 && (
          <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 18px', gridColumn:'1/-1' }}>
            <p style={{ fontWeight:700, color:'#111827', margin:'0 0 14px', fontSize:'0.9rem' }}>⚠️ Pricing alerts — vehicles that need attention</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {priceAnalysis.alerts.slice(0,6).map((a:any,i:number)=>{
                const urgColor = a.urgency==='high'?'#C1272D':a.urgency==='medium'?'#92400E':'#374151';
                const urgBg   = a.urgency==='high'?'#FEE2E2':a.urgency==='medium'?'#FEF3C7':'#F3F4F6';
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:10, background:'#F9FAFB', border:'1px solid #F3F4F6' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontWeight:600, color:'#111827', margin:0, fontSize:'0.82rem' }}>{a.vehicle_name}</p>
                      <p style={{ color:'#9CA3AF', margin:0, fontSize:'0.72rem' }}>{a.recommendation}</p>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <p style={{ fontWeight:700, color:a.status==='overpriced'?'#C1272D':'#007A3D', margin:0, fontSize:'0.82rem' }}>
                        {a.delta_pct>0?'+':''}{a.delta_pct}%
                      </p>
                      <span style={{ fontSize:'0.65rem', padding:'2px 7px', borderRadius:10, fontWeight:700, background:urgBg, color:urgColor }}>{a.urgency}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <a href="/dealer/pricing" style={{ display:'inline-block', marginTop:12, fontSize:'0.8rem', fontWeight:600, color:'#C1272D', textDecoration:'none' }}>
              Open full pricing AI →
            </a>
          </div>
        )}

        {/* Market categories */}
        {market?.by_body_type?.length > 0 && (
          <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 18px' }}>
            <p style={{ fontWeight:700, color:'#111827', margin:'0 0 14px', fontSize:'0.9rem' }}>🚙 Market by category</p>
            <Donut data={market.by_body_type} labelKey="type" valueKey="count" />
          </div>
        )}

        {/* Market fuel type */}
        {market?.by_fuel_type?.length > 0 && (
          <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 18px' }}>
            <p style={{ fontWeight:700, color:'#111827', margin:'0 0 14px', fontSize:'0.9rem' }}>⚡ Market fuel mix</p>
            <Donut data={market.by_fuel_type} labelKey="fuel" valueKey="count" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI Market Analysis Panel ─────────────────────────────────────────────────
function AIMarketPanel({ dealerId }: { dealerId:string }) {
  const formatPrice = usePriceFormatter();
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  const [myVehicles, setMyVehicles] = useState<any[]>([]);
  const [lake, setLake] = useState<any>(null);          // Data Lake overview
  const [lakeIntel, setLakeIntel] = useState<any>(null); // personalized lake intelligence
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealerId) return;
    Promise.all([
      fetch('/api/v1/market-analysis/benchmarks').then(r=>r.ok?r.json():[]).catch(()=>[]),
      fetch(`/api/v1/dealer-dashboard/${dealerId}/price-analysis`).then(r=>r.ok?r.json():null).catch(()=>null),
      fetch('/api/v1/market-lake/overview').then(r=>r.ok?r.json():null).catch(()=>null),
      fetch(`/api/v1/market-lake/dealer/${dealerId}`).then(r=>r.ok?r.json():null).catch(()=>null),
    ]).then(([b, pa, lk, li]) => {
      setBenchmarks(Array.isArray(b)?b:[]);
      setMyVehicles(pa?.vehicles||[]);
      setLake(lk); setLakeIntel(li);
      setLoading(false);
    });
  }, [dealerId]);

  if (loading) return <div style={{ padding:60, textAlign:'center' }}><RefreshCw size={20} style={{ color:'#9CA3AF', animation:'spin 1s linear infinite', display:'block', margin:'0 auto' }} /></div>;

  // Match benchmarks to my vehicles by make/model
  const enriched = myVehicles.slice(0,10).map(v => {
    const parts = v.vehicle_name.split(' ');
    const make = parts[1]||''; const model = parts[2]||'';
    const bench = benchmarks.find(b => b.make?.toLowerCase()===make.toLowerCase() && b.model?.toLowerCase().includes(model.toLowerCase()));
    return { ...v, benchmark: bench };
  }).filter(v=>v.benchmark);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Info banner */}
      <div style={{ background:'linear-gradient(135deg, #1F2937, #111827)', borderRadius:14, padding:'18px 22px', display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ width:44, height:44, borderRadius:10, background:'rgba(193,39,45,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Brain size={20} style={{ color:'#C1272D' }} />
        </div>
        <div>
          <p style={{ fontWeight:700, color:'white', margin:'0 0 3px', fontSize:'0.95rem' }}>🔍 AI Market Intelligence — your vehicles vs Dubizzle & DubiCars</p>
          <p style={{ color:'rgba(255,255,255,0.55)', margin:0, fontSize:'0.8rem' }}>
            Live competitor pricing pulled by AI from UAE's top listing platforms. Updated by the platform admin.
          </p>
        </div>
        <a href="/admin/market-analysis" style={{ display:'none' }}>admin</a>
      </div>

      {/* ── Market Data Lake — proprietary historical intelligence ── */}
      {lake && (lake.listings_tracked > 0 || lake.benchmark_snapshots > 0) && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:12 }}>
          {[
            { label:'Vehicles tracked', value:(lake.listings_tracked||0).toLocaleString(), sub:`${lake.active_listings||0} active on market`, color:'#7C3AED' },
            { label:'Market observations', value:(lake.total_observations||0).toLocaleString(), sub:'historical data points', color:'#1E40AF' },
            { label:'Price changes seen', value:(lake.total_price_changes||0).toLocaleString(), sub:'across all listings', color:'#C1272D' },
            { label:'Observed selling time', value: lake.avg_observed_selling_days ? `${lake.avg_observed_selling_days}d` : '—', sub:`${lake.delisted_listings||0} listings sold/removed`, color:'#007A3D' },
            { label:'History depth', value: lake.history_from ? `${Math.max(1,Math.round((Date.now()-new Date(lake.history_from).getTime())/86400000))}d` : '—', sub: lake.history_to ? `updated ${new Date(lake.history_to).toLocaleDateString('en-GB')}` : 'no sync yet', color:'#B8860B' },
          ].map(k=>(
            <div key={k.label} style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:12, padding:'12px 14px' }}>
              <p style={{ fontSize:'0.64rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 5px' }}>🗄️ {k.label}</p>
              <p style={{ fontSize:'1.2rem', fontWeight:800, color:k.color, margin:'0 0 1px' }}>{k.value}</p>
              <p style={{ fontSize:'0.68rem', color:'#9CA3AF', margin:0 }}>{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Personalized Data Lake intelligence — my inventory vs market history ── */}
      {lakeIntel?.vehicles?.length > 0 && (
        <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid #F3F4F6', background:'#F9FAFB', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
            <p style={{ fontWeight:700, color:'#111827', margin:0, fontSize:'0.9rem' }}>🧠 Data Lake intelligence — your inventory vs historical market data</p>
            {lakeIntel.dealer_competitiveness_score !== null && (
              <span style={{ fontSize:'0.75rem', fontWeight:800, padding:'3px 12px', borderRadius:20,
                background: lakeIntel.dealer_competitiveness_score >= 70 ? '#D1FAE5' : lakeIntel.dealer_competitiveness_score >= 45 ? '#FEF3C7' : '#FEE2E2',
                color: lakeIntel.dealer_competitiveness_score >= 70 ? '#065F46' : lakeIntel.dealer_competitiveness_score >= 45 ? '#92400E' : '#B91C1C' }}>
                Competitiveness {lakeIntel.dealer_competitiveness_score}/100
              </span>
            )}
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#F9FAFB' }}>
                  {['Vehicle','My price','Fair market value','Δ vs market','Market trend','Avg selling time','Heat','Confidence','AI action'].map(h=>(
                    <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:'0.65rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lakeIntel.vehicles.slice(0,12).map((v:any)=>{
                  const ACTION_CFG:any = {
                    reduce_price:{label:'↓ Reduce price',bg:'#FEE2E2',color:'#B91C1C'},
                    increase_price:{label:'↑ Increase price',bg:'#DBEAFE',color:'#1E40AF'},
                    promote_now:{label:'🔥 Promote now',bg:'#FEF3C7',color:'#92400E'},
                    hold:{label:'✓ Hold',bg:'#F3F4F6',color:'#374151'},
                  };
                  const a = ACTION_CFG[v.suggested_action]||ACTION_CFG.hold;
                  return (
                    <tr key={v.vehicle_id} style={{ borderTop:'1px solid #F9FAFB' }}>
                      <td style={{ padding:'9px 14px', fontWeight:600, fontSize:'0.8rem', color:'#111827', whiteSpace:'nowrap' }}>{v.name}</td>
                      <td style={{ padding:'9px 14px', fontWeight:700, fontSize:'0.8rem', color:'#111827' }}>{formatPrice(v.price_aed)}</td>
                      <td style={{ padding:'9px 14px', fontSize:'0.8rem', color:'#374151' }}>{formatPrice(v.fair_market_value_aed)}</td>
                      <td style={{ padding:'9px 14px', fontSize:'0.8rem', fontWeight:700, color: v.delta_vs_market_pct > 5 ? '#C1272D' : v.delta_vs_market_pct < -5 ? '#1E40AF' : '#007A3D' }}>
                        {v.delta_vs_market_pct > 0 ? '+' : ''}{v.delta_vs_market_pct}%
                      </td>
                      <td style={{ padding:'9px 14px', fontSize:'0.8rem', fontWeight:600, color: v.market_trend_pct >= 0 ? '#007A3D' : '#C1272D' }}>
                        {v.market_trend_pct >= 0 ? '↗' : '↘'} {v.market_trend_pct}%
                      </td>
                      <td style={{ padding:'9px 14px', fontSize:'0.8rem', color:'#374151' }}>{v.avg_selling_time_days}d</td>
                      <td style={{ padding:'9px 14px' }}>
                        <div style={{ width:44, height:6, borderRadius:3, background:'#F3F4F6', overflow:'hidden' }}>
                          <div style={{ width:`${v.market_heat}%`, height:'100%', borderRadius:3, background: v.market_heat >= 65 ? '#DC2626' : v.market_heat >= 40 ? '#F59E0B' : '#9CA3AF' }} />
                        </div>
                      </td>
                      <td style={{ padding:'9px 14px', fontSize:'0.75rem', color:'#6B7280' }}>{v.confidence_pct}% · {(v.data_sources||[]).join(', ')}</td>
                      <td style={{ padding:'9px 14px' }}><span style={{ fontSize:'0.7rem', fontWeight:700, padding:'3px 9px', borderRadius:20, background:a.bg, color:a.color, whiteSpace:'nowrap' }}>{a.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {benchmarks.length === 0 ? (
        <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'48px', textAlign:'center' }}>
          <Database size={32} style={{ color:'#D1D5DB', margin:'0 auto 12px', display:'block' }} />
          <p style={{ fontWeight:600, color:'#374151', margin:'0 0 4px' }}>No AI benchmarks available yet</p>
          <p style={{ color:'#9CA3AF', fontSize:'0.82rem' }}>The platform admin runs periodic AI refreshes to pull live pricing from Dubizzle & DubiCars. Check back after the next refresh.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Benchmark table - all available */}
          <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid #F3F4F6', background:'#F9FAFB', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <p style={{ fontWeight:700, color:'#111827', margin:0, fontSize:'0.9rem' }}>📡 Live market benchmarks — UAE platforms</p>
              <span style={{ fontSize:'0.72rem', color:'#9CA3AF' }}>{benchmarks.length} data points</span>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#F9FAFB' }}>
                    {['Vehicle','Source','Market avg price','Listings','Demand','Trend','AI Confidence'].map(h=>(
                      <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:'0.65rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {benchmarks.map((b:any) => {
                    const srcColor = b.source==='dubizzle'?'#C1272D':'#1E40AF';
                    const stale = new Date(b.expires_at) < new Date();
                    return (
                      <tr key={b.id} style={{ borderTop:'1px solid #F9FAFB' }}>
                        <td style={{ padding:'10px 14px', fontWeight:600, fontSize:'0.82rem', color:'#111827', whiteSpace:'nowrap' }}>{b.year} {b.make} {b.model}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ fontSize:'0.68rem', padding:'2px 7px', borderRadius:20, fontWeight:700, background:srcColor+'15', color:srcColor }}>{b.source}</span>
                        </td>
                        <td style={{ padding:'10px 14px', fontWeight:700, fontSize:'0.82rem', color:'#374151' }}>{formatPrice(Number(b.avg_price_aed))}</td>
                        <td style={{ padding:'10px 14px', fontSize:'0.82rem', color:'#6B7280' }}>{b.listing_count}</td>
                        <td style={{ padding:'10px 14px', fontSize:'0.75rem', color:'#6B7280', textTransform:'capitalize' }}>{(b.demand_level||'').replace('_',' ')}</td>
                        <td style={{ padding:'10px 14px', fontSize:'0.82rem', fontWeight:600, color:Number(b.trend_pct)>0?'#007A3D':'#C1272D' }}>
                          {Number(b.trend_pct)>0?'+':''}{Number(b.trend_pct).toFixed(1)}%
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ fontSize:'0.75rem', fontWeight:700, color:b.confidence_pct>=80?'#065F46':b.confidence_pct>=60?'#92400E':'#991B1B' }}>{b.confidence_pct}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* My vehicles vs benchmarks */}
          {enriched.length > 0 && (
            <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid #F3F4F6', background:'linear-gradient(135deg,#FFF1F2,white)' }}>
                <p style={{ fontWeight:700, color:'#C1272D', margin:0, fontSize:'0.9rem' }}>🎯 Your vehicles vs AI benchmark</p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                {enriched.map((v:any,i:number)=>{
                  const diff = Math.round(((v.current_price_aed - Number(v.benchmark.avg_price_aed)) / Number(v.benchmark.avg_price_aed)) * 100);
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 18px', borderTop:i>0?'1px solid #F9FAFB':'none' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontWeight:600, color:'#111827', margin:0, fontSize:'0.85rem' }}>{v.vehicle_name}</p>
                        <p style={{ color:'#9CA3AF', margin:0, fontSize:'0.72rem' }}>Source: {v.benchmark.source} · {v.benchmark.listing_count} listings tracked</p>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <p style={{ fontWeight:600, color:'#374151', margin:0, fontSize:'0.78rem' }}>Your: <strong style={{color:'#111827'}}>{formatPrice(v.current_price_aed)}</strong></p>
                        <p style={{ fontWeight:600, color:'#374151', margin:0, fontSize:'0.78rem' }}>Market: <strong style={{color:'#6B7280'}}>{formatPrice(Number(v.benchmark.avg_price_aed))}</strong></p>
                      </div>
                      <div style={{ width:52, textAlign:'center', flexShrink:0 }}>
                        <p style={{ fontWeight:800, fontSize:'0.9rem', color:diff>5?'#C1272D':diff<-5?'#007A3D':'#374151', margin:0 }}>{diff>0?'+':''}{diff}%</p>
                        <p style={{ fontSize:'0.65rem', color:'#9CA3AF', margin:0 }}>{diff>5?'above':diff<-5?'below':'on'} mkt</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function DealerDashboard() {
  const { t } = useLocale();
  const router = useRouter();
  const formatPrice = usePriceFormatter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<any>({});
  const [brokerStats, setBrokerStats] = useState<any>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [fullEditing, setFullEditing] = useState<Vehicle | null>(null);
  const [sellModalVehicle, setSellModalVehicle] = useState<Vehicle | null>(null);
  const [reservationSell, setReservationSell] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [toast, setToast] = useState('');
  const [dealerId, setDealerId] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [mainTab, setMainTab] = useState<'inventory'|'market'|'ai'>('inventory');

  useEffect(() => {
    const did = localStorage.getItem('dealer_id') || '';
    localStorage.setItem('dealer_id', did);
    setDealerId(did);
  }, []);

  const load = useCallback(async () => {
    if (!dealerId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      const [inv, st, bs, rs] = await Promise.all([
        api.get<any>(`/dealer-dashboard/${dealerId}/inventory?${params}`),
        api.get<any>(`/dealer-dashboard/${dealerId}/stats`).catch(()=>({})),
        api.get<any>(`/broker/dealer/${dealerId}/stats`).catch(()=>null),
        api.get<any>(`/reservations/dealer/${dealerId}?status=active`).catch(()=>[]),
      ]);
      setVehicles(inv.items || []);
      setTotal(inv.total || 0);
      setStats(st || {});
      setBrokerStats(bs);
      setReservations(Array.isArray(rs) ? rs : []);
    } catch { setVehicles([]); }
    finally { setLoading(false); }
  }, [dealerId, search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(()=>load(), 20_000); return ()=>clearInterval(t); }, [load]);

  const showToast = (m: string) => setToast(m);
  const refreshStats = async () => {
    // Read dealerId fresh from localStorage to avoid stale closure
    const did = localStorage.getItem('dealer_id') || dealerId;
    if (!did) return;
    try { const st = await api.get<any>(`/dealer-dashboard/${did}/stats`); setStats(st||{}); } catch {}
  };

  const handleSave = (updated: Vehicle) => {
    setVehicles(vs=>vs.map(v=>v.id===updated.id?updated:v));
    showToast('Vehicle updated');
    setTimeout(() => load(), 400);
  };

  const quickStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/vehicles/${id}/status`, { status });
      setVehicles(vs=>vs.map(v=>v.id===id?{...v,status}:v));
      showToast(`Status → ${STATUS_CFG[status]?.label}`);
      setTimeout(() => load(), 400);
    } catch { showToast('Update failed'); }
  };

  const deleteVehicle = async (id: string) => {
    if (!confirm('Delete this listing?')) return;
    try {
      await api.delete(`/vehicles/${id}`);
      setVehicles(vs=>vs.filter(v=>v.id!==id));
      showToast('Vehicle deleted');
    } catch { showToast('Delete failed'); }
  };

  const cancelReservation = async (id: string) => {
    if (!confirm('Cancel this reservation? The vehicle will become available again.')) return;
    try {
      await api.patch(`/reservations/${id}/cancel`, {});
      showToast('Reservation cancelled — vehicle is available again');
      setTimeout(() => load(), 400);
    } catch { showToast('Cancel failed'); }
  };

  const filtered = vehicles.filter(v => !search || `${v.make} ${v.model} ${v.year} ${v.trim||''}`.toLowerCase().includes(search.toLowerCase()));

  const STAT_CARDS = [
    { label:'Units in stock', value:stats.available!==undefined?stats.available.toLocaleString():'—', sub:`${stats.available_listings||0} listing${stats.available_listings!==1?'s':''}`, color:'#007A3D', icon:Package },
    { label:'Stock value', value:stats.stock_value_aed?formatPrice(Number(stats.stock_value_aed)):'—', sub:'available + reserved, × quantity', color:'#B8860B', icon:DollarSign },
    { label:'Vehicles sold', value:stats.sold!==undefined?String(stats.sold):'—', sub:`+ ${stats.reserved??0} reserved`, color:'#C1272D', icon:Check },
    { label:'Total views', value:stats.total_views?Number(stats.total_views).toLocaleString():'—', sub:'all listings', color:'#1E40AF', icon:Eye },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'#F9FAFB' }}>
      {toast && <Toast msg={toast} onClose={()=>setToast('')} />}
      {editing && <QuickEditModal vehicle={editing} onClose={()=>setEditing(null)} onSave={handleSave} />}
      {fullEditing && <VehicleFullEditModal vehicle={fullEditing} onClose={()=>setFullEditing(null)} onSave={(u)=>{ handleSave(u); setFullEditing(null); }} />}
      {sellModalVehicle && (
        <SellModal vehicle={sellModalVehicle} dealerId={dealerId} onClose={()=>setSellModalVehicle(null)} onDone={(result)=>{
          setVehicles(vs=>vs.map(v=>v.id===sellModalVehicle.id?{...v,status:'sold'}:v));
          if (result?.auto_invoice) {
            showToast(`✓ ${t('dealer.toast.sold_invoice').replace('{{n}}', result.auto_invoice.invoice_number)}`);
            router.push('/dealer/billing');
          } else { showToast('✓ Vehicle marked as sold'); }
          setSellModalVehicle(null);
          setTimeout(() => load(), 400);
        }} />
      )}
      {reservationSell && (
        <ReservationSellModal
          reservation={reservationSell}
          onClose={() => setReservationSell(null)}
          onDone={(result) => {
            setReservationSell(null);
            if (result?.auto_invoice) {
              showToast(`✅ ${t('dealer.toast.sale_confirmed').replace('{{n}}', result.auto_invoice.invoice_number)}`);
              router.push('/dealer/billing');
            } else { showToast('✅ Sale confirmed — broker deal recorded'); }
            setTimeout(() => load(), 400);
          }}
        />
      )}

      {/* Header */}
      <div style={{ background:'white', borderBottom:'1px solid #E5E7EB', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:30 }}>
        <div>
          <h1 style={{ fontWeight:700, fontSize:'1.1rem', color:'#111827', margin:0 }}>{t('dealer.dashboard.title')}</h1>
          <p style={{ fontSize:'0.8rem', color:'#6B7280', margin:0 }}>{total} vehicles · {dealerId}</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <CurrencySelector compact theme="light" />
          <NotificationBell recipient={{ type:'dealer', id:dealerId }} />
          <button onClick={load} style={{ padding:'8px 12px', borderRadius:8, border:'1px solid #E5E7EB', background:'white', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:'0.875rem', color:'#374151' }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <a href="/dealer/profile" style={{ padding:'8px 14px', borderRadius:10, border:'1px solid #E5E7EB', background:'white', color:'#374151', fontSize:'0.8rem', fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:5 }}>
            My Profile
          </a>
          <a href="/dealer/inventory/new" style={{ background:'#C1272D', color:'white', padding:'8px 16px', borderRadius:10, fontSize:'0.875rem', fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={14} /> Add vehicle
          </a>
        </div>
      </div>

      <div className="da-content-pad" style={{ maxWidth:1400, margin:'0 auto', padding:'24px 20px' }}>
        {/* 🤖 AI Twin Dealer — Daily Brief + Command Center (first thing every dealer sees) */}
        {dealerId && <AiTwinPanel dealerId={dealerId} onNavigate={(kind, payload) => {
          if (kind === 'apply_price' || kind === 'open_vehicle') { window.location.href = '/dealer/pricing'; return; }
          if (kind === 'open_lead') { window.location.href = '/dealer/requests' + (payload?.lead_id ? `/${payload.lead_id}` : ''); return; }
          if (kind === 'open_inventory') { window.location.href = '/dealer/inventory/new'; return; }
          if (kind === 'open_global_trade') { window.location.href = '/dealer/global-trade'; return; }
        }} />}

        {/* KPI cards */}
        <div className="da-kpi-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:16, marginBottom:24 }}>
          {STAT_CARDS.map(s=>(
            <div key={s.label} style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'18px 20px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <p style={{ fontSize:'0.72rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'#6B7280', margin:0 }}>{s.label}</p>
                <div style={{ width:32, height:32, borderRadius:8, background:s.color+'15', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <s.icon size={15} style={{ color:s.color }} />
                </div>
              </div>
              <p style={{ fontSize:'1.75rem', fontWeight:800, color:'#111827', margin:'0 0 2px' }}>{s.value}</p>
              <p style={{ fontSize:'0.75rem', color:'#9CA3AF', margin:0 }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Profitability: revenue collected, commissions, stock turnover + evolution curve */}
        {dealerId && <ProfitabilityPanel dealerId={dealerId} stats={stats} />}

        {/* Main tab nav */}
        <div style={{ display:'flex', gap:4, marginBottom:20, background:'white', border:'1px solid #E5E7EB', borderRadius:12, padding:4, width:'fit-content' }}>
          {([  
            { key:'inventory', label:'📦 Inventory', desc:'Manage your stock' },
            { key:'market',    label:'📊 Market Analytics', desc:'Trends & positioning' },
            { key:'ai',        label:'🔍 AI Market Intelligence', desc:'Live competitor pricing' },
          ] as const).map(t=>(
            <button key={t.key} onClick={()=>setMainTab(t.key)}
              style={{ padding:'8px 18px', borderRadius:9, border:'none', cursor:'pointer', fontWeight:700, fontSize:'0.8rem',
                background:mainTab===t.key?'#C1272D':'transparent',
                color:mainTab===t.key?'white':'#6B7280' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── INVENTORY TAB ── */}
        {mainTab === 'inventory' && (
          <div>
            {/* Active reservations */}
            {reservations.length > 0 && (
              <div style={{ background:'white', border:'1.5px solid #BFDBFE', borderRadius:14, overflow:'hidden', marginBottom:20 }}>
                <div style={{ padding:'14px 20px', borderBottom:'1px solid #F3F4F6', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#EFF6FF' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:'1.1rem' }}>🔖</span>
                    <p style={{ fontWeight:700, color:'#1E40AF', margin:0, fontSize:'0.9rem' }}>Active broker reservations</p>
                  </div>
                  <span style={{ fontSize:'0.78rem', fontWeight:700, color:'#1E40AF', background:'white', padding:'2px 10px', borderRadius:20 }}>{reservations.length}</span>
                </div>
                {reservations.map((r:any) => {
                  const hrs = Math.max(0, Math.round((new Date(r.expires_at).getTime()-Date.now())/3600000));
                  return (
                    <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 20px', borderTop:'1px solid #F9FAFB' }}>
                      <div style={{ width:50, height:38, borderRadius:8, background:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {r.vehicle?.vehicle_images?.[0]?.cdn_url ? <img src={r.vehicle.vehicle_images[0].cdn_url} alt="" style={{ width:'100%', height:'100%', borderRadius:8, objectFit:'cover' }} /> : <Car size={14} style={{ color:'#D1D5DB' }} />}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontWeight:700, color:'#111827', margin:0, fontSize:'0.85rem' }}>{r.vehicle?.year} {r.vehicle?.make} {r.vehicle?.model}</p>
                        <p style={{ color:'#6B7280', margin:0, fontSize:'0.78rem' }}>Held by <strong>{r.broker?.full_name||'broker'}</strong> · {formatPrice(Number(r.vehicle?.price_aed||0))}</p>
                      </div>
                      <p style={{ fontSize:'0.78rem', fontWeight:700, color:hrs<=4?'#C1272D':'#1E40AF', margin:0, flexShrink:0 }}>
                        <Clock size={11} style={{ display:'inline', marginRight:3, position:'relative', top:1 }} />{hrs}h left
                      </p>
                      <button onClick={() => setReservationSell(r)}
                        style={{ padding:'5px 13px', borderRadius:8, border:'none', background:'#374151', color:'white', fontSize:'0.75rem', fontWeight:700, cursor:'pointer', flexShrink:0 }}>
                        ✅ Sell
                      </button>
                      <button onClick={() => cancelReservation(r.id)}
                        style={{ width:28, height:28, borderRadius:8, border:'1px solid #FECACA', background:'#FFF1F2', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <X size={13} color="#C1272D" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Broker performance — full breakdown now lives in its own sidebar page */}
            {brokerStats && brokerStats.total_broker_deals > 0 && (
              <button onClick={()=>router.push('/dealer/brokers')}
                style={{ width:'100%', textAlign:'left', background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'14px 20px', marginBottom:20, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:'1.1rem' }}>🤝</span>
                  <div>
                    <p style={{ fontWeight:700, color:'#111827', margin:0, fontSize:'0.9rem' }}>Broker-generated sales</p>
                    <p style={{ color:'#9CA3AF', margin:0, fontSize:'0.75rem' }}>{brokerStats.total_brokers_count} broker{brokerStats.total_brokers_count!==1?'s':''} · {formatPrice(Number(brokerStats.total_revenue_via_brokers))} revenue</p>
                  </div>
                </div>
                <span style={{ fontSize:'0.78rem', fontWeight:700, color:'#C1272D' }}>View all brokers →</span>
              </button>
            )}

            {/* Quick nav */}
            <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
              {[
                { href:'/dealer/shared', label:'🔗 Shared inventory', color:'#3B82F6' },
                { href:'/dealer/scan',   label:'⚡ Smart scan',       color:'#C1272D' },
                { href:'/dealer/pricing',label:'📊 Pricing AI',       color:'#007A3D' },
                { href:'/broker',        label:'🤝 Broker programme', color:'#8B5CF6' },
              ].map(l=>(
                <a key={l.href} href={l.href}
                  style={{ fontSize:'0.8rem', fontWeight:600, padding:'7px 14px', borderRadius:8, border:`1px solid ${l.color}30`, background:l.color+'0A', color:l.color, textDecoration:'none' }}>
                  {l.label}
                </a>
              ))}
            </div>

            {/* Toolbar */}
            <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
              <div style={{ position:'relative', flex:1, minWidth:200 }}>
                <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }} />
                <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search make, model…"
                  style={{ width:'100%', paddingLeft:34, paddingRight:12, paddingTop:9, paddingBottom:9, border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'0.875rem', color:'#111827', outline:'none', background:'white' }} />
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {['','available','reserved','sold','draft','exported'].map(s=>{
                  const c = s?STATUS_CFG[s]:null;
                  return (
                    <button key={s} onClick={()=>{setStatusFilter(s);setPage(1);}}
                      style={{ padding:'8px 14px', borderRadius:8, fontSize:'0.8rem', fontWeight:500, cursor:'pointer', border:'1.5px solid', borderColor:statusFilter===s?(c?.color||'#C1272D'):'#E5E7EB', background:statusFilter===s?(c?.bg||'#FEE2E2'):'white', color:statusFilter===s?(c?.color||'#C1272D'):'#6B7280' }}>
                      {s?c?.label:'All'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table */}
            <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
              {loading ? (
                <div style={{ padding:'60px', textAlign:'center', color:'#9CA3AF' }}>
                  <RefreshCw size={24} style={{ animation:'spin 1s linear infinite', margin:'0 auto 12px', display:'block' }} />Loading inventory…
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding:'60px', textAlign:'center' }}>
                  <Car size={40} style={{ color:'#D1D5DB', margin:'0 auto 12px', display:'block' }} />
                  <p style={{ color:'#6B7280', fontWeight:500 }}>No vehicles found</p>
                  <a href="/dealer/inventory/new" style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:16, background:'#C1272D', color:'white', padding:'10px 20px', borderRadius:10, textDecoration:'none', fontWeight:600, fontSize:'0.875rem' }}>
                    <Plus size={14} /> Add first vehicle
                  </a>
                </div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead style={{ background:'#F9FAFB' }}>
                    <tr>
                      <th style={{ width:40, padding:'10px 12px' }}></th>
                      <th style={{ padding:'10px 14px', textAlign:'left', fontSize:'0.7rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em' }}>Vehicle</th>
                      <th style={{ width:130, padding:'10px 14px', textAlign:'left', fontSize:'0.7rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em' }}>Price</th>
                      <th style={{ width:110, padding:'10px 14px', textAlign:'left', fontSize:'0.7rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em' }}>Status</th>
                      <th style={{ width:90, padding:'10px 14px', textAlign:'left', fontSize:'0.7rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em' }}>Stock</th>
                      <th style={{ width:80, padding:'10px 14px', textAlign:'left', fontSize:'0.7rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em' }}>Views</th>
                      <th style={{ width:90, padding:'10px 14px', textAlign:'left', fontSize:'0.7rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em' }}>Listed</th>
                      <th style={{ width:120, padding:'10px 14px', textAlign:'left', fontSize:'0.7rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(v=>{
                      const days = daysAgo(v.created_at);
                      const img = v.vehicle_images?.find(i=>i.is_primary)?.cdn_url || v.vehicle_images?.[0]?.cdn_url;
                      return (
                        <tr key={v.id} style={{ borderTop:'1px solid #F9FAFB' }}>
                          <td style={{ padding:'10px 12px' }}>
                            <input type="checkbox" checked={selected.includes(v.id)} onChange={()=>setSelected(s=>s.includes(v.id)?s.filter(x=>x!==v.id):[...s,v.id])}
                              style={{ accentColor:'#C1272D', width:15, height:15 }} />
                          </td>
                          <td style={{ padding:'10px 14px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div style={{ width:52, height:40, borderRadius:8, overflow:'hidden', background:'#F3F4F6', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                {img?<img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />:<Car size={16} color="#D1D5DB" />}
                              </div>
                              <div style={{ minWidth:0 }}>
                                <p style={{ fontWeight:600, fontSize:'0.875rem', color:'#111827', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{v.year} {v.make} {v.model}</p>
                                <p style={{ fontSize:'0.75rem', color:'#9CA3AF', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{v.trim||v.body_type||'—'} · {v.mileage_km===0?'New':`${v.mileage_km.toLocaleString()} km`}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding:'10px 14px' }}>
                            <p style={{ fontWeight:700, color:'#C1272D', margin:0, fontSize:'0.9rem' }}>{formatPrice(Number(v.price_aed))}</p>
                            {v.export_eligible && <p style={{ fontSize:'0.72rem', color:'#1E40AF', margin:0 }}>✈ Export</p>}
                          </td>
                          <td style={{ padding:'10px 14px' }}>
                            <div style={{ position:'relative' }} className="group/status">
                              <StatusBadge status={v.status} />
                              <div style={{ position:'absolute', top:'100%', left:0, marginTop:4, background:'white', border:'1px solid #E5E7EB', borderRadius:10, padding:'4px 0', width:130, boxShadow:'0 8px 24px rgba(0,0,0,0.1)', zIndex:10 }}
                                className="hidden group-hover/status:block">
                                {Object.entries(STATUS_CFG).filter(([s])=>s!==v.status).map(([s,c])=>(
                                  <button key={s} onClick={()=>s==='sold'?setSellModalVehicle(v):quickStatus(v.id,s)}
                                    style={{ width:'100%', padding:'8px 12px', background:'none', border:'none', cursor:'pointer', textAlign:'left', fontSize:'0.8rem', color:c.color, fontWeight:500, display:'block' }}>
                                    {c.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding:'10px 14px' }}>
                            {v.status === 'available' ? (
                              <span style={{
                                display:'inline-flex', alignItems:'center', gap:5,
                                padding:'3px 10px', borderRadius:20, fontSize:'0.78rem', fontWeight:700,
                                background: (v.stock_quantity ?? 1) <= 1 ? '#FEF3C7' : '#F3F4F6',
                                color: (v.stock_quantity ?? 1) <= 1 ? '#92400E' : '#374151',
                              }}>
                                {v.stock_quantity ?? 1} in stock
                              </span>
                            ) : (
                              <span style={{ fontSize:'0.8rem', color:'#D1D5DB' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding:'10px 14px' }}><span style={{ color:'#6B7280', fontSize:'0.875rem' }}>{v.view_count}</span></td>
                          <td style={{ padding:'10px 14px' }}>
                            <span style={{ fontSize:'0.8rem', fontWeight:500, color:days>60?'#C1272D':days>30?'#92400E':'#6B7280' }}>{days}d</span>
                          </td>
                          <td style={{ padding:'10px 14px' }}>
                            <div style={{ display:'flex', gap:4 }}>
                              <button onClick={()=>setFullEditing(v)} style={{ padding:6, borderRadius:7, border:'1px solid #C1272D', background:'#FFF1F2', cursor:'pointer' }} title="Full edit"><Edit3 size={13} color="#C1272D" /></button>
                              <button onClick={()=>setEditing(v)} style={{ padding:6, borderRadius:7, border:'1px solid #E5E7EB', background:'white', cursor:'pointer' }} title="Quick edit"><Edit3 size={13} color="#6B7280" /></button>
                              <a href={`/vehicle/${v.id}`} target="_blank" style={{ padding:6, borderRadius:7, border:'1px solid #E5E7EB', background:'white', display:'flex', alignItems:'center' }} title="View"><Eye size={13} color="#6B7280" /></a>
                              <a href={`/dealer/timeline/${v.id}`} style={{ padding:6, borderRadius:7, border:'1px solid #E5E7EB', background:'white', display:'flex', alignItems:'center' }} title="Timeline"><Clock size={13} color="#6B7280" /></a>
                              <button onClick={()=>deleteVehicle(v.id)} style={{ padding:6, borderRadius:7, border:'1px solid #FECACA', background:'#FEF2F2', cursor:'pointer' }} title="Delete"><Trash2 size={13} color="#DC2626" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {total > 20 && (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16 }}>
                <p style={{ fontSize:'0.875rem', color:'#6B7280' }}>{(page-1)*20+1}–{Math.min(page*20,total)} of {total}</p>
                <div style={{ display:'flex', gap:8 }}>
                  {page>1&&<button onClick={()=>setPage(p=>p-1)} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #E5E7EB', background:'white', cursor:'pointer', fontSize:'0.875rem' }}>← Prev</button>}
                  {page*20<total&&<button onClick={()=>setPage(p=>p+1)} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #E5E7EB', background:'white', cursor:'pointer', fontSize:'0.875rem' }}>Next →</button>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MARKET ANALYTICS TAB ── */}
        {mainTab === 'market' && <MarketAnalyticsPanel dealerId={dealerId} stats={stats} />}

        {/* ── AI MARKET INTELLIGENCE TAB ── */}
        {mainTab === 'ai' && <AIMarketPanel dealerId={dealerId} />}
      </div>

      <MobileNav type="dealer" />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
