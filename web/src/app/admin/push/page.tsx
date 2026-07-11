'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { Bell, Send, Eye, Plus, RefreshCw, X, Check, Users, MousePointer, Megaphone, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { fetchOrThrow } from '@/lib/api';

const TYPE_CFG: Record<string,{emoji:string;label:string;color:string}> = {
  announcement:{emoji:'📢',label:'Announcement',color:'#60A5FA'},
  price_drop:  {emoji:'💸',label:'Price Drop',  color:'#34D399'},
  promotion:   {emoji:'🎁',label:'Promotion',   color:'#A78BFA'},
  update:      {emoji:'🔔',label:'Update',       color:'#FBBF24'},
  news:        {emoji:'📰',label:'Market News', color:'#FB923C'},
  alert:       {emoji:'⚠️',label:'Alert',       color:'#F87171'},
};
const AUD_CFG: Record<string,string> = {
  all:'Everyone', dealers:'Dealers only', brokers:'Brokers only', buyers:'Buyers only',
};
const STATUS_CFG: Record<string,{label:string;color:string;bg:string}> = {
  draft:   {label:'Draft',   color:'#9CA3AF',bg:'rgba(156,163,175,0.12)'},
  scheduled:{label:'Scheduled',color:'#60A5FA',bg:'rgba(96,165,250,0.12)'},
  sending: {label:'Sending…',color:'#FBBF24',bg:'rgba(251,191,36,0.12)'},
  sent:    {label:'Sent',    color:'#34D399',bg:'rgba(52,211,153,0.12)'},
};

function CampaignModal({ onSave, onClose, audiences }: any) {
  const [f,setF]=useState({title:'',body:'',type:'announcement',audience:'all',action_url:'https://snaphubtrade.com',action_label:'View',scheduled_at:''});
  const [saving,setSaving]=useState(false);
  const I: React.CSSProperties={width:'100%',padding:'10px 13px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'rgba(255,255,255,0.06)',color:'white',fontSize:'0.875rem',outline:'none',boxSizing:'border-box' as any};
  const L=(t:string)=><label style={{display:'block',fontSize:'0.68rem',fontWeight:700,color:'rgba(255,255,255,0.35)',textTransform:'uppercase' as any,letterSpacing:'0.05em',marginBottom:4}}>{t}</label>;
  const save=async()=>{
    if(!f.title.trim()||!f.body.trim()) return;
    setSaving(true);
    const res=await fetch('/api/v1/push/campaigns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(f)});
    onSave(await res.json()); onClose();
  };
  const recipientCount = f.audience==='all'?(audiences.dealers+audiences.brokers+audiences.buyers)
    :f.audience==='dealers'?audiences.dealers:f.audience==='brokers'?audiences.brokers:audiences.buyers||0;

  return (
    <div style={{position:'fixed',inset:0,zIndex:60,background:'rgba(0,0,0,0.72)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#1a1a2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:18,width:'100%',maxWidth:540,padding:28}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:22}}>
          <Bell size={16} style={{color:'#C1272D'}}/> <p style={{fontWeight:800,color:'white',margin:0,fontSize:'1rem',flex:1}}>Create Push Notification</p>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)'}}><X size={16}/></button>
        </div>

        {/* Type selector */}
        <div style={{marginBottom:16}}>
          {L('Notification type')}
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {Object.entries(TYPE_CFG).map(([k,v])=>(
              <button key={k} onClick={()=>setF(p=>({...p,type:k}))}
                style={{padding:'6px 12px',borderRadius:20,border:'1px solid',borderColor:f.type===k?v.color:'rgba(255,255,255,0.1)',background:f.type===k?v.color+'20':'transparent',color:f.type===k?v.color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'0.75rem',fontWeight:700}}>
                {v.emoji} {v.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div>{L('Title (max 60 chars)')} <input style={I} value={f.title} onChange={e=>setF(p=>({...p,title:e.target.value.slice(0,60)}))} placeholder="e.g. 🔥 New BMW M4 just listed — Dubai"/><p style={{fontSize:'0.65rem',textAlign:'right',color:f.title.length>50?'#F87171':'rgba(255,255,255,0.2)',margin:'3px 0 0'}}>{f.title.length}/60</p></div>
          <div>{L('Message body (max 140 chars)')} <textarea style={{...I,minHeight:70,resize:'vertical' as any}} value={f.body} onChange={e=>setF(p=>({...p,body:e.target.value.slice(0,140)}))} placeholder="Browse 35+ verified dealers — tap to view"/><p style={{fontSize:'0.65rem',textAlign:'right',color:f.body.length>120?'#F87171':'rgba(255,255,255,0.2)',margin:'3px 0 0'}}>{f.body.length}/140</p></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>{L('CTA Label')} <input style={I} value={f.action_label} onChange={e=>setF(p=>({...p,action_label:e.target.value}))}/></div>
            <div>{L('CTA URL')} <input style={I} value={f.action_url} onChange={e=>setF(p=>({...p,action_url:e.target.value}))}/></div>
          </div>

          {/* Audience */}
          <div>
            {L('Audience')}
            <div className="da-kpi-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)',gap:7}}>
              {Object.entries(AUD_CFG).map(([k,l])=>{
                const cnt = k==='all'?(audiences.dealers+audiences.brokers+audiences.buyers):k==='dealers'?audiences.dealers:k==='brokers'?audiences.brokers:audiences.buyers||0;
                return (
                  <button key={k} onClick={()=>setF(p=>({...p,audience:k}))}
                    style={{padding:'8px 6px',borderRadius:10,border:'1.5px solid',borderColor:f.audience===k?'#C1272D':'rgba(255,255,255,0.1)',background:f.audience===k?'rgba(193,39,45,0.12)':'transparent',color:f.audience===k?'white':'rgba(255,255,255,0.4)',cursor:'pointer',textAlign:'center',fontSize:'0.72rem',fontWeight:f.audience===k?700:400}}>
                    <p style={{margin:'0 0 2px'}}>{l}</p>
                    <p style={{margin:0,color:f.audience===k?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.2)',fontSize:'0.65rem'}}>{cnt.toLocaleString()}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>{L('Schedule (optional)') } <input type="datetime-local" style={{...I,color:'rgba(255,255,255,0.6)'}} value={f.scheduled_at} onChange={e=>setF(p=>({...p,scheduled_at:e.target.value}))}/></div>
        </div>

        <div style={{marginTop:4,padding:'10px 12px',background:'rgba(255,255,255,0.04)',borderRadius:10,display:'flex',alignItems:'center',gap:8}}>
          <Users size={13} style={{color:'#60A5FA'}}/> <span style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.5)'}}>Will reach <strong style={{color:'white'}}>{recipientCount.toLocaleString()}</strong> recipients</span>
        </div>

        <div style={{display:'flex',gap:10,marginTop:18}}>
          <button onClick={onClose} style={{flex:1,padding:'11px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,background:'transparent',color:'rgba(255,255,255,0.4)',cursor:'pointer'}}>Cancel</button>
          <button onClick={save} disabled={saving||!f.title.trim()||!f.body.trim()} style={{flex:2,padding:'11px',border:'none',borderRadius:10,background:'#C1272D',color:'white',cursor:'pointer',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {saving?<RefreshCw size={14} style={{animation:'spin 1s linear infinite'}}/>:<Check size={14}/>} Save Campaign
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PushPage() {
  const [campaigns,setCampaigns]=useState<any[]>([]);
  const [analytics,setAnalytics]=useState<any>(null);
  const [audiences,setAudiences]=useState<any>({dealers:0,brokers:0,buyers:0,all:0});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [showCreate,setShowCreate]=useState(false);
  const [sending,setSending]=useState<string|null>(null);

  const load=async()=>{
    try {
      const [c,a,aud]=await Promise.all([
        fetchOrThrow('/api/v1/push/campaigns'),
        fetchOrThrow('/api/v1/push/analytics'),
        fetchOrThrow('/api/v1/push/audiences'),
      ]);
      setCampaigns(Array.isArray(c)?c:[]); setAnalytics(a); setAudiences(aud); setError(null);
    } catch (e:any) {
      setError(e.message || 'Failed to load push data');
    } finally {
      setLoading(false);
    }
  };
  useEffect(()=>{ load(); },[]);

  const sendNow=async(id:string)=>{
    setSending(id);
    await fetch(`/api/v1/push/campaigns/${id}/send`,{method:'POST'});
    setSending(null); load();
  };

  if(loading) return <div style={{minHeight:'100vh',background:'#0a0a12',display:'flex',alignItems:'center',justifyContent:'center'}}><RefreshCw size={20} style={{color:'#C1272D',animation:'spin 1s linear infinite'}}/><style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style></div>;

  if(error) return (
    <div style={{minHeight:'100vh',background:'#0a0a12',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,padding:24,textAlign:'center'}}>
      <AlertTriangle size={26} style={{color:'#F87171'}}/>
      <p style={{color:'white',fontWeight:700,margin:0}}>Couldn't load push data</p>
      <p style={{color:'rgba(255,255,255,0.5)',fontSize:'0.85rem',margin:0,maxWidth:400}}>{error}</p>
      <button onClick={()=>{setLoading(true);setError(null);load();}}
        style={{marginTop:6,padding:'8px 18px',borderRadius:9,border:'1px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.05)',color:'white',fontSize:'0.82rem',fontWeight:700,cursor:'pointer'}}>
        Retry
      </button>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#0a0a12',color:'white',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>
      {showCreate&&<CampaignModal audiences={audiences} onSave={c=>{setCampaigns(p=>[c,...p]);}} onClose={()=>setShowCreate(false)}/>}

      {/* Header */}
      <div style={{borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'13px 24px',display:'flex',alignItems:'center',gap:12,background:'rgba(10,10,18,0.95)',backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:30}}>
        <a href="/admin/executive" style={{width:32,height:32,borderRadius:9,background:'#C1272D',display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none'}}><span style={{fontWeight:900,color:'white',fontSize:'0.9rem'}}>D</span></a>
        <span style={{fontWeight:800,fontSize:'1rem',color:'white'}}>SnapHub<span style={{color:'#C1272D'}}>Trade.com</span></span>
        <span style={{color:'rgba(255,255,255,0.15)'}}>·</span>
        <span style={{color:'rgba(255,255,255,0.6)',fontSize:'0.875rem',display:'flex',alignItems:'center',gap:6}}><Bell size={14}/> Push Notifications</span>
        <div style={{marginLeft:'auto'}}>
          <button onClick={()=>setShowCreate(true)} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',background:'#C1272D',color:'white',border:'none',borderRadius:9,cursor:'pointer',fontWeight:700,fontSize:'0.875rem'}}>
            <Plus size={14}/> New Campaign
          </button>
        </div>
      </div>

      <div style={{maxWidth:1200,margin:'0 auto',padding:'24px'}} className="da-content-pad">
        {/* KPIs */}
        <div className="da-kpi-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
          {[
            {l:'Total Campaigns',v:analytics?.total_campaigns||0,       icon:Megaphone,  c:'#60A5FA'},
            {l:'Total Reached',  v:(analytics?.total_reached||0).toLocaleString(), icon:Users,      c:'#34D399'},
            {l:'Total Clicks',   v:(analytics?.total_clicked||0).toLocaleString(), icon:MousePointer,c:'#A78BFA'},
            {l:'Avg CTR',        v:`${analytics?.avg_ctr||0}%`,         icon:Eye,        c:'#FBBF24'},
          ].map(k=>(
            <div key={k.l} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'16px 18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                <p style={{fontSize:'0.68rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'rgba(255,255,255,0.3)',margin:0}}>{k.l}</p>
                <k.icon size={13} style={{color:k.c}}/>
              </div>
              <p style={{fontSize:'1.6rem',fontWeight:900,color:'white',margin:0}}>{k.v}</p>
            </div>
          ))}
        </div>

        {/* Audience bar */}
        <div className="da-kpi-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:24}}>
          {[
            {l:'All platform',v:audiences.all,c:'#C1272D'},
            {l:'Dealers',v:audiences.dealers,c:'#60A5FA'},
            {l:'Brokers',v:audiences.brokers,c:'#A78BFA'},
            {l:'Buyers',v:audiences.buyers,c:'#34D399'},
          ].map(a=>(
            <div key={a.l} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${a.c}20`,borderRadius:12,padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.4)'}}>{a.l}</span>
              <span style={{fontWeight:800,color:a.c,fontSize:'1rem'}}>{a.v.toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Campaign list */}
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {campaigns.length===0&&(
            <div style={{textAlign:'center',padding:'60px',background:'rgba(255,255,255,0.02)',border:'1px dashed rgba(255,255,255,0.1)',borderRadius:16}}>
              <Bell size={36} style={{color:'rgba(255,255,255,0.1)',display:'block',margin:'0 auto 14px'}}/>
              <p style={{color:'rgba(255,255,255,0.3)',margin:'0 0 8px'}}>No push campaigns yet</p>
              <button onClick={()=>setShowCreate(true)} style={{background:'none',border:'none',color:'#C1272D',cursor:'pointer',fontWeight:700,fontSize:'0.875rem'}}>Create your first notification →</button>
            </div>
          )}
          {campaigns.map((c:any)=>{
            const tc=TYPE_CFG[c.type]||TYPE_CFG.announcement;
            const sc=STATUS_CFG[c.status]||STATUS_CFG.draft;
            return (
              <div key={c.id} style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14}}>
                <div style={{width:44,height:44,borderRadius:12,background:tc.color+'15',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:'1.2rem'}}>{tc.emoji}</div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontWeight:700,color:'white',margin:'0 0 3px',fontSize:'0.875rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.title}</p>
                  <p style={{color:'rgba(255,255,255,0.4)',margin:0,fontSize:'0.75rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.body}</p>
                  <p style={{color:'rgba(255,255,255,0.25)',margin:'3px 0 0',fontSize:'0.68rem'}}>{AUD_CFG[c.audience]} · {tc.label}</p>
                </div>
                {c.status==='sent'&&(
                  <div style={{display:'flex',gap:16,flexShrink:0}}>
                    <div style={{textAlign:'center'}}><p style={{fontWeight:800,color:'#34D399',margin:0,fontSize:'0.9rem'}}>{c.total_sent.toLocaleString()}</p><p style={{color:'rgba(255,255,255,0.25)',margin:0,fontSize:'0.62rem'}}>Reached</p></div>
                    <div style={{textAlign:'center'}}><p style={{fontWeight:800,color:'#A78BFA',margin:0,fontSize:'0.9rem'}}>{c.click_rate}%</p><p style={{color:'rgba(255,255,255,0.25)',margin:0,fontSize:'0.62rem'}}>CTR</p></div>
                  </div>
                )}
                <span style={{padding:'3px 10px',borderRadius:20,fontSize:'0.7rem',fontWeight:700,background:sc.bg,color:sc.color,flexShrink:0}}>{sc.label}</span>
                {c.status==='draft'&&(
                  <button onClick={()=>sendNow(c.id)} disabled={sending===c.id}
                    style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'#C1272D',color:'white',border:'none',borderRadius:9,cursor:sending===c.id?'default':'pointer',fontWeight:700,fontSize:'0.8rem',flexShrink:0}}>
                    {sending===c.id?<RefreshCw size={12} style={{animation:'spin 1s linear infinite'}}/>:<Send size={12}/>}
                    {sending===c.id?'Sending…':'Send Now'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>
    </div>
  );
}
