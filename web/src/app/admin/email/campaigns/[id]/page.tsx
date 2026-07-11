'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Eye, MousePointer, Mail, Users, RefreshCw, Trash2, Edit3, Check, X, Copy } from 'lucide-react';
import Link from 'next/link';

const STATUS_CFG: Record<string,{label:string;color:string;bg:string}> = {
  draft:{label:'Draft',color:'#9CA3AF',bg:'rgba(156,163,175,0.12)'},
  scheduled:{label:'Scheduled',color:'#60A5FA',bg:'rgba(96,165,250,0.12)'},
  sending:{label:'Sending…',color:'#FBBF24',bg:'rgba(251,191,36,0.12)'},
  sent:{label:'Sent',color:'#34D399',bg:'rgba(52,211,153,0.12)'},
};
const SEG_LABELS: Record<string,string> = {
  all_dealers:'All Dealers', active_dealers:'Active Dealers', inactive_dealers:'Inactive Dealers',
  all_brokers:'All Brokers', all_buyers:'All Buyers', all:'Everyone',
};

function StatCard({label,value,sub,icon:Icon,color}:any) {
  return (
    <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'16px 18px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <p style={{fontSize:'0.68rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'rgba(255,255,255,0.35)',margin:0}}>{label}</p>
        <Icon size={13} style={{color}}/>
      </div>
      <p style={{fontSize:'1.5rem',fontWeight:900,color:'white',margin:'0 0 2px'}}>{value}</p>
      {sub&&<p style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.3)',margin:0}}>{sub}</p>}
    </div>
  );
}

export default function CampaignDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = () => fetch(`/api/v1/email/campaigns/${id}`).then(r=>r.json()).then(setCampaign).finally(()=>setLoading(false));

  useEffect(()=>{ load(); },[id]);

  const sendCampaign = async () => {
    if(!showConfirm) { setShowConfirm(true); return; }
    setSending(true); setShowConfirm(false);
    try {
      const r = await fetch(`/api/v1/email/campaigns/${id}/send`,{method:'POST'});
      const data = await r.json();
      setSent(true);
      setTimeout(()=>load(),2000);
    } finally { setSending(false); }
  };

  const sendTest = async () => {
    if(!testEmail) return;
    const r = await fetch(`/api/v1/email/campaigns/${id}/test`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:testEmail})});
    const data = await r.json();
    setTestResult(data.error||`Sent to ${testEmail}`);
  };

  const deleteCampaign = async () => {
    setDeleting(true);
    try { await fetch(`/api/v1/email/campaigns/${id}`,{method:'DELETE'}); router.push('/admin/email'); }
    catch { setDeleting(false); }
  };

  if(loading) return (
    <div style={{minHeight:'100vh',background:'#0a0a12',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <RefreshCw size={20} style={{color:'#C1272D',animation:'spin 1s linear infinite'}}/>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if(!campaign) return <div style={{minHeight:'100vh',background:'#0a0a12',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,0.3)'}}>Campaign not found</div>;

  const s = campaign.stats||{};
  const sc = STATUS_CFG[campaign.status]||STATUS_CFG.draft;
  const isSent = campaign.status==='sent';
  const inp: React.CSSProperties = {padding:'9px 12px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'rgba(255,255,255,0.05)',color:'white',fontSize:'0.82rem',outline:'none',boxSizing:'border-box' as any};

  return (
    <div style={{minHeight:'100vh',background:'#0a0a12',color:'white',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>
      {/* Header */}
      <div style={{borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'13px 24px',display:'flex',alignItems:'center',gap:12,background:'rgba(10,10,18,0.95)',backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:30}}>
        <Link href="/admin/email" style={{display:'flex',alignItems:'center',gap:5,color:'rgba(255,255,255,0.4)',textDecoration:'none',fontSize:'0.82rem'}}>
          <ArrowLeft size={14}/> All Campaigns
        </Link>
        <span style={{color:'rgba(255,255,255,0.15)'}}>·</span>
        <p style={{fontWeight:700,color:'white',margin:0,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{campaign.name}</p>
        <span style={{padding:'4px 10px',borderRadius:20,fontSize:'0.7rem',fontWeight:700,background:sc.bg,color:sc.color,flexShrink:0}}>{sc.label}</span>
        <div style={{display:'flex',gap:8}}>
          {!isSent&&(
            <button onClick={()=>router.push(`/admin/email/campaigns/${id}/edit`)}
              style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'transparent',color:'rgba(255,255,255,0.6)',cursor:'pointer',fontSize:'0.8rem',fontWeight:600}}>
              <Edit3 size={13}/> Edit
            </button>
          )}
          {!isSent&&(
            <button onClick={sendCampaign} disabled={sending}
              style={{display:'flex',alignItems:'center',gap:7,padding:'8px 18px',background:showConfirm?'#F87171':sending?'rgba(193,39,45,0.4)':'#C1272D',color:'white',border:'none',borderRadius:9,cursor:sending?'default':'pointer',fontWeight:700,fontSize:'0.875rem'}}>
              {sending?<RefreshCw size={13} style={{animation:'spin 1s linear infinite'}}/>:<Send size={13}/>}
              {showConfirm?'Confirm Send':'Send Campaign'}
            </button>
          )}
          {showConfirm&&<button onClick={()=>setShowConfirm(false)} style={{padding:'8px 12px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,background:'transparent',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'0.8rem'}}>Cancel</button>}
        </div>
      </div>

      <div style={{maxWidth:1200,margin:'0 auto',padding:'28px 24px',display:'grid',gridTemplateColumns:'1fr 300px',gap:20}}>
        {/* Main */}
        <div style={{display:'flex',flexDirection:'column',gap:20}}>
          {/* Stats grid */}
          {isSent&&(
            <div className="da-kpi-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
              <StatCard label="Sent" value={(s.sent||0).toLocaleString()} icon={Mail} color="#60A5FA" sub={`of ${campaign.total_recipients} recipients`}/>
              <StatCard label="Open Rate" value={`${s.open_rate||0}%`} icon={Eye} color="#34D399" sub={`${s.opened||0} opened`}/>
              <StatCard label="Click Rate" value={`${s.click_rate||0}%`} icon={MousePointer} color="#A78BFA" sub={`${s.clicked||0} clicked`}/>
              <StatCard label="Bounce Rate" value={`${s.bounce_rate||0}%`} icon={X} color="#F87171" sub={`${s.bounced||0} bounced`}/>
            </div>
          )}

          {/* Campaign details */}
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,overflow:'hidden'}}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(255,255,255,0.02)'}}>
              <p style={{fontWeight:700,color:'white',margin:0,fontSize:'0.9rem'}}>Campaign Details</p>
            </div>
            <div style={{padding:'16px 20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              {[
                {l:'Subject A',v:campaign.subject_a},
                ...(campaign.ab_test&&campaign.subject_b?[{l:'Subject B',v:campaign.subject_b}]:[]),
                {l:'Preview text',v:campaign.preview_text||'—'},
                {l:'From',v:`${campaign.from_name} <${campaign.from_email}>`},
                {l:'Audience',v:SEG_LABELS[campaign.segment]||campaign.segment},
                {l:'Recipients',v:(campaign.recipientCount||campaign.total_recipients||0).toLocaleString()},
                {l:'A/B Test',v:campaign.ab_test?`Yes (${campaign.ab_split_pct}% / ${100-campaign.ab_split_pct}%)`:'No'},
                {l:'Blocks',v:`${(campaign.blocks||[]).length} blocks`},
                {l:'Created',v:new Date(campaign.created_at).toLocaleDateString()},
                {l:'Sent at',v:campaign.sent_at?new Date(campaign.sent_at).toLocaleString():'—'},
              ].map(row=>(
                <div key={row.l}>
                  <p style={{fontSize:'0.68rem',fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.05em',margin:'0 0 3px'}}>{row.l}</p>
                  <p style={{fontSize:'0.82rem',color:'rgba(255,255,255,0.8)',margin:0,wordBreak:'break-all'}}>{row.v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent sends */}
          {(campaign.lastSends||[]).length>0&&(
            <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,overflow:'hidden'}}>
              <div style={{padding:'14px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <p style={{fontWeight:700,color:'white',margin:0,fontSize:'0.875rem'}}>Recent Sends ({campaign.lastSends.length})</p>
                <span style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.3)'}}>Last 50 records</span>
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',minWidth:500}}>
                  <thead>
                    <tr style={{background:'rgba(255,255,255,0.02)'}}>
                      {['Recipient','Variant','Status','Opened','Clicked','Sent at'].map(h=>(
                        <th key={h} style={{padding:'8px 14px',textAlign:'left',fontSize:'0.65rem',fontWeight:700,color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaign.lastSends.map((send:any)=>(
                      <tr key={send.id} style={{borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                        <td style={{padding:'9px 14px',fontSize:'0.78rem',color:'rgba(255,255,255,0.7)'}}>{send.recipient_email}</td>
                        <td style={{padding:'9px 14px'}}><span style={{fontSize:'0.68rem',padding:'2px 7px',borderRadius:20,background:'rgba(167,139,250,0.12)',color:'#A78BFA',fontWeight:700}}>Variant {send.variant?.toUpperCase()}</span></td>
                        <td style={{padding:'9px 14px'}}><span style={{fontSize:'0.72rem',padding:'2px 8px',borderRadius:20,background:send.status==='sent'?'rgba(52,211,153,0.1)':'rgba(248,113,113,0.1)',color:send.status==='sent'?'#34D399':'#F87171',fontWeight:700}}>{send.status}</span></td>
                        <td style={{padding:'9px 14px',textAlign:'center'}}>{send.opened?'✅':'—'}</td>
                        <td style={{padding:'9px 14px',textAlign:'center'}}>{send.clicked?'🔗':'—'}</td>
                        <td style={{padding:'9px 14px',fontSize:'0.72rem',color:'rgba(255,255,255,0.3)',whiteSpace:'nowrap'}}>{send.sent_at?new Date(send.sent_at).toLocaleString():send.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {/* Test send */}
          {!isSent&&(
            <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'16px'}}>
              <p style={{fontWeight:700,color:'white',margin:'0 0 12px',fontSize:'0.82rem'}}>Send Test Email</p>
              <input style={{...inp,width:'100%',marginBottom:8}} type="email" value={testEmail} onChange={e=>setTestEmail(e.target.value)} placeholder="test@example.com"/>
              <button onClick={sendTest} disabled={!testEmail}
                style={{width:'100%',padding:'9px',border:'none',borderRadius:9,background:testEmail?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.04)',color:testEmail?'white':'rgba(255,255,255,0.3)',cursor:testEmail?'pointer':'default',fontWeight:600,fontSize:'0.82rem'}}>
                Send test
              </button>
              {testResult&&<p style={{fontSize:'0.75rem',color:'#34D399',margin:'8px 0 0'}}>{testResult}</p>}
            </div>
          )}

          {/* Success message */}
          {sent&&(
            <div style={{padding:'14px 16px',background:'rgba(52,211,153,0.1)',border:'1px solid rgba(52,211,153,0.25)',borderRadius:14,display:'flex',gap:10,alignItems:'flex-start'}}>
              <Check size={15} style={{color:'#34D399',flexShrink:0,marginTop:2}}/>
              <p style={{fontSize:'0.82rem',color:'#34D399',margin:0,fontWeight:600}}>Campaign is sending! Stats will update shortly.</p>
            </div>
          )}

          {/* Danger zone */}
          {!isSent&&(
            <div style={{background:'rgba(248,113,113,0.05)',border:'1px solid rgba(248,113,113,0.15)',borderRadius:14,padding:'16px'}}>
              <p style={{fontWeight:700,color:'#F87171',margin:'0 0 10px',fontSize:'0.82rem'}}>Danger Zone</p>
              <button onClick={deleteCampaign} disabled={deleting}
                style={{width:'100%',padding:'9px',border:'1px solid rgba(248,113,113,0.3)',borderRadius:9,background:'transparent',color:'#F87171',cursor:'pointer',fontWeight:600,fontSize:'0.82rem',display:'flex',alignItems:'center',justifyContent:'center',gap:7}}>
                {deleting?<RefreshCw size={13} style={{animation:'spin 1s linear infinite'}}/>:<Trash2 size={13}/>} Delete Campaign
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>
    </div>
  );
}
