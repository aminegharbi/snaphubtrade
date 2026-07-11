'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, X, Send, Sparkles, RefreshCw } from 'lucide-react';

interface Msg { role: 'user' | 'assistant'; content: string; suggested_query?: string | null; }

const QUICK_PROMPTS = [
  { label: '💰 Best deals under 150K', query: 'What are the best deals available right now under AED 150,000?' },
  { label: '👨‍👩‍👧 Family SUV advice',     query: 'I need a reliable family SUV, what do you recommend?' },
  { label: '✈️ Export to Africa',       query: 'Which vehicles are best for export to Nigeria?' },
  { label: '⚡ Electric vs petrol',      query: 'Should I buy an electric car in the UAE?' },
];

export function AIAssistant() {
  const [open, setOpen]       = useState(false);
  const [msgs, setMsgs]       = useState<Msg[]>([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread]   = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [msgs, loading]);

  // Pulse the bubble once after 4s if never opened
  useEffect(() => {
    const t = setTimeout(() => { if (!open && msgs.length === 0) setUnread(true); }, 4000);
    return () => clearTimeout(t);
  }, [open, msgs.length]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: 'user', content: text };
    setMsgs(m => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/v1/assistant/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: msgs.slice(-6).map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      setMsgs(m => [...m, { role: 'assistant', content: data.reply, suggested_query: data.suggested_query }]);
    } catch {
      setMsgs(m => [...m, { role: 'assistant', content: "I'm having trouble connecting. Please try again or browse our Smart Search." }]);
    } finally { setLoading(false); }
  };

  const openChat = () => { setOpen(true); setUnread(false); };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button onClick={openChat}
          style={{ position: 'fixed', bottom: 24, right: 24, width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(139,92,246,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: unread ? 'pulse 1.8s infinite' : 'none' }}>
          <Sparkles size={24} style={{ color: 'white' }} />
          {unread && <span style={{ position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: '#C1272D', border: '2px solid white' }} />}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, width: 380, maxWidth: 'calc(100vw - 32px)', height: 560, maxHeight: 'calc(100vh - 48px)', background: 'white', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 100, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '16px 18px', background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} style={{ color: 'white' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: 'white', fontWeight: 700, margin: 0, fontSize: '0.9rem' }}>TwinOS — SnapHubTrade.com Assistant</p>
              <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '0.72rem' }}>Ask me anything about vehicles</p>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} style={{ color: 'white' }} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12, background: '#FAFAFA' }}>
            {msgs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Sparkles size={28} style={{ color: '#DDD6FE', display: 'block', margin: '0 auto 10px' }} />
                <p style={{ fontWeight: 600, color: '#374151', margin: '0 0 4px', fontSize: '0.875rem' }}>Hi! I'm your AI car advisor 👋</p>
                <p style={{ color: '#9CA3AF', fontSize: '0.78rem', margin: '0 0 16px' }}>Ask about prices, recommendations, comparisons or export advice</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {QUICK_PROMPTS.map(p => (
                    <button key={p.label} onClick={() => send(p.query)}
                      style={{ padding: '8px 14px', border: '1px solid #E5E7EB', borderRadius: 10, background: 'white', color: '#374151', cursor: 'pointer', fontSize: '0.8rem', textAlign: 'left' }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '85%', padding: '10px 14px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: m.role === 'user' ? '#8B5CF6' : 'white', color: m.role === 'user' ? 'white' : '#374151', fontSize: '0.85rem', lineHeight: 1.6, border: m.role === 'assistant' ? '1px solid #E5E7EB' : 'none' }}>
                  {m.content}
                  {m.suggested_query && (
                    <button onClick={() => { setOpen(false); router.push(`/marketplace?query=${encodeURIComponent(m.suggested_query!)}`); }}
                      style={{ display: 'block', marginTop: 8, padding: '6px 12px', background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#5B21B6' }}>
                      🔍 Search "{m.suggested_query}"
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: 'white', border: '1px solid #E5E7EB' }}>
                  <RefreshCw size={14} style={{ color: '#9CA3AF', animation: 'spin 1s linear infinite' }} />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send(input)}
              placeholder="Ask about cars, prices, comparisons…"
              style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 24, fontSize: '0.85rem', outline: 'none', color: '#374151' }} />
            <button onClick={() => send(input)} disabled={!input.trim() || loading}
              style={{ width: 40, height: 40, borderRadius: '50%', background: input.trim() ? '#8B5CF6' : '#E5E7EB', border: 'none', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Send size={15} style={{ color: 'white' }} />
            </button>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{box-shadow:0 8px 24px rgba(139,92,246,0.4)} 50%{box-shadow:0 8px 32px rgba(139,92,246,0.7)} }
      `}</style>
    </>
  );
}
