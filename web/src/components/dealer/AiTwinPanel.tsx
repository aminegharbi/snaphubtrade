'use client';

// ─── AI TWIN DEALER ───────────────────────────────────────────────────────────
// The dealer's virtual Sales Director. Renders at the very top of the dealer
// dashboard: Daily Brief (hero) + Command Center + Copilot chat + Marketing
// generator. Uses only real API data from /ai-twin/*.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Brain, Sparkles, RefreshCw, Send, X, MessageCircle, TrendingUp, TrendingDown,
  AlertTriangle, Target, Zap, Rocket, Flame, Globe, Users, Package, ChevronDown,
  ChevronUp, Megaphone, Copy, Check, DollarSign, ShieldAlert, ArrowUpRight, Circle,
} from 'lucide-react';
import { api } from '@/lib/api';

// ─── Small UI primitives ──────────────────────────────────────────────────────

function ScoreRing({ value, size = 74, label }: { value: number; size?: number; label: string }) {
  const r = (size - 10) / 2, c = 2 * Math.PI * r;
  const color = value >= 75 ? '#10B981' : value >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={7} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round"
            strokeDasharray={`${(value / 100) * c} ${c}`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size > 60 ? '1.15rem' : '0.9rem', color: 'white' }}>
          {value}
        </div>
      </div>
      <span style={{ fontSize: '0.66rem', fontWeight: 600, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>{label}</span>
    </div>
  );
}

const PRIORITY_CFG: Record<string, { color: string; bg: string; label: string }> = {
  high:   { color: '#B91C1C', bg: '#FEE2E2', label: 'High' },
  medium: { color: '#92400E', bg: '#FEF3C7', label: 'Medium' },
  low:    { color: '#374151', bg: '#F3F4F6', label: 'Low' },
};

function PriorityBadge({ p }: { p: string }) {
  const c = PRIORITY_CFG[p] || PRIORITY_CFG.low;
  return <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 700, background: c.bg, color: c.color, flexShrink: 0 }}>{c.label}</span>;
}

// ─── Copilot Chat drawer ──────────────────────────────────────────────────────

function CopilotChat({ dealerId, onClose }: { dealerId: string; onClose: () => void }) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: 'assistant', content: "I'm your AI Twin — I know your inventory, pricing, leads and revenue in detail. What should we work on?" },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  const SUGGESTIONS = [
    'What should I focus on today?',
    'Which vehicles are overpriced?',
    'Predict my revenue this month',
    'Which vehicles should be exported?',
    'Why are my sales slowing down?',
  ];

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput('');
    const history = messages.slice(1); // drop the canned intro
    setMessages(m => [...m, { role: 'user', content: msg }]);
    setBusy(true);
    try {
      const r = await api.post<{ reply: string }>(`/ai-twin/${dealerId}/chat`, { message: msg, history });
      setMessages(m => [...m, { role: 'assistant', content: r.reply }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Connection issue — please try again.' }]);
    } finally { setBusy(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.35)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: 'white', display: 'flex', flexDirection: 'column', boxShadow: '-16px 0 40px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,#0F172A,#1E293B)' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={17} style={{ color: '#A78BFA' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>AI Twin Copilot</p>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>Connected to your live business data</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: '#F9FAFB' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%', padding: '10px 14px', borderRadius: 14, fontSize: '0.84rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', background: m.role === 'user' ? '#0F172A' : 'white', color: m.role === 'user' ? 'white' : '#111827', border: m.role === 'user' ? 'none' : '1px solid #E5E7EB' }}>
              {m.content}
            </div>
          ))}
          {busy && <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: 14, background: 'white', border: '1px solid #E5E7EB', fontSize: '0.84rem', color: '#6B7280' }}>Analyzing your data…</div>}
          {messages.length <= 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', fontSize: '0.74rem', color: '#374151', fontWeight: 500 }}>{s}</button>
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div style={{ padding: 12, borderTop: '1px solid #F3F4F6', display: 'flex', gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask your AI Twin anything…"
            style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1px solid #E5E7EB', fontSize: '0.85rem', outline: 'none' }} />
          <button onClick={() => send()} disabled={busy || !input.trim()}
            style={{ width: 42, height: 42, borderRadius: 12, border: 'none', cursor: 'pointer', background: '#0F172A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: busy || !input.trim() ? 0.5 : 1 }}>
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Marketing generator modal ────────────────────────────────────────────────

function MarketingModal({ dealerId, onClose }: { dealerId: string; onClose: () => void }) {
  const TYPES = [
    { key: 'whatsapp', label: '💬 WhatsApp campaign' },
    { key: 'email', label: '✉️ Email campaign' },
    { key: 'sms', label: '📱 SMS campaign' },
    { key: 'social_post', label: '📣 Social media post' },
    { key: 'promo_offer', label: '🏷️ Promotional offer' },
    { key: 'vehicle_description', label: '📝 Vehicle descriptions' },
    { key: 'seo', label: '🔎 SEO content' },
    { key: 'landing_page', label: '🖥️ Landing page copy' },
  ];
  const [type, setType] = useState('whatsapp');
  const [instructions, setInstructions] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setBusy(true); setContent('');
    try {
      const r = await api.post<{ content: string }>(`/ai-twin/${dealerId}/marketing`, { type, instructions });
      setContent(r.content || '');
    } catch { setContent('Generation failed — please try again.'); }
    finally { setBusy(false); }
  };

  const copy = () => { navigator.clipboard?.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 620, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Megaphone size={17} style={{ color: '#8B5CF6' }} />
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#111827', flex: 1 }}>AI Marketing Director</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {TYPES.map(t => (
              <button key={t.key} onClick={() => setType(t.key)}
                style={{ padding: '7px 12px', borderRadius: 10, cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600, border: type === t.key ? '1.5px solid #8B5CF6' : '1px solid #E5E7EB', background: type === t.key ? '#F5F3FF' : 'white', color: type === t.key ? '#6D28D9' : '#374151' }}>
                {t.label}
              </button>
            ))}
          </div>
          <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={2}
            placeholder="Optional focus, e.g. 'Push Japanese SUVs this weekend, 10% off angle'"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #E5E7EB', fontSize: '0.84rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
          <button onClick={generate} disabled={busy}
            style={{ marginTop: 10, width: '100%', padding: '11px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#7C3AED,#8B5CF6)', color: 'white', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: busy ? 0.6 : 1 }}>
            <Sparkles size={15} /> {busy ? 'Generating from your live inventory…' : 'Generate content'}
          </button>
          {content && (
            <div style={{ marginTop: 14, border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', background: '#F9FAFB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Generated content</span>
                <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 600, color: copied ? '#059669' : '#374151' }}>
                  {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div style={{ padding: 16, fontSize: '0.84rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#111827', maxHeight: 300, overflowY: 'auto' }}>{content}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Insight card ─────────────────────────────────────────────────────────────

function InsightCard({ icon: Icon, color, title, count, children }: any) {
  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={14} style={{ color }} />
        </div>
        <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#111827', flex: 1 }}>{title}</p>
        {count !== undefined && <span style={{ fontSize: '0.72rem', fontWeight: 800, color, background: color + '15', padding: '2px 9px', borderRadius: 20 }}>{count}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function AiTwinPanel({ dealerId, onNavigate }: { dealerId: string; onNavigate?: (kind: string, payload?: any) => void }) {
  const [brief, setBrief] = useState<any>(null);
  const [cc, setCc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [mktOpen, setMktOpen] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!dealerId) return;
    setLoading(true); setError(false);
    try {
      const [b, c] = await Promise.all([
        api.get<any>(`/ai-twin/${dealerId}/brief`),
        api.get<any>(`/ai-twin/${dealerId}/command-center`),
      ]);
      setBrief(b); setCc(c);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [dealerId]);

  useEffect(() => { load(); }, [load]);
  // Command Center scores are recomputed live on every fetch (never cached) —
  // poll periodically so Business/Inventory/Sales health react to changes made
  // elsewhere in the dashboard (price edits, sales, new leads) without a full
  // page reload. Mirrors the 20s poll already used by the main dashboard.
  useEffect(() => {
    const t = setInterval(() => load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const b = await api.post<any>(`/ai-twin/${dealerId}/brief/regenerate`, {});
      setBrief(b);
    } catch { /* keep old brief */ }
    finally { setRegenerating(false); }
  };

  // Optimistic check/uncheck — the dealer marking "I did this" shouldn't wait
  // on a round-trip to feel instant, but we still persist it so it survives
  // the next brief regeneration and the 30s auto-refresh above.
  const toggleRecommendation = async (rec: any) => {
    const nextDone = !rec.done;
    setCc((prev: any) => {
      if (!prev) return prev;
      const items = prev.recommendations.map((r: any) => r.key === rec.key ? { ...r, done: nextDone } : r);
      const completed = items.filter((r: any) => r.done).length;
      return { ...prev, recommendations: items, recommendations_summary: { total: items.length, completed, pending: items.length - completed } };
    });
    try {
      await api.post(`/ai-twin/${dealerId}/recommendations/${encodeURIComponent(rec.key)}/${nextDone ? 'complete' : 'reopen'}`, {});
    } catch {
      // revert on failure
      setCc((prev: any) => {
        if (!prev) return prev;
        const items = prev.recommendations.map((r: any) => r.key === rec.key ? { ...r, done: !nextDone } : r);
        const completed = items.filter((r: any) => r.done).length;
        return { ...prev, recommendations: items, recommendations_summary: { total: items.length, completed, pending: items.length - completed } };
      });
    }
  };

  if (error) return null; // never break the dashboard if the AI Twin API is unavailable

  const content = brief?.content || {};
  const scores = cc?.scores || {};

  return (
    <div style={{ marginBottom: 24 }}>
      {chatOpen && <CopilotChat dealerId={dealerId} onClose={() => setChatOpen(false)} />}
      {mktOpen && <MarketingModal dealerId={dealerId} onClose={() => setMktOpen(false)} />}

      {/* ── Daily Brief (hero) ── */}
      <div style={{ borderRadius: 18, overflow: 'hidden', background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 55%,#312E81 100%)', border: '1px solid #312E81', boxShadow: '0 12px 32px rgba(30,27,75,0.25)' }}>
        <div style={{ padding: '20px 24px 16px', display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 380px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Brain size={19} style={{ color: '#A78BFA' }} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
                  AI Twin Daily Brief
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(167,139,250,0.2)', color: '#C4B5FD', letterSpacing: '0.05em' }}>YOUR VIRTUAL SALES DIRECTOR</span>
                </p>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)' }}>
                  {brief?.brief_date ? `Analysis of ${brief.brief_date}` : 'Analyzing your dealership…'}
                  {brief?.generated_by === 'fallback' ? ' · offline analysis' : ''}
                </p>
              </div>
            </div>

            {loading ? (
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem', margin: '8px 0 0' }}>Your AI Twin is analyzing inventory, pricing, leads and revenue…</p>
            ) : (
              <>
                <p style={{ color: 'white', fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.5, margin: '2px 0 12px' }}>{content.greeting}</p>
                {expanded && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    <div>
                      <p style={{ margin: '0 0 8px', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', color: '#A78BFA', textTransform: 'uppercase' }}>Today's biggest opportunities</p>
                      {(content.highlights || []).map((h: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                          <Sparkles size={12} style={{ color: '#C4B5FD', marginTop: 3, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.88)', lineHeight: 1.45 }}>{h}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p style={{ margin: '0 0 8px', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', color: '#6EE7B7', textTransform: 'uppercase' }}>Today's success plan</p>
                      {(content.plan || []).map((p: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 7, alignItems: 'flex-start' }}>
                          <span style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(110,231,183,0.15)', color: '#6EE7B7', fontSize: '0.68rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                          <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.88)', lineHeight: 1.45 }}>{p}</span>
                        </div>
                      ))}
                      {content.closing && <p style={{ margin: '10px 0 0', fontSize: '0.8rem', fontStyle: 'italic', color: '#C4B5FD' }}>“{content.closing}”</p>}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Scores + actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <ScoreRing value={scores.business_health ?? brief?.health_score ?? 0} label="Business Health" />
              <ScoreRing value={scores.inventory_health ?? 0} size={58} label="Inventory" />
              <ScoreRing value={scores.sales_performance ?? 0} size={58} label="Sales" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setChatOpen(true)} style={{ padding: '9px 16px', borderRadius: 11, border: 'none', cursor: 'pointer', background: 'white', color: '#1E1B4B', fontWeight: 700, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MessageCircle size={14} /> Ask AI Twin
              </button>
              <button onClick={() => setMktOpen(true)} style={{ padding: '9px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', color: 'white', fontWeight: 700, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Megaphone size={14} /> Marketing
              </button>
              <button onClick={regenerate} disabled={regenerating} title="Regenerate today's brief" style={{ width: 36, height: 36, borderRadius: 11, border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={14} style={regenerating ? { animation: 'spin 1s linear infinite' } : undefined} />
              </button>
            </div>
          </div>
        </div>

        <button onClick={() => setExpanded(e => !e)} style={{ width: '100%', padding: '7px 0', border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          {expanded ? <><ChevronUp size={13} /> Collapse brief</> : <><ChevronDown size={13} /> Expand brief</>}
        </button>
      </div>

      {/* ── Command Center ── */}
      {cc && (
        <div style={{ marginTop: 16 }}>
          {/* KPI strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
            {[
              { label: 'Revenue forecast (month)', value: `AED ${Number(scores.revenue_forecast_aed || 0).toLocaleString()}`, icon: TrendingUp, color: '#059669' },
              { label: 'Inventory value', value: `AED ${Number(scores.inventory_value_aed || 0).toLocaleString()}`, icon: DollarSign, color: '#B8860B' },
              { label: 'Opportunity today', value: `+AED ${Number(content.opportunity_today_aed || 0).toLocaleString()}`, icon: Rocket, color: '#7C3AED' },
              { label: 'Revenue trend (MoM)', value: cc.revenue?.mom_pct !== null && cc.revenue?.mom_pct !== undefined ? `${cc.revenue.mom_pct > 0 ? '+' : ''}${cc.revenue.mom_pct}%` : '—', icon: cc.revenue?.mom_pct >= 0 ? TrendingUp : TrendingDown, color: cc.revenue?.mom_pct >= 0 ? '#059669' : '#DC2626' },
            ].map(k => (
              <div key={k.label} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: k.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <k.icon size={15} style={{ color: k.color }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.66rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</p>
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Insight grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
            {/* AI recommendations */}
            <div style={{ gridColumn: '1 / -1' }}>
              <InsightCard icon={Zap} color="#7C3AED" title="AI Recommendations — proactive actions" count={cc.recommendations?.length || 0}>
                {cc.recommendations_summary?.total > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '8px 12px', background: '#F5F3FF', borderRadius: 10, border: '1px solid #EDE9FE' }}>
                    <div style={{ flex: 1, height: 6, borderRadius: 99, background: '#E5E7EB', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round((cc.recommendations_summary.completed / cc.recommendations_summary.total) * 100)}%`, background: '#7C3AED', borderRadius: 99, transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#5B21B6', whiteSpace: 'nowrap' }}>
                      {cc.recommendations_summary.completed}/{cc.recommendations_summary.total} done
                    </span>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 10 }}>
                  {(cc.recommendations || []).map((r: any, i: number) => (
                    <div key={r.key || i}
                      onClick={() => onNavigate?.(r.action?.kind, r.action)}
                      style={{ border: '1px solid #F3F4F6', borderRadius: 11, padding: '11px 13px', background: r.done ? '#F0FDF4' : '#FAFAFA', opacity: r.done ? 0.75 : 1, transition: 'opacity 0.2s, background 0.2s', cursor: onNavigate && r.action?.kind ? 'pointer' : 'default' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                        <p style={{ margin: 0, fontSize: '0.79rem', fontWeight: 700, color: '#111827', textDecoration: r.done ? 'line-through' : 'none' }}>{r.title}</p>
                        <PriorityBadge p={r.priority} />
                      </div>
                      <p style={{ margin: '0 0 3px', fontSize: '0.73rem', color: '#4B5563', lineHeight: 1.4 }}>{r.reason}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 }}>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>↑ {r.impact}</p>
                        <button onClick={(e) => { e.stopPropagation(); toggleRecommendation(r); }}
                          title={r.done ? 'Mark as not done' : 'Mark this action as done'}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, border: r.done ? '1px solid #A7F3D0' : '1px solid #E5E7EB', background: r.done ? '#D1FAE5' : 'white', color: r.done ? '#065F46' : '#6B7280', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                          {r.done ? <Check size={12} /> : <Circle size={12} />}
                          {r.done ? 'Done' : 'Mark done'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {!cc.recommendations?.length && <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280' }}>All clear — nothing urgent right now. 🎉</p>}
                </div>
              </InsightCard>
            </div>

            {/* Hot buyers */}
            <InsightCard icon={Flame} color="#DC2626" title="Hot buyers" count={cc.hot_buyers?.length || 0}>
              {(cc.hot_buyers || []).slice(0, 5).map((l: any) => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.77rem', borderBottom: '1px solid #F9FAFB', paddingBottom: 6 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#111827' }}>{l.buyer}</p>
                    <p style={{ margin: 0, color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.vehicle || 'General inquiry'} · {l.stage}</p>
                  </div>
                  {l.offer_aed && <span style={{ fontWeight: 700, color: '#059669', flexShrink: 0 }}>AED {l.offer_aed.toLocaleString()}</span>}
                </div>
              ))}
              {!cc.hot_buyers?.length && <p style={{ margin: 0, fontSize: '0.77rem', color: '#9CA3AF' }}>No high-intent buyers right now.</p>}
            </InsightCard>

            {/* High demand vehicles */}
            <InsightCard icon={TrendingUp} color="#059669" title="High demand vehicles" count={cc.high_demand_vehicles?.length || 0}>
              {(cc.high_demand_vehicles || []).slice(0, 5).map((v: any) => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.77rem', borderBottom: '1px solid #F9FAFB', paddingBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name}</span>
                  <span style={{ color: '#6B7280', flexShrink: 0 }}>{v.views} views · {v.favorites} ♥</span>
                </div>
              ))}
            </InsightCard>

            {/* Slow movers */}
            <InsightCard icon={AlertTriangle} color="#D97706" title="Slow-moving vehicles" count={cc.slow_moving_vehicles?.length || 0}>
              {(cc.slow_moving_vehicles || []).slice(0, 5).map((v: any) => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.77rem', borderBottom: '1px solid #F9FAFB', paddingBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name}</span>
                  <span style={{ color: '#D97706', fontWeight: 700, flexShrink: 0 }}>{v.days_listed}d</span>
                </div>
              ))}
              {!cc.slow_moving_vehicles?.length && <p style={{ margin: 0, fontSize: '0.77rem', color: '#9CA3AF' }}>No aging stock — great rotation. ✅</p>}
            </InsightCard>

            {/* Export opportunities */}
            <InsightCard icon={Globe} color="#2563EB" title="Export opportunities" count={cc.export_opportunities?.length || 0}>
              {(cc.export_opportunities || []).slice(0, 5).map((v: any) => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.77rem', borderBottom: '1px solid #F9FAFB', paddingBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name}</span>
                  <span style={{ color: '#2563EB', fontWeight: 700, flexShrink: 0 }}>AED {Number(v.price_aed).toLocaleString()}</span>
                </div>
              ))}
              {!cc.export_opportunities?.length && <p style={{ margin: 0, fontSize: '0.77rem', color: '#9CA3AF' }}>Mark vehicles as export-eligible to unlock this channel.</p>}
            </InsightCard>

            {/* Risks */}
            <InsightCard icon={ShieldAlert} color="#DC2626" title="Risks & warnings" count={cc.risks?.length || 0}>
              {(cc.risks || []).map((r: any, i: number) => (
                <div key={i} style={{ fontSize: '0.77rem', borderBottom: '1px solid #F9FAFB', paddingBottom: 6 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: r.level === 'high' ? '#B91C1C' : '#92400E' }}>{r.title}</p>
                  <p style={{ margin: 0, color: '#6B7280' }}>{r.detail}</p>
                </div>
              ))}
              {!cc.risks?.length && <p style={{ margin: 0, fontSize: '0.77rem', color: '#9CA3AF' }}>No significant risks detected. ✅</p>}
            </InsightCard>

            {/* Growth opportunities */}
            <InsightCard icon={Target} color="#7C3AED" title="Growth opportunities" count={cc.growth_opportunities?.length || 0}>
              {(cc.growth_opportunities || []).map((g: any, i: number) => (
                <div key={i} style={{ fontSize: '0.77rem', borderBottom: '1px solid #F9FAFB', paddingBottom: 6 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 4 }}><ArrowUpRight size={12} style={{ color: '#7C3AED' }} /> {g.title}</p>
                  <p style={{ margin: 0, color: '#6B7280' }}>{g.detail}</p>
                </div>
              ))}
            </InsightCard>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>
    </div>
  );
}
