'use client';
import { useState } from 'react';
import { Bell, BellOff, CheckCircle, X, MessageCircle, Mail } from 'lucide-react';

const ALERT_TYPES = [
  { value: 'price_drop',   label: '💰 Price Drop',          desc: 'When a listed price drops' },
  { value: 'new_vehicle',  label: '🆕 New Listing',         desc: 'New vehicles matching your criteria' },
  { value: 'export_deal',  label: '✈️ Export Opportunity',  desc: 'Export-eligible vehicles added' },
  { value: 'brand',        label: '🚗 Favourite Brand',     desc: 'New vehicles from a specific brand' },
];

export function AlertSubscribeWidget({ make, model, priceMax }: { make?: string; model?: string; priceMax?: number }) {
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [type, setType] = useState('price_drop');
  const [channels, setChannels] = useState(['email']);
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleChannel = (ch: string) =>
    setChannels(prev => prev.includes(ch) ? prev.filter(x => x !== ch) : [...prev, ch]);

  const submit = async () => {
    if (!email) return;
    setLoading(true);
    try {
      await fetch('/api/v1/alerts/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone: whatsapp, alert_type: type, channel: channels, filters: { make, model, price_max: priceMax } }),
      });
      setDone(true);
    } catch {}
    finally { setLoading(false); }
  };

  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, background: 'white', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
      <Bell size={14} style={{ color: '#F59E0B' }} /> Set price alert
    </button>
  );

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #E5E7EB', overflow: 'hidden', padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={16} style={{ color: '#F59E0B' }} /> Smart Alert
        </p>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={14} /></button>
      </div>

      {done ? (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <CheckCircle size={28} style={{ color: '#007A3D', display: 'block', margin: '0 auto 8px' }} />
          <p style={{ fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>Alert created!</p>
          <p style={{ fontSize: '0.8rem', color: '#9CA3AF', margin: 0 }}>We'll notify you via {channels.join(' & ')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ALERT_TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)}
                style={{ padding: '5px 10px', borderRadius: 8, border: `1.5px solid ${type === t.value ? '#F59E0B' : '#E5E7EB'}`, background: type === t.value ? '#FFFBEB' : 'white', color: type === t.value ? '#92400E' : '#6B7280', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                {t.label}
              </button>
            ))}
          </div>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address *"
            style={{ padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: 9, fontSize: '0.82rem', outline: 'none', color: '#374151' }} />
          <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="WhatsApp (optional)"
            style={{ padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: 9, fontSize: '0.82rem', outline: 'none', color: '#374151' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ id: 'email', icon: Mail, label: 'Email' }, { id: 'whatsapp', icon: MessageCircle, label: 'WhatsApp' }].map(ch => (
              <button key={ch.id} onClick={() => toggleChannel(ch.id)}
                style={{ flex: 1, padding: '7px 0', borderRadius: 9, border: `1.5px solid ${channels.includes(ch.id) ? '#007A3D' : '#E5E7EB'}`, background: channels.includes(ch.id) ? '#F0FDF4' : 'white', color: channels.includes(ch.id) ? '#007A3D' : '#6B7280', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <ch.icon size={12} /> {ch.label}
              </button>
            ))}
          </div>
          <button onClick={submit} disabled={!email || loading}
            style={{ padding: '10px 0', background: !email ? '#E5E7EB' : '#F59E0B', color: !email ? '#9CA3AF' : 'white', border: 'none', borderRadius: 10, cursor: !email ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.875rem' }}>
            {loading ? 'Creating…' : '🔔 Create alert'}
          </button>
        </div>
      )}
    </div>
  );
}
