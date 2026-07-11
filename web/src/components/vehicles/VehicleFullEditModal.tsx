'use client';
import { useState } from 'react';
import { X, Check, RefreshCw, QrCode, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';
import { requiredError, yearError, priceError, numberRangeError, vinError } from '@/lib/validation';
import { useLocale } from '@/contexts/LocaleContext';
import { translateValidationError } from '@/i18n/validationMessages';

const MAKES = ['Toyota','Nissan','BMW','Mercedes-Benz','Audi','Porsche','Land Rover','Lexus','Ford','RAM','Chevrolet','GMC','BYD','MG','Hyundai','Kia','Honda','Mitsubishi','Isuzu','Jeep'];
const BODY_TYPES = ['SUV','Sedan','Pickup','Coupe','Convertible','Wagon','Van','Minivan','Hatchback','Crossover'];
const FUEL_TYPES = ['Petrol','Diesel','Hybrid','Plug-in Hybrid','Electric','LPG'];
const TRANSMISSIONS = ['Automatic','Manual','CVT','Semi-Automatic'];
const YEARS = Array.from({length:30},(_:any,i:number)=>2025-i);

const STATUS_CFG: Record<string,{label:string;color:string;bg:string}> = {
  available:{label:'Available',color:'#065F46',bg:'#D1FAE5'},
  reserved:{label:'Reserved',color:'#92400E',bg:'#FEF3C7'},
  sold:{label:'Sold',color:'#374151',bg:'#F3F4F6'},
  draft:{label:'Draft',color:'#5B21B6',bg:'#EDE9FE'},
  pending_payment:{label:'Pending',color:'#1E40AF',bg:'#DBEAFE'},
  exported:{label:'Exported',color:'#065F46',bg:'#D1FAE5'},
};

const inp: React.CSSProperties = {
  width:'100%',padding:'9px 12px',border:'1.5px solid #E5E7EB',borderRadius:9,
  fontSize:'0.875rem',color:'#111827',background:'white',outline:'none',boxSizing:'border-box' as any,
};

function Sec({ title, open, toggle, children }: any) {
  return (
    <div style={{ border:'1px solid #E5E7EB',borderRadius:12,overflow:'hidden',marginBottom:10 }}>
      <button onClick={toggle} style={{ width:'100%',padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#F9FAFB',border:'none',cursor:'pointer' }}>
        <span style={{ fontWeight:700,fontSize:'0.85rem',color:'#111827' }}>{title}</span>
        {open ? <ChevronUp size={15} color="#9CA3AF" /> : <ChevronDown size={15} color="#9CA3AF" />}
      </button>
      {open && <div style={{ padding:'14px 16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>{children}</div>}
    </div>
  );
}

function F({ label, children, full }: any) {
  return (
    <div style={{ gridColumn: full ? '1/-1' : undefined }}>
      <label style={{ display:'block',fontSize:'0.68rem',fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4 }}>{label}</label>
      {children}
    </div>
  );
}

export function VehicleFullEditModal({ vehicle: v, onClose, onSave }: { vehicle:any; onClose:()=>void; onSave:(u:any)=>void }) {
  const { locale } = useLocale();
  const [d, setD] = useState({
    make:v.make||'',model:v.model||'',year:v.year||2024,trim:v.trim||'',
    vin:v.vin||'',plate_number:v.plate_number||'',
    body_type:v.body_type||'',doors:v.doors||'',seats:v.seats||'',
    color_exterior:v.color_exterior||'',color_interior:v.color_interior||'',
    fuel_type:v.fuel_type||'',transmission:v.transmission||'',
    engine:v.engine||'',engine_power_hp:v.engine_power_hp||'',
    mileage_km:v.mileage_km??0,price_aed:v.price_aed||0,is_new:!!v.is_new,
    export_eligible:!!v.export_eligible,negotiable:!!v.negotiable,
    status:v.status||'available',stock_quantity:v.stock_quantity||1,
    title:v.title||'',description:v.description||'',
  });
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState('');
  const [secs,setSecs]=useState({identity:true,body:false,engine:false,commercial:true,content:false});
  const [showQR,setShowQR]=useState(false);

  const set=(k:string,v:any)=>setD(p=>({...p,[k]:v}));
  const tog=(k:keyof typeof secs)=>setSecs(p=>({...p,[k]:!p[k]}));

  const validate = (): string | null => {
    return (
      requiredError(d.make, 'Make', 1, 60) ||
      requiredError(d.model, 'Model', 1, 80) ||
      yearError(d.year) ||
      priceError(d.price_aed) ||
      numberRangeError(d.mileage_km, 'Mileage', 0, 2_000_000) ||
      numberRangeError(d.stock_quantity, 'Stock quantity', 1, 9999) ||
      vinError(d.vin) ||
      null
    );
  };

  const save=async()=>{
    const validationError = validate();
    if (validationError) { setErr(validationError); return; }
    setSaving(true);setErr('');
    try{ const u=await api.patch(`/vehicles/${v.id}`,d); onSave({...v,...d,...u}); onClose(); }
    catch(e:any){ setErr(e.message||'Save failed'); }
    finally{ setSaving(false); }
  };

  const origin=typeof window!=='undefined'?window.location.origin:'https://snaphubtrade.com';
  const vehicleUrl=`${origin}/vehicle/${v.id}`;
  const qrUrl=`https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&data=${encodeURIComponent(vehicleUrl)}`;
  const downloadQR=()=>{ const a=document.createElement('a'); a.href=qrUrl; a.download=`qr-${d.year}-${d.make}-${d.model}.png`; a.target='_blank'; a.click(); };

  return (
    <div style={{ position:'fixed',inset:0,zIndex:50,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'12px',overflowY:'auto' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'white',borderRadius:18,width:'100%',maxWidth:580,marginTop:8,marginBottom:8,overflow:'hidden',boxShadow:'0 32px 64px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'14px 18px',borderBottom:'1px solid #F3F4F6',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:'white',zIndex:10 }}>
          <div>
            <p style={{ fontWeight:800,color:'#111827',margin:0,fontSize:'0.95rem' }}>Edit vehicle</p>
            <p style={{ fontSize:'0.72rem',color:'#9CA3AF',margin:0 }}>{v.year} {v.make} {v.model}</p>
          </div>
          <div style={{ display:'flex',gap:8 }}>
            <button onClick={()=>setShowQR(!showQR)} style={{ display:'flex',alignItems:'center',gap:5,padding:'7px 11px',border:'1px solid #E5E7EB',borderRadius:9,background:showQR?'#F3F4F6':'white',cursor:'pointer',fontSize:'0.75rem',fontWeight:600,color:'#374151' }}>
              <QrCode size={13}/> QR
            </button>
            <button onClick={onClose} style={{ padding:7,border:'1px solid #E5E7EB',borderRadius:9,background:'white',cursor:'pointer' }}><X size={15} color="#9CA3AF"/></button>
          </div>
        </div>
        <div style={{ padding:'14px 18px',maxHeight:'78vh',overflowY:'auto' }}>
          {showQR&&(
            <div style={{ border:'1.5px solid #E5E7EB',borderRadius:12,padding:16,marginBottom:14,display:'flex',alignItems:'center',gap:16,flexWrap:'wrap' }}>
              <img src={qrUrl} alt="QR" width={110} height={110} style={{ borderRadius:8,border:'1px solid #E5E7EB',flexShrink:0 }}/>
              <div style={{ flex:1,minWidth:160 }}>
                <p style={{ fontWeight:700,color:'#111827',margin:'0 0 4px',fontSize:'0.875rem' }}>Vehicle QR Code</p>
                <p style={{ fontSize:'0.72rem',color:'#9CA3AF',margin:'0 0 10px' }}>Direct link to this listing</p>
                <p style={{ fontSize:'0.68rem',color:'#6B7280',margin:'0 0 10px',wordBreak:'break-all',background:'#F9FAFB',padding:'6px 9px',borderRadius:7 }}>{vehicleUrl}</p>
                <button onClick={downloadQR} style={{ display:'flex',alignItems:'center',gap:5,padding:'7px 12px',background:'#C1272D',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:700,fontSize:'0.78rem' }}>
                  <Download size={12}/> Download PNG
                </button>
              </div>
            </div>
          )}
          {err&&<div style={{ marginBottom:12,padding:'9px 13px',background:'#FEF2F2',borderRadius:9,fontSize:'0.82rem',color:'#C1272D' }}>{translateValidationError(err, locale)}</div>}
          <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:12 }}>
            {Object.entries(STATUS_CFG).map(([s,c])=>(
              <button key={s} onClick={()=>set('status',s)} style={{ padding:'5px 11px',borderRadius:20,fontSize:'0.7rem',fontWeight:700,cursor:'pointer',border:'1.5px solid',borderColor:d.status===s?c.color:'#E5E7EB',background:d.status===s?c.bg:'white',color:d.status===s?c.color:'#9CA3AF' }}>{c.label}</button>
            ))}
          </div>
          <div style={{ display:'flex',gap:12,marginBottom:12,flexWrap:'wrap' }}>
            {[{k:'is_new',l:'Brand new'},{k:'export_eligible',l:'✈ Export'},{k:'negotiable',l:'💬 Negotiable'}].map(o=>(
              <label key={o.k} style={{ display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:'0.8rem',color:'#374151',userSelect:'none' as any }}>
                <input type="checkbox" checked={!!(d as any)[o.k]} onChange={e=>set(o.k,e.target.checked)} style={{ accentColor:'#C1272D',width:15,height:15 }}/>{o.l}
              </label>
            ))}
          </div>
          <Sec title="🔑 Identity" open={secs.identity} toggle={()=>tog('identity')}>
            <F label="Make"><select style={inp} value={d.make} onChange={e=>set('make',e.target.value)}><option value="">Select</option>{MAKES.map(m=><option key={m}>{m}</option>)}</select></F>
            <F label="Model"><input style={inp} value={d.model} onChange={e=>set('model',e.target.value)} placeholder="Land Cruiser"/></F>
            <F label="Year"><select style={inp} value={d.year} onChange={e=>set('year',+e.target.value)}>{YEARS.map(y=><option key={y}>{y}</option>)}</select></F>
            <F label="Trim"><input style={inp} value={d.trim} onChange={e=>set('trim',e.target.value)} placeholder="VXR / Executive"/></F>
            <F label="VIN"><input style={inp} value={d.vin} onChange={e=>set('vin',e.target.value)} placeholder="17-char VIN"/></F>
            <F label="Plate No."><input style={inp} value={d.plate_number} onChange={e=>set('plate_number',e.target.value)} placeholder="Dubai A 12345"/></F>
          </Sec>
          <Sec title="🚗 Body & Exterior" open={secs.body} toggle={()=>tog('body')}>
            <F label="Body type"><select style={inp} value={d.body_type} onChange={e=>set('body_type',e.target.value)}><option value="">Select</option>{BODY_TYPES.map(b=><option key={b}>{b}</option>)}</select></F>
            <F label="Ext. colour"><input style={inp} value={d.color_exterior} onChange={e=>set('color_exterior',e.target.value)} placeholder="Pearl White"/></F>
            <F label="Int. colour"><input style={inp} value={d.color_interior} onChange={e=>set('color_interior',e.target.value)} placeholder="Black Leather"/></F>
            <F label="Doors"><input type="number" style={inp} value={d.doors} min={2} max={6} onChange={e=>set('doors',+e.target.value)}/></F>
            <F label="Seats"><input type="number" style={inp} value={d.seats} min={1} max={12} onChange={e=>set('seats',+e.target.value)}/></F>
          </Sec>
          <Sec title="⚙️ Powertrain" open={secs.engine} toggle={()=>tog('engine')}>
            <F label="Fuel"><select style={inp} value={d.fuel_type} onChange={e=>set('fuel_type',e.target.value)}><option value="">Select</option>{FUEL_TYPES.map(f=><option key={f}>{f}</option>)}</select></F>
            <F label="Transmission"><select style={inp} value={d.transmission} onChange={e=>set('transmission',e.target.value)}><option value="">Select</option>{TRANSMISSIONS.map(t=><option key={t}>{t}</option>)}</select></F>
            <F label="Engine"><input style={inp} value={d.engine} onChange={e=>set('engine',e.target.value)} placeholder="3.5L V6 Twin-Turbo"/></F>
            <F label="Power (hp)"><input type="number" style={inp} value={d.engine_power_hp} onChange={e=>set('engine_power_hp',+e.target.value)}/></F>
          </Sec>
          <Sec title="💰 Commercial" open={secs.commercial} toggle={()=>tog('commercial')}>
            <F label={`Price (${v.currency || 'AED'})`}><input type="number" style={inp} value={d.price_aed} onChange={e=>set('price_aed',+e.target.value)}/></F>
            <F label="Mileage (km)"><input type="number" style={inp} value={d.mileage_km} onChange={e=>set('mileage_km',+e.target.value)}/></F>
            <F label="Stock qty"><input type="number" style={inp} value={d.stock_quantity} min={1} onChange={e=>set('stock_quantity',+e.target.value)}/></F>
          </Sec>
          <Sec title="📝 Description" open={secs.content} toggle={()=>tog('content')}>
            <F label="SEO Title" full><input style={inp} value={d.title} onChange={e=>set('title',e.target.value)} placeholder="2024 Toyota Land Cruiser VXR — Dubai"/></F>
            <F label="Description" full><textarea style={{ ...inp,minHeight:80,resize:'vertical' }} value={d.description} onChange={e=>set('description',e.target.value)} placeholder="Full vehicle description…"/></F>
          </Sec>
        </div>
        <div style={{ padding:'12px 18px',borderTop:'1px solid #F3F4F6',display:'flex',gap:10,position:'sticky',bottom:0,background:'white' }}>
          <button onClick={onClose} style={{ flex:1,padding:'11px 0',border:'1px solid #E5E7EB',borderRadius:10,background:'white',color:'#374151',cursor:'pointer',fontWeight:600,fontSize:'0.875rem' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex:2,padding:'11px 0',border:'none',borderRadius:10,background:'#C1272D',color:'white',cursor:'pointer',fontWeight:700,fontSize:'0.875rem',display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
            {saving?<RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }}/>:<Check size={14}/>}
            {saving?'Saving…':'Save all changes'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
