'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { Trophy, DollarSign, Users, TrendingUp, RefreshCw, Check, ChevronRight, Award, Zap, Star, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { fetchOrThrow } from '@/lib/api';
import { usePriceFormatter } from '@/components/common/Price';

const TIER_CFG: Record<string,{color:string;bg:string;rate:string}> = {
  Starter:{color:'#9CA3AF',bg:'rgba(156,163,175,0.1)',rate:'1.5%'},
  Active: {color:'#60A5FA',bg:'rgba(96,165,250,0.1)',rate:'2.0%'},
  Pro:    {color:'#34D399',bg:'rgba(52,211,153,0.1)',rate:'2.5%'},
  Elite:  {color:'#C1272D',bg:'rgba(193,39,45,0.1)',rate:'3.0%'},
};
const MEDALS=['🥇','🥈','🥉','4','5','6','7','8','9','10'];
const PERIOD_OPTS=[{v:'month',l:'This month'},{v:'quarter',l:'This quarter'},{v:'all',l:'All time'}];
const STATUS_CFG: Record<string,{label:string;color:string;bg:string}> = {
  pending:    {label:'Pending',    color:'#FBBF24',bg:'rgba(251,191,36,0.1)'},
  processing: {label:'Processing', color:'#60A5FA',bg:'rgba(96,165,250,0.1)'},
  paid:       {label:'Paid',       color:'#34D399',bg:'rgba(52,211,153,0.1)'},
  cancelled:  {label:'Cancelled',  color:'#9CA3AF',bg:'rgba(156,163,175,0.08)'},
};

function PaymentModal({onSave,onClose,brokers}:{onSave:(d:any)=>void;onClose:()=>void;brokers:any[]}) {
  const [f,setF]=useState({broker_id:'',amount_aed:'',deals_count:'',period_start:'',period_end:'',payment_method:'bank_transfer',notes:''});
  const I: React.CSSProperties={width:'100%',padding:'9px 12px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'rgba(255,255,255,0.06)',color:'white',fontSize:'0.875rem',outline:'none',boxSizing:'border-box' as any};
  const submit=async()=>{
    if(!f.broker_id||!f.amount_aed||!f.period_start||!f.period_end) return;
    const res=await fetch('/api/v1/affiliates/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...f,amount_aed:+f.amount_aed,deals_count:+f.deals_count||0})});
    onSave(await res.json()); onClose();
  };
  return (
    <div style={{position:'fixed',inset:0,zIndex:60,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#1a1a2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,width:'100%',maxWidth:460,padding:24}}>
        <p style={{fontWeight:800,color:'white',margin:'0 0 18px',fontSize:'0.95rem'}}>Create Payout</p>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <select style={{...I,color:'rgba(255,255,255,0.7)'}} value={f.broker_id} onChange={e=>setF(p=>({...p,broker_id:e.target.value}))}>
            <option value="" style={{background:'#1a1a2e'}}>Select affiliate…</option>
            {brokers.map(b=><option key={b.id} value={b.id} style={{background:'#1a1a2e'}}>{b.full_name} — {b.affiliate_code}</option>)}
          </select>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <input type="number" style={I} value={f.amount_aed} onChange={e=>setF(p=>({...p,amount_aed:e.target.value}))} placeholder="Amount (AED)"/>
            <input type="number" style={I} value={f.deals_count} onChange={e=>setF(p=>({...p,deals_count:e.target.value}))} placeholder="# deals"/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div><label style={{fontSize:'0.65rem',color:'rgba(255,255,255,0.3)',display:'block',marginBottom:4}}>Period start</label><input type="date" style={{...I,color:'rgba(255,255,255,0.6)'}} value={f.period_start} onChange={e=>setF(p=>({...p,period_start:e.target.value}))}/></div>
            <div><label style={{fontSize:'0.65rem',color:'rgba(255,255,255,0.3)',display:'block',marginBottom:4}}>Period end</label><input type="date" style={{...I,color:'rgba(255,255,255,0.6)'}} value={f.period_end} onChange={e=>setF(p=>({...p,period_end:e.target.value}))}/></div>
          </div>
          <select style={{...I,color:'rgba(255,255,255,0.7)'}} value={f.payment_method} onChange={e=>setF(p=>({...p,payment_method:e.target.value}))}>
            {['bank_transfer','wise','paypal','crypto'].map(m=><option key={m} value={m} style={{background:'#1a1a2e'}}>{m.replace('_',' ')}</option>)}
          </select>
          <input style={I} value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))} placeholder="Notes (optional)"/>
        </div>
        <div style={{display:'flex',gap:10,marginTop:16}}>
          <button onClick={onClose} style={{flex:1,padding:'10px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'transparent',color:'rgba(255,255,255,0.4)',cursor:'pointer'}}>Cancel</button>
          <button onClick={submit} disabled={!f.broker_id||!f.amount_aed||!f.period_start||!f.period_end} style={{flex:2,padding:'10px',border:'none',borderRadius:9,background:'#C1272D',color:'white',cursor:'pointer',fontWeight:700}}>Create Payout</button>
        </div>
      </div>
    </div>
  );
}

export default function AffiliatesPage() {
  const formatPrice = usePriceFormatter();
  const [stats,setStats]=useState<any>(null);
  const [leaderboard,setLeaderboard]=useState<any[]>([]);
  const [payments,setPayments]=useState<any[]>([]);
  const [period,setPeriod]=useState<'month'|'quarter'|'all'>('month');
  const [tab,setTab]=useState<'leaderboard'|'payments'>('leaderboard');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [showPayout,setShowPayout]=useState(false);
  const [updating,setUpdating]=useState<string|null>(null);

  const load=async()=>{
    try {
      const [s,lb,p]=await Promise.all([
        fetchOrThrow('/api/v1/affiliates/stats'),
        fetchOrThrow(`/api/v1/affiliates/leaderboard?period=${period}`),
        fetchOrThrow('/api/v1/affiliates/payments'),
      ]);
      setStats(s); setLeaderboard(Array.isArray(lb)?lb:[]); setPayments(Array.isArray(p)?p:[]); setError(null);
    } catch (e:any) {
      setError(e.message || 'Failed to load affiliate data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{ load(); },[period]);

  const markPaid=async(id:string)=>{
    setUpdating(id);
    await fetch(`/api/v1/affiliates/payments/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'paid'})});
    setPayments(ps=>ps.map(p=>p.id===id?{...p,status:'paid',paid_at:new Date().toISOString()}:p));
    setUpdating(null);
  };

  if(loading) return <div style={{minHeight:'100vh',background:'#0a0a12',display:'flex',alignItems:'center',justifyContent:'center'}}><RefreshCw size={20} style={{color:'#C1272D',animation:'spin 1s linear infinite'}}/><style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style></div>;

  if(error) return (
    <div style={{minHeight:'100vh',background:'#0a0a12',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,padding:24,textAlign:'center'}}>
      <AlertTriangle size={26} style={{color:'#F87171'}}/>
      <p style={{color:'white',fontWeight:700,margin:0}}>Couldn't load affiliate data</p>
      <p style={{color:'rgba(255,255,255,0.5)',fontSize:'0.85rem',margin:0,maxWidth:400}}>{error}</p>
      <button onClick={()=>{setLoading(true);setError(null);load();}}
        style={{marginTop:6,padding:'8px 18px',borderRadius:9,border:'1px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.05)',color:'white',fontSize:'0.82rem',fontWeight:700,cursor:'pointer'}}>
        Retry
      </button>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#0a0a12',color:'white',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>
      {showPayout&&<PaymentModal brokers={leaderboard} onSave={p=>{setPayments(ps=>[p,...ps]);}} onClose={()=>setShowPayout(false)}/>}

      {/* Header */}
      <div style={{borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'13px 24px',display:'flex',alignItems:'center',gap:12,background:'rgba(10,10,18,0.95)',backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:30}}>
        <a href="/admin/executive" style={{width:32,height:32,borderRadius:9,background:'#C1272D',display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none'}}><span style={{fontWeight:900,color:'white',fontSize:'0.9rem'}}>D</span></a>
        <span style={{fontWeight:800,fontSize:'1rem',color:'white'}}>SnapHub<span style={{color:'#C1272D'}}>Trade.com</span></span>
        <span style={{color:'rgba(255,255,255,0.15)'}}>·</span>
        <span style={{color:'rgba(255,255,255,0.6)',fontSize:'0.875rem',display:'flex',alignItems:'center',gap:6}}><Trophy size={14}/> Affiliate System</span>
        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          <button onClick={()=>setShowPayout(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'#C1272D',color:'white',border:'none',borderRadius:9,cursor:'pointer',fontWeight:700,fontSize:'0.82rem'}}>
            <DollarSign size={13}/> Create Payout
          </button>
        </div>
      </div>

      <div style={{maxWidth:1300,margin:'0 auto',padding:'24px'}} className="da-content-pad">
        {/* KPIs */}
        <div className="da-kpi-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[
            {l:'Active Affiliates', v:stats?.active_affiliates||0,            icon:Users,     c:'#60A5FA'},
            {l:'Earnings this mo',  v:formatPrice(stats?.earnings_this_month||0),  icon:TrendingUp,c:'#34D399'},
            {l:'Deals this mo',     v:stats?.deals_this_month||0,             icon:Zap,       c:'#A78BFA'},
            {l:'Pending Payout',    v:formatPrice(stats?.pending_payout_aed||0),   icon:DollarSign,c:'#FBBF24', alert:stats?.pending_payout_count>0},
          ].map(k=>(
            <div key={k.l} style={{background:'rgba(255,255,255,0.04)',border:`1px solid ${k.alert?'rgba(251,191,36,0.3)':'rgba(255,255,255,0.08)'}`,borderRadius:14,padding:'16px 18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                <p style={{fontSize:'0.68rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'rgba(255,255,255,0.3)',margin:0}}>{k.l}</p>
                <k.icon size={13} style={{color:k.c}}/>
              </div>
              <p style={{fontSize:'1.5rem',fontWeight:900,color:k.alert?'#FBBF24':'white',margin:0}}>{k.v}</p>
            </div>
          ))}
        </div>

        {/* Tier breakdown */}
        <div style={{display:'flex',gap:10,marginBottom:20}}>
          {(stats?.tier_breakdown||[]).map((t:any)=>{
            const tc=TIER_CFG[t.tier]||TIER_CFG.Starter;
            return (
              <div key={t.tier} style={{flex:1,padding:'12px 16px',background:tc.bg,border:`1px solid ${tc.color}30`,borderRadius:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <Award size={14} style={{color:tc.color}}/> <span style={{fontSize:'0.78rem',fontWeight:700,color:tc.color}}>{t.tier}</span>
                  <span style={{fontSize:'0.68rem',color:'rgba(255,255,255,0.3)'}}>· {tc.rate}</span>
                </div>
                <span style={{fontWeight:900,color:'white',fontSize:'1.1rem'}}>{t.count}</span>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,marginBottom:16}}>
          {[{k:'leaderboard',l:'🏆 Leaderboard'},{k:'payments',l:`💰 Payments (${payments.length})`}].map((t:any)=>(
            <button key={t.k} onClick={()=>setTab(t.k)}
              style={{padding:'8px 18px',borderRadius:20,border:'1px solid',borderColor:tab===t.k?'#C1272D':'rgba(255,255,255,0.1)',background:tab===t.k?'rgba(193,39,45,0.15)':'transparent',color:tab===t.k?'#C1272D':'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'0.8rem',fontWeight:700}}>
              {t.l}
            </button>
          ))}
          {tab==='leaderboard'&&(
            <div style={{display:'flex',gap:4,marginLeft:'auto'}}>
              {PERIOD_OPTS.map(p=>(
                <button key={p.v} onClick={()=>setPeriod(p.v as any)} style={{padding:'6px 12px',borderRadius:20,border:'1px solid',borderColor:period===p.v?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.1)',background:period===p.v?'rgba(255,255,255,0.08)':'transparent',color:period===p.v?'white':'rgba(255,255,255,0.35)',cursor:'pointer',fontSize:'0.72rem',fontWeight:period===p.v?700:400}}>
                  {p.l}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Leaderboard */}
        {tab==='leaderboard'&&(
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {leaderboard.length===0&&<div style={{textAlign:'center',padding:'48px',color:'rgba(255,255,255,0.2)'}}>No affiliate data yet. Import brokers from the CRM to start tracking.</div>}
            {leaderboard.slice(0,20).map((b:any,i:number)=>{
              const tc=TIER_CFG[b.tier]||TIER_CFG.Starter;
              return (
                <div key={b.id} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',background:i<3?'rgba(255,255,255,0.05)':'rgba(255,255,255,0.02)',border:`1px solid ${i===0?'rgba(251,191,36,0.3)':i===1?'rgba(160,160,160,0.2)':i===2?'rgba(183,110,54,0.2)':'rgba(255,255,255,0.06)'}`,borderRadius:14}}>
                  <span style={{width:28,fontSize:i<3?'1.2rem':'0.85rem',textAlign:'center',fontWeight:800,color:'rgba(255,255,255,0.4)',flexShrink:0}}>{i<3?MEDALS[i]:i+1}</span>
                  <div style={{width:38,height:38,borderRadius:10,background:tc.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:'0.9rem',fontWeight:900,color:tc.color}}>
                    {b.full_name.charAt(0)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                      <p style={{fontWeight:700,color:'white',margin:0,fontSize:'0.875rem'}}>{b.full_name}</p>
                      <span style={{fontSize:'0.65rem',padding:'2px 7px',borderRadius:20,background:tc.bg,color:tc.color,fontWeight:700}}>{b.tier}</span>
                      <span style={{fontSize:'0.68rem',color:'rgba(255,255,255,0.3)',fontFamily:'monospace'}}>{b.affiliate_code}</span>
                    </div>
                    <p style={{color:'rgba(255,255,255,0.35)',margin:0,fontSize:'0.72rem'}}>{b.country} · {b.deals_count} deals · {(b.commission_rate*100).toFixed(1)}% rate</p>
                  </div>
                  <div style={{display:'flex',gap:20,flexShrink:0}}>
                    <div style={{textAlign:'center'}}>
                      <p style={{fontWeight:800,color:'#34D399',margin:0,fontSize:'0.9rem'}}>{formatPrice(b.earnings)}</p>
                      <p style={{color:'rgba(255,255,255,0.25)',margin:0,fontSize:'0.62rem'}}>Earned</p>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <p style={{fontWeight:800,color:'#FBBF24',margin:0,fontSize:'0.9rem'}}>{formatPrice(b.pending_payout)}</p>
                      <p style={{color:'rgba(255,255,255,0.25)',margin:0,fontSize:'0.62rem'}}>Pending</p>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <p style={{fontWeight:800,color:'rgba(255,255,255,0.5)',margin:0,fontSize:'0.9rem'}}>{formatPrice(b.total_paid)}</p>
                      <p style={{color:'rgba(255,255,255,0.25)',margin:0,fontSize:'0.62rem'}}>Paid</p>
                    </div>
                  </div>
                  <Link href={`/admin/affiliates/${b.id}`} style={{color:'rgba(255,255,255,0.2)',textDecoration:'none',flexShrink:0}}>
                    <ChevronRight size={16}/>
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Payments */}
        {tab==='payments'&&(
          <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,overflow:'hidden'}}>
            {payments.length===0?(
              <div style={{padding:'48px',textAlign:'center',color:'rgba(255,255,255,0.2)'}}>No payouts created yet.</div>
            ):(
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:'rgba(255,255,255,0.03)'}}>
                  {['Affiliate','Amount','Deals','Period','Method','Status',''].map(h=><th key={h} style={{padding:'9px 16px',textAlign:'left',fontSize:'0.63rem',fontWeight:700,color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'0.06em'}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {payments.map((p:any)=>{
                    const sc=STATUS_CFG[p.status]||STATUS_CFG.pending;
                    return (
                      <tr key={p.id} style={{borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                        <td style={{padding:'11px 16px'}}>
                          <p style={{fontWeight:600,color:'white',margin:0,fontSize:'0.82rem'}}>{p.broker?.full_name||'—'}</p>
                          <p style={{color:'rgba(255,255,255,0.3)',margin:0,fontSize:'0.68rem'}}>{p.broker?.affiliate_code}</p>
                        </td>
                        <td style={{padding:'11px 16px',fontWeight:800,color:'#34D399',fontSize:'0.9rem'}}>{formatPrice(Number(p.amount_aed))}</td>
                        <td style={{padding:'11px 16px',fontSize:'0.82rem',color:'rgba(255,255,255,0.5)'}}>{p.deals_count}</td>
                        <td style={{padding:'11px 16px',fontSize:'0.72rem',color:'rgba(255,255,255,0.4)'}}>{new Date(p.period_start).toLocaleDateString()} – {new Date(p.period_end).toLocaleDateString()}</td>
                        <td style={{padding:'11px 16px',fontSize:'0.75rem',color:'rgba(255,255,255,0.4)',textTransform:'capitalize'}}>{p.payment_method?.replace('_',' ')||'—'}</td>
                        <td style={{padding:'11px 16px'}}><span style={{padding:'3px 9px',borderRadius:20,fontSize:'0.7rem',fontWeight:700,background:sc.bg,color:sc.color}}>{sc.label}</span></td>
                        <td style={{padding:'11px 16px'}}>
                          {p.status==='pending'&&(
                            <button onClick={()=>markPaid(p.id)} disabled={updating===p.id}
                              style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',border:'1px solid rgba(52,211,153,0.3)',borderRadius:8,background:'transparent',color:'#34D399',cursor:'pointer',fontSize:'0.72rem',fontWeight:700}}>
                              {updating===p.id?<RefreshCw size={11} style={{animation:'spin 1s linear infinite'}}/>:<Check size={11}/>} Mark paid
                            </button>
                          )}
                          {p.status==='paid'&&p.paid_at&&<span style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.25)'}}>Paid {new Date(p.paid_at).toLocaleDateString()}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>
    </div>
  );
}
