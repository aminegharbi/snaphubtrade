'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Mail, Send, Eye, MousePointer, TrendingUp, Users, Plus, RefreshCw, BarChart3, AlertTriangle, CheckCircle2, Clock, Zap } from 'lucide-react';
import Link from 'next/link';
import { fetchOrThrow } from '@/lib/api';

const fmt = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n);
const STATUS_CFG: Record<string,{label:string;color:string;bg:string}> = {
  draft:     {label:'Draft',     color:'#9CA3AF', bg:'rgba(156,163,175,0.12)'},
  scheduled: {label:'Scheduled', color:'#60A5FA', bg:'rgba(96,165,250,0.12)'},
  sending:   {label:'Sending…',  color:'#FBBF24', bg:'rgba(251,191,36,0.12)'},
  sent:      {label:'Sent',      color:'#34D399', bg:'rgba(52,211,153,0.12)'},
  paused:    {label:'Paused',    color:'#F87171', bg:'rgba(248,113,113,0.12)'},
  cancelled: {label:'Cancelled', color:'#9CA3AF', bg:'rgba(156,163,175,0.08)'},
};
const SEG_LABELS: Record<string,string> = {
  all_dealers:'All Dealers', active_dealers:'Active Dealers', inactive_dealers:'Inactive Dealers',
  all_brokers:'All Brokers', all_buyers:'All Buyers', all:'Everyone',
};

function NavBar() {
  return (
    <div style={{borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'13px 28px',display:'flex',alignItems:'center',gap:12,background:'rgba(10,10,18,0.95)',backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:30}}>
      <a href="/admin/executive" style={{width:32,height:32,borderRadius:9,background:'#C1272D',display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none',flexShrink:0}}>
        <span style={{fontWeight:900,color:'white',fontSize:'0.9rem'}}>D</span>
      </a>
      <span style={{fontWeight:800,fontSize:'1rem',color:'white',letterSpacing:'-0.02em'}}>SnapHub<span style={{color:'#C1272D'}}>Trade.com</span></span>
      <span style={{color:'rgba(255,255,255,0.15)'}}>·</span>
      <div style={{display:'flex',alignItems:'center',gap:6,color:'rgba(255,255,255,0.6)',fontSize:'0.875rem'}}>
        <Mail size={14}/> Email Marketing
      </div>
      <div style={{marginLeft:'auto'}}>
        <Link href="/admin/email/campaigns/new"
          style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',background:'#C1272D',color:'white',borderRadius:10,textDecoration:'none',fontWeight:700,fontSize:'0.875rem'}}>
          <Plus size={14}/> New Campaign
        </Link>
      </div>
    </div>
  );
}

export default function EmailDashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [filter, setFilter] = useState('all');
  const [runningReport, setRunningReport] = useState<'dealer'|'broker'|null>(null);
  const [reportNotice, setReportNotice] = useState('');

  const runDealerReports = async () => {
    setRunningReport('dealer'); setReportNotice('');
    try {
      const res = await fetchOrThrow('/api/v1/email/reports/dealer/run', { method:'POST' });
      setReportNotice(`Sent to ${res.sent}/${res.total} dealers.`);
    } catch (e:any) { setReportNotice(e.message || 'Failed'); }
    finally { setRunningReport(null); }
  };
  const runBrokerReports = async () => {
    setRunningReport('broker'); setReportNotice('');
    try {
      const res = await fetchOrThrow('/api/v1/email/reports/broker/run', { method:'POST' });
      setReportNotice(`Sent to ${res.sent}/${res.total} brokers.`);
    } catch (e:any) { setReportNotice(e.message || 'Failed'); }
    finally { setRunningReport(null); }
  };

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchOrThrow('/api/v1/email/analytics'),
      fetchOrThrow('/api/v1/email/campaigns'),
      fetchOrThrow('/api/v1/email/segments'),
    ]).then(([ov,cam,seg])=>{ setOverview(ov); setCampaigns(Array.isArray(cam)?cam:[]); setSegments(Array.isArray(seg)?seg:[]); setError(null); })
      .catch((e:any)=>setError(e.message || 'Failed to load email data'))
      .finally(()=>setLoading(false));
  };

  useEffect(load,[]);

  const filtered = filter==='all' ? campaigns : campaigns.filter(c=>c.status===filter);

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#0a0a12',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}>
      <RefreshCw size={20} style={{color:'#C1272D',animation:'spin 1s linear infinite'}}/>
      <p style={{color:'rgba(255,255,255,0.3)',fontSize:'0.82rem',margin:0}}>Loading Email Marketing…</p>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{minHeight:'100vh',background:'#0a0a12',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,padding:24,textAlign:'center'}}>
      <AlertTriangle size={26} style={{color:'#F87171'}}/>
      <p style={{color:'white',fontWeight:700,margin:0}}>Couldn't load email data</p>
      <p style={{color:'rgba(255,255,255,0.5)',fontSize:'0.85rem',margin:0,maxWidth:400}}>{error}</p>
      <button onClick={load}
        style={{marginTop:6,padding:'8px 18px',borderRadius:9,border:'1px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.05)',color:'white',fontSize:'0.82rem',fontWeight:700,cursor:'pointer'}}>
        Retry
      </button>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#0a0a12',color:'white',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>
      <NavBar/>
      <div style={{maxWidth:1400,margin:'0 auto',padding:'28px 24px'}} className="da-content-pad">

        {/* KPI Grid */}
        <div className="da-kpi-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:28}}>
          {[
            {label:'Total Sent',       value:fmt(overview?.total_sent||0),        icon:Send,          color:'#60A5FA'},
            {label:'Avg Open Rate',    value:`${overview?.avg_open_rate||0}%`,     icon:Eye,           color:'#34D399'},
            {label:'Avg Click Rate',   value:`${overview?.avg_click_rate||0}%`,    icon:MousePointer,  color:'#A78BFA'},
            {label:'Unsubscribes',     value:overview?.unsubscribes||0,            icon:AlertTriangle, color:'#F87171'},
          ].map(k=>(
            <div key={k.label} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:'18px 20px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <p style={{fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'rgba(255,255,255,0.35)',margin:0}}>{k.label}</p>
                <k.icon size={14} style={{color:k.color}}/>
              </div>
              <p style={{fontSize:'1.8rem',fontWeight:900,color:'white',margin:0,letterSpacing:'-0.02em'}}>{k.value}</p>
            </div>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:20}}>
          {/* Campaign list */}
          <div>
            {/* Filters */}
            <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
              {['all','draft','scheduled','sent'].map(f=>(
                <button key={f} onClick={()=>setFilter(f)}
                  style={{padding:'6px 14px',borderRadius:20,border:'1px solid',borderColor:filter===f?'#C1272D':'rgba(255,255,255,0.1)',background:filter===f?'rgba(193,39,45,0.15)':'transparent',color:filter===f?'#C1272D':'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'0.78rem',fontWeight:600,textTransform:'capitalize'}}>
                  {f==='all'?'All Campaigns':f}
                </button>
              ))}
              <span style={{marginLeft:'auto',fontSize:'0.78rem',color:'rgba(255,255,255,0.3)',alignSelf:'center'}}>{filtered.length} campaigns</span>
            </div>

            {/* List */}
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {filtered.length===0 && (
                <div style={{textAlign:'center',padding:'60px 20px',background:'rgba(255,255,255,0.02)',border:'1px dashed rgba(255,255,255,0.1)',borderRadius:16}}>
                  <Mail size={36} style={{color:'rgba(255,255,255,0.15)',display:'block',margin:'0 auto 14px'}}/>
                  <p style={{color:'rgba(255,255,255,0.3)',fontWeight:600,margin:'0 0 8px'}}>No campaigns yet</p>
                  <Link href="/admin/email/campaigns/new" style={{fontSize:'0.82rem',color:'#C1272D',textDecoration:'none',fontWeight:700}}>Create your first campaign →</Link>
                </div>
              )}
              {filtered.map(c=>{
                const sc = STATUS_CFG[c.status]||STATUS_CFG.draft;
                return (
                  <Link key={c.id} href={`/admin/email/campaigns/${c.id}`}
                    style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,textDecoration:'none',transition:'border-color 0.15s'}}>
                    <div style={{width:40,height:40,borderRadius:10,background:'rgba(193,39,45,0.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Mail size={16} style={{color:'#C1272D'}}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontWeight:700,color:'white',margin:'0 0 3px',fontSize:'0.9rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</p>
                      <p style={{color:'rgba(255,255,255,0.35)',margin:0,fontSize:'0.75rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {c.subject_a} · {SEG_LABELS[c.segment]||c.segment}
                        {c.ab_test&&<span style={{marginLeft:6,color:'#A78BFA'}}>A/B</span>}
                      </p>
                    </div>
                    {c.stats?.sent>0&&(
                      <div style={{display:'flex',gap:16,flexShrink:0}}>
                        <div style={{textAlign:'center'}}>
                          <p style={{fontWeight:800,color:'#34D399',margin:0,fontSize:'0.9rem'}}>{c.stats.open_rate}%</p>
                          <p style={{color:'rgba(255,255,255,0.25)',margin:0,fontSize:'0.62rem'}}>Open</p>
                        </div>
                        <div style={{textAlign:'center'}}>
                          <p style={{fontWeight:800,color:'#60A5FA',margin:0,fontSize:'0.9rem'}}>{c.stats.click_rate}%</p>
                          <p style={{color:'rgba(255,255,255,0.25)',margin:0,fontSize:'0.62rem'}}>Click</p>
                        </div>
                        <div style={{textAlign:'center'}}>
                          <p style={{fontWeight:800,color:'rgba(255,255,255,0.6)',margin:0,fontSize:'0.9rem'}}>{fmt(c.stats.sent)}</p>
                          <p style={{color:'rgba(255,255,255,0.25)',margin:0,fontSize:'0.62rem'}}>Sent</p>
                        </div>
                      </div>
                    )}
                    <span style={{padding:'4px 10px',borderRadius:20,fontSize:'0.7rem',fontWeight:700,background:sc.bg,color:sc.color,flexShrink:0}}>{sc.label}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {/* Audience sizes */}
            <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,overflow:'hidden'}}>
              <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:7}}>
                <Users size={13} style={{color:'#60A5FA'}}/> <p style={{fontWeight:700,color:'white',margin:0,fontSize:'0.82rem'}}>Audience Segments</p>
              </div>
              <div style={{padding:'8px 0'}}>
                {segments.map((s:any)=>(
                  <div key={s.segment} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 16px'}}>
                    <span style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.5)'}}>{SEG_LABELS[s.segment]||s.segment}</span>
                    <span style={{fontSize:'0.82rem',fontWeight:700,color:'white'}}>{s.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick stats */}
            <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:'16px'}}>
              <p style={{fontWeight:700,color:'white',margin:'0 0 14px',fontSize:'0.82rem'}}>This Month</p>
              {[
                {label:'Campaigns sent',value:overview?.sent_this_month||0,color:'#34D399'},
                {label:'Total campaigns',value:overview?.total_campaigns||0,color:'#60A5FA'},
              ].map(s=>(
                <div key={s.label} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                  <span style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.4)'}}>{s.label}</span>
                  <span style={{fontWeight:800,color:s.color,fontSize:'0.875rem'}}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Automations — weekly reports */}
            <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,overflow:'hidden'}}>
              <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:7}}>
                <Clock size={13} style={{color:'#A78BFA'}}/> <p style={{fontWeight:700,color:'white',margin:0,fontSize:'0.82rem'}}>Weekly Reports</p>
              </div>
              <div style={{padding:12, display:'flex', flexDirection:'column', gap:8}}>
                <p style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.4)',margin:0,lineHeight:1.5}}>
                  Personalized Dealer Market Report and Broker Weekly Report auto-send every Monday. Trigger manually below.
                </p>
                <button onClick={runDealerReports} disabled={runningReport==='dealer'}
                  style={{padding:'8px 12px',borderRadius:9,border:'1px solid rgba(167,139,250,0.3)',background:'rgba(167,139,250,0.1)',color:'#A78BFA',fontWeight:700,fontSize:'0.76rem',cursor:'pointer'}}>
                  {runningReport==='dealer' ? 'Sending…' : 'Send Dealer Reports now'}
                </button>
                <button onClick={runBrokerReports} disabled={runningReport==='broker'}
                  style={{padding:'8px 12px',borderRadius:9,border:'1px solid rgba(167,139,250,0.3)',background:'rgba(167,139,250,0.1)',color:'#A78BFA',fontWeight:700,fontSize:'0.76rem',cursor:'pointer'}}>
                  {runningReport==='broker' ? 'Sending…' : 'Send Broker Reports now'}
                </button>
                {reportNotice && <p style={{fontSize:'0.72rem',color:'#34D399',margin:0}}>{reportNotice}</p>}
              </div>
            </div>

            {/* Quick actions */}
            <Link href="/admin/email/campaigns/new"
              style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px',background:'rgba(193,39,45,0.12)',border:'1px solid rgba(193,39,45,0.25)',borderRadius:14,textDecoration:'none',color:'#C1272D',fontWeight:700,fontSize:'0.875rem'}}>
              <Zap size={14}/> Create with AI
            </Link>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>
    </div>
  );
}
