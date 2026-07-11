'use client';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useLocale } from '@/contexts/LocaleContext';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { Smartphone, Zap, Check, X, RefreshCw, QrCode, Download, Share2, Bell, Clock, Car, ChevronRight, Copy, MessageCircle, Star, Wifi } from 'lucide-react';
import { api } from '@/lib/api';
import { usePriceFormatter } from '@/components/common/Price';

// ─── Widget Simulator ─────────────────────────────────────────────────────────

function WidgetPreview({ vehicles, onAction, processing, lastAction }: { vehicles: any[]; onAction: (v: any, action: string) => void; processing: string | null; lastAction: any }) {
  const formatPrice = usePriceFormatter();
  const top3 = vehicles.slice(0, 3);

  return (
    <div style={{ userSelect: 'none' }}>
      {/* iPhone frame */}
      <div style={{ position: 'relative', width: 300, margin: '0 auto' }}>
        {/* Phone body */}
        <div style={{ background: '#1C1C1E', borderRadius: 44, padding: '14px 6px', boxShadow: '0 30px 80px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.08)' }}>
          {/* Notch */}
          <div style={{ background: '#1C1C1E', height: 28, borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
            <div style={{ width: 110, height: 28, background: '#000', borderRadius: '0 0 20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#1C1C1E', border: '2px solid #333' }} />
              <div style={{ width: 60, height: 6, borderRadius: 3, background: '#1C1C1E', border: '1.5px solid #333' }} />
            </div>
          </div>

          {/* Screen */}
          <div style={{ background: '#000', borderRadius: 36, overflow: 'hidden', aspectRatio: '9/19.5', position: 'relative' }}>
            {/* Wallpaper */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)' }} />

            {/* Status bar */}
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', padding: '10px 18px 4px', fontSize: '0.7rem', fontWeight: 700, color: 'white' }}>
              <span>9:41</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Wifi size={11} color="white" />
                <div style={{ display: 'flex', gap: 1 }}>
                  {[3,4,4,4].map((h,i) => <div key={i} style={{ width: 3, height: h, background: 'white', borderRadius: 1 }} />)}
                </div>
                <div style={{ width: 22, height: 11, border: '1.5px solid white', borderRadius: 3, position: 'relative', display: 'flex', alignItems: 'center', padding: '0 2px' }}>
                  <div style={{ width: '70%', height: 6, background: '#4ADE80', borderRadius: 1 }} />
                  <div style={{ position: 'absolute', right: -4, width: 3, height: 6, background: 'white', borderRadius: '0 2px 2px 0' }} />
                </div>
              </div>
            </div>

            {/* Lock screen date */}
            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '8px 0 16px' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', margin: 0 }}>Monday, June 28</p>
            </div>

            {/* === SNAPHUBTRADE.COM WIDGET === */}
            <div style={{ position: 'relative', zIndex: 2, margin: '0 12px', borderRadius: 20, overflow: 'hidden', backdropFilter: 'blur(20px)', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}>
              {/* Widget header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 6px' }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: '#C1272D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Car size={12} color="white" />
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'white', letterSpacing: '0.02em' }}>SNAPHUBTRADE.COM</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>Stock</span>
              </div>

              {/* Vehicle rows */}
              {top3.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center' }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>No vehicles yet — add from dashboard</p>
                </div>
              ) : (
                <div>
                  {top3.map((v, i) => {
                    const isProc = processing === v.id;
                    const img = v.vehicle_images?.find((x: any) => x.is_primary)?.cdn_url || v.vehicle_images?.[0]?.cdn_url;
                    return (
                      <div key={v.id} style={{ padding: '6px 12px', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {/* Mini photo */}
                          <div style={{ width: 36, height: 28, borderRadius: 7, overflow: 'hidden', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}>
                            {img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Car size={12} color="rgba(255,255,255,0.4)" /></div>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: 'white', fontSize: '0.72rem', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {v.year} {v.make} {v.model}
                            </p>
                            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.65rem', margin: 0 }}>
                              {formatPrice(Number(v.price_aed))}
                            </p>
                          </div>
                          {/* One-tap buttons */}
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button onClick={() => onAction(v, 'sold')} disabled={isProc}
                              style={{ width: 28, height: 28, borderRadius: 8, background: '#C1272D', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isProc ? 0.5 : 1, transition: 'transform 0.1s', boxShadow: '0 2px 6px rgba(193,39,45,0.5)' }}
                              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.92)')}
                              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}>
                              {isProc ? <RefreshCw size={12} color="white" style={{ animation: 'spin 1s linear infinite' }} /> : <span style={{ color: 'white', fontSize: '0.75rem' }}>✅</span>}
                            </button>
                            <button onClick={() => onAction(v, 'reserved')} disabled={isProc}
                              style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.72rem' }}>⏸</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Widget footer */}
              <div style={{ padding: '6px 12px 10px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>{vehicles.length} vehicles</span>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>tap ✅ to mark sold</span>
              </div>
            </div>

            {/* Success toast */}
            {lastAction && (
              <div style={{ position: 'absolute', bottom: 20, left: 12, right: 12, zIndex: 10, background: 'rgba(16,185,129,0.95)', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, backdropFilter: 'blur(10px)' }}>
                <Check size={14} color="white" />
                <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 600 }}>{lastAction.vehicle} → {lastAction.action}</span>
              </div>
            )}

            {/* Home indicator */}
            <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', width: 120, height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Setup Steps ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    step: '1', platform: 'iOS', icon: '🍎', color: '#111827',
    title: 'Add to iPhone Home Screen',
    instructions: [
      'Open SnapHubTrade.com in Safari on your iPhone',
      'Tap the Share button (⬆️) at the bottom',
      'Scroll down and tap "Add to Home Screen"',
      'Tap "Add" — the app icon appears on your home screen',
      'Long-press the home screen → tap "Edit Home Screen"',
      'Find the SnapHubTrade.com icon → tap "Edit Widget" to select size',
    ],
  },
  {
    step: '2', platform: 'iOS 17+', icon: '✨', color: '#C1272D',
    title: 'StandBy Mode (iPhone 15+)',
    instructions: [
      'Connect iPhone to charger in landscape mode',
      'StandBy activates automatically',
      'Long-press any widget → tap "+" → search SnapHubTrade.com',
      'Add the "Quick Sale" widget to StandBy',
      'Now your stock is always visible on desk/bedside',
    ],
  },
  {
    step: '3', platform: 'Android', icon: '🤖', color: '#007A3D',
    title: 'Add to Android Home Screen',
    instructions: [
      'Open SnapHubTrade.com in Chrome on your Android phone',
      'Tap the 3-dot menu (⋮) → "Add to Home Screen"',
      'Tap "Add" to confirm',
      'Long-press the home screen → select "Widgets"',
      'Search for SnapHubTrade.com → drag the widget to your screen',
      'Resize the widget to show 1–3 vehicles',
    ],
  },
  {
    step: '4', platform: 'Lock Screen', icon: '🔒', color: '#8B5CF6',
    title: 'iPhone Lock Screen Widget',
    instructions: [
      'On iPhone (iOS 16+), long-press the lock screen',
      'Tap "Customize" → tap the widget area below the clock',
      'Tap "+" → find SnapHubTrade.com in the list',
      'Add the "Quick Sale" small widget',
      'Now you can mark vehicles sold WITHOUT unlocking!',
    ],
  },
];

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function WidgetPage() {
  const { t } = useLocale();
  const { isEnabled } = useFeatureFlags();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<any>(null);
  if (!isEnabled('ios_widget')) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,background:'#F9FAFB'}}>
      <span style={{fontSize:'2rem'}}>📱</span>
      <p style={{fontWeight:700,color:'#374151'}}>iOS Widget</p>
      <p style={{color:'#9CA3AF',fontSize:'0.875rem',textAlign:'center',maxWidth:320}}>iOS Widget is available on Pro and Enterprise plans. Upgrade to unlock.</p>
    </div>
  );
  const [dealerId, setDealerId] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const did = localStorage.getItem('dealer_id') || '';
    setDealerId(did);
    api.get<any>(`/dealer-dashboard/${did}/inventory?limit=10&status=available`)
      .then(d => setVehicles(d?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAction = async (vehicle: any, action: string) => {
    setProcessing(vehicle.id);
    try {
      await api.post(`/collaborative/vehicles/${vehicle.id}/quick-action`, {
        dealer_id: dealerId, action, source: 'widget',
      });
      const label = action === 'sold' ? 'Sold ✅' : action === 'reserved' ? 'Reserved ⏸' : action;
      setLastAction({ vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`, action: label });
      setVehicles(vs => action === 'sold' ? vs.filter(v => v.id !== vehicle.id) : vs.map(v => v.id === vehicle.id ? { ...v, status: action } : v));
      setTimeout(() => setLastAction(null), 3000);
    } catch { /* */ }
    finally { setProcessing(null); }
  };

  const widgetUrl = typeof window !== 'undefined' ? `${window.location.origin}/dealer/scan?dealer=${dealerId}` : '';
  const copyUrl = () => { navigator.clipboard.writeText(widgetUrl); setCopied(true); setTimeout(() => setCopied(false), 2500); };

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '16px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: '#C1272D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={14} color="white" />
              </div>
              <h1 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', margin: 0 }}>{t('dealer.widget.title')}</h1>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 20, background: '#FFF1F2', color: '#C1272D', fontWeight: 700, border: '1px solid #FECACA' }}>BEST PICK</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0 }}>One-Tap Sale in under 2 seconds — no app opening required</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/dealer/scan" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: '#C1272D', color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
              <Zap size={14} /> Open scanner
            </a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 32, alignItems: 'start' }}>

          {/* Left: Widget simulator */}
          <div>
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 20, padding: 24, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <Smartphone size={16} style={{ color: '#C1272D' }} />
                <p style={{ fontWeight: 700, color: '#111827', margin: 0 }}>Live widget preview</p>
                <span style={{ fontSize: '0.72rem', color: '#9CA3AF', marginLeft: 'auto' }}>Interactive demo</span>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
                  <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '0.875rem' }}>Loading your vehicles…</p>
                </div>
              ) : (
                <WidgetPreview vehicles={vehicles} onAction={handleAction} processing={processing} lastAction={lastAction} />
              )}

              <div style={{ marginTop: 20, padding: '12px 14px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
                <p style={{ fontSize: '0.78rem', color: '#065F46', margin: 0, fontWeight: 500 }}>
                  ✓ Tap ✅ on any vehicle to mark it as sold in real-time
                </p>
              </div>
            </div>

            {/* Quick stats */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, padding: 18 }}>
              <p style={{ fontWeight: 700, color: '#111827', marginBottom: 14, fontSize: '0.875rem' }}>Why this is #1</p>
              {[
                { emoji: '⚡', text: 'Under 2 seconds from thought to done' },
                { emoji: '📱', text: 'No app opening — works from home screen' },
                { emoji: '🔒', text: 'Available on iPhone lock screen (iOS 16+)' },
                { emoji: '🔔', text: 'Triggers all notifications automatically' },
                { emoji: '📊', text: 'Stats, timeline and CRM updated instantly' },
                { emoji: '🌐', text: 'All shared dealers notified in real-time' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.emoji}</span>
                  <span style={{ fontSize: '0.82rem', color: '#374151' }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Setup guide */}
          <div>
            <h2 style={{ fontWeight: 800, color: '#111827', marginBottom: 20, fontSize: '1.1rem' }}>
              Setup guide — 4 steps
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{ background: 'white', border: `2px solid ${activeStep === i ? s.color : '#E5E7EB'}`, borderRadius: 16, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                  <button onClick={() => setActiveStep(activeStep === i ? -1 : i)}
                    style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: s.color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>
                      {s.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: s.color, background: s.color + '12', padding: '2px 8px', borderRadius: 20 }}>{s.platform}</span>
                      </div>
                      <p style={{ fontWeight: 700, color: '#111827', margin: '3px 0 0', fontSize: '0.9rem' }}>{s.title}</p>
                    </div>
                    <ChevronRight size={16} style={{ color: '#9CA3AF', transform: activeStep === i ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                  </button>

                  {activeStep === i && (
                    <div style={{ borderTop: '1px solid #F3F4F6', padding: '16px 20px 20px' }}>
                      <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {s.instructions.map((inst, j) => (
                          <li key={j} style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.55 }}>{inst}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Widget URL / QR */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginTop: 20 }}>
              <p style={{ fontWeight: 700, color: '#111827', marginBottom: 12, fontSize: '0.9rem' }}>
                📲 Your personal widget URL
              </p>
              <p style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: 14, lineHeight: 1.55 }}>
                Bookmark this URL on your phone to get the fastest access to your stock. Add it to your home screen as a shortcut.
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <div style={{ flex: 1, padding: '9px 12px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: '0.78rem', color: '#374151', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {widgetUrl || 'Loading…'}
                </div>
                <button onClick={copyUrl}
                  style={{ padding: '9px 14px', background: copied ? '#007A3D' : '#C1272D', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, transition: 'background 0.2s' }}>
                  {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a href={`https://wa.me/?text=${encodeURIComponent(`My SnapHubTrade.com quick-sale link: ${widgetUrl}`)}`}
                  target="_blank" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: '#25D366', color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: '0.8rem' }}>
                  <MessageCircle size={13} /> Share via WhatsApp
                </a>
                <a href={`/dealer/scan?dealer=${dealerId}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid #E5E7EB', color: '#374151', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 500 }}>
                  <QrCode size={13} /> Open on phone
                </a>
              </div>
            </div>

            {/* All 12 innovations */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginTop: 20 }}>
              <p style={{ fontWeight: 700, color: '#111827', marginBottom: 14, fontSize: '0.9rem' }}>All 12 quick-sale innovations</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'iOS Widget', badge: '⭐ Best', color: '#C1272D' },
                  { label: 'Lock Screen', badge: 'iOS 16+', color: '#8B5CF6' },
                  { label: 'Apple Watch', badge: 'Top 3', color: '#231F20' },
                  { label: 'Android Widget', badge: 'Top 3', color: '#007A3D' },
                  { label: 'Push notification', badge: 'Top 3', color: '#3B82F6' },
                  { label: 'NFC key fob', badge: null, color: '#6B7280' },
                  { label: 'WhatsApp Bot', badge: null, color: '#25D366' },
                  { label: 'Telegram Bot', badge: null, color: '#229ED9' },
                  { label: 'QR windshield', badge: null, color: '#374151' },
                  { label: 'Voice (Siri)', badge: null, color: '#6B7280' },
                  { label: 'AI auto-detect', badge: null, color: '#C1272D' },
                  { label: 'StandBy mode', badge: 'iOS 17+', color: '#F59E0B' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: '#F9FAFB' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.78rem', color: '#374151', flex: 1 }}>{item.label}</span>
                    {item.badge && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: item.color, whiteSpace: 'nowrap' }}>{item.badge}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
