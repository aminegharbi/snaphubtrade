'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, RefreshCw, TrendingUp, DollarSign, Target, Trophy, AlertTriangle } from 'lucide-react';
import { fetchOrThrow } from '@/lib/api';
import { usePriceFormatter } from '@/components/common/Price';

const STAGES = [
  { key:'lead',           label:'Lead',            prob:10,  color:'#6B7280' },
  { key:'qualified',      label:'Qualified',       prob:25,  color:'#60A5FA' },
  { key:'demo_scheduled', label:'Demo Scheduled',  prob:40,  color:'#A78BFA' },
  { key:'demo_completed', label:'Demo Completed',  prob:60,  color:'#FBBF24' },
  { key:'negotiation',    label:'Negotiation',     prob:75,  color:'#FB923C' },
  { key:'trial',          label:'Trial',           prob:85,  color:'#34D399' },
  { key:'won',            label:'Won',             prob:100, color:'#10B981' },
  { key:'lost',           label:'Lost',            prob:0,   color:'#F87171' },
];


function AddDealModal({ onAdd, onClose }: { onAdd:(d:any)=>void; onClose:()=>void }) {
  const [form,setForm] = useState({title:'',contact_name:'',value_aed:'',stage:'lead',expected_close:'',owner:'',plan_interest:''});
  const [contacts,setContacts] = useState<any[]>([]);
  const [contactId,setContactId] = useState('');
  const [search,setSearch] = useState('');

  useEffect(()=>{
    if(search.length>1) fetch(`/api/v1/crm/contacts?search=${encodeURIComponent(search)}&limit=8`).then(r=>r.json()).then(d=>setContacts(d.items||[]));
  },[search]);

  const submit = async () => {
    if (!form.title.trim()) return;
    let cid = contactId;
    if (!cid && form.contact_name) {
      const res = await fetch('/api/v1/crm/contacts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({full_name:form.contact_name,type:'prospect',status:'new'})});
      const c = await res.json();
      cid = c.id;
    }
    if (!cid) return;
    const res = await fetch('/api/v1/crm/deals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,contact_id:cid,value_aed:+form.value_aed||0})});
    onAdd(await res.json()); onClose();
  };

  const I: React.CSSProperties = {width:'100%',padding:'9px 12px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'rgba(255,255,255,0.06)',color:'white',fontSize:'0.875rem',outline:'none',boxSizing:'border-box' as any};
  return (
    <div style={{position:'fixed',inset:0,zIndex:60,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#1a1a2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:18,width:'100%',maxWidth:480,padding:26}}>
        <p style={{fontWeight:800,color:'white',margin:'0 0 18px',fontSize:'1rem'}}>Add Deal</p>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <input style={I} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Deal title *" autoFocus/>
          <div style={{position:'relative'}}>
            <input style={I} value={contactId?contacts.find(c=>c.id===contactId)?.full_name||'':search} onChange={e=>{setSearch(e.target.value);setContactId('');}} placeholder="Search or create contact *"/>
            {contacts.length>0&&!contactId&&(
              <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#1a1a2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,zIndex:10,maxHeight:180,overflowY:'auto'}}>
                {contacts.map(c=><button key={c.id} onClick={()=>{setContactId(c.id);setContacts([]);}} style={{display:'block',width:'100%',padding:'9px 14px',background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.7)',textAlign:'left',fontSize:'0.82rem',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>{c.full_name} {c.company?`· ${c.company}`:''}</button>)}
                {search.length>1&&<button onClick={()=>{setForm(p=>({...p,contact_name:search}));setContacts([]);}} style={{display:'block',width:'100%',padding:'9px 14px',background:'none',border:'none',cursor:'pointer',color:'#C1272D',textAlign:'left',fontSize:'0.82rem',fontWeight:700}}>+ Create "{search}"</button>}
              </div>
            )}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <input type="number" style={I} value={form.value_aed} onChange={e=>setForm(p=>({...p,value_aed:e.target.value}))} placeholder="Value (AED)"/>
            <select style={{...I,color:'rgba(255,255,255,0.7)'}} value={form.stage} onChange={e=>setForm(p=>({...p,stage:e.target.value}))}>
              {STAGES.filter(s=>s.key!=='won'&&s.key!=='lost').map(s=><option key={s.key} value={s.key} style={{background:'#1a1a2e'}}>{s.label}</option>)}
            </select>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <input style={I} value={form.plan_interest} onChange={e=>setForm(p=>({...p,plan_interest:e.target.value}))} placeholder="Plan (Starter/Pro/Elite)"/>
            <input style={I} value={form.owner} onChange={e=>setForm(p=>({...p,owner:e.target.value}))} placeholder="Sales owner"/>
          </div>
          <input type="date" style={{...I,color:'rgba(255,255,255,0.6)'}} value={form.expected_close} onChange={e=>setForm(p=>({...p,expected_close:e.target.value}))}/>
        </div>
        <div style={{display:'flex',gap:10,marginTop:16}}>
          <button onClick={onClose} style={{flex:1,padding:'10px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'transparent',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'0.875rem'}}>Cancel</button>
          <button onClick={submit} disabled={!form.title.trim()||(!!contactId||form.contact_name.length>0?false:true)} style={{flex:2,padding:'10px',border:'none',borderRadius:9,background:'#C1272D',color:'white',cursor:'pointer',fontWeight:700,fontSize:'0.875rem'}}>Add Deal</button>
        </div>
      </div>
    </div>
  );
}

function DealCard({ deal, onMove }: { deal:any; onMove:(id:string,stage:string)=>void }) {
  const formatPrice = usePriceFormatter();
  const [hover,setHover] = useState(false);
  const [menuOpen,setMenuOpen] = useState(false);
  const nextStages = STAGES.filter(s=>s.key!==deal.stage).slice(0,4);

  return (
    <div
      draggable
      onDragStart={e=>e.dataTransfer.setData('dealId',deal.id)}
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>{setHover(false);setMenuOpen(false);}}
      style={{background:hover?'rgba(255,255,255,0.07)':'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'12px 14px',cursor:'grab',transition:'all 0.15s',marginBottom:8,position:'relative'}}>
      <p style={{fontWeight:700,color:'white',margin:'0 0 4px',fontSize:'0.82rem',lineHeight:1.3}}>{deal.title}</p>
      <p style={{color:'rgba(255,255,255,0.4)',margin:'0 0 8px',fontSize:'0.72rem'}}>{deal.contact?.full_name} {deal.contact?.company?`· ${deal.contact.company}`:''}</p>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontWeight:800,color:'#34D399',fontSize:'0.82rem'}}>{formatPrice(Number(deal.value_aed))}</span>
        <span style={{fontSize:'0.68rem',color:'rgba(255,255,255,0.35)'}}>{deal.probability_pct}% prob</span>
      </div>
      {deal.plan_interest&&<p style={{margin:'6px 0 0',fontSize:'0.68rem',color:'rgba(167,139,250,0.7)',fontWeight:600}}>{deal.plan_interest}</p>}
      {deal.owner&&<p style={{margin:'3px 0 0',fontSize:'0.68rem',color:'rgba(255,255,255,0.25)'}}>{deal.owner}</p>}
      {deal.expected_close&&(
        <p style={{margin:'4px 0 0',fontSize:'0.65rem',color:new Date(deal.expected_close)<new Date()?'#F87171':'rgba(255,255,255,0.25)'}}>
          📅 {new Date(deal.expected_close).toLocaleDateString()}
        </p>
      )}
      {/* Move menu */}
      {hover&&(
        <div style={{position:'absolute',top:10,right:10}}>
          <button onClick={()=>setMenuOpen(m=>!m)} style={{padding:'3px 7px',background:'rgba(255,255,255,0.1)',border:'none',borderRadius:6,cursor:'pointer',color:'rgba(255,255,255,0.5)',fontSize:'0.7rem',fontWeight:700}}>Move →</button>
          {menuOpen&&(
            <div style={{position:'absolute',right:0,top:'100%',marginTop:4,background:'#1a1a2e',border:'1px solid rgba(255,255,255,0.12)',borderRadius:10,zIndex:20,minWidth:140,overflow:'hidden'}}>
              {STAGES.filter(s=>s.key!==deal.stage).map(s=>(
                <button key={s.key} onClick={()=>{onMove(deal.id,s.key);setMenuOpen(false);}}
                  style={{display:'block',width:'100%',padding:'8px 14px',background:'none',border:'none',cursor:'pointer',textAlign:'left',fontSize:'0.75rem',color:s.color,fontWeight:600,borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PipelineColumn({ stage, deals, onDrop, onMove }: { stage:any; deals:any[]; onDrop:(stage:string,dealId:string)=>void; onMove:(id:string,stage:string)=>void }) {
  const formatPrice = usePriceFormatter();
  const [dragOver,setDragOver] = useState(false);
  const total   = deals.reduce((s,d)=>s+Number(d.value_aed),0);
  const weighted = deals.reduce((s,d)=>s+Number(d.value_aed)*(d.probability_pct/100),0);

  return (
    <div
      onDragOver={e=>{e.preventDefault();setDragOver(true);}}
      onDragLeave={()=>setDragOver(false)}
      onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData('dealId');if(id)onDrop(stage.key,id);setDragOver(false);}}
      style={{width:230,flexShrink:0,display:'flex',flexDirection:'column',background:dragOver?'rgba(255,255,255,0.05)':'rgba(255,255,255,0.02)',border:`1px solid ${dragOver?stage.color+'40':'rgba(255,255,255,0.06)'}`,borderRadius:16,overflow:'hidden',transition:'all 0.15s'}}>
      {/* Column header */}
      <div style={{padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(255,255,255,0.03)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
          <div style={{display:'flex',alignItems:'center',gap:7}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:stage.color}}/>
            <span style={{fontWeight:700,color:'white',fontSize:'0.8rem'}}>{stage.label}</span>
          </div>
          <span style={{fontSize:'0.75rem',fontWeight:800,color:'rgba(255,255,255,0.4)',background:'rgba(255,255,255,0.08)',padding:'2px 8px',borderRadius:20}}>{deals.length}</span>
        </div>
        <p style={{fontSize:'0.7rem',color:stage.color,fontWeight:700,margin:0}}>{total>0?formatPrice(total):'—'}</p>
        {weighted>0&&total>0&&<p style={{fontSize:'0.65rem',color:'rgba(255,255,255,0.25)',margin:'2px 0 0'}}>Weighted: {formatPrice(weighted)}</p>}
      </div>
      {/* Cards */}
      <div style={{flex:1,overflowY:'auto',padding:'10px',maxHeight:560}}>
        {deals.map(d=><DealCard key={d.id} deal={d} onMove={onMove}/>)}
        {deals.length===0&&<p style={{textAlign:'center',color:'rgba(255,255,255,0.15)',fontSize:'0.75rem',padding:'20px 0',margin:0}}>Drop deals here</p>}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const formatPrice = usePriceFormatter();
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [deals,setDeals]               = useState<any[]>([]);
  const [loading,setLoading]           = useState(true);
  const [error,setError]               = useState<string|null>(null);
  const [showAdd,setShowAdd]           = useState(false);

  const load = useCallback(async()=>{
    try {
      const [p,d] = await Promise.all([
        fetchOrThrow('/api/v1/crm/pipeline'),
        fetchOrThrow('/api/v1/crm/deals'),
      ]);
      setPipelineData(p); setDeals(Array.isArray(d)?d:[]); setError(null);
    } catch (e:any) {
      setError(e.message || 'Failed to load pipeline data');
    } finally {
      setLoading(false);
    }
  },[]);

  useEffect(()=>{ load(); },[load]);

  const moveDeal = async (dealId: string, newStage: string) => {
    setDeals(ds=>ds.map(d=>d.id===dealId?{...d,stage:newStage}:d));
    await fetch(`/api/v1/crm/deals/${dealId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({stage:newStage})});
    load();
  };

  const onDrop = (stage: string, dealId: string) => moveDeal(dealId, stage);

  if(loading) return (
    <div style={{minHeight:'100vh',background:'#0a0a12',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}>
      <RefreshCw size={20} style={{color:'#C1272D',animation:'spin 1s linear infinite'}}/>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if(error) return (
    <div style={{minHeight:'100vh',background:'#0a0a12',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,padding:24,textAlign:'center'}}>
      <AlertTriangle size={26} style={{color:'#F87171'}}/>
      <p style={{color:'white',fontWeight:700,margin:0}}>Couldn't load pipeline data</p>
      <p style={{color:'rgba(255,255,255,0.5)',fontSize:'0.85rem',margin:0,maxWidth:400}}>{error}</p>
      <button onClick={()=>{setLoading(true);setError(null);load();}}
        style={{marginTop:6,padding:'8px 18px',borderRadius:9,border:'1px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.05)',color:'white',fontSize:'0.82rem',fontWeight:700,cursor:'pointer'}}>
        Retry
      </button>
    </div>
  );

  const p = pipelineData;

  return (
    <div style={{minHeight:'100vh',background:'#0a0a12',color:'white',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',display:'flex',flexDirection:'column'}}>
      {showAdd&&<AddDealModal onAdd={d=>{setDeals(ds=>[d,...ds]);setShowAdd(false);load();}} onClose={()=>setShowAdd(false)}/>}

      {/* Header */}
      <div style={{borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'13px 24px',display:'flex',alignItems:'center',gap:12,background:'rgba(10,10,18,0.95)',backdropFilter:'blur(12px)',flexShrink:0}}>
        <Link href="/admin/crm" style={{display:'flex',alignItems:'center',gap:5,color:'rgba(255,255,255,0.4)',textDecoration:'none',fontSize:'0.82rem'}}><ArrowLeft size={14}/> CRM</Link>
        <span style={{color:'rgba(255,255,255,0.15)'}}>·</span>
        <span style={{fontWeight:700,color:'white',fontSize:'0.9rem',display:'flex',alignItems:'center',gap:6}}><TrendingUp size={14} style={{color:'#C1272D'}}/> Sales Pipeline</span>

        {/* Forecast strip */}
        <div style={{display:'flex',gap:20,marginLeft:20,flexWrap:'wrap'}}>
          {[
            {l:'Total pipeline',v:formatPrice(p?.total_pipeline_aed||0),c:'white'},
            {l:'Weighted forecast',v:formatPrice(p?.weighted_forecast_aed||0),c:'#34D399'},
            {l:'Won this month',v:`${p?.won_this_month||0} deals · ${formatPrice(p?.won_value_this_month_aed||0)}`,c:'#10B981'},
            {l:'Closing this month',v:`${p?.closing_this_month||0} deals`,c:'#FBBF24'},
          ].map(k=>(
            <div key={k.l} style={{textAlign:'center'}}>
              <p style={{fontSize:'0.62rem',color:'rgba(255,255,255,0.3)',margin:0,textTransform:'uppercase',letterSpacing:'0.04em'}}>{k.l}</p>
              <p style={{fontWeight:800,color:k.c,margin:0,fontSize:'0.85rem'}}>{k.v}</p>
            </div>
          ))}
        </div>

        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          <button onClick={load} style={{padding:'8px 12px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'transparent',color:'rgba(255,255,255,0.4)',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:'0.78rem'}}>
            <RefreshCw size={12}/> Refresh
          </button>
          <button onClick={()=>setShowAdd(true)} style={{display:'flex',alignItems:'center',gap:7,padding:'8px 18px',background:'#C1272D',color:'white',border:'none',borderRadius:9,cursor:'pointer',fontWeight:700,fontSize:'0.875rem'}}>
            <Plus size={14}/> Add Deal
          </button>
        </div>
      </div>

      {/* Kanban board */}
      <div style={{flex:1,overflowX:'auto',padding:'20px 24px'}}>
        <div style={{display:'flex',gap:12,alignItems:'flex-start',minWidth:'max-content'}}>
          {STAGES.map(stage=>(
            <PipelineColumn
              key={stage.key}
              stage={stage}
              deals={deals.filter(d=>d.stage===stage.key)}
              onDrop={onDrop}
              onMove={moveDeal}
            />
          ))}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}*{box-sizing:border-box} ::-webkit-scrollbar{height:6px;width:6px} ::-webkit-scrollbar-track{background:rgba(255,255,255,0.03)} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}`}</style>
    </div>
  );
}
