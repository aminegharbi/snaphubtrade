'use client';
export const dynamic = 'force-dynamic';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { Upload, Camera, Check, ChevronRight, Plus, RefreshCw, X, AlertCircle, Scan, Hash } from 'lucide-react';
import { usePriceFormatter } from '@/components/common/Price';
import { api } from '@/lib/api';

interface VehicleForm {
  make: string; model: string; year: number; trim: string;
  body_type: string; fuel_type: string; transmission: string;
  engine: string; color_exterior: string; color_interior: string;
  mileage_km: number; price_aed: number;
  export_eligible: boolean; status: string;
  title: string; description: string;
  dealer_id: string;
  vin: string; qr_token: string;
  plate_number: string;
  stock_quantity: number;
}

const EMPTY: VehicleForm = {
  make:'', model:'', year: new Date().getFullYear(), trim:'',
  body_type:'SUV', fuel_type:'petrol', transmission:'automatic',
  engine:'', color_exterior:'', color_interior:'',
  mileage_km:0, price_aed:0, export_eligible:true, status:'available',
  title:'', description:'', dealer_id:'', vin:'', qr_token:'', plate_number:'',
};

const MAKES=['Toyota','Mercedes-Benz','BMW','Nissan','Porsche','Range Rover','Ford','Rolls-Royce','Lamborghini','Ferrari','Audi','Lexus','Cadillac','Chevrolet','GMC','BYD','MG','Tesla','Haval','Jeep','Mitsubishi','Honda','Kia','Hyundai','Volvo','Bentley','Maserati','McLaren','Dodge','Ram'];
const FUEL_TYPES=['petrol','diesel','hybrid','electric','phev'];
const BODY_TYPES=['SUV','Sedan','Hatchback','Coupe','Pickup','Convertible','Wagon','MPV','Van'];

function Pills({ options, value, onChange }: { options:{value:string;label:string}[]; value:string; onChange:(v:string)=>void }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          style={{ padding:'6px 12px', borderRadius:8, fontSize:'0.8rem', fontWeight:500, cursor:'pointer', border:'1.5px solid', transition:'all 0.12s',
            borderColor: value===o.value ? '#C1272D' : '#E5E7EB',
            background: value===o.value ? '#FFF1F2' : 'white',
            color: value===o.value ? '#C1272D' : '#6B7280' }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children, hint }: { label:string; children:React.ReactNode; hint?:string }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize:'0.72rem', color:'#9CA3AF', marginTop:4 }}>{hint}</p>}
    </div>
  );
}

export default function InventoryNewPage() {
  const { t } = useLocale();
  const formatPrice = usePriceFormatter();
  const [form, setForm] = useState<VehicleForm>(EMPTY);
  const [photos, setPhotos] = useState<File[]>([]);
  const [stage, setStage] = useState<'form'|'saving'|'done'>('form');
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStage, setAiStage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [vinLookup, setVinLookup] = useState(false);

  useEffect(() => {
    const did = localStorage.getItem('dealer_id') || '';
    if (did) setForm(f => ({ ...f, dealer_id: did }));
  }, []);

  // Auto-generate QR token when vehicle is created
  const sf = (k: keyof VehicleForm, v: any) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (form.make && form.model && form.year) {
      sf('title', `${form.year} ${form.make} ${form.model}${form.trim ? ' '+form.trim : ''}`);
    }
  }, [form.make, form.model, form.year, form.trim]);

  const runAI = async (files: File[]) => {
    if (!files.length) return;
    setAiLoading(true);
    setAiStage('Reading photos…');

    try {
      // Convert images to base64 — sent to NestJS which calls Anthropic SDK server-side
      const stages = ['Reading photos…', 'Detecting make & model…', 'Analysing specs…', 'Estimating UAE price…'];
      let stageIdx = 0;
      const stageTimer = setInterval(() => {
        stageIdx = (stageIdx + 1) % stages.length;
        setAiStage(stages[stageIdx]);
      }, 700);

      const imagePayloads = await Promise.all(
        files.slice(0, 3).map(async (file) => {
          return new Promise<{ data: string; mediaType: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              const base64 = dataUrl.split(',')[1];
              const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
              resolve({ data: base64, mediaType });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );

      clearInterval(stageTimer);
      setAiStage('AI analyzing vehicle…');

      const res = await fetch('/api/v1/ai/analyze-vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: imagePayloads, dealer_id: form.dealer_id }),
      });

      if (!res.ok) throw new Error('AI service unavailable');
      const result = await res.json();

      if (result.error) throw new Error(result.error);

      setForm(f => ({
        ...f,
        make:           result.make           || f.make,
        model:          result.model          || f.model,
        year:           result.year           || f.year,
        trim:           result.trim           || f.trim,
        body_type:      result.body_type      || f.body_type,
        fuel_type:      result.fuel_type      || f.fuel_type,
        transmission:   result.transmission   || f.transmission,
        engine:         result.engine         || f.engine,
        color_exterior: result.color_exterior || f.color_exterior,
        color_interior: result.color_interior || f.color_interior,
        price_aed:      result.price_suggested_aed || f.price_aed,
        description:    result.description    || f.description,
      }));

      setAiStage('✓ Form auto-filled!');
      setTimeout(() => setAiStage(''), 2000);

    } catch (err: any) {
      console.error('AI analysis error:', err);
      setAiStage('⚠ AI unavailable — fill manually');
      setTimeout(() => setAiStage(''), 3000);
    } finally {
      setAiLoading(false);
    }
  };

  const handleFiles = (files: File[]) => {
    const imgs = files.filter(f => f.type.startsWith('image/')).slice(0, 10);
    setPhotos(imgs);
    if (imgs.length > 0) runAI(imgs);
  };

  const handleSubmit = async (statusOverride?: string) => {
    setError('');
    if (!form.make.trim()) { setError(t('vform.error.make_required')); return; }
    if (!form.model.trim()) { setError(t('vform.error.model_required')); return; }
    if (!form.price_aed || form.price_aed <= 0) { setError(t('vform.error.price_required')); return; }
    if (!form.dealer_id) { setError(t('vform.error.not_logged_in')); return; }
    setStage('saving');
    try {
      const payload = {
        dealer_id: form.dealer_id, make: form.make.trim(), model: form.model.trim(),
        year: Number(form.year), trim: form.trim.trim()||null, body_type: form.body_type||null,
        fuel_type: form.fuel_type||null, transmission: form.transmission||null,
        engine: form.engine.trim()||null, color_exterior: form.color_exterior.trim()||null,
        color_interior: form.color_interior.trim()||null, mileage_km: Number(form.mileage_km)||0,
        price_aed: Number(form.price_aed), export_eligible: form.export_eligible,
        status: statusOverride||form.status,
        title: form.title.trim()||`${form.year} ${form.make} ${form.model}`,
        description: form.description.trim()||null,
        vin: form.vin.trim().toUpperCase()||null,
        plate_number: form.plate_number.trim().toUpperCase()||null,
        stock_quantity: Number(form.stock_quantity)||1,
      };
      const vehicle = await api.post<any>('/vehicles', payload);
      setSavedId(vehicle.id);

      // Auto-create QR code for the new vehicle
      try { await api.get(`/collaborative/vehicles/${vehicle.id}/qr`); } catch { /* non-fatal */ }

      // Upload photos
      if (photos.length > 0 && vehicle.id) {
        try {
          const fd = new FormData();
          fd.append('vehicleId', vehicle.id);
          photos.forEach(f => fd.append('files', f));
          await fetch('/api/v1/vehicles/upload-images', { method:'POST', body:fd });
        } catch { /* non-fatal */ }
      }

      // Log timeline
      try {
        await api.post(`/collaborative/vehicles/${vehicle.id}/timeline`, {
          event_type: 'created', actor_id: form.dealer_id,
          event_data: { make: form.make, model: form.model, year: form.year },
        });
        if (photos.length > 0) {
          await api.post(`/collaborative/vehicles/${vehicle.id}/timeline`, {
            event_type: 'photographed', actor_id: form.dealer_id,
            event_data: { photo_count: photos.length },
          });
        }
        if ((statusOverride||form.status) === 'available') {
          await api.post(`/collaborative/vehicles/${vehicle.id}/timeline`, {
            event_type: 'published', actor_id: form.dealer_id, event_data: {},
          });
        }
      } catch { /* non-fatal */ }

      setStage('done');
    } catch (err: any) {
      setError(err.message || 'Failed to save vehicle');
      setStage('form');
    }
  };

  if (stage === 'done') return (
    <div style={{ minHeight:'100vh', background:'#F9FAFB', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', maxWidth:360, padding:24 }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:'#D1FAE5', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <Check size={28} color="#065F46" />
        </div>
        <h2 style={{ fontWeight:700, fontSize:'1.25rem', color:'#111827', marginBottom:8 }}>{t('dealer.inventory.published')}</h2>
        <p style={{ color:'#6B7280', fontSize:'0.875rem', marginBottom:4 }}>Listed in marketplace. QR code auto-generated.</p>
        {savedId && <p style={{ fontSize:'0.75rem', color:'#9CA3AF', marginBottom:24, fontFamily:'monospace' }}>ID: {savedId}</p>}
        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
          <button onClick={() => { setStage('form'); setForm({ ...EMPTY, dealer_id: form.dealer_id }); setPhotos([]); setSavedId(''); }}
            style={{ padding:'10px 20px', background:'#C1272D', color:'white', border:'none', borderRadius:10, fontWeight:600, cursor:'pointer' }}>
            Add another
          </button>
          {savedId && <a href={`/vehicle/${savedId}`} style={{ padding:'10px 20px', border:'1px solid #E5E7EB', borderRadius:10, color:'#374151', textDecoration:'none', fontSize:'0.875rem' }}>View listing</a>}
          {savedId && <a href={`/dealer/timeline/${savedId}`} style={{ padding:'10px 20px', border:'1px solid #E5E7EB', borderRadius:10, color:'#374151', textDecoration:'none', fontSize:'0.875rem' }}>Timeline</a>}
          <a href="/dealer/dashboard" style={{ padding:'10px 20px', border:'1px solid #E5E7EB', borderRadius:10, color:'#374151', textDecoration:'none', fontSize:'0.875rem' }}>Dashboard</a>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#F9FAFB' }}>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:'none' }}
        onChange={e => { if(e.target.files) handleFiles(Array.from(e.target.files)); }} />

      {/* Header */}
      <div style={{ background:'white', borderBottom:'1px solid #E5E7EB', padding:'16px 24px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.875rem', color:'#6B7280' }}>
          <a href="/dealer/dashboard" style={{ color:'#9CA3AF', textDecoration:'none' }}>Dashboard</a>
          <ChevronRight size={13} />
          <span style={{ color:'#111827', fontWeight:500 }}>Add vehicle</span>
        </div>
      </div>

      <div style={{ maxWidth:680, margin:'0 auto', padding:'28px 16px' }}>
        {/* AI Photo section */}
        <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:20, marginBottom:20 }}>
          <p style={{ fontWeight:700, color:'#111827', marginBottom:4 }}>📸 AI auto-fill from photo</p>
          <p style={{ fontSize:'0.8rem', color:'#6B7280', marginBottom:14 }}>Upload 1–3 photos and AI will detect make, model, color and suggest price</p>

          {aiLoading ? (
            <div style={{ textAlign:'center', padding:'28px 0' }}>
              <RefreshCw size={24} style={{ margin:'0 auto 10px', display:'block', color:'#C1272D', animation:'spin 1s linear infinite' }} />
              <p style={{ color:'#374151', fontWeight:500 }}>{aiStage}</p>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              style={{ width:'100%', padding:'20px', borderRadius:12, border:'2px dashed #E5E7EB', background:'#FAFAFA', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:8, transition:'all 0.15s' }}>
              <Camera size={28} color="#C1272D" />
              <p style={{ fontWeight:500, color:'#374151', margin:0 }}>Click to upload photos</p>
              <p style={{ fontSize:'0.75rem', color:'#9CA3AF', margin:0 }}>JPEG, PNG up to 10MB each</p>
            </button>
          )}

          {photos.length > 0 && (
            <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
              {photos.map((f,i) => (
                <div key={i} style={{ position:'relative', width:72, height:56, borderRadius:8, overflow:'hidden', border:'2px solid', borderColor: i===0 ? '#C1272D' : '#E5E7EB' }}>
                  <img src={URL.createObjectURL(f)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  {i===0 && <span style={{ position:'absolute', bottom:2, left:2, fontSize:'0.6rem', background:'#C1272D', color:'white', padding:'1px 4px', borderRadius:3 }}>Main</span>}
                  <button onClick={() => setPhotos(ps => ps.filter((_,j) => j!==i))}
                    style={{ position:'absolute', top:2, right:2, width:16, height:16, background:'rgba(0,0,0,0.5)', border:'none', borderRadius:'50%', cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
                    <X size={9} />
                  </button>
                </div>
              ))}
              <button onClick={() => fileRef.current?.click()}
                style={{ width:72, height:56, borderRadius:8, border:'2px dashed #E5E7EB', background:'#F9FAFB', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#9CA3AF' }}>
                <Plus size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background:'#FEE2E2', border:'1px solid #FECACA', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', gap:8, alignItems:'start' }}>
            <AlertCircle size={15} color="#DC2626" style={{ flexShrink:0, marginTop:1 }} />
            <p style={{ color:'#991B1B', fontSize:'0.875rem', margin:0 }}>{error}</p>
          </div>
        )}

        {!form.dealer_id && (
          <div style={{ background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', gap:8, alignItems:'center' }}>
            <AlertCircle size={15} color="#D97706" />
            <span style={{ fontSize:'0.875rem', color:'#92400E' }}>{t('vform.not_logged_in')} <a href="/login" style={{ fontWeight:600, color:'#C1272D' }}>{t('vform.sign_in')}</a></span>
          </div>
        )}

        {/* Main form */}
        <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:24, display:'flex', flexDirection:'column', gap:20 }}>
          <p style={{ fontWeight:700, color:'#111827', margin:0, fontSize:'1rem' }}>{t('vform.section.details')}</p>

          {/* Make + Model */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <Field label={t('vform.make')}>
              <select value={form.make} onChange={e => sf('make', e.target.value)} className="input-white" style={{ fontSize:'0.875rem' }}>
                <option value="">{t('vform.make.select')}</option>
                {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label={t('vform.model')}>
              <input value={form.model} onChange={e => sf('model', e.target.value)}
                placeholder="Land Cruiser" className="input-white" style={{ fontSize:'0.875rem' }} />
            </Field>
            <Field label={t('vform.year')}>
              <input type="number" value={form.year} onChange={e => sf('year', +e.target.value)}
                min={1990} max={2027} className="input-white" style={{ fontSize:'0.875rem' }} />
            </Field>
            <Field label={t('vform.trim')}>
              <input value={form.trim} onChange={e => sf('trim', e.target.value)}
                placeholder="GR Sport" className="input-white" style={{ fontSize:'0.875rem' }} />
            </Field>
          </div>

          <Field label={t('vform.body_type')}>
            <Pills options={BODY_TYPES.map(b=>({value:b,label:b}))} value={form.body_type} onChange={v => sf('body_type', v)} />
          </Field>

          <Field label={t('vform.fuel_type')}>
            <Pills options={FUEL_TYPES.map(f=>({value:f,label:f.charAt(0).toUpperCase()+f.slice(1)}))} value={form.fuel_type} onChange={v => sf('fuel_type', v)} />
          </Field>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <Field label={t('vform.transmission')}>
              <Pills options={[{value:'automatic',label:'Auto'},{value:'manual',label:'Manual'},{value:'cvt',label:'CVT'},{value:'dct',label:'DCT'}]} value={form.transmission} onChange={v => sf('transmission', v)} />
            </Field>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <Field label={t('vform.engine')} hint={t('vform.engine.hint')}>
              <input value={form.engine} onChange={e => sf('engine', e.target.value)}
                placeholder="3.5L V6 415hp" className="input-white" style={{ fontSize:'0.875rem' }} />
            </Field>
            <Field label={t('vform.mileage')} hint={t('vform.mileage.hint')}>
              <input type="number" value={form.mileage_km} onChange={e => sf('mileage_km', +e.target.value)}
                placeholder="0" className="input-white" style={{ fontSize:'0.875rem' }} min={0} />
            </Field>
            <Field label={t('vform.color_ext')}>
              <input value={form.color_exterior} onChange={e => sf('color_exterior', e.target.value)}
                placeholder="White Pearl" className="input-white" style={{ fontSize:'0.875rem' }} />
            </Field>
            <Field label={t('vform.color_int')}>
              <input value={form.color_interior} onChange={e => sf('color_interior', e.target.value)}
                placeholder="Beige" className="input-white" style={{ fontSize:'0.875rem' }} />
            </Field>
          </div>

          {/* VIN + Plate — important for scan */}
          <div style={{ borderTop:'1px solid #F3F4F6', paddingTop:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <Scan size={16} color="#C1272D" />
              <p style={{ fontWeight:700, color:'#111827', margin:0, fontSize:'0.875rem' }}>Scan identifiers</p>
              <span style={{ fontSize:'0.72rem', background:'#FFF1F2', color:'#C1272D', padding:'2px 8px', borderRadius:20, border:'1px solid #FECACA' }}>Required for QR / Smart scan</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <Field label={t('vform.vin')} hint={t('vform.vin.hint')}>
                <div style={{ position:'relative' }}>
                  <Hash size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }} />
                  <input value={form.vin} onChange={e => sf('vin', e.target.value.toUpperCase())}
                    placeholder="1HGBH41JXMN109186" className="input-white"
                    style={{ fontSize:'0.8rem', paddingLeft:30, fontFamily:'monospace', letterSpacing:'0.05em' }}
                    maxLength={17} />
                </div>
              </Field>
              <Field label={t('vform.plate')} hint={t('vform.plate.hint')}>
                <input value={form.plate_number} onChange={e => sf('plate_number', e.target.value.toUpperCase())}
                  placeholder="A 12345 Dubai" className="input-white"
                  style={{ fontSize:'0.875rem', fontFamily:'monospace' }} />
              </Field>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:10 }}>
              <div>
                <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{t('vform.quantity')}</label>
                <input type="number" value={form.stock_quantity} onChange={e => sf('stock_quantity', Math.max(1, +e.target.value))}
                  min={1} max={999} className="input-white" style={{ fontSize:'1.1rem', fontWeight:700 }} />
                <p style={{ fontSize:'0.72rem', color:'#9CA3AF', marginTop:4 }}>{t('vform.quantity.hint')}</p>
              </div>
              <div style={{ display:'flex', alignItems:'center', paddingTop:20 }}>
                <div style={{ padding:'10px 14px', background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8, fontSize:'0.8rem', color:'#065F46' }}>
                  {t('vform.qr_note')}
                </div>
              </div>
            </div>
          </div>

          {/* Price */}
          <div style={{ background:'#FFF1F2', border:'1px solid #FECACA', borderRadius:12, padding:16 }}>
            <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, color:'#991B1B', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{t('vform.price')}</label>
            <input type="number" value={form.price_aed||''} onChange={e => sf('price_aed', +e.target.value)}
              placeholder="220000" className="input-white"
              style={{ fontSize:'1.5rem', fontWeight:800, color:'#C1272D', border:'1.5px solid #FECACA', padding:'12px 14px' }} min={0} />
            <button type="button" onClick={async () => {
              if (!form.make||!form.model) return;
              try {
                const r = await fetch('/api/v1/ai/suggest-price', {
                  method:'POST', headers:{'Content-Type':'application/json'},
                  body: JSON.stringify(form),
                });
                const d = await r.json();
                if (d.suggested_aed) {
                  sf('price_aed', d.suggested_aed);
                  const msg = 'AI suggests ' + formatPrice(d.suggested_aed) + '\nRange: ' + (d.min_aed ? formatPrice(d.min_aed) : '') + ' – ' + (d.max_aed ? formatPrice(d.max_aed) : '') + '\n\n' + (d.reasoning || '');
                  alert(msg);
                }
              } catch {}
            }}
              style={{ marginTop:8, padding:'7px 16px', background:'white', border:'1px solid #FECACA', borderRadius:8, cursor:'pointer', fontSize:'0.8rem', color:'#C1272D', fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
              {t('vform.ai_suggest_price')}
            </button>
          </div>

          {/* Status + Export */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <Field label={t('vform.status')}>
              <Pills options={[{value:'available',label:t('vform.status.available')},{value:'draft',label:t('vform.status.draft')},{value:'reserved',label:t('vform.status.reserved')}]} value={form.status} onChange={v => sf('status', v)} />
            </Field>
            <Field label={t('vform.export_eligible')}>
              <button type="button" onClick={() => sf('export_eligible', !form.export_eligible)}
                style={{ display:'flex', alignItems:'center', gap:10, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                <div style={{ width:44, height:24, borderRadius:12, background: form.export_eligible ? '#C1272D' : '#D1D5DB', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
                  <span style={{ position:'absolute', top:3, width:18, height:18, borderRadius:'50%', background:'white', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 0.2s', left: form.export_eligible ? 23 : 3 }} />
                </div>
                <span style={{ fontSize:'0.875rem', color: form.export_eligible ? '#C1272D' : '#6B7280', fontWeight:500 }}>
                  {form.export_eligible ? t('vform.export_ready') : t('vform.local_only')}
                </span>
              </button>
            </Field>
          </div>

          <Field label={t('vform.listing_title')}>
            <input value={form.title} onChange={e => sf('title', e.target.value)}
              className="input-white" style={{ fontSize:'0.875rem' }} />
          </Field>

          <Field label={t('vform.description')}>
            <div style={{ position:'relative' }}>
              <textarea value={form.description} onChange={e => sf('description', e.target.value)}
                rows={4} placeholder={t('vform.description.placeholder')}
                className="input-white" style={{ fontSize:'0.875rem', resize:'vertical', paddingBottom:36 }} />
              <button type="button" onClick={async () => {
                if (!form.make||!form.model) return;
                try {
                  const r = await fetch('/api/v1/ai/generate-description', {
                    method:'POST', headers:{'Content-Type':'application/json'},
                    body: JSON.stringify(form),
                  });
                  const d = await r.json();
                  if (d.description) sf('description', d.description);
                } catch {}
              }}
                style={{ position:'absolute', bottom:8, right:8, padding:'4px 12px', background:'#FFF1F2', border:'1px solid #FECACA', borderRadius:7, cursor:'pointer', fontSize:'0.75rem', color:'#C1272D', fontWeight:600 }}>
                ✨ AI generate
              </button>
            </div>
          </Field>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          <button onClick={() => handleSubmit('draft')} disabled={stage==='saving'}
            style={{ padding:'12px 20px', border:'1.5px solid #E5E7EB', borderRadius:10, background:'white', cursor:'pointer', fontSize:'0.875rem', color:'#374151', opacity: stage==='saving' ? 0.6 : 1 }}>
            Save as draft
          </button>
          <button onClick={() => handleSubmit()} disabled={stage==='saving'}
            style={{ flex:1, padding:'12px 20px', background:'#C1272D', color:'white', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer', fontSize:'0.875rem', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity: stage==='saving' ? 0.7 : 1 }}>
            {stage==='saving' ? <><RefreshCw size={15} style={{ animation:'spin 1s linear infinite' }}/> Publishing…</> : <><Check size={15}/> Publish listing</>}
          </button>
        </div>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
