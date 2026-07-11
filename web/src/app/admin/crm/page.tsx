'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Plus, RefreshCw, Users, TrendingUp, Activity, Filter, ChevronRight, Star, Mail, Phone, Building2, Globe, AlertTriangle } from 'lucide-react';
import { fetchOrThrow } from '@/lib/api';

const TYPE_CFG: Record<string,{label:string;color:string;bg:string}> = {
  lead:     {label:'Lead',      color:'#9CA3AF', bg:'rgba(156,163,175,0.12)'},
  prospect: {label:'Prospect',  color:'#60A5FA', bg:'rgba(96,165,250,0.12)'},
  dealer:   {label:'Dealer',    color:'#C1272D', bg:'rgba(193,39,45,0.12)'},
  broker:   {label:'Broker',    color:'#A78BFA', bg:'rgba(167,139,250,0.12)'},
  buyer:    {label:'Buyer',     color:'#34D399', bg:'rgba(52,211,153,0.12)'},
  partner:  {label:'Partner',   color:'#FBBF24', bg:'rgba(251,191,36,0.12)'},
};

const STATUS_CFG: Record<string,{label:string;dot:string}> = {
  new:          {label:'New',         dot:'#60A5FA'},
  active:       {label:'Active',      dot:'#34D399'},
  qualified:    {label:'Qualified',   dot:'#A78BFA'},
  unqualified:  {label:'Unqualified', dot:'#9CA3AF'},
  customer:     {label:'Customer',    dot:'#10B981'},
  churned:      {label:'Churned',     dot:'#F87171'},
};

const SOURCE_CFG: Record<string,string> = {
  website:'🌐', referral:'🤝', cold_outreach:'📞', social:'📱', event:'🎪', platform:'🏠', inbound:'📩',
};

function ScoreBar({ score }: { score: number }) {
  const c = score >= 70 ? '#34D399' : score >= 40 ? '#FBBF24' : '#F87171';
  return (
    <div style={{display:'flex',alignItems:'center',gap:6}}>
      <div style={{width:48,height:4,background:'rgba(255,255,255,0.08)',borderRadius:2,overflow:'hidden'}}>
        <div style={{width:`${score}%`,height:'100%',background:c,borderRadius:2}}/>
      </div>
      <span style={{fontSize:'0.7rem',fontWeight:700,color:c}}>{score}</span>
    </div>
  );
}

function AddContactModal({ onAdd, onClose }: { onAdd:(d:any)=>void; onClose:()=>void }) {
  const [d,setD] = useState({full_name:'',email:'',phone:'',company:'',type:'lead',source:'website',country:'',owner:'',status:'new'});
  const I: React.CSSProperties = {width:'100%',padding:'9px 12px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'rgba(255,255,255,0.06)',color:'white',fontSize:'0.875rem',outline:'none',boxSizing:'border-box' as any};
  const L = (t:string) => <label style={{display:'block',fontSize:'0.68rem',fontWeight:700,color:'rgba(255,255,255,0.35)',textTransform:'uppercase' as any,letterSpacing:'0.05em',marginBottom:4}}>{t}</label>;
  const submit = async () => {
    if (!d.full_name.trim()) return;
    const res = await fetch('/api/v1/crm/contacts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
    onAdd(await res.json()); onClose();
  };
  return (
    <div style={{position:'fixed',inset:0,zIndex:60,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#1a1a2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:18,width:'100%',maxWidth:520,padding:28}}>
        <p style={{fontWeight:800,color:'white',margin:'0 0 20px',fontSize:'1rem'}}>Add Contact</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
          <div>{L('Full name *')}<input autoFocus style={I} value={d.full_name} onChange={e=>setD(p=>({...p,full_name:e.target.value}))}/></div>
          <div>{L('Company')}<input style={I} value={d.company} onChange={e=>setD(p=>({...p,company:e.target.value}))}/></div>
          <div>{L('Email')}<input type="email" style={I} value={d.email} onChange={e=>setD(p=>({...p,email:e.target.value}))}/></div>
          <div>{L('Phone / WhatsApp')}<input style={I} value={d.phone} onChange={e=>setD(p=>({...p,phone:e.target.value}))}/></div>
          <div>{L('Type')}<select style={{...I,color:'rgba(255,255,255,0.8)'}} value={d.type} onChange={e=>setD(p=>({...p,type:e.target.value}))}>
            {Object.entries(TYPE_CFG).map(([k,v])=><option key={k} value={k} style={{background:'#1a1a2e'}}>{v.label}</option>)}
          </select></div>
          <div>{L('Source')}<select style={{...I,color:'rgba(255,255,255,0.8)'}} value={d.source} onChange={e=>setD(p=>({...p,source:e.target.value}))}>
            {['website','referral','cold_outreach','social','event','inbound'].map(s=><option key={s} value={s} style={{background:'#1a1a2e'}}>{s.replace('_',' ')}</option>)}
          </select></div>
          <div>{L('Country')}<input style={I} value={d.country} onChange={e=>setD(p=>({...p,country:e.target.value}))} placeholder="UAE"/></div>
          <div>{L('Owner')}<input style={I} value={d.owner} onChange={e=>setD(p=>({...p,owner:e.target.value}))} placeholder="Sales agent"/></div>
        </div>
        <div style={{display:'flex',gap:10,marginTop:8}}>
          <button onClick={onClose} style={{flex:1,padding:'11px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,background:'transparent',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'0.875rem'}}>Cancel</button>
          <button onClick={submit} disabled={!d.full_name.trim()} style={{flex:2,padding:'11px',border:'none',borderRadius:10,background:'#C1272D',color:'white',cursor:'pointer',fontWeight:700,fontSize:'0.875rem'}}>Add Contact</button>
        </div>
      </div>
    </div>
  );
}

export default function CRMPage() {
  const [contacts,setContacts] = useState<any[]>([]);
  const [stats,setStats]       = useState<any>(null);
  const [total,setTotal]       = useState(0);
  const [loading,setLoading]   = useState(true);
  const [error,setError]       = useState<string|null>(null);
  const [search,setSearch]     = useState('');
  const [typeFilter,setType]   = useState('');
  const [statusFilter,setStatus] = useState('');
  const [page,setPage]         = useState(1);
  const [showAdd,setShowAdd]   = useState(false);
  const [importing,setImporting] = useState(false);

  const load = useCallback(async()=>{
    setLoading(true);
    const p = new URLSearchParams({page:String(page),limit:'40'});
    if(search)      p.set('search',search);
    if(typeFilter)  p.set('type',typeFilter);
    if(statusFilter)p.set('status',statusFilter);
    try {
      const [c,s] = await Promise.all([
        fetchOrThrow(`/api/v1/crm/contacts?${p}`),
        fetchOrThrow('/api/v1/crm/stats'),
      ]);
      setContacts(c.items||[]); setTotal(c.total||0); setStats(s); setError(null);
    } catch (e:any) {
      setError(e.message || 'Failed to load CRM data');
    } finally {
      setLoading(false);
    }
  },[search,typeFilter,statusFilter,page]);

  useEffect(()=>{ load(); },[load]);

  const importPlatform = async () => {
    setImporting(true);
    await fetch('/api/v1/crm/contacts/import',{method:'POST'});
    setImporting(false); load();
  };

  return (
    <div style={{minHeight:'100vh',background:'#0a0a12',color:'white',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>
      {showAdd&&<AddContactModal onAdd={c=>{setContacts(p=>[c,...p]);setShowAdd(false);}} onClose={()=>setShowAdd(false)}/>}

      {error && (
        <div style={{background:'rgba(248,113,113,0.1)',borderBottom:'1px solid rgba(248,113,113,0.25)',padding:'10px 24px',display:'flex',alignItems:'center',gap:10}}>
          <AlertTriangle size={14} style={{color:'#F87171',flexShrink:0}}/>
          <p style={{color:'#F87171',fontSize:'0.8rem',margin:0,flex:1}}>{error}</p>
          <button onClick={load} style={{fontSize:'0.75rem',fontWeight:700,color:'#F87171',background:'none',border:'1px solid rgba(248,113,113,0.3)',borderRadius:7,padding:'4px 10px',cursor:'pointer'}}>Retry</button>
        </div>
      )}

      {/* Header */}
      <div style={{borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'13px 24px',display:'flex',alignItems:'center',gap:12,background:'rgba(10,10,18,0.95)',backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:30}}>
        <a href="/admin/executive" style={{width:32,height:32,borderRadius:9,background:'#C1272D',display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none',flexShrink:0}}>
          <span style={{fontWeight:900,color:'white',fontSize:'0.9rem'}}>D</span>
        </a>
        <span style={{fontWeight:800,fontSize:'1rem',color:'white'}}>SnapHub<span style={{color:'#C1272D'}}>Trade.com</span></span>
        <span style={{color:'rgba(255,255,255,0.15)'}}>·</span>
        <span style={{color:'rgba(255,255,255,0.6)',fontSize:'0.875rem',display:'flex',alignItems:'center',gap:6}}><Users size={14}/> CRM</span>
        <div style={{flex:1,maxWidth:400,position:'relative'}}>
          <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,0.3)'}}/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search contacts…"
            style={{width:'100%',paddingLeft:34,paddingRight:12,paddingTop:8,paddingBottom:8,border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'rgba(255,255,255,0.06)',color:'white',fontSize:'0.875rem',outline:'none',boxSizing:'border-box'}}/>
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          <a href="/admin/pipeline" style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'transparent',color:'rgba(255,255,255,0.6)',textDecoration:'none',fontSize:'0.8rem',fontWeight:600}}>
            <TrendingUp size={13}/> Pipeline
          </a>
          <button onClick={importPlatform} disabled={importing}
            style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'transparent',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:'0.8rem'}}>
            {importing?<RefreshCw size={12} style={{animation:'spin 1s linear infinite'}}/>:'↓'} Import platform
          </button>
          <button onClick={()=>setShowAdd(true)}
            style={{display:'flex',alignItems:'center',gap:7,padding:'8px 18px',background:'#C1272D',color:'white',border:'none',borderRadius:9,cursor:'pointer',fontWeight:700,fontSize:'0.875rem'}}>
            <Plus size={14}/> Add Contact
          </button>
        </div>
      </div>

      <div style={{maxWidth:1400,margin:'0 auto',padding:'24px'}} className="da-content-pad">
        {/* Stats */}
        {stats&&(
          <div className="da-kpi-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
            {[
              {label:'Total Contacts',value:stats.total_contacts,color:'#60A5FA',icon:Users},
              {label:'New this month', value:stats.new_this_month,color:'#34D399',icon:TrendingUp},
              {label:'Activities 24h', value:stats.activities_last_24h,color:'#A78BFA',icon:Activity},
              {label:'Types',          value:stats.by_type?.length||0, color:'#FBBF24', icon:Filter},
            ].map(k=>(
              <div key={k.label} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'16px 18px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <p style={{fontSize:'0.68rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'rgba(255,255,255,0.3)',margin:0}}>{k.label}</p>
                  <k.icon size={13} style={{color:k.color}}/>
                </div>
                <p style={{fontSize:'1.6rem',fontWeight:900,color:'white',margin:0}}>{k.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
          <button onClick={()=>{setType('');setPage(1);}} style={{padding:'5px 12px',borderRadius:20,border:'1px solid',borderColor:!typeFilter?'#C1272D':'rgba(255,255,255,0.1)',background:!typeFilter?'rgba(193,39,45,0.15)':'transparent',color:!typeFilter?'#C1272D':'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'0.75rem',fontWeight:600}}>All types</button>
          {Object.entries(TYPE_CFG).map(([k,v])=>(
            <button key={k} onClick={()=>{setType(k);setPage(1);}} style={{padding:'5px 12px',borderRadius:20,border:'1px solid',borderColor:typeFilter===k?v.color:'rgba(255,255,255,0.1)',background:typeFilter===k?v.bg:'transparent',color:typeFilter===k?v.color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'0.75rem',fontWeight:600}}>{v.label}</button>
          ))}
          <span style={{color:'rgba(255,255,255,0.15)',margin:'0 4px'}}>|</span>
          {['','new','active','qualified','customer','churned'].map(s=>(
            <button key={s} onClick={()=>{setStatus(s);setPage(1);}} style={{padding:'5px 12px',borderRadius:20,border:'1px solid',borderColor:statusFilter===s&&s?'#34D399':'rgba(255,255,255,0.1)',background:statusFilter===s&&s?'rgba(52,211,153,0.1)':'transparent',color:statusFilter===s&&s?'#34D399':'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'0.75rem',fontWeight:600}}>{s||'All status'}</button>
          ))}
          <span style={{marginLeft:'auto',fontSize:'0.78rem',color:'rgba(255,255,255,0.3)'}}>{total.toLocaleString()} contacts</span>
        </div>

        {/* Table */}
        <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,overflow:'hidden'}}>
          {loading?(
            <div style={{padding:'60px',textAlign:'center'}}><RefreshCw size={20} style={{color:'#C1272D',animation:'spin 1s linear infinite',display:'block',margin:'0 auto 12px'}}/><p style={{color:'rgba(255,255,255,0.3)',fontSize:'0.82rem',margin:0}}>Loading contacts…</p></div>
          ):contacts.length===0?(
            <div style={{padding:'60px',textAlign:'center'}}>
              <Users size={36} style={{color:'rgba(255,255,255,0.1)',display:'block',margin:'0 auto 14px'}}/>
              <p style={{color:'rgba(255,255,255,0.3)',margin:'0 0 8px'}}>No contacts found</p>
              <button onClick={importPlatform} style={{fontSize:'0.82rem',color:'#C1272D',background:'none',border:'none',cursor:'pointer',fontWeight:700}}>Import from platform →</button>
            </div>
          ):(
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'rgba(255,255,255,0.03)'}}>
                  {['Contact','Type','Company','Email','Score','Last activity','Deals','Status',''].map(h=>(
                    <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:'0.63rem',fontWeight:700,color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'0.06em',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contacts.map(c=>{
                  const tc = TYPE_CFG[c.type]||TYPE_CFG.lead;
                  const sc = STATUS_CFG[c.status]||STATUS_CFG.new;
                  const lastDeal = c.deals?.[0];
                  return (
                    <tr key={c.id} style={{borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                      <td style={{padding:'11px 14px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:9}}>
                          <div style={{width:34,height:34,borderRadius:9,background:tc.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:'0.875rem',fontWeight:800,color:tc.color}}>
                            {c.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={{fontWeight:700,color:'white',margin:0,fontSize:'0.84rem'}}>{c.full_name}</p>
                            {c.owner&&<p style={{color:'rgba(255,255,255,0.3)',margin:0,fontSize:'0.7rem'}}>{c.owner}</p>}
                          </div>
                        </div>
                      </td>
                      <td style={{padding:'11px 14px'}}><span style={{padding:'3px 9px',borderRadius:20,fontSize:'0.68rem',fontWeight:700,background:tc.bg,color:tc.color}}>{tc.label}</span></td>
                      <td style={{padding:'11px 14px',fontSize:'0.78rem',color:'rgba(255,255,255,0.55)'}}>{c.company||'—'}</td>
                      <td style={{padding:'11px 14px',fontSize:'0.75rem',color:'rgba(255,255,255,0.4)',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.email||'—'}</td>
                      <td style={{padding:'11px 14px'}}><ScoreBar score={c.score||0}/></td>
                      <td style={{padding:'11px 14px',fontSize:'0.72rem',color:'rgba(255,255,255,0.3)',whiteSpace:'nowrap'}}>
                        {c.last_activity_at?new Date(c.last_activity_at).toLocaleDateString():'—'}
                      </td>
                      <td style={{padding:'11px 14px',textAlign:'center'}}>
                        <span style={{fontSize:'0.78rem',fontWeight:700,color:c._count?.deals>0?'#A78BFA':'rgba(255,255,255,0.2)'}}>{c._count?.deals||0}</span>
                      </td>
                      <td style={{padding:'11px 14px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <span style={{width:6,height:6,borderRadius:'50%',background:sc.dot,flexShrink:0}}/>
                          <span style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.5)'}}>{sc.label}</span>
                        </div>
                      </td>
                      <td style={{padding:'11px 14px'}}>
                        <Link href={`/admin/crm/${c.id}`} style={{display:'flex',alignItems:'center',color:'rgba(255,255,255,0.2)',textDecoration:'none'}}>
                          <ChevronRight size={15}/>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total>40&&(
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:14}}>
            <p style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.3)',margin:0}}>{(page-1)*40+1}–{Math.min(page*40,total)} of {total}</p>
            <div style={{display:'flex',gap:8}}>
              {page>1&&<button onClick={()=>setPage(p=>p-1)} style={{padding:'7px 14px',borderRadius:9,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:'0.82rem'}}>← Prev</button>}
              {page*40<total&&<button onClick={()=>setPage(p=>p+1)} style={{padding:'7px 14px',borderRadius:9,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:'0.82rem'}}>Next →</button>}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>
    </div>
  );
}
