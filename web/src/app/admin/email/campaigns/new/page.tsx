'use client';
export const dynamic = 'force-dynamic';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Brain, RefreshCw, Send, Eye, Check, X, AlertTriangle } from 'lucide-react';

// ─── Block types ──────────────────────────────────────────────────────────────
const BLOCK_LIBRARY = [
  { type:'header',    icon:'🎯', label:'Header',   default:{headline:'Your headline here',subtitle:'Subtitle text',bg:'#111827',headline_color:'#FFFFFF'} },
  { type:'text',      icon:'📝', label:'Text',      default:{content:'Your text here...',align:'left'} },
  { type:'button',    icon:'🔘', label:'Button',    default:{text:'Get Started →',url:'https://snaphubtrade.com',color:'#C1272D',align:'center'} },
  { type:'stats',     icon:'📊', label:'Stats',     default:{items:[{label:'Dealers',value:'35+'},{label:'Inventory',value:'AED 2B'},{label:'Countries',value:'40'}]} },
  { type:'image',     icon:'🖼️', label:'Image',     default:{url:'',alt:'',rounded:true} },
  { type:'divider',   icon:'➖', label:'Divider',   default:{color:'#E5E7EB'} },
  { type:'spacer',    icon:'↕️', label:'Spacer',    default:{height:32} },
  { type:'footer',    icon:'📄', label:'Footer',    default:{content:'SnapHubTrade.com · Dubai Free Zone, UAE'} },
];

const SEG_OPTIONS = [
  { value:'all_dealers',       label:'All Dealers' },
  { value:'active_dealers',    label:'Active Dealers (last 30d)' },
  { value:'inactive_dealers',  label:'Inactive Dealers' },
  { value:'all_brokers',       label:'All Brokers' },
  { value:'all_buyers',        label:'All Buyers' },
  { value:'all',               label:'Everyone' },
];

// ─── Block Preview Component ──────────────────────────────────────────────────
function BlockPreview({ block }: { block: any }) {
  const s: React.CSSProperties = { fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif' };
  switch(block.type) {
    case 'header': return (
      <div style={{...s,background:block.bg||'#111827',padding:'32px 28px',textAlign:'center'}}>
        <h1 style={{color:block.headline_color||'white',fontSize:22,fontWeight:900,margin:'0 0 6px',lineHeight:1.3}}>{block.headline||'Headline'}</h1>
        {block.subtitle&&<p style={{color:'rgba(255,255,255,0.65)',fontSize:13,margin:0}}>{block.subtitle}</p>}
      </div>
    );
    case 'text': return (
      <div style={{...s,padding:'20px 28px',textAlign:(block.align||'left') as any}}>
        <p style={{color:'#374151',fontSize:14,lineHeight:1.7,margin:0,whiteSpace:'pre-wrap'}}>{block.content||'Text content...'}</p>
      </div>
    );
    case 'button': return (
      <div style={{...s,padding:'10px 28px 20px',textAlign:(block.align||'center') as any}}>
        <span style={{display:'inline-block',background:block.color||'#C1272D',color:'white',fontSize:14,fontWeight:700,padding:'12px 28px',borderRadius:9}}>{block.text||'Button'}</span>
      </div>
    );
    case 'stats': return (
      <div style={{...s,padding:'24px 28px'}}>
        <div style={{display:'flex',justifyContent:'space-around'}}>
          {(block.items||[]).map((it:any,i:number)=>(
            <div key={i} style={{textAlign:'center'}}>
              <p style={{fontSize:24,fontWeight:900,color:'#C1272D',margin:'0 0 3px'}}>{it.value}</p>
              <p style={{fontSize:11,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.05em',margin:0}}>{it.label}</p>
            </div>
          ))}
        </div>
      </div>
    );
    case 'divider': return <div style={{...s,padding:'8px 28px'}}><div style={{height:1,background:block.color||'#E5E7EB'}}/></div>;
    case 'spacer':  return <div style={{height:Math.min(block.height||32,64)}}/>;
    case 'image':   return block.url ? <img src={block.url} alt={block.alt||''} style={{width:'100%',display:'block',borderRadius:block.rounded?10:0}}/> : <div style={{padding:'20px',textAlign:'center',color:'#9CA3AF',fontSize:13,background:'#F9FAFB'}}>Image placeholder</div>;
    case 'footer':  return (
      <div style={{...s,background:'#F9FAFB',padding:'20px 28px',textAlign:'center'}}>
        <p style={{color:'#9CA3AF',fontSize:11,margin:'0 0 6px'}}>{block.content||'SnapHubTrade.com · Dubai Free Zone, UAE'}</p>
        <span style={{color:'#9CA3AF',fontSize:11,textDecoration:'underline',cursor:'pointer'}}>Unsubscribe</span>
      </div>
    );
    default: return <div style={{padding:12,fontSize:13,color:'#9CA3AF'}}>Block</div>;
  }
}

// ─── Block Editor ─────────────────────────────────────────────────────────────
function BlockEditor({ block, onChange }: { block:any; onChange:(b:any)=>void }) {
  const inp: React.CSSProperties = {width:'100%',padding:'8px 10px',border:'1px solid rgba(255,255,255,0.12)',borderRadius:8,background:'rgba(255,255,255,0.06)',color:'white',fontSize:'0.82rem',outline:'none',boxSizing:'border-box' as any};
  const label = (t: string) => <label style={{display:'block',fontSize:'0.65rem',fontWeight:700,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4}}>{t}</label>;

  switch(block.type) {
    case 'header': return (
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        <div>{label('Headline')}<input style={inp} value={block.headline||''} onChange={e=>onChange({...block,headline:e.target.value})} placeholder="Main headline"/></div>
        <div>{label('Subtitle')}<input style={inp} value={block.subtitle||''} onChange={e=>onChange({...block,subtitle:e.target.value})} placeholder="Subtitle (optional)"/></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div>{label('Background')} <input type="color" style={{...inp,height:34,padding:3,cursor:'pointer'}} value={block.bg||'#111827'} onChange={e=>onChange({...block,bg:e.target.value})}/></div>
          <div>{label('Text color')} <input type="color" style={{...inp,height:34,padding:3,cursor:'pointer'}} value={block.headline_color||'#FFFFFF'} onChange={e=>onChange({...block,headline_color:e.target.value})}/></div>
        </div>
      </div>
    );
    case 'text': return (
      <div>
        {label('Content')}
        <textarea style={{...inp,minHeight:100,resize:'vertical' as any}} value={block.content||''} onChange={e=>onChange({...block,content:e.target.value})} placeholder="Email text..."/>
        <div style={{marginTop:8}}>{label('Align')}
          <div style={{display:'flex',gap:6}}>
            {['left','center','right'].map(a=>(
              <button key={a} onClick={()=>onChange({...block,align:a})} style={{flex:1,padding:'6px',border:'1px solid',borderColor:block.align===a?'#C1272D':'rgba(255,255,255,0.1)',borderRadius:7,background:block.align===a?'rgba(193,39,45,0.2)':'transparent',color:block.align===a?'#C1272D':'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'0.72rem',fontWeight:600,textTransform:'capitalize' as any}}>{a}</button>
            ))}
          </div>
        </div>
      </div>
    );
    case 'button': return (
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        <div>{label('Button text')}<input style={inp} value={block.text||''} onChange={e=>onChange({...block,text:e.target.value})} placeholder="Click here"/></div>
        <div>{label('URL')}<input style={inp} value={block.url||''} onChange={e=>onChange({...block,url:e.target.value})} placeholder="https://..."/></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div>{label('Color')}<input type="color" style={{...inp,height:34,padding:3,cursor:'pointer'}} value={block.color||'#C1272D'} onChange={e=>onChange({...block,color:e.target.value})}/></div>
          <div>{label('Align')}
            <select style={inp} value={block.align||'center'} onChange={e=>onChange({...block,align:e.target.value})}>
              {['left','center','right'].map(a=><option key={a} style={{background:'#1a1a2e'}}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>
    );
    case 'stats': return (
      <div>
        {label('Stat Items')}
        {(block.items||[]).map((it:any,i:number)=>(
          <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:6}}>
            <input style={inp} value={it.value} onChange={e=>{const items=[...block.items];items[i]={...it,value:e.target.value};onChange({...block,items});}} placeholder="Value"/>
            <input style={inp} value={it.label} onChange={e=>{const items=[...block.items];items[i]={...it,label:e.target.value};onChange({...block,items});}} placeholder="Label"/>
          </div>
        ))}
        <button onClick={()=>onChange({...block,items:[...(block.items||[]),{label:'Label',value:'0'}]})}
          style={{width:'100%',padding:'6px',border:'1px dashed rgba(255,255,255,0.15)',borderRadius:7,background:'transparent',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'0.75rem',marginTop:4}}>
          + Add stat
        </button>
      </div>
    );
    case 'image': return (
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        <div>{label('Image URL')}<input style={inp} value={block.url||''} onChange={e=>onChange({...block,url:e.target.value})} placeholder="https://..."/></div>
        <div>{label('Alt text')}<input style={inp} value={block.alt||''} onChange={e=>onChange({...block,alt:e.target.value})} placeholder="Image description"/></div>
        <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:'0.78rem',color:'rgba(255,255,255,0.6)'}}>
          <input type="checkbox" checked={!!block.rounded} onChange={e=>onChange({...block,rounded:e.target.checked})} style={{accentColor:'#C1272D'}}/> Rounded corners
        </label>
      </div>
    );
    case 'spacer': return <div>{label('Height (px)')}<input type="number" style={inp} value={block.height||32} min={8} max={120} onChange={e=>onChange({...block,height:+e.target.value})}/></div>;
    case 'divider': return <div>{label('Color')}<input type="color" style={{...inp,height:34,padding:3,cursor:'pointer'}} value={block.color||'#E5E7EB'} onChange={e=>onChange({...block,color:e.target.value})}/></div>;
    case 'footer':  return <div>{label('Footer text')}<textarea style={{...inp,minHeight:60,resize:'vertical' as any}} value={block.content||''} onChange={e=>onChange({...block,content:e.target.value})}/></div>;
    default: return <p style={{color:'rgba(255,255,255,0.3)',fontSize:'0.75rem'}}>No settings for this block</p>;
  }
}

// ─── AI Generator Panel ───────────────────────────────────────────────────────
function AIPanel({ onApply, onClose }: { onApply:(data:any)=>void; onClose:()=>void }) {
  const [goal,setGoal]=useState('');
  const [audience,setAudience]=useState('UAE car dealers on a SaaS platform');
  const [tone,setTone]=useState('Professional & Luxury');
  const [facts,setFacts]=useState('');
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState('');
  const inp: React.CSSProperties = {width:'100%',padding:'9px 12px',border:'1px solid rgba(255,255,255,0.12)',borderRadius:9,background:'rgba(255,255,255,0.06)',color:'white',fontSize:'0.875rem',outline:'none',boxSizing:'border-box' as any};

  const generate=async()=>{
    if(!goal.trim()) return;
    setLoading(true); setErr('');
    try {
      const res=await fetch('/api/v1/email/ai/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({goal,audience,tone,brand_facts:facts})});
      const data=await res.json();
      if(data.subject_a) { onApply(data); onClose(); }
      else setErr('AI returned unexpected format. Try again.');
    } catch { setErr('Failed to connect to AI. Check your API key.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{position:'fixed',inset:0,zIndex:60,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#1a1a2e',border:'1px solid rgba(167,139,250,0.3)',borderRadius:18,width:'100%',maxWidth:480,padding:28}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
          <Brain size={18} style={{color:'#A78BFA'}}/> <p style={{fontWeight:800,color:'white',margin:0,fontSize:'1rem',flex:1}}>AI Email Generator</p>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)'}}><X size={16}/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div>
            <label style={{display:'block',fontSize:'0.72rem',fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:5}}>Campaign Goal *</label>
            <textarea style={{...inp,minHeight:80,resize:'vertical' as any}} value={goal} onChange={e=>setGoal(e.target.value)} placeholder="e.g. Re-engage inactive dealers with a special offer to upgrade their subscription"/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div>
              <label style={{display:'block',fontSize:'0.72rem',fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:5}}>Audience</label>
              <input style={inp} value={audience} onChange={e=>setAudience(e.target.value)} placeholder="UAE car dealers..."/>
            </div>
            <div>
              <label style={{display:'block',fontSize:'0.72rem',fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:5}}>Tone</label>
              <select style={{...inp,color:'rgba(255,255,255,0.8)'}} value={tone} onChange={e=>setTone(e.target.value)}>
                {['Professional & Luxury','Friendly & Casual','Urgent & Direct','Educational & Helpful'].map(t=><option key={t} style={{background:'#1a1a2e'}}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{display:'block',fontSize:'0.72rem',fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:5}}>Key facts to include (optional)</label>
            <input style={inp} value={facts} onChange={e=>setFacts(e.target.value)} placeholder="Specific stats, offer details, deadlines..."/>
          </div>
          {err&&<div style={{padding:'10px 12px',background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:9,fontSize:'0.82rem',color:'#F87171'}}>{err}</div>}
          <button onClick={generate} disabled={!goal.trim()||loading}
            style={{padding:'13px',border:'none',borderRadius:11,background:loading||!goal.trim()?'rgba(167,139,250,0.3)':'#A78BFA',color:'white',cursor:loading||!goal.trim()?'default':'pointer',fontWeight:800,fontSize:'0.95rem',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:4}}>
            {loading?<><RefreshCw size={15} style={{animation:'spin 1s linear infinite'}}/> Generating…</>:<><Brain size={15}/> Generate Email</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Builder ─────────────────────────────────────────────────────────────
export default function CampaignBuilder() {
  const router = useRouter();
  const [step, setStep]     = useState<0|1|2>(0);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendResult, setSendResult] = useState<any>(null);
  const [selectedBlock, setSelectedBlock] = useState<number|null>(null);
  const [segCounts, setSegCounts] = useState<Record<string,number>>({});
  const [recipientCount, setRecipientCount] = useState<number|null>(null);

  const [form, setForm] = useState({
    name: '', subject_a: '', subject_b: '', preview_text: '',
    from_name: 'SnapHubTrade.com', from_email: 'noreply@snaphubtrade.com', reply_to: '',
    segment: 'all_dealers', ab_test: false, ab_split_pct: 50,
    scheduled_at: '', blocks: [] as any[],
  });

  // Load segment counts
  useState(()=>{ fetch('/api/v1/email/segments').then(r=>r.json()).then((s:any[])=>{ const m:Record<string,number>={}; s.forEach(x=>m[x.segment]=x.count); setSegCounts(m); }); });

  const setF = (k: string, v: any) => setForm(p=>({...p,[k]:v}));

  // Update recipient count when segment changes
  const updateSegCount = (seg: string) => { setRecipientCount(segCounts[seg]||0); };

  const addBlock = (type: string) => {
    const def = BLOCK_LIBRARY.find(b=>b.type===type)?.default || {};
    setForm(p=>({...p, blocks:[...p.blocks,{type,...def}]}));
    setSelectedBlock(form.blocks.length);
  };

  const updateBlock = (idx: number, block: any) => setForm(p=>({...p,blocks:p.blocks.map((b,i)=>i===idx?block:b)}));
  const removeBlock = (idx: number) => { setForm(p=>({...p,blocks:p.blocks.filter((_,i)=>i!==idx)})); if(selectedBlock===idx) setSelectedBlock(null); };
  const moveBlock = (idx: number, dir: -1|1) => {
    const b=[...form.blocks]; const ni=idx+dir;
    if(ni<0||ni>=b.length) return;
    [b[idx],b[ni]]=[b[ni],b[idx]];
    setForm(p=>({...p,blocks:b}));
    setSelectedBlock(ni);
  };

  const applyAI = (data: any) => {
    setF('subject_a', data.subject_a||'');
    setF('subject_b', data.subject_b||'');
    setF('preview_text', data.preview_text||'');
    if(data.blocks?.length) setForm(p=>({...p,blocks:data.blocks,subject_a:data.subject_a||'',subject_b:data.subject_b||'',preview_text:data.preview_text||''}));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/email/campaigns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
      const c = await res.json();
      if(c.id) router.push(`/admin/email/campaigns/${c.id}`);
    } finally { setSaving(false); }
  };

  const sendTest = async () => {
    if(!testEmail) return;
    setSending(true);
    try {
      const res = await fetch('/api/v1/email/campaigns/test-preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,test_email:testEmail})});
      setSendResult(await res.json());
    } catch { setSendResult({error:'Failed'}); }
    finally { setSending(false); }
  };

  const inp: React.CSSProperties = {width:'100%',padding:'10px 13px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'rgba(255,255,255,0.05)',color:'white',fontSize:'0.875rem',outline:'none',boxSizing:'border-box' as any};
  const label = (t:string) => <label style={{display:'block',fontSize:'0.7rem',fontWeight:700,color:'rgba(255,255,255,0.35)',textTransform:'uppercase' as any,letterSpacing:'0.05em',marginBottom:5}}>{t}</label>;

  const step0Valid = form.name.trim() && form.subject_a.trim();
  const step1Valid = form.blocks.length > 0;

  return (
    <div style={{minHeight:'100vh',background:'#0a0a12',color:'white',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>
      {showAI && <AIPanel onApply={applyAI} onClose={()=>setShowAI(false)}/>}

      {/* Header */}
      <div style={{borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'13px 24px',display:'flex',alignItems:'center',gap:14,background:'rgba(10,10,18,0.95)',backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:30}}>
        <a href="/admin/email" style={{display:'flex',alignItems:'center',gap:6,color:'rgba(255,255,255,0.4)',textDecoration:'none',fontSize:'0.82rem',flexShrink:0}}>
          <ArrowLeft size={15}/> Back
        </a>
        <div style={{flex:1}}>
          <input value={form.name} onChange={e=>setF('name',e.target.value)} placeholder="Campaign name…"
            style={{background:'none',border:'none',color:'white',fontSize:'1rem',fontWeight:700,outline:'none',width:'100%'}}/>
        </div>
        {/* Step pills */}
        <div style={{display:'flex',gap:2}}>
          {[{n:0,l:'Setup'},{n:1,l:'Content'},{n:2,l:'Review'}].map(s=>(
            <button key={s.n} onClick={()=>setStep(s.n as 0|1|2)}
              style={{padding:'6px 14px',borderRadius:20,border:'none',cursor:'pointer',fontSize:'0.78rem',fontWeight:700,background:step===s.n?'#C1272D':step>s.n?'rgba(52,211,153,0.15)':'rgba(255,255,255,0.07)',color:step===s.n?'white':step>s.n?'#34D399':'rgba(255,255,255,0.4)'}}>
              {step>s.n?'✓ ':''}{s.l}
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setShowAI(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',border:'1px solid rgba(167,139,250,0.3)',borderRadius:9,background:'rgba(167,139,250,0.1)',color:'#A78BFA',cursor:'pointer',fontSize:'0.8rem',fontWeight:700}}>
            <Brain size={13}/> AI Generate
          </button>
          <button onClick={save} disabled={saving||!step0Valid}
            style={{display:'flex',alignItems:'center',gap:7,padding:'8px 18px',background:saving||!step0Valid?'rgba(255,255,255,0.1)':'#C1272D',color:saving||!step0Valid?'rgba(255,255,255,0.3)':'white',border:'none',borderRadius:9,cursor:saving||!step0Valid?'default':'pointer',fontWeight:700,fontSize:'0.875rem'}}>
            {saving?<RefreshCw size={13} style={{animation:'spin 1s linear infinite'}}/>:<Check size={13}/>} Save
          </button>
        </div>
      </div>

      {/* ── STEP 0: Setup ── */}
      {step===0&&(
        <div style={{maxWidth:680,margin:'40px auto',padding:'0 24px'}}>
          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            <div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div>
                  {label('Subject Line A *')}
                  <input style={inp} value={form.subject_a} onChange={e=>setF('subject_a',e.target.value)} placeholder="Your compelling subject line…"/>
                  <p style={{fontSize:'0.68rem',color:form.subject_a.length>60?'#F87171':'rgba(255,255,255,0.25)',margin:'4px 0 0',textAlign:'right'}}>{form.subject_a.length}/60</p>
                </div>
                <div>
                  {label(`Subject Line B ${form.ab_test?'*':'(A/B Testing)'}`)}
                  <input style={{...inp,opacity:form.ab_test?1:0.4}} value={form.subject_b} onChange={e=>setF('subject_b',e.target.value)} placeholder="Alternative subject…" disabled={!form.ab_test}/>
                  <div style={{marginTop:6}}>
                    <label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',fontSize:'0.75rem',color:'rgba(255,255,255,0.5)'}}>
                      <input type="checkbox" checked={form.ab_test} onChange={e=>setF('ab_test',e.target.checked)} style={{accentColor:'#A78BFA'}}/> Enable A/B test
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div>
              {label('Preview Text (inbox snippet)')}
              <input style={inp} value={form.preview_text} onChange={e=>setF('preview_text',e.target.value)} placeholder="This text appears in the inbox preview…"/>
              <p style={{fontSize:'0.68rem',color:form.preview_text.length>90?'#F87171':'rgba(255,255,255,0.25)',margin:'4px 0 0',textAlign:'right'}}>{form.preview_text.length}/90</p>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div>{label('From Name')}<input style={inp} value={form.from_name} onChange={e=>setF('from_name',e.target.value)}/></div>
              <div>{label('From Email')}<input type="email" style={inp} value={form.from_email} onChange={e=>setF('from_email',e.target.value)}/></div>
              <div>{label('Reply-To (optional)')}<input type="email" style={inp} value={form.reply_to} onChange={e=>setF('reply_to',e.target.value)} placeholder="hello@snaphubtrade.com"/></div>
            </div>

            <div>
              {label('Audience Segment')}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:4}}>
                {SEG_OPTIONS.map(s=>(
                  <button key={s.value} onClick={()=>{setF('segment',s.value);updateSegCount(s.value);}}
                    style={{padding:'12px 14px',border:'1.5px solid',borderColor:form.segment===s.value?'#C1272D':'rgba(255,255,255,0.1)',borderRadius:11,background:form.segment===s.value?'rgba(193,39,45,0.12)':'transparent',color:form.segment===s.value?'white':'rgba(255,255,255,0.5)',cursor:'pointer',textAlign:'left',fontSize:'0.82rem',fontWeight:form.segment===s.value?700:400}}>
                    <p style={{margin:'0 0 2px'}}>{s.label}</p>
                    {segCounts[s.value]!==undefined&&<p style={{margin:0,fontSize:'0.68rem',color:form.segment===s.value?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.3)'}}>{segCounts[s.value].toLocaleString()} recipients</p>}
                  </button>
                ))}
              </div>
            </div>

            <div>
              {label('Schedule (optional — leave blank to send now)')}
              <input type="datetime-local" style={inp} value={form.scheduled_at} onChange={e=>setF('scheduled_at',e.target.value)}/>
            </div>

            <button onClick={()=>setStep(1)} disabled={!step0Valid}
              style={{padding:'14px',border:'none',borderRadius:11,background:step0Valid?'#C1272D':'rgba(255,255,255,0.08)',color:step0Valid?'white':'rgba(255,255,255,0.3)',cursor:step0Valid?'pointer':'default',fontWeight:800,fontSize:'0.95rem',marginTop:8}}>
              Next: Design Content →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 1: Content ── */}
      {step===1&&(
        <div style={{display:'grid',gridTemplateColumns:'300px 1fr',height:'calc(100vh - 61px)',overflow:'hidden'}}>
          {/* Left: editor panel */}
          <div style={{borderRight:'1px solid rgba(255,255,255,0.07)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            {/* Block list */}
            <div style={{flex:1,overflowY:'auto',padding:'14px'}}>
              <p style={{fontSize:'0.7rem',fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.06em',margin:'0 0 10px'}}>Blocks ({form.blocks.length})</p>
              {form.blocks.length===0&&(
                <div style={{textAlign:'center',padding:'30px 10px',border:'1px dashed rgba(255,255,255,0.1)',borderRadius:12}}>
                  <p style={{color:'rgba(255,255,255,0.25)',fontSize:'0.78rem',margin:'0 0 8px'}}>No blocks yet</p>
                  <p style={{color:'rgba(255,255,255,0.15)',fontSize:'0.72rem',margin:0}}>Use AI or add blocks below</p>
                </div>
              )}
              {form.blocks.map((b,i)=>(
                <div key={i} onClick={()=>setSelectedBlock(i===selectedBlock?null:i)}
                  style={{marginBottom:6,border:'1.5px solid',borderColor:selectedBlock===i?'#C1272D':'rgba(255,255,255,0.08)',borderRadius:10,overflow:'hidden',cursor:'pointer',background:selectedBlock===i?'rgba(193,39,45,0.08)':'rgba(255,255,255,0.02)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px'}}>
                    <span style={{fontSize:'0.9rem'}}>{BLOCK_LIBRARY.find(bl=>bl.type===b.type)?.icon||'📦'}</span>
                    <span style={{flex:1,fontSize:'0.78rem',fontWeight:600,color:'rgba(255,255,255,0.7)',textTransform:'capitalize'}}>{b.type}</span>
                    <div style={{display:'flex',gap:2}}>
                      {[{d:-1 as -1,icon:ChevronUp},{d:1 as 1,icon:ChevronDown}].map(({d,icon:Icon})=>(
                        <button key={d} onClick={e=>{e.stopPropagation();moveBlock(i,d);}} style={{padding:3,background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)'}}>
                          <Icon size={12}/>
                        </button>
                      ))}
                      <button onClick={e=>{e.stopPropagation();removeBlock(i);}} style={{padding:3,background:'none',border:'none',cursor:'pointer',color:'rgba(248,113,113,0.5)'}}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </div>
                  {selectedBlock===i&&(
                    <div style={{padding:'12px',borderTop:'1px solid rgba(255,255,255,0.07)',background:'rgba(0,0,0,0.2)'}} onClick={e=>e.stopPropagation()}>
                      <BlockEditor block={b} onChange={nb=>updateBlock(i,nb)}/>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add block */}
            <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',padding:'12px 14px'}}>
              <p style={{fontSize:'0.7rem',fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.06em',margin:'0 0 8px'}}>Add Block</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
                {BLOCK_LIBRARY.map(bl=>(
                  <button key={bl.type} onClick={()=>addBlock(bl.type)}
                    style={{display:'flex',alignItems:'center',gap:6,padding:'7px 9px',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,background:'rgba(255,255,255,0.03)',cursor:'pointer',color:'rgba(255,255,255,0.55)',fontSize:'0.72rem',fontWeight:500}}>
                    <span>{bl.icon}</span> {bl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: preview */}
          <div style={{overflowY:'auto',background:'#1a1a1a',display:'flex',flexDirection:'column',alignItems:'center',padding:'32px 20px'}}>
            <div style={{width:'100%',maxWidth:560}}>
              {/* Inbox preview */}
              <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',marginBottom:20,display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:'#C1272D',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:'0.8rem',fontWeight:800,color:'white'}}>D</div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontWeight:700,color:'white',margin:0,fontSize:'0.82rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{form.name||'Campaign Name'} <span style={{color:'rgba(255,255,255,0.3)',fontWeight:400}}>— {form.subject_a||'Subject line…'}</span></p>
                  <p style={{color:'rgba(255,255,255,0.35)',margin:0,fontSize:'0.72rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{form.preview_text||'Preview text…'}</p>
                </div>
                <span style={{fontSize:'0.68rem',color:'rgba(255,255,255,0.25)',flexShrink:0}}>Now</span>
              </div>

              {/* Email frame */}
              <div style={{background:'white',borderRadius:12,overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,0.4)'}}>
                {form.blocks.length===0?(
                  <div style={{padding:'60px 28px',textAlign:'center'}}>
                    <p style={{color:'#9CA3AF',fontSize:15,marginBottom:12}}>Your email preview will appear here</p>
                    <p style={{color:'#D1D5DB',fontSize:13}}>Use the AI generator or add blocks from the panel →</p>
                  </div>
                ):form.blocks.map((b,i)=>(
                  <div key={i} onClick={()=>setSelectedBlock(i)} style={{outline:selectedBlock===i?'2px solid #C1272D':'none',outlineOffset:-2,cursor:'pointer'}}>
                    <BlockPreview block={b}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Review & Send ── */}
      {step===2&&(
        <div style={{maxWidth:640,margin:'40px auto',padding:'0 24px'}}>
          {/* Summary */}
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,overflow:'hidden',marginBottom:20}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(255,255,255,0.02)'}}>
              <p style={{fontWeight:800,color:'white',margin:0}}>Campaign Summary</p>
            </div>
            <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:12}}>
              {[
                {l:'Campaign name',v:form.name||'—'},
                {l:'Subject A',v:form.subject_a||'—'},
                ...(form.ab_test&&form.subject_b?[{l:'Subject B (A/B)',v:form.subject_b}]:[]),
                {l:'Audience',v:`${SEG_OPTIONS.find(s=>s.value===form.segment)?.label||form.segment} (${(segCounts[form.segment]||0).toLocaleString()} recipients)`},
                {l:'Blocks',v:`${form.blocks.length} content blocks`},
                {l:'Send time',v:form.scheduled_at?new Date(form.scheduled_at).toLocaleString():'Immediately'},
              ].map(row=>(
                <div key={row.l} style={{display:'flex',gap:12}}>
                  <span style={{width:140,fontSize:'0.78rem',color:'rgba(255,255,255,0.35)',flexShrink:0}}>{row.l}</span>
                  <span style={{fontSize:'0.82rem',color:'white',fontWeight:600}}>{row.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {form.blocks.length===0&&(
            <div style={{display:'flex',gap:10,padding:'12px 16px',background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.2)',borderRadius:12,marginBottom:16}}>
              <AlertTriangle size={15} style={{color:'#FBBF24',flexShrink:0,marginTop:2}}/>
              <p style={{fontSize:'0.82rem',color:'#FBBF24',margin:0,fontWeight:500}}>No blocks added. Go back to Content step to design your email.</p>
            </div>
          )}

          {/* Test send */}
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'16px 20px',marginBottom:20}}>
            <p style={{fontWeight:700,color:'white',margin:'0 0 10px',fontSize:'0.875rem'}}>Send test email</p>
            <div style={{display:'flex',gap:8}}>
              <input style={{...inp,flex:1}} type="email" value={testEmail} onChange={e=>setTestEmail(e.target.value)} placeholder="your@email.com"/>
              <button onClick={sendTest} disabled={!testEmail||sending}
                style={{padding:'10px 16px',border:'none',borderRadius:9,background:testEmail&&!sending?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.04)',color:testEmail?'white':'rgba(255,255,255,0.3)',cursor:testEmail&&!sending?'pointer':'default',fontWeight:700,fontSize:'0.82rem',flexShrink:0}}>
                {sending?<RefreshCw size={13} style={{animation:'spin 1s linear infinite'}}/>:'Send test'}
              </button>
            </div>
            {sendResult&&<p style={{fontSize:'0.78rem',color:sendResult.error?'#F87171':'#34D399',margin:'8px 0 0'}}>{sendResult.error||`Test sent to ${testEmail}`}</p>}
          </div>

          {/* Send button */}
          <button onClick={async()=>{
            await save();
          }}
            disabled={!step0Valid||form.blocks.length===0}
            style={{width:'100%',padding:'16px',border:'none',borderRadius:14,background:step0Valid&&form.blocks.length>0?'#C1272D':'rgba(255,255,255,0.07)',color:step0Valid&&form.blocks.length>0?'white':'rgba(255,255,255,0.3)',cursor:step0Valid&&form.blocks.length>0?'pointer':'default',fontWeight:900,fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
            <Send size={16}/> {form.scheduled_at?'Schedule Campaign':'Save & Go to Campaign'}
          </button>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>
    </div>
  );
}
