'use client';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useLocale } from '@/contexts/LocaleContext';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { Scan, Zap, Check, AlertCircle, RefreshCw, Camera, Keyboard, Phone, Wifi, Car, ChevronRight, Clock, X, Search, QrCode } from 'lucide-react';
import { api } from '@/lib/api';
import { usePriceFormatter } from '@/components/common/Price';

const ACTIONS = [
  { id:'sold',      label:'Mark Sold',       color:'#C1272D', bg:'#FEE2E2', emoji:'✅' },
  { id:'reserved',  label:'Reserved',         color:'#92400E', bg:'#FEF3C7', emoji:'⏸' },
  { id:'available', label:'Available',         color:'#065F46', bg:'#D1FAE5', emoji:'🟢' },
  { id:'delivered', label:'Delivered',         color:'#1E40AF', bg:'#DBEAFE', emoji:'📦' },
  { id:'preparing', label:'In Preparation',   color:'#5B21B6', bg:'#EDE9FE', emoji:'🔧' },
  { id:'returned',  label:'Returned',          color:'#374151', bg:'#F3F4F6', emoji:'↩️' },
];

const SCAN_MODES = [
  { id:'manual',    label:'My stock',       icon:Car,     desc:'Pick from your vehicle list' },
  { id:'vin',       label:'VIN number',     icon:Keyboard,desc:'Type or scan the VIN' },
  { id:'qr',        label:'QR Code',        icon:QrCode,  desc:'Scan windshield QR token' },
  { id:'plate_ocr', label:'Plate number',   icon:Camera,  desc:'Type the plate number' },
  { id:'nfc',       label:'NFC tap',        icon:Wifi,    desc:'Tap NFC sticker on vehicle' },
];

const INNOVATIONS = [
  { title:'📱 iOS/Android Widget',        desc:'One tap on home screen — mark sold in under 2 seconds',                badge:'BEST PICK', color:'#C1272D' },
  { title:'⌚ Apple Watch / Wear OS',      desc:'Tap your watch to mark sold — instant, hands-free on the lot',          badge:'TOP 3',     color:'#007A3D' },
  { title:'🔔 Interactive push notif.',   desc:'"Sold / Reserved / Available" buttons inside the notification',          badge:'TOP 3',     color:'#3B82F6' },
  { title:'🏷 NFC on key fob',            desc:'Tap phone to vehicle key → action sheet appears instantly',              badge:'TOP 3',     color:'#8B5CF6' },
  { title:'💬 WhatsApp Business Bot',     desc:'Send "SOLD [plate]" → bot updates status and confirms',                 badge:null,        color:'#25D366' },
  { title:'🤖 Telegram Bot',              desc:'/sold LandCruiser → stock updated, all dealers notified',               badge:null,        color:'#229ED9' },
  { title:'🎙 Siri / Google Assistant',   desc:'"Hey Siri, mark Land Cruiser as sold" via custom Shortcut',            badge:null,        color:'#6B7280' },
  { title:'🔲 Smart QR on windshield',    desc:'QR sticker on every car — scan → action in 3 taps',                    badge:null,        color:'#374151' },
  { title:'🤖 AI auto-detect sale',       desc:'AI monitors payment + contract → auto-triggers sold event',             badge:null,        color:'#C1272D' },
  { title:'🔴 Physical IoT button',       desc:'Bluetooth desk button — one press = sold, paired to last active vehicle',badge:null,       color:'#374151' },
  { title:'🖥 iOS Live Activities',       desc:'Dynamic Island shows reservations, tap to update status in place',       badge:null,        color:'#111827' },
  { title:'📲 Lock screen shortcut',      desc:'Mark sold from iPhone lock screen — zero app navigation needed',         badge:null,        color:'#6B7280' },
];

export default function ScanPage() {
  const { t } = useLocale();
  const formatPrice = usePriceFormatter();
  const { isEnabled } = useFeatureFlags();
  const [section, setSection] = useState<'scan'|'onetap'|'innovations'>('scan');
  const [scanMode, setScanMode] = useState<string|null>(null);
  const [input, setInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [foundVehicle, setFoundVehicle] = useState<any>(null);
  const [selectedAction, setSelectedAction] = useState<string|null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{success:boolean; message:string}|null>(null);
  const [dealerId, setDealerId] = useState('');
  if (!isEnabled('smart_scan')) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,background:'#F9FAFB'}}>
      <span style={{fontSize:'2rem'}}>📷</span>
      <p style={{fontWeight:700,color:'#374151'}}>Smart Scan</p>
      <p style={{color:'#9CA3AF',fontSize:'0.875rem',textAlign:'center',maxWidth:320}}>This feature is not yet available on your plan. Contact your admin to enable it.</p>
    </div>
  );

  // Manual search state
  const [myVehicles, setMyVehicles] = useState<any[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [recentActions, setRecentActions] = useState<any[]>([]);

  useEffect(() => {
    const did = localStorage.getItem('dealer_id') || '';
    setDealerId(did);
    const recent = JSON.parse(localStorage.getItem('recent_quick_actions') || '[]');
    setRecentActions(recent);
  }, []);

  // Load dealer vehicles when manual mode is selected
  useEffect(() => {
    if (scanMode === 'manual' && dealerId) {
      setLoadingVehicles(true);
      api.get<any>(`/dealer-dashboard/${dealerId}/inventory?limit=100&status=available`)
        .then(data => setMyVehicles(data?.items || []))
        .catch(() => setMyVehicles([]))
        .finally(() => setLoadingVehicles(false));
    }
  }, [scanMode, dealerId]);

  const doScan = async () => {
    if (!input && scanMode !== 'nfc') return;
    setScanning(true); setFoundVehicle(null);
    try {
      const data = await api.post<any>('/collaborative/scan', {
        scan_type: scanMode, scan_data: input,
        dealer_id: dealerId, source: 'scan_page',
      });
      if (data.found) setFoundVehicle(data.vehicle);
      else setResult({ success:false, message:`No vehicle found for "${input}"` });
    } catch (e:any) { setResult({ success:false, message: e.message||'Scan failed' }); }
    finally { setScanning(false); }
  };

  const selectVehicle = (v: any) => setFoundVehicle(v);

  const doAction = async () => {
    if (!foundVehicle || !selectedAction) return;
    setProcessing(true);
    try {
      const data = await api.post<any>(`/collaborative/vehicles/${foundVehicle.id}/quick-action`, {
        dealer_id: dealerId, action: selectedAction, source: `scan_${scanMode||'manual'}`,
      });
      const label = ACTIONS.find(a => a.id===selectedAction)?.label || selectedAction;
      setResult({ success:true, message:`${foundVehicle.year} ${foundVehicle.make} ${foundVehicle.model} → ${label}. ${data.notifications_sent} dealer(s) notified.` });

      const recent = [
        { vehicle:`${foundVehicle.year} ${foundVehicle.make} ${foundVehicle.model}`, action:label, time:new Date().toISOString() },
        ...recentActions,
      ].slice(0, 5);
      setRecentActions(recent);
      localStorage.setItem('recent_quick_actions', JSON.stringify(recent));
      setFoundVehicle(null); setInput(''); setSelectedAction(null); setScanMode(null);
    } catch (e:any) { setResult({ success:false, message: e.message||'Action failed' }); }
    finally { setProcessing(false); }
  };

  const reset = () => { setFoundVehicle(null); setInput(''); setSelectedAction(null); setResult(null); setScanMode(null); };

  const filteredVehicles = myVehicles.filter(v => {
    if (!vehicleSearch) return true;
    return `${v.year} ${v.make} ${v.model} ${v.trim||''}`.toLowerCase().includes(vehicleSearch.toLowerCase());
  });

  const navBtn = (id: string, label: string) => (
    <button onClick={() => setSection(id as any)}
      style={{ padding:'9px 16px', fontSize:'0.875rem', fontWeight: section===id ? 600 : 400, color: section===id ? '#C1272D' : '#6B7280', background:'none', border:'none', borderBottom: section===id ? '2px solid #C1272D' : '2px solid transparent', cursor:'pointer' }}>
      {label}
    </button>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#F9FAFB' }}>
      <div style={{ background:'white', borderBottom:'1px solid #E5E7EB', padding:'16px 24px' }}>
        <h1 style={{ fontWeight:700, fontSize:'1.1rem', color:'#111827', margin:0 }}>{t('dealer.scan.title')}</h1>
        <p style={{ fontSize:'0.8rem', color:'#6B7280', margin:0 }}>Mark vehicles sold in under 5 seconds</p>
      </div>
      <div style={{ background:'white', borderBottom:'1px solid #E5E7EB', paddingLeft:24, display:'flex' }}>
        {navBtn('scan','📷 Smart Scan')}
        {navBtn('onetap','⚡ One-Tap Sale')}
        {navBtn('innovations','💡 12 Innovations')}
      </div>

      <div style={{ maxWidth:640, margin:'0 auto', padding:'24px 16px' }}>

        {/* Result banner */}
        {result && (
          <div style={{ padding:'14px 18px', borderRadius:12, marginBottom:20, background: result.success ? '#D1FAE5' : '#FEE2E2', border:`1px solid ${result.success ? '#A7F3D0' : '#FECACA'}`, display:'flex', alignItems:'center', gap:10 }}>
            {result.success ? <Check size={18} color="#065F46" /> : <AlertCircle size={18} color="#991B1B" />}
            <p style={{ fontSize:'0.875rem', color: result.success ? '#065F46' : '#991B1B', margin:0, fontWeight:500, flex:1 }}>{result.message}</p>
            <button onClick={() => setResult(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#9CA3AF' }}>×</button>
          </div>
        )}

        {/* ── SMART SCAN ─────────────────────────────────────────────────── */}
        {section === 'scan' && (
          !scanMode ? (
            <div>
              <h2 style={{ fontSize:'1rem', fontWeight:700, color:'#111827', marginBottom:16 }}>Choose scan method</h2>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {SCAN_MODES.map(m => {
                  const Icon = m.icon;
                  return (
                    <button key={m.id} onClick={() => setScanMode(m.id)}
                      style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:12, border:'1.5px solid #E5E7EB', background:'white', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
                      <div style={{ width:44, height:44, borderRadius:10, background:'#FFF1F2', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Icon size={20} style={{ color:'#C1272D' }} />
                      </div>
                      <div>
                        <p style={{ fontWeight:600, color:'#111827', margin:0, fontSize:'0.9rem' }}>{m.label}</p>
                        <p style={{ color:'#6B7280', margin:0, fontSize:'0.8rem' }}>{m.desc}</p>
                      </div>
                      <ChevronRight size={16} style={{ color:'#9CA3AF', marginLeft:'auto' }} />
                    </button>
                  );
                })}
              </div>

              {/* Recent actions */}
              {recentActions.length > 0 && (
                <div style={{ marginTop:28 }}>
                  <p style={{ fontSize:'0.72rem', color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8, fontWeight:700 }}>Recent</p>
                  {recentActions.map((r,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #F3F4F6' }}>
                      <Clock size={13} style={{ color:'#9CA3AF', flexShrink:0 }} />
                      <span style={{ fontSize:'0.875rem', color:'#374151', flex:1 }}>{r.vehicle}</span>
                      <span style={{ fontSize:'0.8rem', fontWeight:500, color:'#C1272D' }}>{r.action}</span>
                      <span style={{ fontSize:'0.72rem', color:'#9CA3AF' }}>{new Date(r.time).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          ) : !foundVehicle ? (
            <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
              <div style={{ padding:'14px 16px', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', gap:10 }}>
                <button onClick={reset} style={{ background:'none', border:'none', cursor:'pointer', color:'#6B7280', fontSize:'1.2rem', lineHeight:1 }}>←</button>
                <h2 style={{ fontSize:'1rem', fontWeight:700, color:'#111827', margin:0 }}>
                  {SCAN_MODES.find(m => m.id===scanMode)?.label}
                </h2>
              </div>

              {/* MANUAL — real vehicle list */}
              {scanMode === 'manual' && (
                <div style={{ padding:16 }}>
                  <div style={{ position:'relative', marginBottom:12 }}>
                    <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }} />
                    <input value={vehicleSearch} onChange={e => setVehicleSearch(e.target.value)}
                      placeholder="Filter by make, model…" className="input-white" style={{ paddingLeft:30, fontSize:'0.875rem' }} />
                  </div>

                  {loadingVehicles ? (
                    <div style={{ textAlign:'center', padding:'32px 0', color:'#9CA3AF' }}>
                      <RefreshCw size={20} style={{ margin:'0 auto 8px', display:'block', animation:'spin 1s linear infinite' }} />
                      <p style={{ fontSize:'0.875rem' }}>Loading your stock…</p>
                    </div>
                  ) : filteredVehicles.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'32px 0', color:'#9CA3AF' }}>
                      <Car size={28} style={{ margin:'0 auto 8px', display:'block', opacity:0.4 }} />
                      <p style={{ fontSize:'0.875rem' }}>{myVehicles.length === 0 ? 'No available vehicles in stock' : 'No vehicles match your search'}</p>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:360, overflowY:'auto' }}>
                      {filteredVehicles.map(v => {
                        const img = v.vehicle_images?.find((i:any) => i.is_primary)?.cdn_url || v.vehicle_images?.[0]?.cdn_url;
                        return (
                          <button key={v.id} onClick={() => selectVehicle(v)}
                            style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:10, border:'1.5px solid #E5E7EB', background:'white', cursor:'pointer', textAlign:'left', transition:'all 0.12s' }}>
                            <div style={{ width:52, height:40, borderRadius:8, background:'#F3F4F6', overflow:'hidden', flexShrink:0 }}>
                              {img ? <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                                : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#D1D5DB' }}><Car size={18}/></div>}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={{ fontWeight:600, color:'#111827', margin:0, fontSize:'0.875rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                {v.year} {v.make} {v.model}{v.trim ? ' '+v.trim : ''}
                              </p>
                              <p style={{ color:'#9CA3AF', margin:0, fontSize:'0.75rem' }}>
                                {v.mileage_km===0 ? 'New' : `${v.mileage_km.toLocaleString()} km`} · {formatPrice(Number(v.price_aed))}
                                {v.vin ? ` · VIN: ${v.vin.slice(-6)}` : ''}
                              </p>
                            </div>
                            <ChevronRight size={14} color="#9CA3AF" style={{ flexShrink:0 }} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* VIN / QR / Plate input */}
              {(scanMode==='vin'||scanMode==='plate_ocr'||scanMode==='qr') && (
                <div style={{ padding:16 }}>
                  <input value={input} onChange={e => setInput(e.target.value)}
                    placeholder={scanMode==='vin' ? 'Enter 17-char VIN…' : scanMode==='plate_ocr' ? 'Enter plate number…' : 'Paste QR token…'}
                    className="input-white" style={{ marginBottom:12, fontSize:'0.9rem', letterSpacing: scanMode==='vin' ? '0.05em' : 'normal', fontFamily: scanMode==='vin' ? 'monospace' : 'inherit' }}
                    onKeyDown={e => { if(e.key==='Enter') doScan(); }} />
                  <button onClick={doScan} disabled={scanning||!input}
                    style={{ width:'100%', padding:'12px 0', background: (!input||scanning) ? '#E5E7EB' : '#C1272D', color: (!input||scanning) ? '#9CA3AF' : 'white', border:'none', borderRadius:10, fontWeight:700, cursor: (!input||scanning) ? 'default' : 'pointer', fontSize:'0.9rem', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                    {scanning ? <RefreshCw size={16} style={{ animation:'spin 1s linear infinite' }} /> : <Scan size={16} />}
                    {scanning ? 'Scanning…' : 'Find vehicle'}
                  </button>
                </div>
              )}

              {/* NFC */}
              {scanMode==='nfc' && (
                <div style={{ padding:'32px 16px', textAlign:'center' }}>
                  <div style={{ width:80, height:80, borderRadius:'50%', background:'#FFF1F2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', border:'3px solid #FECACA' }}>
                    <Wifi size={32} style={{ color:'#C1272D' }} />
                  </div>
                  <p style={{ fontWeight:600, color:'#111827' }}>Ready to scan NFC tag</p>
                  <p style={{ color:'#6B7280', fontSize:'0.875rem' }}>Tap your phone to the NFC sticker on the vehicle key or windshield</p>
                </div>
              )}
            </div>

          ) : (
            /* Vehicle found → action sheet */
            <div>
              <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden', marginBottom:16 }}>
                <div style={{ background:'#D1FAE5', padding:'10px 16px', display:'flex', alignItems:'center', gap:8 }}>
                  <Check size={15} color="#065F46" />
                  <span style={{ fontSize:'0.875rem', fontWeight:600, color:'#065F46' }}>Vehicle found</span>
                  <button onClick={reset} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#6B7280' }}><X size={15}/></button>
                </div>
                <div style={{ padding:'14px 16px', display:'flex', gap:12, alignItems:'center' }}>
                  {foundVehicle.vehicle_images?.[0]?.cdn_url && (
                    <img src={foundVehicle.vehicle_images[0].cdn_url} alt="" style={{ width:64, height:48, objectFit:'cover', borderRadius:8, flexShrink:0 }} />
                  )}
                  <div>
                    <p style={{ fontWeight:700, color:'#111827', margin:'0 0 2px', fontSize:'1rem' }}>{foundVehicle.year} {foundVehicle.make} {foundVehicle.model}{foundVehicle.trim ? ' '+foundVehicle.trim : ''}</p>
                    <p style={{ color:'#C1272D', fontWeight:700, margin:0 }}>{formatPrice(Number(foundVehicle.price_aed))}</p>
                    {foundVehicle.vin && <p style={{ color:'#9CA3AF', margin:0, fontSize:'0.75rem', fontFamily:'monospace' }}>VIN: {foundVehicle.vin}</p>}
                  </div>
                </div>
              </div>

              <h2 style={{ fontSize:'1rem', fontWeight:700, color:'#111827', marginBottom:12 }}>What happened?</h2>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                {ACTIONS.map(a => (
                  <button key={a.id} onClick={() => setSelectedAction(a.id)}
                    style={{ padding:'14px 12px', borderRadius:12, border:`2px solid ${selectedAction===a.id ? a.color : '#E5E7EB'}`, background: selectedAction===a.id ? a.bg : 'white', cursor:'pointer', textAlign:'center', transition:'all 0.15s' }}>
                    <div style={{ fontSize:24, marginBottom:4 }}>{a.emoji}</div>
                    <p style={{ fontSize:'0.8rem', fontWeight:600, color: selectedAction===a.id ? a.color : '#374151', margin:0 }}>{a.label}</p>
                  </button>
                ))}
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button onClick={reset} style={{ flex:1, padding:'12px 0', border:'1.5px solid #E5E7EB', borderRadius:10, background:'white', cursor:'pointer', fontWeight:500, color:'#374151' }}>Cancel</button>
                <button onClick={doAction} disabled={!selectedAction||processing}
                  style={{ flex:2, padding:'12px 0', background: selectedAction ? (ACTIONS.find(a=>a.id===selectedAction)?.color||'#C1272D') : '#E5E7EB', color: selectedAction ? 'white' : '#9CA3AF', border:'none', borderRadius:10, fontWeight:700, cursor: selectedAction ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all 0.2s' }}>
                  {processing ? <RefreshCw size={16} style={{ animation:'spin 1s linear infinite' }} /> : <Zap size={16} />}
                  {processing ? 'Updating…' : 'Confirm action'}
                </button>
              </div>
            </div>
          )
        )}

        {/* ── ONE TAP SALE ────────────────────────────────────────────────── */}
        {section === 'onetap' && (
          <div>
            <div style={{ background:'#FFF1F2', border:'1px solid #FECACA', borderRadius:14, padding:20, marginBottom:24 }}>
              <p style={{ fontWeight:800, fontSize:'1.2rem', color:'#C1272D', margin:'0 0 6px' }}>⚡ One-Tap Sale</p>
              <p style={{ color:'#374151', fontSize:'0.9rem', lineHeight:1.6, margin:0 }}>Mark a vehicle as sold in under 5 seconds — no search, no navigation, no clicks.</p>
            </div>

            <h2 style={{ fontSize:'1rem', fontWeight:700, color:'#111827', marginBottom:12 }}>Find vehicle</h2>
            <div style={{ display:'flex', gap:8, marginBottom:8 }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                placeholder="Vehicle ID, VIN, or QR token…"
                className="input-white" style={{ flex:1 }}
                onKeyDown={e => { if(e.key==='Enter') doScan(); }} />
              <button onClick={() => { setScanMode('manual'); setSection('scan'); }}
                style={{ padding:'10px 14px', border:'1px solid #E5E7EB', borderRadius:10, background:'white', cursor:'pointer', color:'#374151', fontSize:'0.875rem', whiteSpace:'nowrap' }}>
                Browse list
              </button>
            </div>
            {input && (
              <button onClick={doScan} disabled={scanning}
                style={{ width:'100%', marginBottom:20, padding:'11px 0', background:'#C1272D', color:'white', border:'none', borderRadius:10, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {scanning ? <RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }} /> : <Scan size={14} />}
                {scanning ? 'Searching…' : 'Find vehicle'}
              </button>
            )}

            {foundVehicle && (
              <div style={{ background:'white', border:'2px solid #C1272D', borderRadius:12, padding:14, marginBottom:16 }}>
                <p style={{ fontWeight:700, color:'#111827', margin:'0 0 2px' }}>{foundVehicle.year} {foundVehicle.make} {foundVehicle.model}</p>
                <p style={{ color:'#C1272D', fontWeight:700, margin:0 }}>{formatPrice(Number(foundVehicle.price_aed))}</p>
              </div>
            )}

            <h2 style={{ fontSize:'1rem', fontWeight:700, color:'#111827', marginBottom:10 }}>Quick action</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {ACTIONS.map(a => (
                <button key={a.id} onClick={() => { setSelectedAction(a.id); if(foundVehicle) doAction(); }}
                  style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:12, border:`1.5px solid ${a.bg==='#F3F4F6'?'#E5E7EB':a.color+'40'}`, background:a.bg, cursor:'pointer', transition:'all 0.15s' }}>
                  <span style={{ fontSize:24 }}>{a.emoji}</span>
                  <div>
                    <p style={{ fontWeight:700, color:a.color, margin:0, fontSize:'0.95rem' }}>{a.label}</p>
                    {a.id==='sold' && <p style={{ color:a.color, opacity:0.7, margin:0, fontSize:'0.75rem' }}>Timeline · notify dealers · update stats</p>}
                  </div>
                  {!foundVehicle && <span style={{ marginLeft:'auto', fontSize:'0.72rem', color:'#9CA3AF' }}>Find vehicle first</span>}
                </button>
              ))}
            </div>

            {/* Flow */}
            <div style={{ marginTop:24, background:'white', border:'1px solid #E5E7EB', borderRadius:12, padding:16 }}>
              <p style={{ fontWeight:700, color:'#111827', marginBottom:12, fontSize:'0.875rem' }}>What happens in &lt;5s when you tap "Sold"</p>
              {[
                ['Status → Sold','Instant'],['Removed from active stock','Immediately'],
                ['Timeline logged','Timestamped'],['Owner notified','Push'],
                ['Shared dealers notified','All collaborators'],['Stats recalculated','Real-time'],
                ['CRM sync','Auto'],['Archived','Audit kept'],
              ].map(([label,sub],i,arr) => (
                <div key={i} style={{ display:'flex', gap:10, padding:'6px 0', borderBottom: i<arr.length-1 ? '1px dashed #E5E7EB' : 'none' }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:'#C1272D', flexShrink:0, marginTop:8 }} />
                  <span style={{ fontSize:'0.875rem', color:'#374151', flex:1 }}>{label}</span>
                  <span style={{ fontSize:'0.75rem', color:'#9CA3AF' }}>{sub}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── INNOVATIONS ─────────────────────────────────────────────────── */}
        {section === 'innovations' && (
          <div>
            <div style={{ background:'linear-gradient(135deg,#FFF1F2,#FFF)', border:'1px solid #FECACA', borderRadius:14, padding:20, marginBottom:24 }}>
              <p style={{ fontWeight:800, fontSize:'1.1rem', color:'#C1272D', margin:'0 0 6px' }}>💡 12 Innovation Ideas</p>
              <p style={{ color:'#374151', fontSize:'0.875rem', lineHeight:1.6, margin:0 }}>Beyond the app — manage stock without ever opening SnapHubTrade.com.</p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {INNOVATIONS.map((inn,i) => (
                <div key={i} style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:12, padding:'14px 16px', display:'flex', gap:12, alignItems:'flex-start' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <p style={{ fontWeight:700, color:'#111827', margin:0, fontSize:'0.9rem' }}>{inn.title}</p>
                      {inn.badge && <span style={{ fontSize:'0.65rem', fontWeight:700, padding:'2px 8px', borderRadius:20, background:inn.color+'15', color:inn.color, border:`1px solid ${inn.color}30` }}>{inn.badge}</span>}
                    </div>
                    <p style={{ fontSize:'0.8rem', color:'#6B7280', margin:0, lineHeight:1.5 }}>{inn.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:20, background:'#D1FAE5', border:'1px solid #A7F3D0', borderRadius:12, padding:16 }}>
              <p style={{ fontWeight:700, color:'#065F46', margin:'0 0 8px' }}>🏆 Our recommendation: iOS/Android Widget</p>
              <p style={{ fontSize:'0.875rem', color:'#065F46', margin:0, lineHeight:1.6 }}>The home screen widget is the best balance of speed, adoption and simplicity. No app navigation. The dealer's 3 recent vehicles appear. One tap → sold. Works on iOS 16+ and Android 12+.</p>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
