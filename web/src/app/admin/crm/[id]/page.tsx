'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Phone, Mail, Globe, MapPin, Star, Plus, Check, RefreshCw, MessageCircle, Calendar, FileText, TrendingUp, Brain, Clock, ChevronDown, Trash2, Building2 } from 'lucide-react';
import Link from 'next/link';
import { usePriceFormatter } from '@/components/common/Price';

const TYPE_CFG: Record<string,{label:string;color:string;bg:string}> = {
  lead:     {label:'Lead',      color:'#9CA3AF', bg:'rgba(156,163,175,0.12)'},
  prospect: {label:'Prospect',  color:'#60A5FA', bg:'rgba(96,165,250,0.12)'},
  dealer:   {label:'Dealer',    color:'#C1272D', bg:'rgba(193,39,45,0.12)'},
  broker:   {label:'Broker',    color:'#A78BFA', bg:'rgba(167,139,250,0.12)'},
  buyer:    {label:'Buyer',     color:'#34D399', bg:'rgba(52,211,153,0.12)'},
  partner:  {label:'Partner',   color:'#FBBF24', bg:'rgba(251,191,36,0.12)'},
};

const ACTIVITY_CFG: Record<string,{icon:string;color:string;label:string}> = {
  call:      {icon:'📞', color:'#34D399', label:'Call'},
  meeting:   {icon:'📅', color:'#60A5FA', label:'Meeting'},
  email:     {icon:'✉️', color:'#A78BFA', label:'Email'},
  note:      {icon:'📝', color:'#FBBF24', label:'Note'},
  task:      {icon:'✅', color:'#FB923C', label:'Task'},
  whatsapp:  {icon:'💬', color:'#25D366', label:'WhatsApp'},
  demo:      {icon:'🖥️', color:'#C1272D', label:'Demo'},
};

const STAGE_CFG: Record<string,{label:string;color:string}> = {
  lead:           {label:'Lead',           color:'#6B7280'},
  qualified:      {label:'Qualified',      color:'#60A5FA'},
  demo_scheduled: {label:'Demo Scheduled', color:'#A78BFA'},
  demo_completed: {label:'Demo Completed', color:'#FBBF24'},
  negotiation:    {label:'Negotiation',    color:'#FB923C'},
  trial:          {label:'Trial',          color:'#34D399'},
  won:            {label:'Won ✓',          color:'#10B981'},
  lost:           {label:'Lost',           color:'#F87171'},
};

function AddActivityModal({ contactId, onAdd, onClose }: { contactId:string; onAdd:(a:any)=>void; onClose:()=>void }) {
  const [form,setForm] = useState({type:'note',title:'',body:'',direction:'outbound',outcome:'',duration_min:''});
  const I: React.CSSProperties = {width:'100%',padding:'9px 12px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'rgba(255,255,255,0.06)',color:'white',fontSize:'0.875rem',outline:'none',boxSizing:'border-box' as any};
  const submit = async () => {
    if (!form.title.trim()) return;
    const res = await fetch(`/api/v1/crm/contacts/${contactId}/activities`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,duration_min:form.duration_min?+form.duration_min:undefined})});
    onAdd(await res.json()); onClose();
  };
  return (
    <div style={{position:'fixed',inset:0,zIndex:60,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#1a1a2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:18,width:'100%',maxWidth:480,padding:26}}>
        <p style={{fontWeight:800,color:'white',margin:'0 0 18px',fontSize:'1rem'}}>Log Activity</p>
        <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap' as any}}>
          {Object.entries(ACTIVITY_CFG).map(([k,v])=>(
            <button key={k} onClick={()=>setForm(p=>({...p,type:k}))}
              style={{padding:'6px 12px',borderRadius:20,border:'1px solid',borderColor:form.type===k?v.color:'rgba(255,255,255,0.1)',background:form.type===k?v.color+'20':'transparent',color:form.type===k?v.color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'0.75rem',fontWeight:700}}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <input style={I} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Activity title *" autoFocus/>
          <textarea style={{...I,minHeight:70,resize:'vertical' as any}} value={form.body} onChange={e=>setForm(p=>({...p,body:e.target.value}))} placeholder="Notes, summary…"/>
          {['call','meeting'].includes(form.type)&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <select style={{...I,color:'rgba(255,255,255,0.7)'}} value={form.outcome} onChange={e=>setForm(p=>({...p,outcome:e.target.value}))}>
                <option value="" style={{background:'#1a1a2e'}}>Outcome…</option>
                {['answered','voicemail','no_answer','positive','negative','scheduled'].map(o=><option key={o} value={o} style={{background:'#1a1a2e'}}>{o}</option>)}
              </select>
              <input type="number" style={I} value={form.duration_min} onChange={e=>setForm(p=>({...p,duration_min:e.target.value}))} placeholder="Duration (min)"/>
            </div>
          )}
        </div>
        <div style={{display:'flex',gap:10,marginTop:16}}>
          <button onClick={onClose} style={{flex:1,padding:'10px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'transparent',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'0.875rem'}}>Cancel</button>
          <button onClick={submit} disabled={!form.title.trim()} style={{flex:2,padding:'10px',border:'none',borderRadius:9,background:'#C1272D',color:'white',cursor:'pointer',fontWeight:700,fontSize:'0.875rem'}}>Log Activity</button>
        </div>
      </div>
    </div>
  );
}

function AddDealModal({ contactId, onAdd, onClose }: { contactId:string; onAdd:(d:any)=>void; onClose:()=>void }) {
  const [form,setForm] = useState({title:'',value_aed:'',stage:'lead',expected_close:'',owner:'',plan_interest:'',notes:''});
  const I: React.CSSProperties = {width:'100%',padding:'9px 12px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'rgba(255,255,255,0.06)',color:'white',fontSize:'0.875rem',outline:'none',boxSizing:'border-box' as any};
  const submit = async () => {
    if (!form.title.trim()) return;
    const res = await fetch('/api/v1/crm/deals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,contact_id:contactId,value_aed:+form.value_aed||0})});
    onAdd(await res.json()); onClose();
  };
  return (
    <div style={{position:'fixed',inset:0,zIndex:60,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#1a1a2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:18,width:'100%',maxWidth:460,padding:26}}>
        <p style={{fontWeight:800,color:'white',margin:'0 0 18px',fontSize:'1rem'}}>Add Deal</p>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <input style={I} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Deal title *" autoFocus/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <input type="number" style={I} value={form.value_aed} onChange={e=>setForm(p=>({...p,value_aed:e.target.value}))} placeholder="Value (AED)"/>
            <select style={{...I,color:'rgba(255,255,255,0.7)'}} value={form.stage} onChange={e=>setForm(p=>({...p,stage:e.target.value}))}>
              {Object.entries(STAGE_CFG).map(([k,v])=><option key={k} value={k} style={{background:'#1a1a2e'}}>{v.label}</option>)}
            </select>
          </div>
          <input style={I} value={form.plan_interest} onChange={e=>setForm(p=>({...p,plan_interest:e.target.value}))} placeholder="Plan interest (Starter / Pro / Elite…)"/>
          <input style={I} value={form.owner} onChange={e=>setForm(p=>({...p,owner:e.target.value}))} placeholder="Sales owner"/>
          <input type="date" style={{...I,color:'rgba(255,255,255,0.6)'}} value={form.expected_close} onChange={e=>setForm(p=>({...p,expected_close:e.target.value}))}/>
          <textarea style={{...I,minHeight:60,resize:'vertical' as any}} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Notes…"/>
        </div>
        <div style={{display:'flex',gap:10,marginTop:16}}>
          <button onClick={onClose} style={{flex:1,padding:'10px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'transparent',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'0.875rem'}}>Cancel</button>
          <button onClick={submit} disabled={!form.title.trim()} style={{flex:2,padding:'10px',border:'none',borderRadius:9,background:'#C1272D',color:'white',cursor:'pointer',fontWeight:700,fontSize:'0.875rem'}}>Create Deal</button>
        </div>
      </div>
    </div>
  );
}

export default function ContactDetail() {
  const formatPrice = usePriceFormatter();
  const params = useParams();
  const id = params.id as string;
  const [contact,setContact] = useState<any>(null);
  const [insights,setInsights] = useState<any[]>([]);
  const [loading,setLoading]   = useState(true);
  const [tab,setTab]           = useState<'overview'|'activities'|'deals'>('overview');
  const [showAddActivity,setShowAddActivity] = useState(false);
  const [showAddDeal,setShowAddDeal]         = useState(false);
  const [editField,setEditField]             = useState<string|null>(null);
  const [editVal,setEditVal]                 = useState('');

  useEffect(()=>{
    fetch(`/api/v1/crm/contacts/${id}`).then(r=>r.json()).then(c=>{setContact(c);setLoading(false);});
    fetch(`/api/v1/crm/contacts/${id}/insights`).then(r=>r.json()).then(setInsights).catch(()=>{});
  },[id]);

  const save = async (field: string, val: any) => {
    const updated = await fetch(`/api/v1/crm/contacts/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({[field]:val})}).then(r=>r.json());
    setContact((c:any)=>({...c,[field]:val}));
    setEditField(null);
  };

  const toggleActivity = async (actId: string, done: boolean) => {
    await fetch(`/api/v1/crm/activities/${actId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({completed:done})});
    setContact((c:any)=>({...c,activities:c.activities.map((a:any)=>a.id===actId?{...a,completed:done}:a)}));
  };

  if (loading) return <div style={{minHeight:'100vh',background:'#0a0a12',display:'flex',alignItems:'center',justifyContent:'center'}}><RefreshCw size={20} style={{color:'#C1272D',animation:'spin 1s linear infinite'}}/><style>{'@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}'}</style></div>;
  if (!contact) return <div style={{minHeight:'100vh',background:'#0a0a12',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,0.3)'}}>Contact not found</div>;

  const tc = TYPE_CFG[contact.type]||TYPE_CFG.lead;
  const scoreColor = contact.score>=70?'#34D399':contact.score>=40?'#FBBF24':'#F87171';

  const Editable = ({field,label,value}:{field:string;label:string;value:string}) => (
    <div>
      <p style={{fontSize:'0.65rem',fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.05em',margin:'0 0 3px'}}>{label}</p>
      {editField===field?(
        <div style={{display:'flex',gap:6}}>
          <input autoFocus style={{flex:1,padding:'6px 10px',border:'1px solid #C1272D',borderRadius:7,background:'rgba(255,255,255,0.06)',color:'white',fontSize:'0.82rem',outline:'none'}} value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&save(field,editVal)}/>
          <button onClick={()=>save(field,editVal)} style={{padding:'5px 10px',border:'none',borderRadius:7,background:'#C1272D',color:'white',cursor:'pointer',fontSize:'0.78rem'}}>✓</button>
          <button onClick={()=>setEditField(null)} style={{padding:'5px 8px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:7,background:'transparent',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'0.78rem'}}>✕</button>
        </div>
      ):(
        <p onClick={()=>{setEditField(field);setEditVal(value||'');}} style={{fontSize:'0.875rem',color:value?'rgba(255,255,255,0.8)':'rgba(255,255,255,0.2)',margin:0,cursor:'pointer',padding:'4px 6px',borderRadius:6,border:'1px solid transparent',transition:'all 0.15s'}}>{value||'Click to edit…'}</p>
      )}
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#0a0a12',color:'white',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>
      {showAddActivity&&<AddActivityModal contactId={id} onAdd={a=>{setContact((c:any)=>({...c,activities:[a,...c.activities]}));setShowAddActivity(false);}} onClose={()=>setShowAddActivity(false)}/>}
      {showAddDeal&&<AddDealModal contactId={id} onAdd={d=>{setContact((c:any)=>({...c,deals:[d,...c.deals]}));setShowAddDeal(false);}} onClose={()=>setShowAddDeal(false)}/>}

      {/* Header */}
      <div style={{borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'13px 24px',display:'flex',alignItems:'center',gap:12,background:'rgba(10,10,18,0.95)',backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:30}}>
        <Link href="/admin/crm" style={{display:'flex',alignItems:'center',gap:5,color:'rgba(255,255,255,0.4)',textDecoration:'none',fontSize:'0.82rem'}}><ArrowLeft size={14}/> CRM</Link>
        <span style={{color:'rgba(255,255,255,0.15)'}}>·</span>
        <p style={{fontWeight:700,color:'white',margin:0,flex:1}}>{contact.full_name}</p>
        <span style={{padding:'4px 10px',borderRadius:20,fontSize:'0.7rem',fontWeight:700,background:tc.bg,color:tc.color}}>{tc.label}</span>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setShowAddActivity(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'transparent',color:'rgba(255,255,255,0.6)',cursor:'pointer',fontSize:'0.8rem',fontWeight:600}}>
            <Plus size={13}/> Log Activity
          </button>
          <button onClick={()=>setShowAddDeal(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'#C1272D',color:'white',border:'none',borderRadius:9,cursor:'pointer',fontSize:'0.8rem',fontWeight:700}}>
            <TrendingUp size={13}/> Add Deal
          </button>
        </div>
      </div>

      <div style={{maxWidth:1200,margin:'0 auto',padding:'24px',display:'grid',gridTemplateColumns:'300px 1fr',gap:20}}>
        {/* Left: contact info */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {/* Avatar + score */}
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:20,textAlign:'center'}}>
            <div style={{width:64,height:64,borderRadius:16,background:tc.bg,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:'1.5rem',fontWeight:900,color:tc.color}}>
              {contact.full_name.charAt(0).toUpperCase()}
            </div>
            <p style={{fontWeight:800,color:'white',margin:'0 0 4px',fontSize:'1rem'}}>{contact.full_name}</p>
            {contact.company&&<p style={{color:'rgba(255,255,255,0.4)',margin:'0 0 12px',fontSize:'0.82rem'}}>{contact.company}</p>}
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:14}}>
              <span style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.35)'}}>Score</span>
              <span style={{fontWeight:900,fontSize:'1.2rem',color:scoreColor}}>{contact.score}</span>
              <span style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.2)'}}>/100</span>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'center'}}>
              {contact.email&&<a href={`mailto:${contact.email}`} style={{display:'flex',alignItems:'center',gap:4,padding:'7px 12px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,color:'rgba(255,255,255,0.5)',textDecoration:'none',fontSize:'0.75rem'}}><Mail size={12}/> Email</a>}
              {contact.phone&&<a href={`https://wa.me/${contact.phone.replace(/[^0-9]/g,'')}`} target="_blank" style={{display:'flex',alignItems:'center',gap:4,padding:'7px 12px',border:'1px solid rgba(37,211,102,0.3)',borderRadius:9,color:'#25D366',textDecoration:'none',fontSize:'0.75rem'}}><MessageCircle size={12}/> WA</a>}
            </div>
          </div>

          {/* Details */}
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:'16px'}}>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <Editable field="email"    label="Email"    value={contact.email||''} />
              <Editable field="phone"    label="Phone"    value={contact.phone||''} />
              <Editable field="company"  label="Company"  value={contact.company||''} />
              <Editable field="country"  label="Country"  value={contact.country||''} />
              <Editable field="city"     label="City"     value={contact.city||''} />
              <Editable field="owner"    label="Owner"    value={contact.owner||''} />
              <div>
                <p style={{fontSize:'0.65rem',fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.05em',margin:'0 0 3px'}}>Source</p>
                <p style={{fontSize:'0.875rem',color:'rgba(255,255,255,0.6)',margin:0}}>{contact.source||'—'}</p>
              </div>
              <div>
                <p style={{fontSize:'0.65rem',fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.05em',margin:'0 0 3px'}}>Status</p>
                <select value={contact.status} onChange={e=>save('status',e.target.value)} style={{padding:'6px 10px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:7,background:'rgba(255,255,255,0.06)',color:'white',fontSize:'0.82rem',outline:'none',width:'100%'}}>
                  {['new','active','qualified','unqualified','customer','churned'].map(s=><option key={s} value={s} style={{background:'#1a1a2e'}}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* AI Insights */}
          {insights.length>0&&(
            <div style={{background:'rgba(167,139,250,0.06)',border:'1px solid rgba(167,139,250,0.15)',borderRadius:16,padding:16}}>
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:12}}>
                <Brain size={13} style={{color:'#A78BFA'}}/> <p style={{fontWeight:700,color:'#A78BFA',margin:0,fontSize:'0.82rem'}}>AI Insights</p>
              </div>
              {insights.map((ins:any,i:number)=>(
                <div key={i} style={{marginBottom:10,paddingBottom:10,borderBottom:i<insights.length-1?'1px solid rgba(255,255,255,0.06)':'none'}}>
                  <p style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.7)',margin:'0 0 3px'}}>{ins.insight}</p>
                  <p style={{fontSize:'0.72rem',color:'#A78BFA',margin:0,fontWeight:600}}>→ {ins.action}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: tabs */}
        <div>
          {/* Tab nav */}
          <div style={{display:'flex',gap:4,marginBottom:18}}>
            {([{k:'overview',l:'Overview'},{k:'activities',l:`Activities (${contact.activities?.length||0})`},{k:'deals',l:`Deals (${contact.deals?.length||0})`}] as const).map(t=>(
              <button key={t.k} onClick={()=>setTab(t.k)}
                style={{padding:'8px 18px',borderRadius:20,border:'1px solid',borderColor:tab===t.k?'#C1272D':'rgba(255,255,255,0.1)',background:tab===t.k?'rgba(193,39,45,0.15)':'transparent',color:tab===t.k?'#C1272D':'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'0.8rem',fontWeight:700}}>
                {t.l}
              </button>
            ))}
          </div>

          {/* Overview */}
          {tab==='overview'&&(
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {/* Quick notes */}
              <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:18}}>
                <p style={{fontWeight:700,color:'white',margin:'0 0 10px',fontSize:'0.875rem'}}>Notes</p>
                <textarea value={contact.notes||''} onChange={e=>setContact((c:any)=>({...c,notes:e.target.value}))} onBlur={e=>save('notes',e.target.value)}
                  style={{width:'100%',minHeight:100,padding:'10px 12px',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.75)',fontSize:'0.875rem',outline:'none',resize:'vertical' as any,lineHeight:1.6,boxSizing:'border-box' as any}}
                  placeholder="Add notes about this contact…"/>
              </div>
              {/* Recent activities */}
              {contact.activities?.length>0&&(
                <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,overflow:'hidden'}}>
                  <p style={{fontWeight:700,color:'white',margin:0,padding:'14px 18px',borderBottom:'1px solid rgba(255,255,255,0.06)',fontSize:'0.875rem'}}>Recent Activity</p>
                  {contact.activities.slice(0,5).map((a:any)=>{
                    const ac=ACTIVITY_CFG[a.type]||ACTIVITY_CFG.note;
                    return (
                      <div key={a.id} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 18px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                        <span style={{fontSize:'1rem',flexShrink:0,marginTop:2}}>{ac.icon}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontWeight:600,color:'rgba(255,255,255,0.8)',margin:'0 0 2px',fontSize:'0.82rem'}}>{a.title}</p>
                          {a.body&&<p style={{color:'rgba(255,255,255,0.4)',margin:0,fontSize:'0.75rem'}}>{a.body}</p>}
                        </div>
                        <span style={{fontSize:'0.68rem',color:'rgba(255,255,255,0.25)',flexShrink:0}}>{new Date(a.created_at).toLocaleDateString()}</span>
                      </div>
                    );
                  })}
                  {contact.activities.length>5&&<button onClick={()=>setTab('activities')} style={{display:'block',width:'100%',padding:'10px',background:'none',border:'none',color:'rgba(255,255,255,0.3)',cursor:'pointer',fontSize:'0.78rem'}}>View all {contact.activities.length} activities →</button>}
                </div>
              )}
            </div>
          )}

          {/* Activities */}
          {tab==='activities'&&(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{display:'flex',justifyContent:'flex-end',marginBottom:4}}>
                <button onClick={()=>setShowAddActivity(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'#C1272D',color:'white',border:'none',borderRadius:9,cursor:'pointer',fontWeight:700,fontSize:'0.82rem'}}>
                  <Plus size={12}/> Log Activity
                </button>
              </div>
              {contact.activities?.length===0&&(
                <div style={{textAlign:'center',padding:'40px',background:'rgba(255,255,255,0.02)',border:'1px dashed rgba(255,255,255,0.1)',borderRadius:14}}>
                  <p style={{color:'rgba(255,255,255,0.2)',fontSize:'0.875rem'}}>No activities yet — log a call, meeting or note</p>
                </div>
              )}
              {contact.activities?.map((a:any)=>{
                const ac=ACTIVITY_CFG[a.type]||ACTIVITY_CFG.note;
                return (
                  <div key={a.id} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'14px 18px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14}}>
                    <div style={{width:36,height:36,borderRadius:9,background:ac.color+'18',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:'1.1rem'}}>{ac.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                        <p style={{fontWeight:700,color:'white',margin:0,fontSize:'0.875rem'}}>{a.title}</p>
                        {a.outcome&&<span style={{fontSize:'0.68rem',padding:'2px 7px',borderRadius:20,background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.5)'}}>{a.outcome}</span>}
                        {a.duration_min&&<span style={{fontSize:'0.68rem',color:'rgba(255,255,255,0.3)'}}>{a.duration_min}min</span>}
                      </div>
                      {a.body&&<p style={{color:'rgba(255,255,255,0.5)',margin:0,fontSize:'0.78rem',lineHeight:1.5}}>{a.body}</p>}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                      <span style={{fontSize:'0.68rem',color:'rgba(255,255,255,0.2)'}}>{new Date(a.created_at).toLocaleDateString()}</span>
                      {!a.completed&&<button onClick={()=>toggleActivity(a.id,true)} style={{padding:'4px 9px',border:'1px solid rgba(52,211,153,0.3)',borderRadius:7,background:'transparent',color:'#34D399',cursor:'pointer',fontSize:'0.7rem',fontWeight:700}}>✓ Done</button>}
                      {a.completed&&<span style={{fontSize:'0.7rem',color:'#34D399',fontWeight:700}}>✓ Done</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Deals */}
          {tab==='deals'&&(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{display:'flex',justifyContent:'flex-end',marginBottom:4}}>
                <button onClick={()=>setShowAddDeal(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'#C1272D',color:'white',border:'none',borderRadius:9,cursor:'pointer',fontWeight:700,fontSize:'0.82rem'}}>
                  <Plus size={12}/> Add Deal
                </button>
              </div>
              {contact.deals?.length===0&&(
                <div style={{textAlign:'center',padding:'40px',background:'rgba(255,255,255,0.02)',border:'1px dashed rgba(255,255,255,0.1)',borderRadius:14}}>
                  <p style={{color:'rgba(255,255,255,0.2)',fontSize:'0.875rem'}}>No deals yet</p>
                </div>
              )}
              {contact.deals?.map((d:any)=>{
                const sc=STAGE_CFG[d.stage]||{label:d.stage,color:'#9CA3AF'};
                return (
                  <div key={d.id} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14}}>
                    <div style={{width:10,height:10,borderRadius:'50%',background:sc.color,flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <p style={{fontWeight:700,color:'white',margin:'0 0 2px',fontSize:'0.875rem'}}>{d.title}</p>
                      <p style={{color:'rgba(255,255,255,0.35)',margin:0,fontSize:'0.72rem'}}>{d.plan_interest||''} {d.owner?`· ${d.owner}`:''}</p>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <p style={{fontWeight:800,color:sc.color,margin:0,fontSize:'0.9rem'}}>{sc.label}</p>
                      <p style={{color:'rgba(255,255,255,0.4)',margin:0,fontSize:'0.78rem'}}>{formatPrice(Number(d.value_aed))} · {d.probability_pct}%</p>
                    </div>
                    {d.expected_close&&<span style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.25)',flexShrink:0}}>Close {new Date(d.expected_close).toLocaleDateString()}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>
    </div>
  );
}
