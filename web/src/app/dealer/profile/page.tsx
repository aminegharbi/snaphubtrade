'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Save, RefreshCw, Check, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

const ZONES = ['Dubai Free Zone','Jebel Ali JAFZA','Dubai Mainland','Sharjah','Abu Dhabi','RAK','Ajman','Fujairah'];
const LANGS = ['Arabic','English','French','Russian','Chinese','Hindi','Urdu','German'];
const SPECS = ['Luxury Cars','Sports Cars','SUVs & 4x4','Electric Vehicles','Classic Cars','Commercial Vehicles','Budget Cars','Export Specialist'];

const inp: React.CSSProperties = {
  width:'100%', padding:'11px 14px', border:'2px solid #E5E7EB', borderRadius:10,
  fontSize:'0.9rem', color:'#111827', background:'white', outline:'none', boxSizing:'border-box' as any,
};

export default function DealerProfilePage() {
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dealerId, setDealerId] = useState('');

  useEffect(() => {
    const did = localStorage.getItem('dealer_id') || '';
    setDealerId(did);
    api.get<any>(`/dealers/${did}`).then(d => {
      setForm({
        company_name: d.company_name || '', email: d.email || '', phone: d.phone || '',
        website: d.website || '', address: d.address || '', zone: d.zone || 'Dubai Free Zone',
        trade_license: d.trade_license || '', trn: d.trn || '', description: d.description || '',
        languages: d.languages || ['English','Arabic'], specialties: d.specialties || [],
        working_hours: d.working_hours || 'Mon–Sat 9:00–18:00',
        vat_registered: d.vat_registered ?? true, export_enabled: d.export_enabled ?? false,
      });
    }).catch(() => setForm({
      company_name:'', email:'', phone:'', website:'', address:'', zone:'Dubai Free Zone',
      trade_license:'', trn:'', description:'', languages:['English'], specialties:[],
      working_hours:'', vat_registered:true, export_enabled:false,
    }));
  }, []);

  const save = async () => {
    setSaving(true);
    try { await api.patch(`/dealers/${dealerId}`, form); setSaved(true); setTimeout(()=>setSaved(false),2500); }
    catch { } finally { setSaving(false); }
  };

  const set = (k: string, v: any) => setForm((f:any) => ({ ...f, [k]: v }));
  const toggle = (k: string, v: string) => setForm((f:any) => ({
    ...f, [k]: f[k].includes(v) ? f[k].filter((x:string)=>x!==v) : [...f[k], v]
  }));

  if (!form) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <RefreshCw size={20} style={{ color:'#9CA3AF', animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const Section = ({ title, children }: { title:string; children:any }) => (
    <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:16, overflow:'hidden', marginBottom:14 }}>
      <div style={{ padding:'13px 18px', borderBottom:'1px solid #F3F4F6', background:'#FAFAFA' }}>
        <p style={{ fontWeight:700, color:'#111827', margin:0, fontSize:'0.88rem' }}>{title}</p>
      </div>
      <div style={{ padding:18 }}>{children}</div>
    </div>
  );

  const Field = ({ label, children, half }: { label:string; children:any; half?:boolean }) => (
    <div style={{ marginBottom:14, flex:half?'1 1 calc(50% - 7px)':'1 1 100%' }}>
      <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:5 }}>{label}</label>
      {children}
    </div>
  );

  const Row = ({ children }: any) => (
    <div style={{ display:'flex', flexWrap:'wrap', gap:14 }}>{children}</div>
  );

  return (
    <div style={{ minHeight:'100dvh', background:'#F9FAFB' }}>
      <div style={{ position:'sticky', top:0, zIndex:30, background:'white', borderBottom:'1px solid #E5E7EB', padding:'13px 18px', display:'flex', alignItems:'center', gap:10 }}>
        <a href="/dealer/dashboard" style={{ display:'flex', alignItems:'center', gap:5, color:'#6B7280', textDecoration:'none', fontSize:'0.82rem', flexShrink:0 }}>
          <ArrowLeft size={15} /> Dashboard
        </a>
        <p style={{ fontWeight:700, color:'#111827', margin:0, flex:1, fontSize:'0.95rem' }}>Dealer Profile</p>
        <button onClick={save} disabled={saving}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', background:saved?'#007A3D':'#C1272D', color:'white', border:'none', borderRadius:9, cursor:'pointer', fontWeight:700, fontSize:'0.8rem' }}>
          {saving?<RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }}/>:saved?<Check size={13}/>:<Save size={13}/>}
          {saving?'Saving…':saved?'Saved!':'Save'}
        </button>
      </div>

      <div style={{ maxWidth:720, margin:'0 auto', padding:'20px 14px' }}>
        <Section title="🏢 Company">
          <Row>
            <Field label="Company name" half><input style={inp} value={form.company_name} onChange={e=>set('company_name',e.target.value)} placeholder="Al Zaabi Motors LLC" /></Field>
            <Field label="Working hours" half><input style={inp} value={form.working_hours} onChange={e=>set('working_hours',e.target.value)} placeholder="Mon–Sat 9:00–18:00" /></Field>
          </Row>
          <Field label="Description">
            <textarea style={{ ...inp, minHeight:80, resize:'vertical' }} value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Brief description of your dealership..." />
          </Field>
        </Section>

        <Section title="📍 Location">
          <Row>
            <Field label="Zone" half>
              <select style={inp} value={form.zone} onChange={e=>set('zone',e.target.value)}>
                {ZONES.map(z=><option key={z}>{z}</option>)}
              </select>
            </Field>
            <Field label="Address" half><input style={inp} value={form.address} onChange={e=>set('address',e.target.value)} placeholder="Building / Street, Dubai" /></Field>
          </Row>
        </Section>

        <Section title="📞 Contact">
          <Row>
            <Field label="Email" half><input type="email" style={inp} value={form.email} onChange={e=>set('email',e.target.value)} placeholder="info@dealer.ae" /></Field>
            <Field label="Phone / WhatsApp" half><input type="tel" style={inp} value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+971 50 000 0000" /></Field>
            <Field label="Website" half><input type="url" style={inp} value={form.website} onChange={e=>set('website',e.target.value)} placeholder="https://dealer.ae" /></Field>
          </Row>
        </Section>

        <Section title="🧾 Legal & Fiscal">
          <Row>
            <Field label="Trade License No." half><input style={inp} value={form.trade_license} onChange={e=>set('trade_license',e.target.value)} placeholder="DED-XXXX-XXXX" /></Field>
            <Field label="TRN (VAT Registration)" half><input style={inp} value={form.trn} onChange={e=>set('trn',e.target.value)} placeholder="100XXXXXXXXX003" /></Field>
          </Row>
          <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
            {[{k:'vat_registered',l:'VAT registered (5%)'},{k:'export_enabled',l:'Export licenced'}].map(o=>(
              <label key={o.k} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:'0.875rem', color:'#374151', userSelect:'none' }}>
                <input type="checkbox" checked={!!form[o.k]} onChange={e=>set(o.k,e.target.checked)} style={{ accentColor:'#C1272D', width:17, height:17 }} />
                {o.l}
              </label>
            ))}
          </div>
        </Section>

        <Section title="🌐 Languages spoken">
          <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
            {LANGS.map(l => {
              const on = form.languages.includes(l);
              return <button key={l} onClick={()=>toggle('languages',l)} style={{ padding:'7px 13px', borderRadius:20, fontSize:'0.8rem', fontWeight:600, cursor:'pointer', border:'1.5px solid', borderColor:on?'#C1272D':'#E5E7EB', background:on?'#FEE2E2':'white', color:on?'#C1272D':'#6B7280' }}>{l}</button>;
            })}
          </div>
        </Section>

        <Section title="🚗 Specialties">
          <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
            {SPECS.map(s => {
              const on = form.specialties.includes(s);
              return <button key={s} onClick={()=>toggle('specialties',s)} style={{ padding:'7px 13px', borderRadius:20, fontSize:'0.8rem', fontWeight:600, cursor:'pointer', border:'1.5px solid', borderColor:on?'#007A3D':'#E5E7EB', background:on?'#D1FAE5':'white', color:on?'#007A3D':'#6B7280' }}>{s}</button>;
            })}
          </div>
        </Section>

        <button onClick={save} disabled={saving}
          style={{ width:'100%', padding:'14px', background:saved?'#007A3D':'#C1272D', color:'white', border:'none', borderRadius:12, fontWeight:800, fontSize:'1rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:32 }}>
          {saving?<RefreshCw size={16} style={{ animation:'spin 1s linear infinite' }}/>:saved?<Check size={16}/>:<Save size={16}/>}
          {saving?'Saving…':saved?'Profile saved!':'Save profile'}
        </button>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
