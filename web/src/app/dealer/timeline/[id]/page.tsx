'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Clock, Check, Camera, Globe, Users, ShoppingCart, Truck, Archive, AlertTriangle, MessageCircle, ArrowLeftRight, RefreshCw, Plus, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { usePriceFormatter } from '@/components/common/Price';

const EVENT_CFG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  created:           { icon: Plus,           color: '#374151', bg: '#F3F4F6', label: 'Created' },
  photographed:      { icon: Camera,         color: '#5B21B6', bg: '#EDE9FE', label: 'Photographed' },
  published:         { icon: Globe,          color: '#007A3D', bg: '#D1FAE5', label: 'Published' },
  shared:            { icon: Users,          color: '#3B82F6', bg: '#DBEAFE', label: 'Shared' },
  share_revoked:     { icon: AlertTriangle,  color: '#92400E', bg: '#FEF3C7', label: 'Share revoked' },
  reserved:          { icon: Clock,          color: '#92400E', bg: '#FEF3C7', label: 'Reserved' },
  test_drive:        { icon: ArrowLeftRight, color: '#6B7280', bg: '#F3F4F6', label: 'Test drive' },
  sold:              { icon: ShoppingCart,   color: '#C1272D', bg: '#FEE2E2', label: 'Sold' },
  delivered:         { icon: Truck,          color: '#1E40AF', bg: '#DBEAFE', label: 'Delivered' },
  returned:          { icon: RefreshCw,      color: '#374151', bg: '#F3F4F6', label: 'Returned' },
  archived:          { icon: Archive,        color: '#374151', bg: '#F3F4F6', label: 'Archived' },
  status_changed:    { icon: RefreshCw,      color: '#B8860B', bg: '#FEF3C7', label: 'Status changed' },
  price_changed:     { icon: Check,          color: '#B8860B', bg: '#FEF3C7', label: 'Price updated' },
  collab_message:    { icon: MessageCircle,  color: '#3B82F6', bg: '#DBEAFE', label: 'Message' },
  collab_offer:      { icon: MessageCircle,  color: '#007A3D', bg: '#D1FAE5', label: 'Offer received' },
  collab_reserve:    { icon: Clock,          color: '#92400E', bg: '#FEF3C7', label: 'Reserve request' },
  collab_transfer:   { icon: ArrowLeftRight, color: '#8B5CF6', bg: '#EDE9FE', label: 'Transfer request' },
  quick_action:      { icon: Check,          color: '#C1272D', bg: '#FEE2E2', label: 'Quick action' },
  scan:              { icon: Check,          color: '#374151', bg: '#F3F4F6', label: 'Scanned' },
};

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return new Date(date).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function VehicleTimelinePage({ params }: { params: { id: string } }) {
  const formatPrice = usePriceFormatter();
  const [timeline, setTimeline] = useState<any[]>([]);
  const [vehicle, setVehicle] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addNote, setAddNote] = useState('');
  const [saving, setSaving] = useState(false);
  const dealerId = typeof window !== 'undefined' ? localStorage.getItem('dealer_id') || '' : '';
  const vehicleId = params?.id;

  useEffect(() => {
    if (!vehicleId) return;
    load();
  }, [vehicleId]);

  const load = async () => {
    setLoading(true);
    try {
      const [tl, v, msgs] = await Promise.all([
        api.get<any[]>(`/collaborative/vehicles/${vehicleId}/timeline`),
        api.get<any>(`/vehicles/${vehicleId}`),
        api.get<any[]>(`/collaborative/vehicles/${vehicleId}/messages`),
      ]);
      setTimeline(tl || []);
      setVehicle(v);
      setMessages(msgs || []);
    } catch { /* */ }
    finally { setLoading(false); }
  };

  const saveNote = async () => {
    if (!addNote.trim()) return;
    setSaving(true);
    try {
      await api.post(`/collaborative/vehicles/${vehicleId}/timeline`, {
        event_type: 'note', note: addNote, actor_id: dealerId,
      });
      setAddNote('');
      load();
    } catch { /* */ }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <RefreshCw size={24} className="animate-spin" style={{ color: '#9CA3AF' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '16px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <a href="/dealer/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6B7280', textDecoration: 'none', fontSize: '0.875rem', marginBottom: 8 }}>
            <ChevronLeft size={14} /> Dashboard
          </a>
          {vehicle && (
            <div>
              <h1 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827', margin: '0 0 2px' }}>
                {vehicle.year} {vehicle.make} {vehicle.model}
                {vehicle.trim ? ` ${vehicle.trim}` : ''}
              </h1>
              <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0 }}>
                {formatPrice(Number(vehicle.price_aed))} · {vehicle.status}
              </p>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
        {/* Add note */}
        <div className="card" style={{ padding: 16, marginBottom: 24 }}>
          <p style={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem', marginBottom: 8 }}>Add timeline note</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={addNote} onChange={e => setAddNote(e.target.value)}
              placeholder="e.g. Client viewed vehicle, test drive completed…"
              className="input-white" style={{ flex: 1, fontSize: '0.875rem' }}
              onKeyDown={e => { if (e.key === 'Enter') saveNote(); }} />
            <button onClick={saveNote} disabled={saving || !addNote.trim()}
              style={{ padding: '10px 16px', background: '#C1272D', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', opacity: (!addNote.trim() || saving) ? 0.6 : 1 }}>
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontWeight: 700, color: '#111827', margin: 0 }}>Vehicle timeline</p>
            <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{timeline.length} events</span>
          </div>

          {timeline.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9CA3AF' }}>
              <Clock size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
              <p>No timeline events yet</p>
            </div>
          ) : (
            <div style={{ padding: '16px' }}>
              {timeline.map((event, i) => {
                const cfg = EVENT_CFG[event.event_type] || EVENT_CFG.status_changed;
                const Icon = cfg.icon;
                const isLast = i === timeline.length - 1;

                return (
                  <div key={event.id} style={{ display: 'flex', gap: 12, paddingBottom: isLast ? 0 : 16 }}>
                    {/* Icon + line */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: cfg.bg, border: `2px solid ${cfg.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={15} style={{ color: cfg.color }} />
                      </div>
                      {!isLast && <div style={{ width: 2, flex: 1, background: '#E5E7EB', marginTop: 4 }} />}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, paddingBottom: isLast ? 0 : 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>{cfg.label}</span>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF', flexShrink: 0, marginLeft: 8 }}>{timeAgo(event.occurred_at)}</span>
                      </div>
                      {event.note && <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '2px 0 0', lineHeight: 1.5 }}>{event.note}</p>}
                      {event.event_data && Object.keys(event.event_data).length > 0 && (
                        <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {Object.entries(event.event_data).slice(0, 3).map(([k, v]) => (
                            <span key={k} style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 5, background: '#F3F4F6', color: '#6B7280' }}>
                              {k}: {String(v).slice(0, 30)}
                            </span>
                          ))}
                        </div>
                      )}
                      {event.actor_id && (
                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: '3px 0 0' }}>by {event.actor_id}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Collaboration messages */}
        {messages.length > 0 && (
          <div className="card" style={{ marginTop: 20, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6' }}>
              <p style={{ fontWeight: 700, color: '#111827', margin: 0 }}>Collaboration messages</p>
            </div>
            {messages.map(m => (
              <div key={m.id} style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', gap: 10 }}>
                <MessageCircle size={15} style={{ color: '#3B82F6', flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827', textTransform: 'capitalize' }}>{m.msg_type.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: 20, background: m.status === 'accepted' ? '#D1FAE5' : m.status === 'declined' ? '#FEE2E2' : '#FEF3C7', color: m.status === 'accepted' ? '#065F46' : m.status === 'declined' ? '#991B1B' : '#92400E', fontWeight: 500 }}>{m.status}</span>
                    {m.offer_price_aed && <span style={{ fontSize: '0.8rem', color: '#C1272D', fontWeight: 700, marginLeft: 'auto' }}>{formatPrice(Number(m.offer_price_aed))}</span>}
                  </div>
                  {m.content && <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0 }}>{m.content}</p>}
                  <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: '3px 0 0' }}>{timeAgo(m.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
