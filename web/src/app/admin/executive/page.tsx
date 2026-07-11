'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Users, Car, DollarSign, Activity, AlertTriangle, Brain, CheckCircle2, Circle, Plus, ArrowUpRight, ArrowDownRight, RefreshCw, Target, BarChart3, Calendar, Star, Flame } from 'lucide-react';
import { usePriceFormatter } from '@/components/common/Price';

const pct = (n: number) => `${n>0?'+':''}${n}%`;
const gradeColor = (g: string) => g==='excellent'?'#34D399':g==='good'?'#60A5FA':g==='at_risk'?'#FBBF24':'#F87171';
const PRIORITY_CFG: Record<string,{color:string;bg:string}> = { critical:{color:'#F87171',bg:'rgba(248,113,113,0.1)'}, high:{color:'#FBBF24',bg:'rgba(251,191,36,0.08)'}, medium:{color:'#60A5FA',bg:'rgba(96,165,250,0.08)'} };
const TYPE_EMOJI: Record<string,string> = { revenue:'💰', growth:'🚀', retention:'🔒', activation:'⚡' };
const EFFORT_COLOR: Record<string,string> = { low:'#34D399', medium:'#FBBF24', high:'#F87171' };

function Spark({ data, color='#34D399' }: { data:number[]; color?:string }) {
  if (!data.length) return null;
  const max=Math.max(...data,1), min=Math.min(...data), W=80, H=28;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*W},${H-((v-min)/(max-min||1))*H}`).join(' ');
  return <svg width={W} height={H} style={{overflow:'visible'}}><polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function HealthGauge({ score, grade }: { score:number; grade:string }) {
  const color=gradeColor(grade), r=46, circ=2*Math.PI*r, dash=(score/100)*circ*0.75;
  return (
    <div style={{position:'relative',width:130,height:90,flexShrink:0}}>
      <svg width={130} height={130} style={{position:'absolute',top:-20}}>
        <circle cx={65} cy={65} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} strokeDasharray={`${circ*0.75} ${circ*0.25}`} strokeLinecap="round" transform="rotate(135 65 65)"/>
        <circle cx={65} cy={65} r={r} fill="none" stroke={color} strokeWidth={10} strokeDasharray={`${dash} ${circ-dash}`} strokeLinecap="round" transform="rotate(135 65 65)"/>
      </svg>
      <div style={{position:'absolute',bottom:0,left:0,right:0,textAlign:'center'}}>
        <p style={{fontSize:'2rem',fontWeight:900,color,margin:0,lineHeight:1}}>{score}</p>
        <p style={{fontSize:'0.65rem',fontWeight:700,color:'rgba(255,255,255,0.4)',margin:0,textTransform:'uppercase',letterSpacing:'0.08em'}}>{grade.replace('_',' ')}</p>
      </div>
    </div>
  );
}

function KpiTile({ label,value,sub,trend,spark,icon:Icon,color,trendUp }: any) {
  return (
    <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:'18px 20px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
        <p style={{fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'rgba(255,255,255,0.4)',margin:0}}>{label}</p>
        <div style={{width:30,height:30,borderRadius:8,background:`${color}18`,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Icon size={13} style={{color}}/>
        </div>
      </div>
      <p style={{fontSize:'1.55rem',fontWeight:900,color:'white',margin:'0 0 6px',letterSpacing:'-0.02em'}}>{value}</p>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:5}}>
          {trend!==undefined&&<>{trendUp?<ArrowUpRight size={12} style={{color:'#34D399'}}/>:<ArrowDownRight size={12} style={{color:'#F87171'}}/>}<span style={{fontSize:'0.75rem',fontWeight:700,color:trendUp?'#34D399':'#F87171'}}>{trend}</span></>}
          {sub&&!trend&&<span style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.35)'}}>{sub}</span>}
        </div>
        {spark&&<Spark data={spark} color={color}/>}
      </div>
    </div>
  );
}

function MiniBarChart({ data, labelKey, valueKey, color='#C1272D' }: any) {
  const max=Math.max(...data.map((d:any)=>d[valueKey]),1);
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:4,height:56}}>
      {data.map((d:any,i:number)=>(
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
          <div style={{width:'100%',height:Math.max(3,(d[valueKey]/max)*48),background:i===data.length-1?color:`${color}55`,borderRadius:3}}/>
          <span style={{fontSize:'0.55rem',color:'rgba(255,255,255,0.3)',whiteSpace:'nowrap'}}>{d[labelKey]}</span>
        </div>
      ))}
    </div>
  );
}

const PRIORITY_DOT: Record<string,string> = { urgent:'#F87171', high:'#FBBF24', medium:'#60A5FA', low:'rgba(255,255,255,0.3)' };

function TaskItem({ task, onToggle }: { task:any; onToggle:()=>void }) {
  const done = task.status==='done';
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
      <button onClick={onToggle} style={{background:'none',border:'none',cursor:'pointer',padding:0,flexShrink:0}}>
        {done?<CheckCircle2 size={16} style={{color:'#34D399'}}/>:<Circle size={16} style={{color:'rgba(255,255,255,0.25)'}}/>}
      </button>
      <div style={{width:6,height:6,borderRadius:'50%',background:PRIORITY_DOT[task.priority]||PRIORITY_DOT.medium,flexShrink:0}}/>
      <span style={{flex:1,fontSize:'0.82rem',color:done?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.8)',textDecoration:done?'line-through':'none',lineHeight:1.3}}>{task.title}</span>
      {task.due_date&&!done&&<span style={{fontSize:'0.68rem',color:new Date(task.due_date)<new Date()?'#F87171':'rgba(255,255,255,0.3)',flexShrink:0}}>{new Date(task.due_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span>}
    </div>
  );
}

function AddTaskModal({ onAdd, onClose }: { onAdd:(t:any)=>void; onClose:()=>void }) {
  const [title,setTitle]=useState(''), [priority,setPriority]=useState('medium'), [due,setDue]=useState(''), [category,setCategory]=useState('general');
  const submit=()=>{ if(!title.trim()) return; onAdd({title,priority,due_date:due||undefined,category}); onClose(); };
  const inp: React.CSSProperties = {width:'100%',padding:'9px 12px',border:'1px solid rgba(255,255,255,0.12)',borderRadius:9,background:'rgba(255,255,255,0.06)',color:'white',fontSize:'0.875rem',outline:'none',boxSizing:'border-box' as any};
  return (
    <div style={{position:'fixed',inset:0,zIndex:60,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#1a1a2e',border:'1px solid rgba(255,255,255,0.12)',borderRadius:16,width:'100%',maxWidth:360,padding:24}}>
        <p style={{fontWeight:800,color:'white',margin:'0 0 18px',fontSize:'1rem'}}>Add Task</p>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <input autoFocus style={inp} placeholder="Task title…" value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <select style={{...inp,color:'rgba(255,255,255,0.8)'}} value={priority} onChange={e=>setPriority(e.target.value)}>
              {['urgent','high','medium','low'].map(p=><option key={p} value={p} style={{background:'#1a1a2e'}}>{p}</option>)}
            </select>
            <select style={{...inp,color:'rgba(255,255,255,0.8)'}} value={category} onChange={e=>setCategory(e.target.value)}>
              {['general','sales','marketing','ops','finance'].map(c=><option key={c} value={c} style={{background:'#1a1a2e'}}>{c}</option>)}
            </select>
          </div>
          <input type="date" style={{...inp,color:'rgba(255,255,255,0.6)'}} value={due} onChange={e=>setDue(e.target.value)}/>
          <div style={{display:'flex',gap:10,marginTop:4}}>
            <button onClick={onClose} style={{flex:1,padding:'10px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'transparent',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:'0.875rem'}}>Cancel</button>
            <button onClick={submit} style={{flex:2,padding:'10px',border:'none',borderRadius:9,background:'#C1272D',color:'white',cursor:'pointer',fontWeight:700,fontSize:'0.875rem'}}>Add Task</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const formatPrice = usePriceFormatter();
  const [stats,setStats]=useState<any>(null);
  const [tasks,setTasks]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [addTask,setAddTask]=useState(false);
  const [lastFetch,setLastFetch]=useState<Date|null>(null);
  const [tab,setTab]=useState<'mrr'|'dealers'>('mrr');

  const load=useCallback(async()=>{
    try {
      const [statsRes,tasksRes]=await Promise.all([
        fetch('/api/v1/executive/stats'),
        fetch('/api/v1/executive/tasks'),
      ]);
      // A 401/403 response still has a valid JSON body (e.g. {"statusCode":401,"message":"Unauthorized"}),
      // so without checking .ok that error body would get treated as real stats and
      // silently render as all-zero KPIs — checking status explicitly surfaces the
      // actual problem (expired session, missing admin role) instead.
      if (!statsRes.ok) {
        const body = await statsRes.json().catch(()=>({}));
        throw new Error(body.message || `Failed to load stats (HTTP ${statsRes.status})`);
      }
      const s = await statsRes.json();
      const t = tasksRes.ok ? await tasksRes.json() : [];
      setStats(s); setTasks(Array.isArray(t)?t:[]); setLastFetch(new Date()); setError(null);
    } catch (e:any) {
      setError(e.message || 'Failed to load dashboard data');
    }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{ load(); const iv=setInterval(load,60_000); return()=>clearInterval(iv); },[load]);

  const toggleTask=async(t:any)=>{
    const next=t.status==='done'?'todo':'done';
    setTasks(ts=>ts.map(x=>x.id===t.id?{...x,status:next}:x));
    await fetch(`/api/v1/executive/tasks/${t.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:next})});
  };

  const createTask=async(data:any)=>{
    const t=await fetch('/api/v1/executive/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json());
    setTasks(ts=>[t,...ts]);
  };

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#0a0a12',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}>
      <RefreshCw size={22} style={{color:'#C1272D',animation:'spin 1s linear infinite'}}/>
      <p style={{color:'rgba(255,255,255,0.3)',fontSize:'0.82rem',margin:0}}>Loading Revenue OS…</p>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{minHeight:'100vh',background:'#0a0a12',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:14,padding:24,textAlign:'center'}}>
      <AlertTriangle size={28} style={{color:'#F87171'}}/>
      <p style={{color:'white',fontWeight:700,margin:0}}>Couldn't load the dashboard</p>
      <p style={{color:'rgba(255,255,255,0.5)',fontSize:'0.85rem',margin:0,maxWidth:420}}>{error}</p>
      <p style={{color:'rgba(255,255,255,0.35)',fontSize:'0.78rem',margin:0,maxWidth:420}}>
        If this says "Unauthorized" or "Forbidden", your session may not have admin rights — try logging out and back in with an admin account.
      </p>
      <button onClick={()=>{setLoading(true);setError(null);load();}}
        style={{marginTop:6,padding:'8px 18px',borderRadius:9,border:'1px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.05)',color:'white',fontSize:'0.82rem',fontWeight:700,cursor:'pointer'}}>
        Retry
      </button>
    </div>
  );

  const s=stats;
  if (!s) return <div style={{minHeight:'100vh',background:'#0a0a12',display:'flex',alignItems:'center',justifyContent:'center'}}><p style={{color:'rgba(255,255,255,0.3)'}}>No data</p></div>;

  const pendingTasks=tasks.filter(t=>t.status!=='done');
  const doneTasks=tasks.filter(t=>t.status==='done');
  const mrrData=(s.mrr_chart||[]).map((d:any)=>d.mrr);

  return (
    <div style={{minHeight:'100vh',background:'#0a0a12',color:'white',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>
      {addTask&&<AddTaskModal onAdd={createTask} onClose={()=>setAddTask(false)}/>}

      {/* Header */}
      <div style={{borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'14px 28px',display:'flex',alignItems:'center',gap:12,position:'sticky',top:0,background:'rgba(10,10,18,0.95)',zIndex:30,backdropFilter:'blur(12px)'}}>
        <div style={{width:32,height:32,borderRadius:9,background:'#C1272D',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <span style={{fontWeight:900,color:'white',fontSize:'0.9rem'}}>D</span>
        </div>
        <span style={{fontWeight:800,fontSize:'1rem',color:'white',letterSpacing:'-0.02em'}}>SnapHub<span style={{color:'#C1272D'}}>Trade.com</span> <span style={{color:'rgba(255,255,255,0.3)',fontWeight:400}}>Revenue OS</span></span>
        <div style={{display:'flex',gap:2,marginLeft:20}}>
          {[{href:'/admin',label:'Overview'},{href:'/admin/executive',label:'Executive',active:true},{href:'/admin/market-analytics',label:'Market'},{href:'/admin/market-analysis',label:'AI Insights'},{href:'/admin/email',label:'Email'},{href:'/admin/crm',label:'CRM'},{href:'/admin/pipeline',label:'Pipeline'},{href:'/admin/marketing',label:'Marketing'},{href:'/admin/push',label:'Push'},{href:'/admin/affiliates',label:'Affiliates'}].map(l=>(
            <a key={l.href} href={l.href} style={{padding:'5px 12px',borderRadius:8,fontSize:'0.8rem',fontWeight:600,textDecoration:'none',color:(l as any).active?'white':'rgba(255,255,255,0.4)',background:(l as any).active?'rgba(255,255,255,0.1)':'transparent'}}>{l.label}</a>
          ))}
        </div>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10}}>
          {lastFetch&&<span style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.25)'}}>Updated {lastFetch.toLocaleTimeString()}</span>}
          <button onClick={load} style={{padding:'7px 12px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'transparent',color:'rgba(255,255,255,0.5)',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:'0.78rem'}}>
            <RefreshCw size={12}/> Refresh
          </button>
        </div>
      </div>

      <div style={{maxWidth:1440,margin:'0 auto',padding:'28px 24px'}} className="da-content-pad">

        {/* Hero */}
        <div style={{background:'linear-gradient(135deg,rgba(193,39,45,0.12) 0%,rgba(10,10,18,0) 60%)',border:'1px solid rgba(193,39,45,0.2)',borderRadius:20,padding:'28px 32px',marginBottom:24,display:'flex',alignItems:'center',gap:32,flexWrap:'wrap'}}>
          <div>
            <p style={{fontSize:'0.7rem',fontWeight:700,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.1em',margin:'0 0 6px'}}>Startup Health Score</p>
            <HealthGauge score={s.health_score?.total||0} grade={s.health_score?.grade||'good'}/>
          </div>
          <div style={{flex:1,minWidth:220}}>
            <p style={{fontSize:'1.4rem',fontWeight:900,color:'white',margin:'0 0 8px',letterSpacing:'-0.02em'}}>{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {Object.entries(s.health_score?.components||{}).map(([k,v]:any)=>(
                <div key={k} style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{width:110,fontSize:'0.7rem',color:'rgba(255,255,255,0.35)',textTransform:'capitalize'}}>{k.replace('_',' ')}</span>
                  <div style={{flex:1,height:4,background:'rgba(255,255,255,0.07)',borderRadius:2}}>
                    <div style={{width:`${v}%`,height:'100%',background:v>=70?'#34D399':v>=45?'#FBBF24':'#F87171',borderRadius:2,transition:'width 0.8s'}}/>
                  </div>
                  <span style={{width:28,fontSize:'0.7rem',color:'rgba(255,255,255,0.5)',textAlign:'right'}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {[
              {label:'Monthly Revenue',value:formatPrice(s.kpis?.total_revenue_month||0),color:'#34D399'},
              {label:'Active Dealers',value:(s.dealers?.active||0).toLocaleString(),color:'#60A5FA'},
              {label:'Live Vehicles',value:`${(s.vehicles?.available||0).toLocaleString()} avail. · ${(s.vehicles?.sold_total||0).toLocaleString()} sold`,color:'#FBBF24'},
              {label:'Total Leads',value:(s.leads?.total||0).toLocaleString(),color:'#A78BFA'},
            ].map(p=>(
              <div key={p.label} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 14px',border:`1px solid ${p.color}25`,borderRadius:10,background:`${p.color}08`}}>
                <span style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.4)',minWidth:100}}>{p.label}</span>
                <span style={{fontWeight:800,color:p.color,fontSize:'0.95rem'}}>{p.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        {(s.alerts||[]).length>0&&(
          <div style={{marginBottom:20}}>
            {(s.alerts||[]).map((a:any,i:number)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 16px',background:a.severity==='critical'?'rgba(248,113,113,0.08)':'rgba(251,191,36,0.06)',border:`1px solid ${a.severity==='critical'?'rgba(248,113,113,0.25)':'rgba(251,191,36,0.2)'}`,borderRadius:12,marginBottom:8}}>
                <AlertTriangle size={15} style={{color:a.severity==='critical'?'#F87171':'#FBBF24',flexShrink:0}}/>
                <span style={{flex:1,fontSize:'0.82rem',color:'rgba(255,255,255,0.8)',fontWeight:600}}>{a.msg}</span>
                <span style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.4)'}}>{a.action}</span>
                <span style={{fontSize:'0.62rem',fontWeight:700,padding:'2px 8px',borderRadius:20,background:a.severity==='critical'?'rgba(248,113,113,0.15)':'rgba(251,191,36,0.12)',color:a.severity==='critical'?'#F87171':'#FBBF24',flexShrink:0}}>{a.severity.toUpperCase()}</span>
              </div>
            ))}
          </div>
        )}

        {/* KPIs */}
        <div className="da-kpi-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
          <KpiTile label="MRR" value={formatPrice(s.kpis?.mrr_aed||0)} trend={pct(s.kpis?.mrr_growth_pct||0)} trendUp={(s.kpis?.mrr_growth_pct||0)>=0} spark={mrrData} color="#C1272D" icon={DollarSign}/>
          <KpiTile label="ARR" value={formatPrice(s.kpis?.arr_aed||0)} sub="Annualized" color="#34D399" icon={TrendingUp}/>
          <KpiTile label="Active Dealers" value={s.dealers?.active||0} trend={`+${s.dealers?.new_month||0} mo`} trendUp color="#60A5FA" icon={Users}/>
          <KpiTile label="Total Vehicles" value={(s.vehicles?.total||0).toLocaleString()} sub={`${s.vehicles?.available||0} live · ${s.vehicles?.sold_total||0} sold`} color="#FBBF24" icon={Car}/>
          <KpiTile label="Broker Revenue" value={formatPrice(s.kpis?.deals_revenue_month||0)} trend={pct(s.kpis?.deals_revenue_growth||0)} trendUp={(s.kpis?.deals_revenue_growth||0)>=0} sub={`${s.vehicles?.sold_total||0} total sales`} color="#A78BFA" icon={Activity}/>
          <KpiTile label="Subscriptions" value={s.kpis?.active_subscriptions||0} sub="paying" color="#F472B6" icon={Star}/>
          <KpiTile label="New Leads" value={s.leads?.new_month||0} sub={`${s.leads?.conversion_rate||0}% conv.`} color="#2DD4BF" icon={Target}/>
          <KpiTile label="Users" value={(s.users?.total||0).toLocaleString()} trend={`+${s.users?.new_month||0} mo`} trendUp color="#FB923C" icon={Users}/>
        </div>

        {/* Main content */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:20}}>
          <div style={{display:'flex',flexDirection:'column',gap:20}}>

            {/* Chart */}
            <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:18,overflow:'hidden'}}>
              <div style={{padding:'16px 22px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:10}}>
                <BarChart3 size={15} style={{color:'#C1272D'}}/>
                <p style={{fontWeight:700,color:'white',margin:0,fontSize:'0.9rem',flex:1}}>Growth Trends — Last 6 Months</p>
                <div style={{display:'flex',gap:4}}>
                  {[{k:'mrr' as const,l:'MRR'},{k:'dealers' as const,l:'Dealers'}].map(t=>(
                    <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:'4px 10px',borderRadius:7,border:'none',cursor:'pointer',fontSize:'0.72rem',fontWeight:700,background:tab===t.k?'rgba(193,39,45,0.3)':'transparent',color:tab===t.k?'#C1272D':'rgba(255,255,255,0.35)'}}>{t.l}</button>
                  ))}
                </div>
              </div>
              <div style={{padding:'20px 22px'}}>
                {tab==='mrr'?<MiniBarChart data={s.mrr_chart||[]} labelKey="month" valueKey="mrr" color="#C1272D"/>:<MiniBarChart data={s.dealer_chart||[]} labelKey="month" valueKey="dealers" color="#60A5FA"/>}
                <div style={{display:'flex',justifyContent:'space-between',marginTop:16,paddingTop:16,borderTop:'1px solid rgba(255,255,255,0.05)'}}>
                  {(tab==='mrr'?s.mrr_chart||[]:s.dealer_chart||[]).map((d:any,i:number,arr:any[])=>(
                    <div key={i} style={{textAlign:'center'}}>
                      <p style={{fontSize:'0.78rem',fontWeight:700,color:i===arr.length-1?'white':'rgba(255,255,255,0.5)',margin:0}}>
                        {tab==='mrr'?(d.mrr>=1000?`${Math.round(d.mrr/1000)}K`:d.mrr||'—'):d.dealers}
                      </p>
                      <p style={{fontSize:'0.62rem',color:'rgba(255,255,255,0.25)',margin:'2px 0 0'}}>{d.month}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Copilot */}
            <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:18,overflow:'hidden'}}>
              <div style={{padding:'16px 22px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:10}}>
                <Brain size={15} style={{color:'#A78BFA'}}/>
                <p style={{fontWeight:700,color:'white',margin:0,fontSize:'0.9rem',flex:1}}>AI Growth Copilot</p>
                <span style={{fontSize:'0.68rem',padding:'3px 9px',background:'rgba(167,139,250,0.15)',color:'#A78BFA',borderRadius:20,fontWeight:700}}>LIVE</span>
              </div>
              <div style={{padding:'14px 20px',display:'flex',flexDirection:'column',gap:10}}>
                {(s.ai_recommendations||[]).map((r:any,i:number)=>{
                  const pc=PRIORITY_CFG[r.priority]||PRIORITY_CFG.medium;
                  return (
                    <div key={i} style={{padding:'14px 16px',background:pc.bg,border:`1px solid ${pc.color}30`,borderRadius:13}}>
                      <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:6}}>
                        <span style={{fontSize:'1rem',flexShrink:0}}>{TYPE_EMOJI[r.type]||'💡'}</span>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3}}>
                            <p style={{fontWeight:800,color:'white',margin:0,fontSize:'0.875rem'}}>{r.title}</p>
                            <span style={{fontSize:'0.62rem',padding:'1px 7px',borderRadius:20,background:`${pc.color}20`,color:pc.color,fontWeight:700,flexShrink:0}}>{r.priority?.toUpperCase()}</span>
                          </div>
                          <p style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.5)',margin:0,lineHeight:1.4}}>{r.insight}</p>
                        </div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                        <span style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.75)',fontWeight:500}}>→ {r.action}</span>
                        <div style={{marginLeft:'auto',display:'flex',gap:6}}>
                          <span style={{fontSize:'0.65rem',padding:'2px 7px',borderRadius:20,background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.35)'}}>{r.impact}</span>
                          <span style={{fontSize:'0.65rem',padding:'2px 7px',borderRadius:20,background:`${EFFORT_COLOR[r.effort]||'#60A5FA'}15`,color:EFFORT_COLOR[r.effort]||'#60A5FA'}}>effort: {r.effort}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{display:'flex',flexDirection:'column',gap:16}}>

            {/* Tasks */}
            <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:18,overflow:'hidden'}}>
              <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:8}}>
                <CheckCircle2 size={14} style={{color:'#34D399'}}/>
                <p style={{fontWeight:700,color:'white',margin:0,fontSize:'0.875rem',flex:1}}>Tasks <span style={{color:'rgba(255,255,255,0.3)',fontWeight:400}}>({pendingTasks.length})</span></p>
                <button onClick={()=>setAddTask(true)} style={{padding:'5px 10px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,background:'transparent',color:'rgba(255,255,255,0.5)',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:'0.72rem'}}>
                  <Plus size={11}/> Add
                </button>
              </div>
              <div style={{padding:'8px 18px',maxHeight:300,overflowY:'auto'}}>
                {pendingTasks.length===0&&<p style={{color:'rgba(255,255,255,0.2)',fontSize:'0.82rem',textAlign:'center',padding:'20px 0'}}>All done! 🎉</p>}
                {pendingTasks.map(t=><TaskItem key={t.id} task={t} onToggle={()=>toggleTask(t)}/>)}
                {doneTasks.length>0&&(
                  <details style={{marginTop:8}}>
                    <summary style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.25)',cursor:'pointer',padding:'6px 0',listStyle:'none'}}>{doneTasks.length} completed</summary>
                    {doneTasks.slice(0,5).map(t=><TaskItem key={t.id} task={t} onToggle={()=>toggleTask(t)}/>)}
                  </details>
                )}
              </div>
            </div>

            {/* Meetings */}
            <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:18,overflow:'hidden'}}>
              <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:8}}>
                <Calendar size={14} style={{color:'#60A5FA'}}/>
                <p style={{fontWeight:700,color:'white',margin:0,fontSize:'0.875rem',flex:1}}>Upcoming Meetings</p>
              </div>
              <div style={{padding:'10px 18px'}}>
                {!(s.meetings||[]).length?(
                  <div style={{textAlign:'center',padding:'20px 0'}}>
                    <p style={{color:'rgba(255,255,255,0.2)',fontSize:'0.82rem',margin:0}}>No meetings scheduled</p>
                  </div>
                ):(s.meetings||[]).map((m:any)=>{
                  const dt=new Date(m.date);
                  const TC: Record<string,string>={investor:'#A78BFA',dealer:'#60A5FA',partner:'#34D399',internal:'rgba(255,255,255,0.3)'};
                  return (
                    <div key={m.id} style={{display:'flex',gap:10,padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                      <div style={{width:38,height:38,borderRadius:9,background:'rgba(255,255,255,0.05)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <span style={{fontSize:'0.85rem',fontWeight:900,color:'white',lineHeight:1}}>{dt.getDate()}</span>
                        <span style={{fontSize:'0.55rem',color:'rgba(255,255,255,0.35)',textTransform:'uppercase'}}>{dt.toLocaleString('en-US',{month:'short'})}</span>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontWeight:700,color:'white',margin:0,fontSize:'0.82rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.title}</p>
                        <p style={{color:'rgba(255,255,255,0.35)',margin:0,fontSize:'0.72rem'}}>{dt.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})} · {m.duration_min}min</p>
                      </div>
                      <span style={{fontSize:'0.62rem',padding:'2px 7px',borderRadius:20,background:'rgba(255,255,255,0.05)',color:TC[m.type]||'rgba(255,255,255,0.3)',fontWeight:700,flexShrink:0,height:'fit-content',marginTop:4}}>{m.type}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Investor KPIs */}
            <div style={{background:'linear-gradient(135deg,rgba(167,139,250,0.08),rgba(10,10,18,0))',border:'1px solid rgba(167,139,250,0.15)',borderRadius:18,padding:'16px 18px'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
                <Flame size={14} style={{color:'#A78BFA'}}/>
                <p style={{fontWeight:700,color:'white',margin:0,fontSize:'0.875rem'}}>Investor KPIs</p>
              </div>
              {[
                {label:'MRR',value:formatPrice(s.kpis?.mrr_aed||0),good:(s.kpis?.mrr_growth_pct||0)>=0},
                {label:'ARR',value:formatPrice(s.kpis?.arr_aed||0),good:true},
                {label:'Active Dealers',value:s.dealers?.active||0,good:(s.dealers?.new_month||0)>0},
                {label:'Vehicles Sold',value:(s.vehicles?.sold_total||0).toLocaleString(),good:(s.vehicles?.sold_total||0)>0},
                {label:'Broker Deals',value:(s.kpis?.deals_this_month||0).toString()+' this mo.',good:(s.kpis?.deals_this_month||0)>0},
                {label:'Lead Conv. Rate',value:`${s.leads?.conversion_rate||0}%`,good:(s.leads?.conversion_rate||0)>=10},
                {label:'Vehicles GMV',value:formatPrice(s.vehicles?.total_value_aed||0),good:true},
                {label:'Health Score',value:`${s.health_score?.total||0}/100`,good:(s.health_score?.total||0)>=60},
              ].map(k=>(
                <div key={k.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                  <span style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.4)'}}>{k.label}</span>
                  <span style={{fontSize:'0.82rem',fontWeight:800,color:k.good?'white':'#F87171'}}>{k.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>
    </div>
  );
}
