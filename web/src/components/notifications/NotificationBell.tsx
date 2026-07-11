'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Bookmark, Share2, DollarSign, UserPlus, Briefcase, Info, Check, RefreshCw } from 'lucide-react';

export type NotificationRecipient = { type: 'dealer' | 'broker'; id: string };

interface NotificationItem {
  id: string; type: string; category: string; title: string; body?: string;
  data: Record<string, any>; read_at: string | null; created_at: string;
}

const CATEGORY_CFG: Record<string, { icon: any; color: string; bg: string }> = {
  reservation:  { icon: Bookmark,    color: '#1E40AF', bg: '#DBEAFE' },
  shared_stock: { icon: Share2,      color: '#5B21B6', bg: '#EDE9FE' },
  sale:         { icon: DollarSign,  color: '#065F46', bg: '#D1FAE5' },
  lead:         { icon: UserPlus,    color: '#C1272D', bg: '#FFF1F2' },
  broker_deal:  { icon: Briefcase,   color: '#92400E', bg: '#FEF3C7' },
  general:      { icon: Info,        color: '#6B7280', bg: '#F3F4F6' },
};

function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

const POLL_MS = 10_000;

export function NotificationBell({ recipient }: { recipient: NotificationRecipient }) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const prevUnread = useRef(0);

  const load = useCallback(async () => {
    if (!recipient.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/notifications/${recipient.type}/${recipient.id}/feed?limit=25`);
      const data = await res.json();
      setItems(data.items || []);
      const newUnread = data.unread_count || 0;
      if (newUnread > prevUnread.current) setPulse(true);
      prevUnread.current = newUnread;
      setUnread(newUnread);
    } catch { /* polling is best-effort */ }
    finally { setLoading(false); }
  }, [recipient.type, recipient.id]);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!pulse) return;
    const t = setTimeout(() => setPulse(false), 1800);
    return () => clearTimeout(t);
  }, [pulse]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markOneRead = async (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, read_at: new Date().toISOString() } : i));
    setUnread(u => Math.max(0, u - 1));
    fetch(`/api/v1/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
  };

  const markAllRead = async () => {
    setItems(prev => prev.map(i => ({ ...i, read_at: i.read_at || new Date().toISOString() })));
    setUnread(0);
    fetch(`/api/v1/notifications/${recipient.type}/${recipient.id}/read-all`, { method: 'PATCH' }).catch(() => {});
  };

  if (!recipient.id) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: pulse ? 'bell-ring 0.6s' : 'none' }}>
        <Bell size={17} style={{ color: '#374151' }} />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -3, right: -3, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 9, background: '#C1272D', color: 'white', fontSize: '0.62rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '110%', right: 0, width: 360, maxHeight: 480, background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, boxShadow: '0 16px 40px rgba(0,0,0,0.15)', overflow: 'hidden', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.875rem' }}>Notifications</p>
              {loading && <RefreshCw size={11} style={{ color: '#D1D5DB', animation: 'spin 1s linear infinite' }} />}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, color: '#C1272D' }}>
                <Check size={11} /> Mark all read
              </button>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {items.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: '#9CA3AF' }}>
                <Bell size={24} style={{ margin: '0 auto 8px', opacity: 0.3, display: 'block' }} />
                <p style={{ fontSize: '0.82rem' }}>No notifications yet</p>
              </div>
            ) : items.map(n => {
              const cfg = CATEGORY_CFG[n.category] || CATEGORY_CFG.general;
              const Icon = cfg.icon;
              const isUnread = !n.read_at;
              return (
                <button key={n.id} onClick={() => {
                  if (isUnread) markOneRead(n.id);
                  if (n.category === 'lead' && recipient.type === 'dealer') {
                    setOpen(false);
                    router.push(n.data?.lead_id ? `/dealer/requests/${n.data.lead_id}` : '/dealer/requests');
                  }
                }}
                  style={{ width: '100%', display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '1px solid #F9FAFB', background: isUnread ? '#FFFBFB' : 'white', border: 'none', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: '#F9FAFB', cursor: (isUnread || n.category === 'lead') ? 'pointer' : 'default', textAlign: 'left' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} style={{ color: cfg.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{ fontWeight: isUnread ? 700 : 500, color: '#111827', margin: 0, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{n.title}</p>
                      {isUnread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#C1272D', flexShrink: 0 }} />}
                    </div>
                    {n.body && <p style={{ color: '#6B7280', margin: '2px 0 0', fontSize: '0.76rem', lineHeight: 1.4 }}>{n.body}</p>}
                    <p style={{ color: '#9CA3AF', margin: '4px 0 0', fontSize: '0.68rem' }}>{timeAgo(n.created_at)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes bell-ring { 0%,100%{transform:rotate(0)} 20%{transform:rotate(14deg)} 40%{transform:rotate(-12deg)} 60%{transform:rotate(8deg)} 80%{transform:rotate(-4deg)} }
      `}</style>
    </div>
  );
}
