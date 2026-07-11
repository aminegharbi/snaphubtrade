'use client';
import { useState } from 'react';
import { Send, CheckCircle, RefreshCw, MessageSquare } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';

interface Props {
  vehicleId: string;
  dealerId: string;
  vehiclePrice: number;
}

export function BuyerInquiryWidget({ vehicleId, dealerId, vehiclePrice }: Props) {
  const { profile } = useSession();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(profile.profile_type !== 'guest' ? profile.display_name : '');
  const [email, setEmail] = useState(profile.email || '');
  const [phone, setPhone] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  // Brokers/dealers have their own dedicated flows (reserve, designate) — this
  // form is for marketplace buyers expressing interest in purchasing.
  if (profile.profile_type === 'broker' || profile.profile_type === 'dealer') return null;

  const submit = async () => {
    if (!name || !(email || phone)) { setError('Please share your name and an email or phone number'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/v1/crm/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealer_id: dealerId, vehicle_id: vehicleId,
          buyer_name: name, buyer_email: email || undefined, buyer_phone: phone || undefined,
          offer_price: offerPrice ? Number(offerPrice) : undefined,
          notes: message || undefined,
          channel: 'website',
        }),
      });
      if (!res.ok) throw new Error('Could not send your request — please try again');
      setDone(true);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', background: 'white', color: '#111827', border: '1.5px solid #E5E7EB', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
      <MessageSquare size={16} /> Request this vehicle
    </button>
  );

  return (
    <div style={{ background: 'white', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: '14px 16px' }}>
      {done ? (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <CheckCircle size={26} style={{ color: '#007A3D', display: 'block', margin: '0 auto 8px' }} />
          <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 2px', fontSize: '0.875rem' }}>Request sent!</p>
          <p style={{ color: '#9CA3AF', fontSize: '0.78rem', margin: 0 }}>The dealer has been notified and will reach out shortly.</p>
        </div>
      ) : (
        <>
          <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 10px', fontSize: '0.85rem' }}>Request this vehicle</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
              style={{ padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 9, fontSize: '0.8rem', outline: 'none' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email"
                style={{ padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 9, fontSize: '0.8rem', outline: 'none' }} />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone / WhatsApp"
                style={{ padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 9, fontSize: '0.8rem', outline: 'none' }} />
            </div>
            <input value={offerPrice} onChange={e => setOfferPrice(e.target.value)} type="number"
              placeholder={`Your offer (optional, AED — listed at ${vehiclePrice.toLocaleString()})`}
              style={{ padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 9, fontSize: '0.8rem', outline: 'none' }} />
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Message (optional)" rows={2}
              style={{ padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 9, fontSize: '0.8rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
            {error && <p style={{ fontSize: '0.75rem', color: '#C1272D', margin: 0 }}>{error}</p>}
            <button onClick={submit} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', background: loading ? '#9CA3AF' : '#111827', color: 'white', border: 'none', borderRadius: 10, cursor: loading ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
              {loading ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
              {loading ? 'Sending…' : 'Send request'}
            </button>
          </div>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </>
      )}
    </div>
  );
}
