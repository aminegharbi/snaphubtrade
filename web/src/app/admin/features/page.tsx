'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Search, CheckCircle2, XCircle, Clock, Users, Zap,
  Calendar, Save, ChevronDown, ChevronUp, BarChart3, Rocket,
  Eye, EyeOff, Shield, Globe, AlertTriangle, X, History, Copy
} from 'lucide-react';
import { api } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Flag {
  id: string; key: string; name: string; description: string;
  category: string; icon: string; is_enabled: boolean; rollout_pct: number;
  target_plans: string[]; target_roles: string[]; target_zones: string[];
  scheduled_on?: string; scheduled_off?: string; enabled_at?: string;
  tags: string[]; notes: string; updated_by?: string; updated_at: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const CAT: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  marketplace: { label: 'Marketplace', color: '#3B82F6', bg: '#DBEAFE',  emoji: '🏪' },
  dealer:      { label: 'Dealer',      color: '#007A3D', bg: '#D1FAE5',  emoji: '🚗' },
  mobile:      { label: 'Mobile',      color: '#8B5CF6', bg: '#EDE9FE',  emoji: '📱' },
  broker:      { label: 'Broker',      color: '#C1272D', bg: '#FEE2E2',  emoji: '🤝' },
  ai:          { label: 'AI',          color: '#F59E0B', bg: '#FEF3C7',  emoji: '🤖' },
  social:      { label: 'Social',      color: '#EC4899', bg: '#FCE7F3',  emoji: '💬' },
  payment:     { label: 'Payment',     color: '#065F46', bg: '#D1FAE5',  emoji: '💳' },
  admin:       { label: 'Admin',       color: '#374151', bg: '#F3F4F6',  emoji: '⚙️' },
};

const PHASES: Record<string, { label: string; color: string; bg: string; border: string; desc: string }> = {
  launch: { label: '🚀 Launch',   color: '#065F46', bg: '#D1FAE5', border: '#6EE7B7', desc: 'Core features — live on day 1' },
  phase1: { label: '📈 Phase 1',  color: '#1E40AF', bg: '#DBEAFE', border: '#93C5FD', desc: 'Growth features — 1-3 months' },
  phase2: { label: '⚡ Phase 2',  color: '#5B21B6', bg: '#EDE9FE', border: '#C4B5FD', desc: 'Monetization — 3-6 months' },
  phase3: { label: '🌟 Phase 3',  color: '#92400E', bg: '#FEF3C7', border: '#FDE68A', desc: 'Scale features — 6-12 months' },
  phase4: { label: '🔮 Phase 4',  color: '#991B1B', bg: '#FEE2E2', border: '#FCA5A5', desc: 'Innovation — 12+ months' },
};

const PLANS = ['free', 'pro', 'enterprise'];
const ROLES = ['admin', 'dealer', 'buyer', 'broker'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={e => { e.stopPropagation(); onChange(!on); }}
      style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, background: on ? '#007A3D' : '#D1D5DB', border: 'none', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
    </button>
  );
}

function RolloutBar({ pct }: { pct: number }) {
  const color = pct === 0 ? '#E5E7EB' : pct < 30 ? '#FEF3C7' : pct < 70 ? '#DBEAFE' : '#D1FAE5';
  const fill  = pct === 0 ? '#9CA3AF' : pct < 30 ? '#F59E0B' : pct < 70 ? '#3B82F6' : '#007A3D';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 64, height: 6, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: fill, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: fill }}>{pct}%</span>
    </div>
  );
}

// ─── Configure Modal ──────────────────────────────────────────────────────────

function ConfigModal({ flag, onClose, onSave }: { flag: Flag; onClose: () => void; onSave: (f: Flag) => void }) {
  const [form, setForm] = useState<any>({
    is_enabled:    flag.is_enabled,
    rollout_pct:   flag.rollout_pct,
    target_plans:  [...flag.target_plans],
    target_roles:  [...flag.target_roles],
    scheduled_on:  flag.scheduled_on ? flag.scheduled_on.slice(0, 16) : '',
    scheduled_off: flag.scheduled_off ? flag.scheduled_off.slice(0, 16) : '',
    notes:         flag.notes || '',
  });
  const [logs, setLogs]     = useState<any[]>([]);
  const [tab, setTab]       = useState<'config' | 'logs'>('config');
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState('');

  useEffect(() => {
    api.get<any[]>(`/feature-flags/${flag.key}/logs`).then(setLogs).catch(() => setLogs([]));
  }, [flag.key]);

  const togglePlan = (p: string) => setForm((f: any) => ({ ...f, target_plans: f.target_plans.includes(p) ? f.target_plans.filter((x: string) => x !== p) : [...f.target_plans, p] }));
  const toggleRole = (r: string) => setForm((f: any) => ({ ...f, target_roles: f.target_roles.includes(r) ? f.target_roles.filter((x: string) => x !== r) : [...f.target_roles, r] }));

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.patch<Flag>(`/feature-flags/${flag.key}`, { ...form, actor: 'admin', scheduled_on: form.scheduled_on || null, scheduled_off: form.scheduled_off || null });
      setToast('Saved ✓');
      setTimeout(() => setToast(''), 2000);
      onSave(updated);
    } catch { setToast('Error saving'); }
    finally { setSaving(false); }
  };

  const cat = CAT[flag.category] || CAT.admin;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        {/* Modal header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{flag.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.95rem' }}>{flag.name}</p>
            <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.78rem', fontFamily: 'monospace' }}>{flag.key}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Toggle on={form.is_enabled} onChange={v => setForm((f: any) => ({ ...f, is_enabled: v }))} />
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, padding: '10px 22px 0', borderBottom: '1px solid #F3F4F6' }}>
          {(['config', 'logs'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '7px 16px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', background: tab === t ? 'white' : 'transparent', color: tab === t ? '#111827' : '#9CA3AF', borderBottom: tab === t ? '2px solid #C1272D' : '2px solid transparent' }}>
              {t === 'config' ? '⚙️ Configure' : `📋 Change log (${logs.length})`}
            </button>
          ))}
        </div>

        {/* Modal body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          {tab === 'config' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>{flag.description}</p>

              {/* Rollout slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rollout percentage</label>
                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: form.rollout_pct === 100 ? '#007A3D' : '#C1272D' }}>{form.rollout_pct}%</span>
                </div>
                <input type="range" min={0} max={100} step={5} value={form.rollout_pct}
                  onChange={e => setForm((f: any) => ({ ...f, rollout_pct: +e.target.value }))}
                  style={{ width: '100%', accentColor: '#C1272D' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#9CA3AF' }}>
                  <span>0% — disabled</span><span>50% — A/B test</span><span>100% — everyone</span>
                </div>
              </div>

              {/* Target plans */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Target plans <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(empty = all plans)</span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {PLANS.map(p => (
                    <button key={p} onClick={() => togglePlan(p)}
                      style={{ padding: '6px 14px', borderRadius: 8, border: `1.5px solid`, borderColor: form.target_plans.includes(p) ? '#C1272D' : '#E5E7EB', background: form.target_plans.includes(p) ? '#FFF1F2' : 'white', color: form.target_plans.includes(p) ? '#C1272D' : '#6B7280', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', textTransform: 'capitalize' }}>
                      {form.target_plans.includes(p) && '✓ '}{p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target roles */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Target roles <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(empty = all roles)</span>
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ROLES.map(r => (
                    <button key={r} onClick={() => toggleRole(r)}
                      style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid', borderColor: form.target_roles.includes(r) ? '#3B82F6' : '#E5E7EB', background: form.target_roles.includes(r) ? '#EFF6FF' : 'white', color: form.target_roles.includes(r) ? '#1E40AF' : '#6B7280', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', textTransform: 'capitalize' }}>
                      {form.target_roles.includes(r) && '✓ '}{r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    <Calendar size={11} style={{ display: 'inline', marginRight: 4 }} />Auto-enable on
                  </label>
                  <input type="datetime-local" value={form.scheduled_on} onChange={e => setForm((f: any) => ({ ...f, scheduled_on: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: '0.82rem', color: '#374151', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />Auto-disable on
                  </label>
                  <input type="datetime-local" value={form.scheduled_off} onChange={e => setForm((f: any) => ({ ...f, scheduled_off: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: '0.82rem', color: '#374151', outline: 'none' }} />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Internal notes</label>
                <textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} rows={2}
                  placeholder="Why is this enabled/disabled? Any caveats?"
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: '0.82rem', color: '#374151', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              {/* Tags */}
              {flag.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {flag.tags.map(t => {
                    const ph = PHASES[t];
                    return <span key={t} style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: ph?.bg || '#F3F4F6', color: ph?.color || '#6B7280' }}>{ph ? PHASES[t].label : t}</span>;
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Change log */
            <div>
              {logs.length === 0 ? (
                <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '30px 0', fontSize: '0.875rem' }}>No changes logged yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {logs.map((l: any) => (
                    <div key={l.id} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #F3F4F6' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: l.action === 'enabled' ? '#D1FAE5' : l.action === 'disabled' ? '#FEE2E2' : '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0 }}>
                        {l.action === 'enabled' ? '✓' : l.action === 'disabled' ? '✗' : '~'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, color: '#374151', margin: 0, fontSize: '0.82rem' }}>{l.action} by {l.actor || 'admin'}</p>
                        <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.75rem' }}>{new Date(l.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {tab === 'config' && (
          <div style={{ padding: '14px 22px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA' }}>
            {toast && <span style={{ fontSize: '0.82rem', fontWeight: 600, color: toast.includes('Error') ? '#C1272D' : '#007A3D' }}>{toast}</span>}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={{ padding: '8px 16px', border: '1.5px solid #E5E7EB', borderRadius: 9, background: 'white', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem', color: '#374151' }}>Cancel</button>
              <button onClick={save} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: saving ? '#E5E7EB' : '#C1272D', color: saving ? '#9CA3AF' : 'white', border: 'none', borderRadius: 9, cursor: saving ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.875rem' }}>
                {saving ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Flag row ─────────────────────────────────────────────────────────────────

function FlagRow({ flag, onToggle, onConfigure }: { flag: Flag; onToggle: (key: string, v: boolean) => void; onConfigure: (f: Flag) => void }) {
  const cat = CAT[flag.category] || CAT.admin;
  const isScheduled = flag.scheduled_on && !flag.is_enabled;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #F9FAFB', background: flag.is_enabled ? 'white' : '#FAFAFA', transition: 'background 0.15s' }}>
      {/* Icon + name */}
      <div style={{ fontSize: '1.1rem', width: 28, textAlign: 'center', flexShrink: 0 }}>{flag.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <p style={{ fontWeight: 600, color: flag.is_enabled ? '#111827' : '#9CA3AF', margin: 0, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{flag.name}</p>
          {isScheduled && <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: 10, background: '#FEF3C7', color: '#92400E', fontWeight: 600, flexShrink: 0 }}>⏰ scheduled</span>}
          {flag.target_plans.length > 0 && <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: 10, background: '#DBEAFE', color: '#1E40AF', fontWeight: 600, flexShrink: 0 }}>🔒 {flag.target_plans.join('+')}</span>}
          {flag.tags.filter(t => t.startsWith('phase')).map(t => {
            const ph = PHASES[t];
            return ph ? <span key={t} style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: 10, background: ph.bg, color: ph.color, fontWeight: 600, flexShrink: 0 }}>{t}</span> : null;
          })}
        </div>
        <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{flag.description}</p>
      </div>

      {/* Rollout */}
      <div style={{ flexShrink: 0, width: 90 }}>
        <RolloutBar pct={flag.rollout_pct} />
      </div>

      {/* Toggle */}
      <Toggle on={flag.is_enabled} onChange={v => onToggle(flag.key, v)} />

      {/* Configure */}
      <button onClick={() => onConfigure(flag)}
        style={{ padding: '5px 12px', border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#374151', flexShrink: 0, whiteSpace: 'nowrap' }}>
        Configure
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FeaturesAdminPage() {
  const [data,     setData]     = useState<{ flags: Flag[]; grouped: Record<string, Flag[]>; total: number; enabled: number } | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState<Flag | null>(null);
  const [search,   setSearch]   = useState('');
  const [catFilter,setCatFilter]= useState('');
  const [view,     setView]     = useState<'category' | 'phase'>('category');
  const [toast,    setToast]    = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [collapsed,setCollapsed]= useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<any>(`/feature-flags?${new URLSearchParams({ search, category: catFilter })}`);
      setData(result);
    } catch {}
    finally { setLoading(false); }
  }, [search, catFilter]);

  useEffect(() => { load(); }, [load]);

  const showToast = (m: string, dur = 2500) => { setToast(m); setTimeout(() => setToast(''), dur); };

  const handleToggle = async (key: string, enabled: boolean) => {
    try {
      await api.patch(`/feature-flags/${key}/toggle`, { enabled, actor: 'admin' });
      setData(d => d ? {
        ...d,
        flags: d.flags.map(f => f.key === key ? { ...f, is_enabled: enabled, rollout_pct: enabled ? (f.rollout_pct || 100) : f.rollout_pct } : f),
        grouped: Object.fromEntries(Object.entries(d.grouped).map(([cat, flags]) => [cat, flags.map(f => f.key === key ? { ...f, is_enabled: enabled } : f)])),
        enabled: d.enabled + (enabled ? 1 : -1),
      } : d);
      showToast(`${key} ${enabled ? '✓ enabled' : '✗ disabled'}`);
    } catch { showToast('Failed to update flag'); }
  };

  const handleSave = (updated: Flag) => {
    setData(d => d ? {
      ...d,
      flags: d.flags.map(f => f.key === updated.key ? updated : f),
      grouped: Object.fromEntries(Object.entries(d.grouped).map(([cat, flags]) => [cat, flags.map(f => f.key === updated.key ? updated : f)])),
    } : d);
    showToast('Configuration saved ✓');
  };

  const activatePhase = async (phase: string) => {
    const keys = (data?.flags || []).filter(f => f.tags.includes(phase) && !f.is_enabled).map(f => f.key);
    if (!keys.length) { showToast(`All ${PHASES[phase].label} features already active`); return; }
    try {
      await api.post('/feature-flags/bulk-toggle', { keys, enabled: true, actor: 'admin' });
      await load();
      showToast(`✓ ${PHASES[phase].label} — ${keys.length} features activated`);
    } catch { showToast('Bulk activation failed'); }
  };

  const bulkToggle = async (enabled: boolean) => {
    if (!selected.length) return;
    try {
      await api.post('/feature-flags/bulk-toggle', { keys: selected, enabled, actor: 'admin' });
      await load();
      setSelected([]);
      showToast(`${selected.length} flags ${enabled ? 'enabled' : 'disabled'}`);
    } catch { showToast('Bulk action failed'); }
  };

  // Group by phase for phase view
  const byPhase: Record<string, Flag[]> = {};
  for (const flag of data?.flags || []) {
    const phase = flag.tags.find(t => PHASES[t]) || 'other';
    if (!byPhase[phase]) byPhase[phase] = [];
    byPhase[phase].push(flag);
  }

  const stats = data ? {
    total: data.total, enabled: data.enabled, disabled: data.total - data.enabled,
    pct: Math.round((data.enabled / data.total) * 100),
  } : null;

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 100, background: '#111827', color: 'white', padding: '10px 18px', borderRadius: 12, fontSize: '0.875rem', fontWeight: 500, boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}>
          {toast}
        </div>
      )}

      {editing && <ConfigModal flag={editing} onClose={() => setEditing(null)} onSave={f => { handleSave(f); setEditing(null); }} />}

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '20px 28px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
            <div>
              <h1 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#111827', margin: '0 0 4px' }}>🚩 Feature Flag Manager</h1>
              <p style={{ color: '#6B7280', margin: 0, fontSize: '0.875rem' }}>Control which features are live — activate by phase, plan, or percentage rollout</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setView('category')} style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid', borderColor: view === 'category' ? '#C1272D' : '#E5E7EB', background: view === 'category' ? '#FFF1F2' : 'white', color: view === 'category' ? '#C1272D' : '#6B7280', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>By category</button>
              <button onClick={() => setView('phase')}    style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid', borderColor: view === 'phase'    ? '#C1272D' : '#E5E7EB', background: view === 'phase'    ? '#FFF1F2' : 'white', color: view === 'phase'    ? '#C1272D' : '#6B7280', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>By launch phase</button>
              <button onClick={load} style={{ padding: '7px 12px', border: '1px solid #E5E7EB', borderRadius: 8, background: 'white', cursor: 'pointer' }}><RefreshCw size={14} style={{ color: '#6B7280', animation: loading ? 'spin 1s linear infinite' : 'none' }} /></button>
            </div>
          </div>

          {/* KPI row */}
          {stats && (
            <div className="da-kpi-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
              {[
                { label: 'Total features', value: stats.total,   color: '#374151', icon: '🚩' },
                { label: 'Active',         value: stats.enabled, color: '#007A3D', icon: '✅' },
                { label: 'Inactive',       value: stats.disabled,color: '#C1272D', icon: '⭕' },
                { label: 'Rollout avg',    value: `${stats.pct}%`, color: '#3B82F6', icon: '📊' },
              ].map(s => (
                <div key={s.label} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: '12px 16px' }}>
                  <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, margin: 0 }}>{s.icon} {s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Phase quick-launch row */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#9CA3AF', alignSelf: 'center', marginRight: 4 }}>Quick launch:</span>
            {Object.entries(PHASES).map(([key, ph]) => {
              const total = (data?.flags || []).filter(f => f.tags.includes(key)).length;
              const active = (data?.flags || []).filter(f => f.tags.includes(key) && f.is_enabled).length;
              const done = total > 0 && active === total;
              return (
                <button key={key} onClick={() => activatePhase(key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: `1.5px solid ${done ? ph.color : '#E5E7EB'}`, background: done ? ph.bg : 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: done ? ph.color : '#6B7280', transition: 'all 0.15s' }}>
                  {ph.label}
                  <span style={{ fontSize: '0.7rem', background: done ? ph.color : '#E5E7EB', color: done ? 'white' : '#9CA3AF', padding: '1px 6px', borderRadius: 10 }}>{active}/{total}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 28px' }}>
        {/* Filters + bulk actions */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search features…"
              style={{ width: '100%', padding: '8px 10px 8px 32px', border: '1.5px solid #E5E7EB', borderRadius: 9, fontSize: '0.875rem', outline: 'none', color: '#374151' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['', ...Object.keys(CAT)].map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid', borderColor: catFilter === c ? '#C1272D' : '#E5E7EB', background: catFilter === c ? '#FFF1F2' : 'white', color: catFilter === c ? '#C1272D' : '#6B7280', cursor: 'pointer', fontWeight: 500, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                {c ? `${CAT[c].emoji} ${CAT[c].label}` : 'All'}
              </button>
            ))}
          </div>
          {selected.length > 0 && (
            <div style={{ display: 'flex', gap: 6, padding: '6px 12px', background: '#FFF1F2', border: '1px solid #FECACA', borderRadius: 9, alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#C1272D' }}>{selected.length} selected</span>
              <button onClick={() => bulkToggle(true)}  style={{ padding: '4px 10px', background: '#007A3D', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>Enable all</button>
              <button onClick={() => bulkToggle(false)} style={{ padding: '4px 10px', background: '#C1272D', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>Disable all</button>
              <button onClick={() => setSelected([])}  style={{ padding: '4px 8px', background: 'white', border: '1px solid #FECACA', borderRadius: 6, cursor: 'pointer', fontSize: '0.78rem', color: '#C1272D' }}>✕ Clear</button>
            </div>
          )}
        </div>

        {/* Flag list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }} />
            <p>Loading feature flags…</p>
          </div>
        ) : view === 'category' ? (
          /* ── Category view ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(data?.grouped || {}).map(([cat, flags]) => {
              const cfg = CAT[cat] || CAT.admin;
              const activeCount = flags.filter(f => f.is_enabled).length;
              const isCollapsed = collapsed[cat];
              return (
                <div key={cat} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
                  <button onClick={() => setCollapsed(c => ({ ...c, [cat]: !c[cat] }))}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: '1.1rem' }}>{cfg.emoji}</span>
                    <span style={{ fontWeight: 700, color: '#111827', fontSize: '0.9rem' }}>{cfg.label}</span>
                    <span style={{ fontSize: '0.78rem', color: '#9CA3AF', flex: 1 }}>{flags.length} features</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ height: 6, width: 80, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round(activeCount / flags.length * 100)}%`, background: cfg.color, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: cfg.color }}>{activeCount}/{flags.length}</span>
                    </div>
                    {isCollapsed ? <ChevronDown size={14} style={{ color: '#9CA3AF' }} /> : <ChevronUp size={14} style={{ color: '#9CA3AF' }} />}
                  </button>
                  {!isCollapsed && flags.map(flag => (
                    <FlagRow key={flag.key} flag={flag} onToggle={handleToggle} onConfigure={setEditing} />
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Phase view ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(PHASES).map(([phase, ph]) => {
              const flags = byPhase[phase] || [];
              if (!flags.length) return null;
              const activeCount = flags.filter(f => f.is_enabled).length;
              const isCollapsed = collapsed[phase];
              const allDone = activeCount === flags.length;
              return (
                <div key={phase} style={{ background: 'white', border: `2px solid ${allDone ? ph.border : '#E5E7EB'}`, borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: allDone ? ph.bg : 'white', borderBottom: '1px solid #F3F4F6' }}>
                    <button onClick={() => setCollapsed(c => ({ ...c, [phase]: !c[phase] }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: allDone ? ph.color : '#111827' }}>{ph.label}</span>
                      <span style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>{ph.desc}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.78rem', fontWeight: 700, color: allDone ? ph.color : '#9CA3AF' }}>{activeCount}/{flags.length} active</span>
                      {isCollapsed ? <ChevronDown size={14} style={{ color: '#9CA3AF' }} /> : <ChevronUp size={14} style={{ color: '#9CA3AF' }} />}
                    </button>
                    {!allDone && (
                      <button onClick={() => activatePhase(phase)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: ph.color, color: 'white', border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                        <Rocket size={13} /> Activate all
                      </button>
                    )}
                    {allDone && <span style={{ fontSize: '0.78rem', fontWeight: 700, color: ph.color, flexShrink: 0 }}>✓ All live</span>}
                  </div>
                  {!isCollapsed && flags.map(flag => (
                    <FlagRow key={flag.key} flag={flag} onToggle={handleToggle} onConfigure={setEditing} />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
