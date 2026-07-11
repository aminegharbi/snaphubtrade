'use client';
export const dynamic = 'force-dynamic';

// ─── Super Admin — AI Twin Dealer configuration ──────────────────────────────
// Activation, model selection, prompt templates, recommendation rules and logs.

import { useState, useEffect, useCallback } from 'react';
import { Brain, Save, RefreshCw, CheckCircle2, XCircle, ScrollText } from 'lucide-react';

async function jfetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message || `HTTP ${res.status}`); }
  return res.json();
}

const S = {
  card: { background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, padding: 20, marginBottom: 16 } as const,
  label: { display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  input: { width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: '0.85rem', boxSizing: 'border-box' as const, outline: 'none' },
};

export default function AiTwinAdminPage() {
  const [cfg, setCfg] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [rulesText, setRulesText] = useState('{}');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, l] = await Promise.all([
        jfetch('/api/v1/ai-twin/admin/config'),
        jfetch('/api/v1/ai-twin/admin/logs?limit=50').catch(() => []),
      ]);
      setCfg(c);
      setRulesText(JSON.stringify(c.rules || {}, null, 2));
      setLogs(Array.isArray(l) ? l : []);
      setErr('');
    } catch (e: any) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true); setMsg(''); setErr('');
    try {
      let rules = {};
      try { rules = JSON.parse(rulesText); } catch { throw new Error('Rules must be valid JSON'); }
      const updated = await jfetch('/api/v1/ai-twin/admin/config', {
        method: 'PUT',
        body: JSON.stringify({
          enabled: cfg.enabled, model_alias: cfg.model_alias,
          brief_template: cfg.brief_template || null, chat_template: cfg.chat_template || null,
          nightly_hour_utc: Number(cfg.nightly_hour_utc) || 3, rules,
        }),
      });
      setCfg(updated); setMsg('Configuration saved ✓');
      setTimeout(() => setMsg(''), 2500);
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  if (!cfg) return (
    <div style={{ padding: 32 }}>
      {err ? <p style={{ color: '#DC2626' }}>{err}</p> : <p style={{ color: '#6B7280' }}>Loading AI Twin configuration…</p>}
    </div>
  );

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#1E1B4B,#312E81)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Brain size={20} style={{ color: '#A78BFA' }} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>AI Twin Dealer — Configuration</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280' }}>Virtual Sales Director settings: activation, models, prompt templates, recommendation rules, logs.</p>
        </div>
        <button onClick={load} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {msg && <div style={{ padding: '10px 16px', borderRadius: 10, background: '#D1FAE5', color: '#065F46', fontSize: '0.82rem', fontWeight: 600, marginBottom: 14 }}>{msg}</div>}
      {err && <div style={{ padding: '10px 16px', borderRadius: 10, background: '#FEE2E2', color: '#B91C1C', fontSize: '0.82rem', fontWeight: 600, marginBottom: 14 }}>{err}</div>}

      {/* Activation & model */}
      <div style={S.card}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div>
            <label style={S.label}>AI Twin activation</label>
            <button onClick={() => setCfg({ ...cfg, enabled: !cfg.enabled })}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', background: cfg.enabled ? '#D1FAE5' : '#FEE2E2', color: cfg.enabled ? '#065F46' : '#B91C1C' }}>
              {cfg.enabled ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              {cfg.enabled ? 'Enabled — AI Twin active for all dealers' : 'Disabled — deterministic fallback only'}
            </button>
          </div>
          <div>
            <label style={S.label}>AI model</label>
            <select value={cfg.model_alias} onChange={e => setCfg({ ...cfg, model_alias: e.target.value })} style={S.input}>
              <option value="haiku">Haiku — fastest / cheapest</option>
              <option value="sonnet">Sonnet — balanced (recommended)</option>
              <option value="opus">Opus — highest quality</option>
            </select>
          </div>
          <div>
            <label style={S.label}>Nightly run hour (UTC)</label>
            <input type="number" min={0} max={23} value={cfg.nightly_hour_utc}
              onChange={e => setCfg({ ...cfg, nightly_hour_utc: e.target.value })} style={S.input} />
          </div>
        </div>
      </div>

      {/* Prompt templates */}
      <div style={S.card}>
        <label style={S.label}>Daily Brief template — extra instructions injected into the brief prompt</label>
        <textarea rows={3} value={cfg.brief_template || ''} onChange={e => setCfg({ ...cfg, brief_template: e.target.value })}
          placeholder="e.g. Always mention Ramadan promotions in season. Keep highlights under 15 words each."
          style={{ ...S.input, resize: 'vertical' }} />
        <div style={{ height: 14 }} />
        <label style={S.label}>Copilot chat template — extra instructions for the conversational assistant</label>
        <textarea rows={3} value={cfg.chat_template || ''} onChange={e => setCfg({ ...cfg, chat_template: e.target.value })}
          placeholder="e.g. Answer in the dealer's language. Never advise below-cost pricing."
          style={{ ...S.input, resize: 'vertical' }} />
      </div>

      {/* Recommendation engine rules */}
      <div style={S.card}>
        <label style={S.label}>Recommendation engine rules (JSON)</label>
        <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: '#6B7280' }}>
          Supported keys: <code>overpriced_pct</code> (default 8), <code>underpriced_pct</code> (default 5), <code>slow_days</code> (default 45).
        </p>
        <textarea rows={5} value={rulesText} onChange={e => setRulesText(e.target.value)}
          style={{ ...S.input, fontFamily: 'monospace', fontSize: '0.78rem', resize: 'vertical' }} />
      </div>

      <button onClick={save} disabled={saving}
        style={{ padding: '11px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', background: '#0F172A', color: 'white', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8, opacity: saving ? 0.6 : 1 }}>
        <Save size={15} /> {saving ? 'Saving…' : 'Save configuration'}
      </button>

      {/* Logs */}
      <div style={{ ...S.card, marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <ScrollText size={15} style={{ color: '#6B7280' }} />
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#111827' }}>Recent AI Twin activity</p>
        </div>
        <div style={{ maxHeight: 340, overflowY: 'auto' }}>
          {logs.map((l: any) => (
            <div key={l.id} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #F9FAFB', fontSize: '0.76rem' }}>
              <span style={{ color: '#9CA3AF', flexShrink: 0, width: 130 }}>{new Date(l.created_at).toLocaleString()}</span>
              <span style={{ fontWeight: 700, color: l.action === 'error' ? '#B91C1C' : '#374151', flexShrink: 0, width: 130 }}>{l.action}</span>
              <span style={{ color: '#6B7280', flexShrink: 0, width: 110, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.dealer_id || '—'}</span>
              <span style={{ color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{JSON.stringify(l.meta)}</span>
            </div>
          ))}
          {!logs.length && <p style={{ margin: 0, fontSize: '0.78rem', color: '#9CA3AF' }}>No activity yet.</p>}
        </div>
      </div>
    </div>
  );
}
