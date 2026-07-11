'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { TrendingUp, Users, Mail, DollarSign, Target, Zap, BarChart3, RefreshCw, Plus, Trash2, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react';
import { fetchOrThrow } from '@/lib/api';
import { usePriceFormatter } from '@/components/common/Price';

const CHANNEL_COLORS: Record<string,string>={google_ads:'#4285F4',meta:'#1877F2',linkedin:'#0A66C2',events:'#A78BFA',content:'#34D399',email:'#FBBF24',seo:'#FB923C',other:'#9CA3AF'};
const CHANNEL_LABELS: Record<string,string>={google_ads:'Google Ads',meta:'Meta Ads',linkedin:'LinkedIn',events:'Events',content:'Content',email:'Email',seo:'SEO',other:'Other'};

function BarV({data,labelKey,valueKey,color='#C1272D'}:{data:any[];labelKey:string;valueKey:string;color?:string}) {
  const max=Math.max(...data.map((d:any)=>d[valueKey]),1);
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:6,height:80}}>
      {data.map((d:any,i:number)=>(
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
          <span style={{fontSize:'0.65rem',color:'rgba(255,255,255,0.5)',fontWeight:700}}>{d[valueKey]>0?d[valueKey]:''}</span>
          <div style={{width:'100%',background:i===data.length-1?color:`${color}55`,borderRadius:'3px 3px 0 0',height:Math.max(3,(d[valueKey]/max)*56),transition:'height 0.6s'}}/>
          <span style={{fontSize:'0.58rem',color:'rgba(255,255,255,0.25)',whiteSpace:'nowrap'}}>{d[labelKey]}</span>
        </div>
      ))}
    </div>
  );
}

function FunnelBar({stages}:{stages:any[]}) {
  const max=Math.max(...stages.map(s=>s.count),1);
  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {stages.map((s:any,i:number)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{width:100,fontSize:'0.72rem',color:'rgba(255,255,255,0.5)',flexShrink:0}}>{s.stage}</span>
          <div style={{flex:1,height:20,background:'rgba(255,255,255,0.06)',borderRadius:4,overflow:'hidden'}}>
            <div style={{width:`${(s.count/max)*100}%`,height:'100%',background:s.color,borderRadius:4,transition:'width 0.8s'}}/>
          </div>
          <span style={{width:40,textAlign:'right',fontSize:'0.78rem',fontWeight:700,color:'white',flexShrink:0}}>{s.count}</span>
          {i>0&&stages[i-1].count>0&&<span style={{fontSize:'0.65rem',color:'rgba(255,255,255,0.3)',flexShrink:0}}>{Math.round((s.count/stages[i-1].count)*100)}%</span>}
        </div>
      ))}
    </div>
  );
}

function SpendModal({onSave,onClose}:{onSave:(d:any)=>void;onClose:()=>void}) {
  const [f,setF]=useState({month:'',channel:'google_ads',amount_aed:'',notes:''});
  const I: React.CSSProperties={width:'100%',padding:'9px 12px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'rgba(255,255,255,0.06)',color:'white',fontSize:'0.875rem',outline:'none',boxSizing:'border-box' as any};
  const submit=async()=>{
    if(!f.month||!f.amount_aed) return;
    const res=await fetch('/api/v1/marketing/spend',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...f,amount_aed:+f.amount_aed})});
    onSave(await res.json()); onClose();
  };
  return (
    <div style={{position:'fixed',inset:0,zIndex:60,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#1a1a2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,width:'100%',maxWidth:420,padding:24}}>
        <p style={{fontWeight:800,color:'white',margin:'0 0 16px',fontSize:'0.95rem'}}>Log Marketing Spend</p>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <input type="month" style={{...I,color:'rgba(255,255,255,0.7)'}} value={f.month} onChange={e=>setF(p=>({...p,month:e.target.value}))}/>
          <select style={{...I,color:'rgba(255,255,255,0.7)'}} value={f.channel} onChange={e=>setF(p=>({...p,channel:e.target.value}))}>
            {Object.entries(CHANNEL_LABELS).map(([k,l])=><option key={k} value={k} style={{background:'#1a1a2e'}}>{l}</option>)}
          </select>
          <input type="number" style={I} value={f.amount_aed} onChange={e=>setF(p=>({...p,amount_aed:e.target.value}))} placeholder="Amount (AED)"/>
          <input style={I} value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))} placeholder="Notes (optional)"/>
        </div>
        <div style={{display:'flex',gap:10,marginTop:16}}>
          <button onClick={onClose} style={{flex:1,padding:'10px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'transparent',color:'rgba(255,255,255,0.4)',cursor:'pointer'}}>Cancel</button>
          <button onClick={submit} disabled={!f.month||!f.amount_aed} style={{flex:2,padding:'10px',border:'none',borderRadius:9,background:'#C1272D',color:'white',cursor:'pointer',fontWeight:700}}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default function MarketingDashboard() {
  const formatPrice = usePriceFormatter();
  const [data,setData]=useState<any>(null);
  const [spend,setSpend]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [showSpend,setShowSpend]=useState(false);

  const load=async()=>{
    try {
      const [d,s]=await Promise.all([
        fetchOrThrow('/api/v1/marketing/dashboard'),
        fetchOrThrow('/api/v1/marketing/spend'),
      ]);
      setData(d); setSpend(Array.isArray(s)?s:[]); setError(null);
    } catch (e:any) {
      setError(e.message || 'Failed to load marketing data');
    } finally {
      setLoading(false);
    }
  };
  useEffect(()=>{ load(); },[]);

  const deleteSpend=async(id:string)=>{
    await fetch(`/api/v1/marketing/spend/${id}`,{method:'DELETE'});
    setSpend(s=>s.filter(x=>x.id!==id));
  };

  if(loading) return <div style={{minHeight:'100vh',background:'#0a0a12',display:'flex',alignItems:'center',justifyContent:'center'}}><RefreshCw size={20} style={{color:'#C1272D',animation:'spin 1s linear infinite'}}/><style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style></div>;

  if(error) return (
    <div style={{minHeight:'100vh',background:'#0a0a12',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,padding:24,textAlign:'center'}}>
      <AlertTriangle size={26} style={{color:'#F87171'}}/>
      <p style={{color:'white',fontWeight:700,margin:0}}>Couldn't load marketing data</p>
      <p style={{color:'rgba(255,255,255,0.5)',fontSize:'0.85rem',margin:0,maxWidth:400}}>{error}</p>
      <button onClick={()=>{setLoading(true);setError(null);load();}}
        style={{marginTop:6,padding:'8px 18px',borderRadius:9,border:'1px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.05)',color:'white',fontSize:'0.82rem',fontWeight:700,cursor:'pointer'}}>
        Retry
      </button>
    </div>
  );

  const r=data?.revenue||{};

  return (
    <div style={{minHeight:'100vh',background:'#0a0a12',color:'white',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>
      {showSpend&&<SpendModal onSave={d=>{setSpend(s=>[d,...s]);}} onClose={()=>setShowSpend(false)}/>}

      {/* Header */}
      <div style={{borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'13px 24px',display:'flex',alignItems:'center',gap:12,background:'rgba(10,10,18,0.95)',backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:30}}>
        <a href="/admin/executive" style={{width:32,height:32,borderRadius:9,background:'#C1272D',display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none'}}><span style={{fontWeight:900,color:'white',fontSize:'0.9rem'}}>D</span></a>
        <span style={{fontWeight:800,fontSize:'1rem',color:'white'}}>SnapHub<span style={{color:'#C1272D'}}>Trade.com</span></span>
        <span style={{color:'rgba(255,255,255,0.15)'}}>·</span>
        <span style={{color:'rgba(255,255,255,0.6)',fontSize:'0.875rem',display:'flex',alignItems:'center',gap:6}}><BarChart3 size={14}/> Marketing Dashboard</span>
        <div style={{marginLeft:'auto'}}>
          <button onClick={()=>setShowSpend(true)} style={{display:'flex',alignItems:'center',gap:7,padding:'8px 16px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'transparent',color:'rgba(255,255,255,0.6)',cursor:'pointer',fontSize:'0.82rem',fontWeight:600}}>
            <Plus size={13}/> Log Ad Spend
          </button>
        </div>
      </div>

      <div style={{maxWidth:1400,margin:'0 auto',padding:'24px'}} className="da-content-pad">
        {/* Revenue KPIs */}
        <div className="da-kpi-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[
            {l:'MRR',      v:formatPrice(r.mrr||0),       sub:`${r.mrr_growth_pct>=0?'+':''}${r.mrr_growth_pct||0}% MoM`, up:r.mrr_growth_pct>=0, c:'#C1272D', icon:DollarSign},
            {l:'CAC',      v:r.cac?formatPrice(r.cac):'—', sub:'Cost per Acquisition',  c:'#F87171', icon:Target},
            {l:'LTV',      v:formatPrice(r.ltv||0),        sub:'Avg customer lifetime',  c:'#34D399', icon:TrendingUp},
            {l:'ROI',      v:r.roi!==undefined?`${r.roi}%`:'—', sub:'Marketing ROI',  up:(r.roi||0)>=0, c:(r.roi||0)>=0?'#34D399':'#F87171', icon:Zap},
            {l:'Ad Spend', v:formatPrice(r.marketing_spend_month||0), sub:'This month', c:'#FBBF24', icon:DollarSign},
            {l:'New Dealers',v:r.new_dealers_month||0, sub:'this month',  c:'#60A5FA', icon:Users},
            {l:'CPL',      v:r.cost_per_lead?formatPrice(r.cost_per_lead):'—', sub:'Cost per Lead', c:'#A78BFA', icon:Target},
            {l:'Active Subs',v:r.active_subscriptions||0, sub:'paying customers', c:'#FB923C', icon:Zap},
          ].map(k=>(
            <div key={k.l} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'14px 16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <p style={{fontSize:'0.65rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'rgba(255,255,255,0.3)',margin:0}}>{k.l}</p>
                <k.icon size={12} style={{color:k.c}}/>
              </div>
              <p style={{fontSize:'1.35rem',fontWeight:900,color:'white',margin:'0 0 3px'}}>{k.v}</p>
              <div style={{display:'flex',alignItems:'center',gap:4}}>
                {k.up!==undefined&&(k.up?<ArrowUpRight size={11} style={{color:'#34D399'}}/>:<ArrowDownRight size={11} style={{color:'#F87171'}}/>)}
                <p style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.3)',margin:0}}>{k.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
          {/* Lead velocity */}
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:'16px 20px'}}>
            <p style={{fontWeight:700,color:'white',margin:'0 0 4px',fontSize:'0.9rem'}}>Lead Velocity — 6 months</p>
            <p style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.3)',margin:'0 0 16px'}}>New leads, customers & dealer signups per month</p>
            <BarV data={data?.velocity||[]} labelKey="month" valueKey="leads" color="#60A5FA"/>
            <div style={{display:'flex',gap:14,marginTop:10}}>
              {[{c:'#60A5FA',l:'Leads'},{c:'#34D399',l:'Customers'},{c:'#C1272D',l:'Dealers'}].map(x=>(
                <div key={x.l} style={{display:'flex',alignItems:'center',gap:5}}>
                  <div style={{width:8,height:8,borderRadius:2,background:x.c}}/>
                  <span style={{fontSize:'0.68rem',color:'rgba(255,255,255,0.4)'}}>{x.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Acquisition funnel */}
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:'16px 20px'}}>
            <p style={{fontWeight:700,color:'white',margin:'0 0 4px',fontSize:'0.9rem'}}>Acquisition Funnel</p>
            <p style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.3)',margin:'0 0 20px'}}>Contact lifecycle stages</p>
            <FunnelBar stages={data?.funnel||[]}/>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
          {/* Top channels */}
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:'16px 20px'}}>
            <p style={{fontWeight:700,color:'white',margin:'0 0 16px',fontSize:'0.9rem'}}>Lead Sources</p>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {(data?.channels||[]).slice(0,8).map((ch:any,i:number)=>{
                const max=Math.max(...(data?.channels||[]).map((x:any)=>x.total),1);
                const color=CHANNEL_COLORS[ch.channel]||'#9CA3AF';
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{width:12,height:12,borderRadius:3,background:color,flexShrink:0}}/>
                    <span style={{width:100,fontSize:'0.75rem',color:'rgba(255,255,255,0.6)',flexShrink:0,textTransform:'capitalize'}}>{ch.channel?.replace('_',' ')}</span>
                    <div style={{flex:1,height:6,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{width:`${(ch.total/max)*100}%`,height:'100%',background:color,borderRadius:3}}/>
                    </div>
                    <span style={{fontSize:'0.75rem',fontWeight:700,color:'white',width:28,textAlign:'right',flexShrink:0}}>{ch.total}</span>
                    <span style={{fontSize:'0.68rem',color:'#34D399',width:28,textAlign:'right',flexShrink:0}}>+{ch.this_month}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Email performance */}
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,overflow:'hidden'}}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <p style={{fontWeight:700,color:'white',margin:0,fontSize:'0.9rem'}}>Email Campaigns</p>
              <a href="/admin/email" style={{fontSize:'0.75rem',color:'#C1272D',textDecoration:'none',fontWeight:700}}>View all →</a>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:400}}>
                <thead><tr style={{background:'rgba(255,255,255,0.02)'}}>
                  {['Campaign','Sent','Open','Click'].map(h=><th key={h} style={{padding:'7px 12px',textAlign:'left',fontSize:'0.62rem',fontWeight:700,color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {(data?.email_campaigns||[]).map((c:any)=>(
                    <tr key={c.id} style={{borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                      <td style={{padding:'9px 12px',fontSize:'0.78rem',color:'rgba(255,255,255,0.7)',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</td>
                      <td style={{padding:'9px 12px',fontSize:'0.78rem',color:'rgba(255,255,255,0.5)'}}>{c.sent}</td>
                      <td style={{padding:'9px 12px',fontWeight:700,color:'#34D399',fontSize:'0.82rem'}}>{c.open_rate}%</td>
                      <td style={{padding:'9px 12px',fontWeight:700,color:'#A78BFA',fontSize:'0.82rem'}}>{c.click_rate}%</td>
                    </tr>
                  ))}
                  {!data?.email_campaigns?.length&&<tr><td colSpan={4} style={{padding:'20px 12px',textAlign:'center',color:'rgba(255,255,255,0.2)',fontSize:'0.78rem'}}>No campaigns sent yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Ad Spend tracker */}
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'14px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <p style={{fontWeight:700,color:'white',margin:0,fontSize:'0.9rem'}}>Marketing Spend Log</p>
            <button onClick={()=>setShowSpend(true)} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,background:'transparent',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:'0.75rem'}}>
              <Plus size={12}/> Add
            </button>
          </div>
          {spend.length===0?(
            <div style={{padding:'28px',textAlign:'center',color:'rgba(255,255,255,0.2)',fontSize:'0.82rem'}}>No spend logged yet. Add your ad spend to calculate CAC & ROI.</div>
          ):(
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:'rgba(255,255,255,0.02)'}}>
                {['Month','Channel','Amount','Notes',''].map(h=><th key={h} style={{padding:'8px 16px',textAlign:'left',fontSize:'0.62rem',fontWeight:700,color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {spend.slice(0,20).map((s:any)=>(
                  <tr key={s.id} style={{borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                    <td style={{padding:'10px 16px',fontSize:'0.78rem',color:'rgba(255,255,255,0.6)'}}>{new Date(s.month).toLocaleDateString('en-US',{month:'short',year:'numeric'})}</td>
                    <td style={{padding:'10px 16px'}}>
                      <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:'0.75rem',padding:'3px 9px',borderRadius:20,background:`${CHANNEL_COLORS[s.channel]||'#9CA3AF'}15`,color:CHANNEL_COLORS[s.channel]||'#9CA3AF',fontWeight:600}}>
                        {CHANNEL_LABELS[s.channel]||s.channel}
                      </span>
                    </td>
                    <td style={{padding:'10px 16px',fontWeight:700,color:'#FBBF24',fontSize:'0.875rem'}}>{formatPrice(Number(s.amount_aed))}</td>
                    <td style={{padding:'10px 16px',fontSize:'0.75rem',color:'rgba(255,255,255,0.35)'}}>{s.notes||'—'}</td>
                    <td style={{padding:'10px 16px'}}>
                      <button onClick={()=>deleteSpend(s.id)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(248,113,113,0.5)',padding:4}}>
                        <Trash2 size={13}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>
    </div>
  );
}
