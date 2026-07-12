'use client';
import { useState, useEffect } from 'react';
import { Plus, X, Check, Clock, DollarSign, FileText, Send, Receipt, RefreshCw, Target } from 'lucide-react';
import { usePriceFormatter } from '@/components/common/Price';

const QUOTE_STATUS: Record<string,{label:string;color:string;bg:string}> = {
  draft:     { label:'Draft',     color:'#6B7280', bg:'#F3F4F6' },
  sent:      { label:'Sent',      color:'#1E40AF', bg:'#DBEAFE' },
  accepted:  { label:'Accepted',  color:'#065F46', bg:'#D1FAE5' },
  rejected:  { label:'Rejected',  color:'#991B1B', bg:'#FEE2E2' },
  expired:   { label:'Expired',   color:'#92400E', bg:'#FEF3C7' },
  converted: { label:'Converted', color:'#5B21B6', bg:'#EDE9FE' },
};
const INVOICE_STATUS: Record<string,{label:string;color:string;bg:string}> = {
  draft:     { label:'Draft',     color:'#6B7280', bg:'#F3F4F6' },
  sent:      { label:'Sent',      color:'#1E40AF', bg:'#DBEAFE' },
  paid:      { label:'Paid',      color:'#065F46', bg:'#D1FAE5' },
  overdue:   { label:'Overdue',   color:'#991B1B', bg:'#FEE2E2' },
  cancelled: { label:'Cancelled', color:'#374151', bg:'#F3F4F6' },
};

function CreateQuoteModal({ dealerId, onClose, onDone }: { dealerId:string; onClose:()=>void; onDone:()=>void }) {
  const formatPrice = usePriceFormatter();
  const [buyer, setBuyer] = useState({ name:'', email:'', phone:'', country:'' });
  const [vehicleId, setVehicleId] = useState('');
  const [brokerId, setBrokerId] = useState('');
  const [items, setItems] = useState([{ description:'', quantity:1, unit_price:0 }]);
  const [discountPct, setDiscountPct] = useState(0);
  const [taxPct, setTaxPct] = useState(5);
  const [validUntil, setValidUntil] = useState(new Date(Date.now()+30*86400000).toISOString().slice(0,10));
  const [notes, setNotes] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(()=>{
    Promise.all([
      fetch(`/api/v1/dealer-dashboard/${dealerId}/inventory?limit=100&status=available`).then(r=>r.json()).catch(()=>({})),
      fetch('/api/v1/broker/all?status=active&limit=100').then(r=>r.json()).catch(()=>({})),
    ]).then(([inv,bk])=>{ setVehicles(inv.items||[]); setBrokers(bk.items||[]); });
  },[dealerId]);

  const subtotal = items.reduce((s,i)=>s+Number(i.unit_price)*(Number(i.quantity)||1),0);
  const discount = Math.round(subtotal*discountPct/100*100)/100;
  const taxBase  = subtotal-discount;
  const tax      = Math.round(taxBase*taxPct/100*100)/100;
  const total    = taxBase+tax;

  const addItem = () => setItems(prev=>[...prev,{description:'',quantity:1,unit_price:0}]);
  const removeItem = (i:number) => setItems(prev=>prev.filter((_,idx)=>idx!==i));
  const updItem = (i:number, k:string, v:any) => setItems(prev=>prev.map((it,idx)=>idx===i?{...it,[k]:v}:it));

  const submit = async () => {
    if (!buyer.name.trim()) return setErr('Buyer name is required');
    const validItems = items.filter(i=>i.description.trim());
    if (!validItems.length) return setErr('At least one line item with description required');
    setSaving(true); setErr('');
    try {
      const res = await fetch('/api/v1/billing/quotes', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          dealer_id: dealerId,
          buyer_name: buyer.name, buyer_email: buyer.email||undefined,
          buyer_phone: buyer.phone||undefined, buyer_country: buyer.country||undefined,
          vehicle_id: vehicleId||undefined, broker_id: brokerId||undefined,
          items: validItems.map(i=>({...i, unit_price:Number(i.unit_price), quantity:Number(i.quantity)||1})),
          discount_pct: discountPct, tax_pct: taxPct,
          valid_until: validUntil, notes: notes||undefined,
        }),
      });
      if (!res.ok) { const d=await res.json(); throw new Error(d.message||'Failed'); }
      onDone();
    } catch(e:any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const inp:React.CSSProperties = {width:'100%',padding:'8px 11px',border:'1.5px solid #E5E7EB',borderRadius:8,fontSize:'0.85rem',outline:'none',color:'#111827'};

  return (
    <div style={{position:'fixed',inset:0,zIndex:60,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto'}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'white',borderRadius:18,width:'100%',maxWidth:600,overflow:'hidden',boxShadow:'0 24px 64px rgba(0,0,0,0.2)',margin:'auto'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #F3F4F6',display:'flex',justifyContent:'space-between',alignItems:'center',background:'linear-gradient(135deg,#F8FAFF,white)'}}>
          <div><p style={{fontWeight:700,color:'#111827',margin:'0 0 2px',fontSize:'1rem'}}>📄 Nouveau devis</p><p style={{color:'#9CA3AF',fontSize:'0.78rem',margin:0}}>VAT 5% inclu automatiquement</p></div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer'}}><X size={16} color="#9CA3AF" /></button>
        </div>
        <div style={{padding:'18px 20px',display:'flex',flexDirection:'column',gap:14,maxHeight:'70vh',overflowY:'auto'}}>
          {/* Buyer info */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div><label style={{fontSize:'0.72rem',fontWeight:700,color:'#6B7280',display:'block',marginBottom:4}}>Nom acheteur *</label>
              <input style={inp} value={buyer.name} onChange={e=>setBuyer(b=>({...b,name:e.target.value}))} placeholder="Mohamed Al-Rashid" /></div>
            <div><label style={{fontSize:'0.72rem',fontWeight:700,color:'#6B7280',display:'block',marginBottom:4}}>Pays</label>
              <input style={inp} value={buyer.country} onChange={e=>setBuyer(b=>({...b,country:e.target.value}))} placeholder="UAE" /></div>
            <div><label style={{fontSize:'0.72rem',fontWeight:700,color:'#6B7280',display:'block',marginBottom:4}}>Email</label>
              <input style={inp} type="email" value={buyer.email} onChange={e=>setBuyer(b=>({...b,email:e.target.value}))} /></div>
            <div><label style={{fontSize:'0.72rem',fontWeight:700,color:'#6B7280',display:'block',marginBottom:4}}>Phone</label>
              <input style={inp} value={buyer.phone} onChange={e=>setBuyer(b=>({...b,phone:e.target.value}))} /></div>
          </div>
          {/* Vehicle + Broker */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div><label style={{fontSize:'0.72rem',fontWeight:700,color:'#6B7280',display:'block',marginBottom:4}}>Vehicle (optional)</label>
              <select style={{...inp,color:'#111827',background:'white'}} value={vehicleId} onChange={e=>setVehicleId(e.target.value)}>
                <option value="">-- Aucun --</option>
                {vehicles.map((v:any)=><option key={v.id} value={v.id}>{v.year} {v.make} {v.model} · {formatPrice(Number(v.price_aed))}</option>)}
              </select></div>
            <div><label style={{fontSize:'0.72rem',fontWeight:700,color:'#6B7280',display:'block',marginBottom:4}}>Broker (optionnel)</label>
              <select style={{...inp,color:'#111827',background:'white'}} value={brokerId} onChange={e=>setBrokerId(e.target.value)}>
                <option value="">-- Aucun --</option>
                {brokers.map((b:any)=><option key={b.id} value={b.id}>{b.full_name} · {b.affiliate_code}</option>)}
              </select></div>
          </div>
          {/* Line items */}
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <label style={{fontSize:'0.72rem',fontWeight:700,color:'#6B7280'}}>LIGNES</label>
              <button onClick={addItem} style={{fontSize:'0.72rem',fontWeight:700,color:'#C1272D',background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:4}}><Plus size={12}/>Add</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {items.map((it,i)=>(
                <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 60px 100px 24px',gap:6,alignItems:'center'}}>
                  <input style={inp} placeholder="Description" value={it.description} onChange={e=>updItem(i,'description',e.target.value)} />
                  <input style={{...inp,textAlign:'center'}} type="number" min={1} placeholder="Qty" value={it.quantity} onChange={e=>updItem(i,'quantity',e.target.value)} />
                  <input style={{...inp,textAlign:'right'}} type="number" min={0} placeholder="Prix" value={it.unit_price||''} onChange={e=>updItem(i,'unit_price',e.target.value)} />
                  {items.length>1&&<button onClick={()=>removeItem(i)} style={{background:'none',border:'none',cursor:'pointer',color:'#D1D5DB',padding:0}}><X size={13}/></button>}
                </div>
              ))}
            </div>
          </div>
          {/* Totals */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div><label style={{fontSize:'0.72rem',fontWeight:700,color:'#6B7280',display:'block',marginBottom:4}}>Remise (%)</label>
              <input style={inp} type="number" min={0} max={100} value={discountPct} onChange={e=>setDiscountPct(Number(e.target.value))} /></div>
            <div><label style={{fontSize:'0.72rem',fontWeight:700,color:'#6B7280',display:'block',marginBottom:4}}>TVA (%)</label>
              <input style={inp} type="number" min={0} max={100} value={taxPct} onChange={e=>setTaxPct(Number(e.target.value))} /></div>
          </div>
          <div style={{padding:'12px 14px',borderRadius:10,background:'#F8FAFF',border:'1px solid #E5E7EB'}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.8rem',color:'#6B7280',marginBottom:4}}><span>Sous-total</span><span>{formatPrice(subtotal)}</span></div>
            {discountPct>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'0.8rem',color:'#C1272D',marginBottom:4}}><span>Remise -{discountPct}%</span><span>-{formatPrice(discount)}</span></div>}
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.8rem',color:'#6B7280',marginBottom:6}}><span>TVA {taxPct}%</span><span>{formatPrice(tax)}</span></div>
            <div style={{display:'flex',justifyContent:'space-between',fontWeight:800,color:'#111827',fontSize:'1rem',paddingTop:6,borderTop:'1px solid #E5E7EB'}}><span>TOTAL</span><span>{formatPrice(total)}</span></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div><label style={{fontSize:'0.72rem',fontWeight:700,color:'#6B7280',display:'block',marginBottom:4}}>Valide jusqu'au</label>
              <input style={inp} type="date" value={validUntil} onChange={e=>setValidUntil(e.target.value)} /></div>
            <div><label style={{fontSize:'0.72rem',fontWeight:700,color:'#6B7280',display:'block',marginBottom:4}}>Notes</label>
              <input style={inp} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes internes…" /></div>
          </div>
          {err&&<div style={{padding:'8px 12px',background:'#FEF2F2',borderRadius:8,fontSize:'0.78rem',color:'#C1272D'}}>{err}</div>}
        </div>
        <div style={{padding:'14px 20px',borderTop:'1px solid #F3F4F6',display:'flex',gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:'10px 0',borderRadius:10,border:'1px solid #E5E7EB',background:'white',color:'#374151',cursor:'pointer',fontWeight:600}}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{flex:2,padding:'10px 0',borderRadius:10,border:'none',background:'#1E40AF',color:'white',cursor:'pointer',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {saving?<RefreshCw size={14} style={{animation:'spin 1s linear infinite'}}/>:<FileText size={14}/>}
            {saving?'Creating…':'Create quote'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function BillingPanel({ dealerId, onToast }: { dealerId:string; onToast:(m:string)=>void }) {
  const formatPrice = usePriceFormatter();
  const [stats,   setStats]   = useState<any>(null);
  const [quotes,  setQuotes]  = useState<any[]>([]);
  const [invoices,setInvoices]= useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingTab, setBillingTab] = useState<'quotes'|'invoices'>('quotes');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    if (!dealerId) return;
    setLoading(true);
    try {
      const [st, qt, inv] = await Promise.all([
        fetch(`/api/v1/billing/stats?dealer_id=${dealerId}`).then(r=>r.ok?r.json():null),
        fetch(`/api/v1/billing/quotes?dealer_id=${dealerId}`).then(r=>r.ok?r.json():[]),
        fetch(`/api/v1/billing/invoices?dealer_id=${dealerId}`).then(r=>r.ok?r.json():[]),
      ]);
      setStats(st); setQuotes(Array.isArray(qt)?qt:[]); setInvoices(Array.isArray(inv)?inv:[]);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(()=>{ load(); },[dealerId]);

  const quoteAction = async (id:string, action:'send'|'convert'|'reject') => {
    try {
      const res = await fetch(`/api/v1/billing/quotes/${id}/${action}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:'{}'});
      if (!res.ok) { const d=await res.json(); throw new Error(d.message||'Failed'); }
      onToast(action==='send'?'✉️ Quote sent':action==='convert'?'✅ Converted to invoice':'❌ Quote rejected');
      load();
    } catch(e:any) { onToast(e.message); }
  };

  const invoiceAction = async (id:string, action:'send'|'pay'|'cancel') => {
    try {
      const res = await fetch(`/api/v1/billing/invoices/${id}/${action}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:'{}'});
      if (!res.ok) { const d=await res.json(); throw new Error(d.message||'Failed'); }
      onToast(action==='send'?'✉️ Invoice sent':action==='pay'?'✅ Invoice marked paid':'❌ Invoice cancelled');
      load();
    } catch(e:any) { onToast(e.message); }
  };

  const filteredQuotes  = statusFilter ? quotes.filter(q=>q.status===statusFilter) : quotes;
  const filteredInvoices = statusFilter ? invoices.filter(i=>i.status===statusFilter) : invoices;

  const convRate = stats?.quotes?.conversion_rate_pct ?? 0;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {showCreate && <CreateQuoteModal dealerId={dealerId} onClose={()=>setShowCreate(false)} onDone={()=>{setShowCreate(false);onToast('📄 Quote created');load();}} />}

      {/* KPI row */}
      {stats && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))',gap:12}}>
          {[
            {label:'Total quotes',   value:stats.quotes?.total??0,        sub:`${stats.quotes?.this_month??0} this month`,  color:'#1E40AF', icon:FileText},
            {label:'Conversion rate',value:`${convRate}%`,              sub:`${stats.quotes?.converted??0} converted`, color:convRate>=50?'#007A3D':convRate>=25?'#92400E':'#C1272D', icon:Target},
            {label:'Factures total', value:stats.invoices?.total??0,     sub:`${stats.invoices?.this_month??0} ce mois`, color:'#374151', icon:Receipt},
            {label:'Revenue collected',   value:formatPrice(stats.revenue_collected_aed??0), sub:'paid invoices', color:'#007A3D', icon:DollarSign},
            {label:'En attente',    value:formatPrice(stats.revenue_outstanding_aed??0), sub:`${stats.invoices?.overdue??0} en retard`, color:stats.invoices?.overdue>0?'#C1272D':'#92400E', icon:Clock},
          ].map(c=>(
            <div key={c.label} style={{background:'white',border:'1px solid #E5E7EB',borderRadius:12,padding:'14px 16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <p style={{fontSize:'0.68rem',fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.06em',margin:0}}>{c.label}</p>
                <c.icon size={14} style={{color:c.color}}/>
              </div>
              <p style={{fontWeight:800,fontSize:'1.25rem',color:c.color,margin:'0 0 2px'}}>{c.value}</p>
              <p style={{fontSize:'0.7rem',color:'#9CA3AF',margin:0}}>{c.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs + filters + actions */}
      <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:4,background:'white',border:'1px solid #E5E7EB',borderRadius:10,padding:3}}>
          <button onClick={()=>{setBillingTab('quotes');setStatusFilter('');}} style={{padding:'7px 16px',borderRadius:8,border:'none',cursor:'pointer',fontWeight:700,fontSize:'0.8rem',background:billingTab==='quotes'?'#1E40AF':'transparent',color:billingTab==='quotes'?'white':'#6B7280'}}>Quotes ({quotes.length})</button>
          <button onClick={()=>{setBillingTab('invoices');setStatusFilter('');}} style={{padding:'7px 16px',borderRadius:8,border:'none',cursor:'pointer',fontWeight:700,fontSize:'0.8rem',background:billingTab==='invoices'?'#1E40AF':'transparent',color:billingTab==='invoices'?'white':'#6B7280'}}>Factures ({invoices.length})</button>
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {(billingTab==='quotes'?Object.entries(QUOTE_STATUS):Object.entries(INVOICE_STATUS)).map(([s,c])=>(
            <button key={s} onClick={()=>setStatusFilter(statusFilter===s?'':s)}
              style={{padding:'5px 11px',borderRadius:7,fontSize:'0.72rem',fontWeight:600,cursor:'pointer',border:'1.5px solid',borderColor:statusFilter===s?c.color:'#E5E7EB',background:statusFilter===s?c.bg:'white',color:statusFilter===s?c.color:'#6B7280'}}>{c.label}</button>
          ))}
        </div>
        <div style={{marginLeft:'auto'}}>
          {billingTab==='quotes' && <button onClick={()=>setShowCreate(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,border:'none',background:'#1E40AF',color:'white',fontWeight:700,fontSize:'0.82rem',cursor:'pointer'}}><Plus size={14}/>Nouveau devis</button>}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{padding:60,textAlign:'center',color:'#9CA3AF'}}><RefreshCw size={20} style={{animation:'spin 1s linear infinite',margin:'0 auto',display:'block'}}/></div>
      ) : billingTab==='quotes' ? (
        <div style={{background:'white',border:'1px solid #E5E7EB',borderRadius:14,overflow:'hidden'}}>
          {filteredQuotes.length===0 ? (
            <div style={{padding:'48px',textAlign:'center'}}><FileText size={32} style={{color:'#D1D5DB',margin:'0 auto 12px',display:'block'}}/><p style={{color:'#6B7280',fontWeight:500}}>Aucun devis</p></div>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead style={{background:'#F9FAFB'}}>
                <tr>{['Quote #','Buyer','Vehicle','Broker','Amount','Status','Valid until','Actions'].map(h=>(
                  <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:'0.68rem',fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filteredQuotes.map((q:any)=>{
                  const sc = QUOTE_STATUS[q.status]||QUOTE_STATUS.draft;
                  const expired = q.valid_until && new Date(q.valid_until)<new Date() && q.status==='sent';
                  return (
                    <tr key={q.id} style={{borderTop:'1px solid #F9FAFB'}}>
                      <td style={{padding:'10px 14px',fontWeight:700,fontSize:'0.82rem',color:'#1E40AF'}}>{q.quote_number}</td>
                      <td style={{padding:'10px 14px'}}><p style={{fontWeight:600,fontSize:'0.82rem',color:'#111827',margin:0}}>{q.buyer_name}</p><p style={{fontSize:'0.7rem',color:'#9CA3AF',margin:0}}>{q.buyer_country}</p></td>
                      <td style={{padding:'10px 14px',fontSize:'0.78rem',color:'#374151'}}>{q.vehicle?`${q.vehicle.year} ${q.vehicle.make} ${q.vehicle.model}`:'—'}</td>
                      <td style={{padding:'10px 14px',fontSize:'0.78rem',color:'#6B7280'}}>{q.broker_id?<span style={{fontSize:'0.7rem',background:'#EDE9FE',color:'#5B21B6',padding:'2px 7px',borderRadius:20,fontWeight:600}}>Broker</span>:'—'}</td>
                      <td style={{padding:'10px 14px',fontWeight:700,color:'#C1272D',fontSize:'0.85rem'}}>{formatPrice(Number(q.total_aed))}</td>
                      <td style={{padding:'10px 14px'}}><span style={{fontSize:'0.7rem',padding:'2px 8px',borderRadius:20,fontWeight:600,background:sc.bg,color:sc.color}}>{expired?'Expired':sc.label}</span></td>
                      <td style={{padding:'10px 14px',fontSize:'0.75rem',color:'#6B7280'}}>{q.valid_until?new Date(q.valid_until).toLocaleDateString('en-GB'):'—'}</td>
                      <td style={{padding:'10px 14px'}}>
                        <div style={{display:'flex',gap:4}}>
                          {q.status==='draft'&&<button onClick={()=>quoteAction(q.id,'send')} style={{padding:'4px 9px',borderRadius:7,border:'1px solid #BFDBFE',background:'#EFF6FF',color:'#1E40AF',fontSize:'0.7rem',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:3}}><Send size={11}/>Envoyer</button>}
                          {['draft','sent','accepted'].includes(q.status)&&!q.invoice&&<button onClick={()=>quoteAction(q.id,'convert')} style={{padding:'4px 9px',borderRadius:7,border:'1px solid #D1FAE5',background:'#F0FDF4',color:'#065F46',fontSize:'0.7rem',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:3}}><Receipt size={11}/>Facturer</button>}
                          {['draft','sent'].includes(q.status)&&<button onClick={()=>quoteAction(q.id,'reject')} style={{padding:'4px 9px',borderRadius:7,border:'1px solid #FECACA',background:'#FFF1F2',color:'#C1272D',fontSize:'0.7rem',fontWeight:700,cursor:'pointer'}}>×</button>}
                          {q.invoice&&<span style={{fontSize:'0.68rem',padding:'2px 7px',borderRadius:20,background:'#EDE9FE',color:'#5B21B6',fontWeight:600}}>{q.invoice.invoice_number}</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div style={{background:'white',border:'1px solid #E5E7EB',borderRadius:14,overflow:'hidden'}}>
          {filteredInvoices.length===0 ? (
            <div style={{padding:'48px',textAlign:'center'}}><Receipt size={32} style={{color:'#D1D5DB',margin:'0 auto 12px',display:'block'}}/><p style={{color:'#6B7280',fontWeight:500}}>Aucune facture</p></div>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead style={{background:'#F9FAFB'}}>
                <tr>{['Invoice #','Buyer','Vehicle','Amount','Status','Due date','Paid on','Actions'].map(h=>(
                  <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:'0.68rem',fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv:any)=>{
                  const sc = INVOICE_STATUS[inv.status]||INVOICE_STATUS.draft;
                  return (
                    <tr key={inv.id} style={{borderTop:'1px solid #F9FAFB'}}>
                      <td style={{padding:'10px 14px',fontWeight:700,fontSize:'0.82rem',color:'#374151'}}>{inv.invoice_number}</td>
                      <td style={{padding:'10px 14px'}}><p style={{fontWeight:600,fontSize:'0.82rem',color:'#111827',margin:0}}>{inv.buyer_name}</p><p style={{fontSize:'0.7rem',color:'#9CA3AF',margin:0}}>{inv.buyer_country}</p></td>
                      <td style={{padding:'10px 14px',fontSize:'0.78rem',color:'#374151'}}>{inv.vehicle?`${inv.vehicle.year} ${inv.vehicle.make} ${inv.vehicle.model}`:'—'}</td>
                      <td style={{padding:'10px 14px',fontWeight:800,color:'#007A3D',fontSize:'0.9rem'}}>{formatPrice(Number(inv.total_aed))}</td>
                      <td style={{padding:'10px 14px'}}><span style={{fontSize:'0.7rem',padding:'2px 8px',borderRadius:20,fontWeight:600,background:sc.bg,color:sc.color}}>{sc.label}</span></td>
                      <td style={{padding:'10px 14px',fontSize:'0.75rem',color:inv.status==='overdue'?'#C1272D':'#6B7280',fontWeight:inv.status==='overdue'?700:400}}>{inv.due_date?new Date(inv.due_date).toLocaleDateString('en-GB'):'—'}</td>
                      <td style={{padding:'10px 14px',fontSize:'0.75rem',color:'#007A3D'}}>{inv.paid_at?new Date(inv.paid_at).toLocaleDateString('en-GB'):'—'}</td>
                      <td style={{padding:'10px 14px'}}>
                        <div style={{display:'flex',gap:4}}>
                          {inv.status==='draft'&&<button onClick={()=>invoiceAction(inv.id,'send')} style={{padding:'4px 9px',borderRadius:7,border:'1px solid #BFDBFE',background:'#EFF6FF',color:'#1E40AF',fontSize:'0.7rem',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:3}}><Send size={11}/>Envoyer</button>}
                          {['sent','overdue'].includes(inv.status)&&<button onClick={()=>invoiceAction(inv.id,'pay')} style={{padding:'4px 9px',borderRadius:7,border:'1px solid #D1FAE5',background:'#F0FDF4',color:'#065F46',fontSize:'0.7rem',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:3}}><Check size={11}/>Mark paid</button>}
                          {!['paid','cancelled'].includes(inv.status)&&<button onClick={()=>invoiceAction(inv.id,'cancel')} style={{padding:'4px 9px',borderRadius:7,border:'1px solid #FECACA',background:'#FFF1F2',color:'#C1272D',fontSize:'0.7rem',fontWeight:700,cursor:'pointer'}}>×</button>}
                        </div>
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
  );
}
