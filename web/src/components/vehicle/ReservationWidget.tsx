'use client';
import { useState, useEffect, useCallback } from 'react';
import { Bookmark, Clock, CheckCircle, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';

interface Reservation {
  id: string; status: string; expires_at: string;
  reserved_by_name?: string;
  broker?: { id: string; full_name: string; affiliate_code: string; tier: string };
}

function hoursLeft(expiresAt: string): number {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 3600000));
}

export function ReservationWidget({ vehicleId, vehicleStatus }: { vehicleId: string; vehicleStatus: string }) {
  const { profile } = useSession();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/reservations/vehicle/${vehicleId}`);
      const data = await res.json();
      setReservation(data && data.status === 'active' ? data : null);
    } catch { setReservation(null); }
    finally { setLoading(false); }
  }, [vehicleId]);

  useEffect(() => { load(); }, [load]);

  const isBroker = profile.profile_type === 'broker';

  const book = async () => {
    setBooking(true); setError('');
    try {
      const res = await fetch('/api/v1/reservations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: vehicleId, broker_id: profile.broker_id,
          reserved_by_name: profile.display_name, reserved_by_contact: profile.email,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not reserve this vehicle');
      setReservation(data);
      setNote('');
    } catch (e: any) { setError(e.message); }
    finally { setBooking(false); }
  };

  const cancel = async () => {
    if (!reservation) return;
    setBooking(true);
    try {
      await fetch(`/api/v1/reservations/${reservation.id}/cancel`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: profile.display_name }),
      });
      setReservation(null);
    } catch {}
    finally { setBooking(false); }
  };

  if (loading) return null;

  // ── Vehicle is actively reserved ──────────────────────────────────────────
  if (reservation) {
    const hrs = hoursLeft(reservation.expires_at);
    const isOwnReservation = isBroker && reservation.broker?.id === profile.broker_id;
    return (
      <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 14, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Bookmark size={15} style={{ color: '#1E40AF' }} />
          <p style={{ fontWeight: 700, color: '#1E40AF', margin: 0, fontSize: '0.85rem' }}>Reserved</p>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#374151', margin: '0 0 4px' }}>
          Held by {reservation.broker?.full_name || reservation.reserved_by_name || 'a broker'}
          {reservation.broker?.tier && <span style={{ marginLeft: 6, fontSize: '0.68rem', padding: '1px 7px', borderRadius: 20, background: '#DBEAFE', color: '#1E40AF', fontWeight: 700 }}>{reservation.broker.tier}</span>}
        </p>
        <p style={{ fontSize: '0.78rem', color: '#3B82F6', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={11} /> {hrs > 0 ? `Expires in ${hrs}h` : 'Expiring soon'}
        </p>
        {isOwnReservation && (
          <button onClick={cancel} disabled={booking}
            style={{ marginTop: 10, width: '100%', padding: '8px 0', background: 'white', border: '1.5px solid #FECACA', color: '#C1272D', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {booking ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={13} />}
            Cancel my reservation
          </button>
        )}
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── Not reserved, vehicle not available (sold etc.) ─────────────────────────
  if (vehicleStatus !== 'available') return null;

  // ── Not reserved, current user is a broker → show booking action ───────────
  if (isBroker) {
    return (
      <div style={{ background: 'white', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Bookmark size={15} style={{ color: '#007A3D' }} />
          <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.85rem' }}>Reserve for a client</p>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#9CA3AF', margin: '0 0 10px' }}>
          Hold this vehicle for 24h while you close the deal. The dealer is notified instantly.
        </p>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note for dealer (optional)"
          style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 9, fontSize: '0.8rem', outline: 'none', marginBottom: 8 }} />
        {error && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 8, padding: '8px 10px', background: '#FEF2F2', borderRadius: 8 }}>
            <AlertTriangle size={12} style={{ color: '#C1272D', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: '0.75rem', color: '#C1272D', margin: 0 }}>{error}</p>
          </div>
        )}
        <button onClick={book} disabled={booking}
          style={{ width: '100%', padding: '10px 0', background: booking ? '#9CA3AF' : '#007A3D', color: 'white', border: 'none', borderRadius: 10, cursor: booking ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {booking ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Bookmark size={13} />}
          {booking ? 'Reserving…' : 'Reserve for 24h'}
        </button>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── Not a broker — soft prompt ───────────────────────────────────────────
  return null;
}
