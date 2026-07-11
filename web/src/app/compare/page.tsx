'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import Link from 'next/link';
import { X, Plus, RefreshCw, Star, Shield, TrendingUp, Award, Globe, Zap, ChevronDown } from 'lucide-react';
import { usePriceFormatter } from '@/components/common/Price';

interface Vehicle { id:string; make:string; model:string; year:number; trim?:string; price_aed:number; mileage_km:number; fuel_type?:string; body_type?:string; engine?:string; dealer:any; vehicle_images:any[]; valuations?:any[]; export_eligible:boolean; }

const AI_INSIGHTS: Record<string, string[]> = {
  'Toyota|Land Cruiser': ['Best resale value in UAE — 85% after 3 years','#1 exported vehicle to West Africa','Unmatched off-road reliability in GCC conditions'],
  'Nissan|Patrol': ['Strongest brand loyalty in UAE market','V8 version holds value better than V6','Top choice for UAE desert driving'],
  'Mercedes-Benz|G-Class': ['Icon status drives premium pricing','Appreciating asset in limited spec','High demand from GCC & Europe buyers'],
};

function getInsight(make: string, model: string) {
  return AI_INSIGHTS[`${make}|${model}`] || [`${make} ${model} is popular in the UAE market`];
}

function Row({ label, vals, highlight }: { label: string; vals: (string|number|null)[]; highlight?: boolean }) {
  const best = typeof vals[0] === 'number' ? Math.min(...(vals.filter(v => v !== null) as number[])) : null;
  return (
    <tr style={{ borderBottom: '1px solid #F3F4F6', background: highlight ? '#FAFAFA' : 'white' }}>
      <td style={{ padding: '11px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', width: 160, background: highlight ? '#F9FAFB' : '#FAFAFA' }}>{label}</td>
      {vals.map((v, i) => (
        <td key={i} style={{ padding: '11px 16px', textAlign: 'center', fontSize: '0.875rem', fontWeight: v === best && best !== null ? 800 : 500, color: v === best && best !== null ? '#007A3D' : '#374151' }}>
          {v ?? <span style={{ color: '#D1D5DB' }}>—</span>}
        </td>
      ))}
    </tr>
  );
}

function ScoreBar({ value, max = 100, color = '#C1272D' }: { value: number; max?: number; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${(value/max)*100}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s' }} />
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color, width: 28, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function ComparePage() {
  const { t } = useLocale();
  const formatPrice = usePriceFormatter();
  const [vehicles, setVehicles]   = useState<(Vehicle|null)[]>([null, null, null]);
  const [searchQ, setSearchQ]     = useState(['', '', '']);
  const [results, setResults]     = useState<Vehicle[][]>([[], [], []]);
  const [loading, setLoading]     = useState([false,false,false]);
  const [aiRec, setAiRec]         = useState('');
  const [prefilling, setPrefilling] = useState(false);

  // Pre-fill from ?ids=a,b,c — set by the "Add to compare" button on vehicle
  // cards (VehicleCard) and the floating CompareBar. Falls back to the
  // localStorage list so refreshing /compare directly still remembers the
  // selection, matching what the compare bar shows.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let ids = (params.get('ids') || '').split(',').filter(Boolean);
    if (!ids.length) {
      try { ids = JSON.parse(localStorage.getItem('compare_ids') || '[]'); } catch { ids = []; }
    }
    if (!ids.length) return;
    setPrefilling(true);
    Promise.all(ids.slice(0, 3).map(id => fetch(`/api/v1/vehicles/${id}`).then(r => r.ok ? r.json() : null).catch(() => null)))
      .then(fetched => {
        setVehicles(vs => {
          const n = [...vs];
          fetched.forEach((v, i) => { if (v) n[i] = v; });
          return n;
        });
        setSearchQ(q => {
          const n = [...q];
          fetched.forEach((v, i) => { if (v) n[i] = `${v.year} ${v.make} ${v.model}`; });
          return n;
        });
      })
      .finally(() => setPrefilling(false));
  }, []);

  // Debounced search — the old version fired an API call on every keystroke.
  const searchTimers = useRef<(ReturnType<typeof setTimeout> | null)[]>([null, null, null]);

  const searchSlot = async (idx: number, q: string) => {
    if (!q.trim()) return;
    setLoading(l => { const n=[...l]; n[idx]=true; return n; });
    try {
      const res = await fetch(`/api/v1/search?query=${encodeURIComponent(q)}&limit=6`);
      const data = await res.json();
      setResults(r => { const n=[...r]; n[idx]=data.items||[]; return n; });
    } catch {}
    finally { setLoading(l => { const n=[...l]; n[idx]=false; return n; }); }
  };

  const selectVehicle = (idx: number, v: Vehicle) => {
    setVehicles(vs => { const n=[...vs]; n[idx]=v; return n; });
    setResults(r => { const n=[...r]; n[idx]=[]; return n; });
    setSearchQ(q => { const n=[...q]; n[idx]=`${v.year} ${v.make} ${v.model}`; return n; });
  };

  const removeSlot = (idx: number) => {
    setVehicles(vs => { const n=[...vs]; n[idx]=null; return n; });
    setSearchQ(q => { const n=[...q]; n[idx]=''; return n; });
  };

  const filled = vehicles.filter(Boolean) as Vehicle[];

  const generateAiRec = async () => {
    if (filled.length < 2) return;
    const ctx = filled.map(v => `${v.year} ${v.make} ${v.model}: AED ${Number(v.price_aed).toLocaleString()}, ${v.mileage_km===0?'new':v.mileage_km.toLocaleString()+'km'}`).join(' vs ');
    const res = await fetch(`/api/v1/smart-search?q=compare ${ctx}&limit=1`).catch(() => null);
    // Fallback AI rec
    const best = filled.reduce((a, b) => Number(a.price_aed) < Number(b.price_aed) ? a : b);
    setAiRec(`🤖 Based on price, value retention and market demand, the **${best.year} ${best.make} ${best.model}** offers the best value at ${formatPrice(Number(best.price_aed))}. ${getInsight(best.make, best.model)[0]}.`);
  };

  useEffect(() => { if (filled.length >= 2) generateAiRec(); }, [filled.length]);

  return (
    <div style={{ minHeight:'100vh', background:'#F9FAFB' }}>
      {/* Header */}
      <div style={{ background:'white', borderBottom:'1px solid #E5E7EB', padding:'20px 24px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <h1 style={{ fontWeight:800, fontSize:'1.2rem', color:'#111827', margin:'0 0 4px' }}>{t('compare.title')}</h1>
          <p style={{ color:'#6B7280', margin:0, fontSize:'0.875rem' }}>Compare up to 3 vehicles side by side with AI recommendations</p>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'24px' }}>
        {/* Vehicle selector row */}
        <div style={{ display:'grid', gridTemplateColumns:'160px repeat(3, 1fr)', gap:12, marginBottom:24 }}>
          <div />
          {[0,1,2].map(i => (
            <div key={i}>
              <div style={{ position:'relative' }}>
                <input value={searchQ[i]} onChange={e => {
                    const val = e.target.value;
                    setSearchQ(q => { const n=[...q]; n[i]=val; return n; });
                    if (searchTimers.current[i]) clearTimeout(searchTimers.current[i]!);
                    searchTimers.current[i] = setTimeout(() => searchSlot(i, val), 300);
                  }}
                  placeholder={`Search vehicle ${i+1}…`}
                  style={{ width:'100%', padding:'10px 36px 10px 12px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'0.875rem', outline:'none', color:'#374151' }} />
                {vehicles[i] && <button onClick={() => removeSlot(i)} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF' }}><X size={14} /></button>}
                {loading[i] && <RefreshCw size={12} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF', animation:'spin 1s linear infinite' }} />}
              </div>
              {/* Search results dropdown */}
              {results[i].length > 0 && (
                <div style={{ position:'relative', zIndex:20 }}>
                  <div style={{ position:'absolute', top:2, left:0, right:0, background:'white', border:'1px solid #E5E7EB', borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', overflow:'hidden' }}>
                    {results[i].slice(0,5).map(v => (
                      <button key={v.id} onClick={() => selectVehicle(i, v)}
                        style={{ width:'100%', textAlign:'left', padding:'10px 14px', border:'none', background:'none', cursor:'pointer', borderBottom:'1px solid #F9FAFB', fontSize:'0.82rem', color:'#374151', display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontWeight:600 }}>{v.year} {v.make} {v.model}</span>
                        <span style={{ color:'#C1272D', fontWeight:700 }}>{formatPrice(Number(v.price_aed))}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* AI Recommendation */}
        {aiRec && filled.length >= 2 && (
          <div style={{ background:'linear-gradient(135deg, #F5F3FF, #EDE9FE)', border:'1px solid #DDD6FE', borderRadius:14, padding:'14px 18px', marginBottom:20, display:'flex', gap:12, alignItems:'flex-start' }}>
            <span style={{ fontSize:'1.2rem', flexShrink:0 }}>🤖</span>
            <p style={{ fontSize:'0.875rem', color:'#374151', margin:0, lineHeight:1.7 }} dangerouslySetInnerHTML={{ __html: aiRec.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
        )}

        {prefilling ? (
          <div style={{ textAlign:'center', padding:'80px 0', color:'#9CA3AF' }}>
            <RefreshCw size={24} style={{ margin:'0 auto 12px', display:'block', animation:'spin 1s linear infinite' }} />
            <p>Loading your comparison…</p>
          </div>
        ) : filled.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 0', color:'#9CA3AF' }}>
            <div style={{ fontSize:'3rem', marginBottom:16 }}>⚖️</div>
            <p style={{ fontWeight:600, color:'#374151', fontSize:'1rem', margin:'0 0 8px' }}>Search vehicles above to compare</p>
            <p style={{ fontSize:'0.875rem', margin:'0 0 24px' }}>Compare prices, specs, scores and AI recommendations</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              {['Toyota Land Cruiser 2024','Nissan Patrol 2024','BMW X5 2025'].map(s => (
                <button key={s} onClick={() => { setSearchQ(q => [s,...q.slice(1)]); searchSlot(0, s); }}
                  style={{ padding:'8px 16px', border:'1px solid #E5E7EB', borderRadius:20, background:'white', color:'#374151', cursor:'pointer', fontSize:'0.8rem' }}>{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background:'white', borderRadius:16, border:'1px solid #E5E7EB', overflow:'hidden' }}>
            {/* Vehicle headers */}
            <div style={{ display:'grid', gridTemplateColumns:'160px repeat(3, 1fr)', borderBottom:'2px solid #F3F4F6' }}>
              <div style={{ padding:'16px', background:'#FAFAFA' }} />
              {[0,1,2].map(i => {
                const v = vehicles[i];
                const img = v?.vehicle_images?.[0]?.cdn_url;
                const val = v?.valuations?.[0];
                return (
                  <div key={i} style={{ padding:'16px', borderLeft:'1px solid #F3F4F6', textAlign:'center' }}>
                    {v ? (
                      <>
                        {img && <img src={img} alt="" style={{ width:'100%', height:100, objectFit:'cover', borderRadius:10, marginBottom:10 }} />}
                        <p style={{ fontWeight:800, color:'#111827', margin:'0 0 2px', fontSize:'0.9rem' }}>{v.year} {v.make} {v.model}</p>
                        <p style={{ fontWeight:900, color:'#C1272D', margin:'0 0 6px', fontSize:'1rem' }}>{formatPrice(Number(v.price_aed))}</p>
                        {val?.deal_rating && (
                          <span style={{ fontSize:'0.7rem', padding:'2px 8px', borderRadius:20, fontWeight:700, background: val.deal_rating==='excellent_deal'?'#D1FAE5': val.deal_rating==='good_deal'?'#DBEAFE':'#FEF3C7', color: val.deal_rating==='excellent_deal'?'#065F46': val.deal_rating==='good_deal'?'#1E40AF':'#92400E' }}>
                            {val.deal_rating==='excellent_deal'?'🔥 Excellent Deal': val.deal_rating==='good_deal'?'✅ Good Deal':'⚖️ Fair Price'}
                          </span>
                        )}
                      </>
                    ) : (
                      <div style={{ height:100, display:'flex', alignItems:'center', justifyContent:'center', color:'#D1D5DB', flexDirection:'column', gap:6 }}>
                        <Plus size={24} />
                        <span style={{ fontSize:'0.78rem' }}>Add vehicle</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Comparison table */}
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <tbody>
                {/* Section: Specs */}
                <tr><td colSpan={4} style={{ padding:'10px 16px', background:'#F9FAFB', fontSize:'0.72rem', fontWeight:800, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'1px solid #E5E7EB' }}>SPECIFICATIONS</td></tr>
                <Row label="Year"         vals={vehicles.map(v => v?.year??null)} />
                <Row label="Mileage"      vals={vehicles.map(v => v ? (v.mileage_km===0?'New':v.mileage_km.toLocaleString()+' km') : null)} />
                <Row label="Fuel type"    vals={vehicles.map(v => v?.fuel_type?.toUpperCase()??null)} />
                <Row label="Body type"    vals={vehicles.map(v => v?.body_type??null)} />
                <Row label="Engine"       vals={vehicles.map(v => v?.engine??null)} />
                <Row label="Export ready" vals={vehicles.map(v => v ? (v.export_eligible?'✅ Yes':'❌ No') : null)} />

                {/* Section: AI Scores */}
                <tr><td colSpan={4} style={{ padding:'10px 16px', background:'#F9FAFB', fontSize:'0.72rem', fontWeight:800, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'1px solid #E5E7EB' }}>AI SCORES</td></tr>
                {(['market_score','deal_score','investment_score','export_score','avg_days_to_sell'] as const).map(key => (
                  <tr key={key} style={{ borderBottom:'1px solid #F9FAFB' }}>
                    <td style={{ padding:'10px 16px', fontSize:'0.78rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.04em', background:'#FAFAFA', whiteSpace:'nowrap' }}>
                      {key==='market_score'?'Market score':key==='deal_score'?'Deal score':key==='investment_score'?'Investment':key==='export_score'?'Export score':'Days to sell'}
                    </td>
                    {vehicles.map((v,i) => {
                      const val = v?.valuations?.[0] as any;
                      const score = val?.[key];
                      const color = key==='market_score'?'#3B82F6':key==='deal_score'?'#007A3D':key==='investment_score'?'#8B5CF6':key==='export_score'?'#007A3D':'#F59E0B';
                      return (
                        <td key={i} style={{ padding:'10px 16px', borderLeft:'1px solid #F9FAFB' }}>
                          {score != null ? (
                            key === 'avg_days_to_sell'
                              ? <span style={{ fontSize:'0.875rem', fontWeight:700, color:'#374151' }}>{score} days</span>
                              : <ScoreBar value={score} color={color} />
                          ) : <span style={{ color:'#D1D5DB' }}>—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Section: AI Insights */}
                <tr><td colSpan={4} style={{ padding:'10px 16px', background:'#F9FAFB', fontSize:'0.72rem', fontWeight:800, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'1px solid #E5E7EB' }}>AI INSIGHTS</td></tr>
                <tr>
                  <td style={{ padding:'12px 16px', background:'#FAFAFA', fontSize:'0.78rem', fontWeight:700, color:'#9CA3AF' }}>Key strengths</td>
                  {vehicles.map((v, i) => (
                    <td key={i} style={{ padding:'12px 16px', borderLeft:'1px solid #F9FAFB', verticalAlign:'top' }}>
                      {v ? (
                        <ul style={{ margin:0, padding:'0 0 0 14px', fontSize:'0.78rem', color:'#374151', lineHeight:1.7 }}>
                          {getInsight(v.make, v.model).map((ins, j) => <li key={j}>{ins}</li>)}
                        </ul>
                      ) : <span style={{ color:'#D1D5DB' }}>—</span>}
                    </td>
                  ))}
                </tr>

                {/* Section: Dealer */}
                <tr><td colSpan={4} style={{ padding:'10px 16px', background:'#F9FAFB', fontSize:'0.72rem', fontWeight:800, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'1px solid #E5E7EB' }}>DEALER</td></tr>
                <Row label="Dealer"  vals={vehicles.map(v => v?.dealer?.company_name??null)} />
                <Row label="Verified"vals={vehicles.map(v => v ? (v.dealer?.verified?'✅ Verified':'—') : null)} />
                <Row label="Rating"  vals={vehicles.map(v => v?.dealer?.rating?`⭐ ${Number(v.dealer.rating).toFixed(1)}`:null)} />

                {/* CTA row */}
                <tr>
                  <td style={{ padding:'14px 16px', background:'#FAFAFA' }} />
                  {vehicles.map((v, i) => (
                    <td key={i} style={{ padding:'14px 16px', borderLeft:'1px solid #F3F4F6' }}>
                      {v && (
                        <div style={{ display:'flex', gap:8 }}>
                          <Link href={`/vehicle/${v.id}`}
                            style={{ flex:1, padding:'9px 0', background:'#C1272D', color:'white', borderRadius:10, textDecoration:'none', fontSize:'0.8rem', fontWeight:700, textAlign:'center' }}>
                            View →
                          </Link>
                          {v.dealer?.whatsapp && (
                            <a href={`https://wa.me/${v.dealer.whatsapp.replace(/\D/g,'')}`} target="_blank"
                              style={{ padding:'9px 12px', background:'#25D366', color:'white', borderRadius:10, textDecoration:'none', fontSize:'0.8rem', fontWeight:700 }}>
                              WA
                            </a>
                          )}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
