'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { Users, Briefcase, Building2, User, Shield, RefreshCw, Circle } from 'lucide-react';

const PROFILE_CFG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  broker: { label: 'Brokers', color: '#007A3D', bg: '#F0FDF4', icon: Briefcase },
  dealer: { label: 'Dealers', color: '#1E40AF', bg: '#EFF6FF', icon: Building2 },
  buyer:  { label: 'Buyers',  color: '#6B7280', bg: '#F9FAFB', icon: User },
  admin:  { label: 'Admins',  color: '#C1272D', bg: '#FFF1F2', icon: Shield },
};

function timeAgo(seconds: number) {
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

export default function AdminSessionsPage() {
  const [data, setData] = useState<{ total_online: number; by_type: Record<string, number>; sessions: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  const load = useCallback(async () => {
    try {
      const params = filter ? `?profile_type=${filter}` : '';
      const res = await fetch(`/api/v1/sessions/online${params}`);
      const json = await res.json();
      setData(json);
    } catch {}
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15_000); // auto-refresh every 15s
    return () => clearInterval(t);
  }, [load]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: '1.3rem', color: '#111827', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <Circle size={10} fill="#22C55E" style={{ color: '#22C55E' }} />
            </span>
            Active Sessions
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: 0 }}>Who's currently browsing SnapHubTrade.com — auto-refreshes every 15s</p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stat cards by profile type */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setFilter('')}
          style={{ textAlign: 'left', padding: '16px 18px', borderRadius: 14, border: `1.5px solid ${filter === '' ? '#111827' : '#E5E7EB'}`, background: filter === '' ? '#111827' : 'white', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Users size={16} style={{ color: filter === '' ? 'white' : '#374151' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: filter === '' ? 'rgba(255,255,255,0.7)' : '#9CA3AF' }}>All online</span>
          </div>
          <p style={{ fontWeight: 800, fontSize: '1.8rem', color: filter === '' ? 'white' : '#111827', margin: 0 }}>{data?.total_online ?? '—'}</p>
        </button>
        {Object.entries(PROFILE_CFG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const count = data?.by_type?.[key] || 0;
          const active = filter === key;
          return (
            <button key={key} onClick={() => setFilter(active ? '' : key)}
              style={{ textAlign: 'left', padding: '16px 18px', borderRadius: 14, border: `1.5px solid ${active ? cfg.color : '#E5E7EB'}`, background: active ? cfg.bg : 'white', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon size={16} style={{ color: cfg.color }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF' }}>{cfg.label}</span>
              </div>
              <p style={{ fontWeight: 800, fontSize: '1.8rem', color: cfg.color, margin: 0 }}>{count}</p>
            </button>
          );
        })}
      </div>

      {/* Session list */}
      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6' }}>
          <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.9rem' }}>
            {filter ? PROFILE_CFG[filter]?.label : 'All profiles'} — live now
          </p>
        </div>

        {loading && !data ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <RefreshCw size={20} className="animate-spin" style={{ color: '#9CA3AF' }} />
          </div>
        ) : !data?.sessions?.length ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9CA3AF' }}>
            <Users size={28} style={{ margin: '0 auto 10px', opacity: 0.3, display: 'block' }} />
            <p style={{ fontWeight: 500 }}>No one online right now</p>
          </div>
        ) : (
          <div>
            {data.sessions.map(s => {
              const cfg = PROFILE_CFG[s.profile_type] || PROFILE_CFG.buyer;
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderTop: '1px solid #F9FAFB' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: cfg.color, color: 'white', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {s.avatar_label}
                    </div>
                    <span style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', background: '#22C55E', border: '2px solid white' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.85rem' }}>{s.display_name}</p>
                      <span style={{ fontSize: '0.65rem', padding: '1px 7px', borderRadius: 10, background: cfg.bg, color: cfg.color, fontWeight: 700 }}>{cfg.label.replace(/s$/, '')}</span>
                    </div>
                    {s.email && <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.75rem' }}>{s.email}</p>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 140 }}>
                    {s.current_page && <p style={{ fontSize: '0.75rem', color: '#374151', margin: 0, fontFamily: 'monospace' }}>{s.current_page}</p>}
                    <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: 0 }}>{timeAgo(s.seconds_ago)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
