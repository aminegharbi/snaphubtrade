'use client';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// SNAPHUBTRADE.COM — Teaser landing page (light theme, matches the app's
// own SaaS look: white/#F8F9FB backgrounds, #111827 text, #C1272D accent —
// same palette as the marketplace homepage and dashboards).
//
// The one deliberately dark element is the AI Twin Daily Brief card: it's a
// literal window into the real in-app component (which IS dark in the
// product), so it stays dark on purpose — everything else is light.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Zap, Brain, Database, Bot, ShieldCheck, Gauge, TrendingUp,
  MessageCircle, Mail, CheckCircle2, Sparkles, MapPin,
} from 'lucide-react';

function RadialGauge({ value, size = 220, label, sublabel, color = '#C1272D', delay = 0, dark = false }:
  { value: number; size?: number; label: string; sublabel?: string; color?: string; delay?: number; dark?: boolean }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) {
        setStarted(true);
        setTimeout(() => {
          const start = performance.now();
          const duration = 1400;
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(Math.round(eased * value));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }, delay);
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay]);

  const stroke = size * 0.055;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const arcFraction = 0.75;
  const arcLength = circumference * arcFraction;
  const rotation = 135;
  const trackColor = dark ? 'rgba(255,255,255,0.1)' : '#EEF0F3';
  const numColor = dark ? '#F5F4F1' : '#111827';
  const tickColor = dark ? 'rgba(255,255,255,0.18)' : '#D1D5DB';

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: `rotate(${rotation}deg)` }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor}
            strokeWidth={stroke} strokeDasharray={`${arcLength} ${circumference}`} strokeLinecap="round" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
            strokeWidth={stroke} strokeDasharray={`${(display / 100) * arcLength} ${circumference}`}
            strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${color}55)`, transition: 'stroke-dasharray 0.1s linear' }} />
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 11) * (360 * arcFraction);
            return (
              <line key={i}
                x1={size / 2 + (r - stroke * 1.6) * Math.cos((angle * Math.PI) / 180)}
                y1={size / 2 + (r - stroke * 1.6) * Math.sin((angle * Math.PI) / 180)}
                x2={size / 2 + (r - stroke * 0.5) * Math.cos((angle * Math.PI) / 180)}
                y2={size / 2 + (r - stroke * 0.5) * Math.sin((angle * Math.PI) / 180)}
                stroke={tickColor} strokeWidth={1.5} />
            );
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span className="ss-mono" style={{ fontSize: size * 0.2, fontWeight: 700, color: numColor, lineHeight: 1 }}>{display}</span>
          <span className="ss-mono" style={{ fontSize: size * 0.045, color: dark ? 'rgba(255,255,255,0.4)' : '#9CA3AF', marginTop: 4 }}>/ 100</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: dark ? '#F5F4F1' : '#111827' }}>{label}</p>
        {sublabel && <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: dark ? 'rgba(255,255,255,0.45)' : '#9CA3AF' }}>{sublabel}</p>}
      </div>
    </div>
  );
}

function CountUp({ to, prefix = '', suffix = '', duration = 1600 }: { to: number; prefix?: string; suffix?: string; duration?: number }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration);
          setN(Math.round((1 - Math.pow(1 - p, 3)) * to));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.disconnect();
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);
  return <span ref={ref} className="ss-mono">{prefix}{n.toLocaleString()}{suffix}</span>;
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: shown ? 1 : 0, transform: shown ? 'translateY(0)' : 'translateY(22px)', transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

const HUBS = [
  { code: 'DXB', name: 'Dubai', x: 58, y: 46 },
  { code: 'AUH', name: 'Abu Dhabi', x: 50, y: 54 },
  { code: 'JAFZA', name: 'Jebel Ali', x: 46, y: 50 },
  { code: 'SHJ', name: 'Sharjah', x: 61, y: 42 },
  { code: 'RUH', name: 'Riyadh', x: 20, y: 48 },
  { code: 'DMM', name: 'Dammam', x: 30, y: 38 },
  { code: 'DOH', name: 'Doha', x: 42, y: 32 },
  { code: 'KWI', name: 'Kuwait', x: 28, y: 14 },
  { code: 'MCT', name: 'Muscat', x: 78, y: 62 },
  { code: 'MHD', name: 'Manama', x: 34, y: 30 },
];

const PILLARS = [
  { icon: Zap, tag: 'CORE', title: 'Dealer & Broker Platform', color: '#3B82F6',
    desc: "One workspace for dealers and brokers across the Gulf. List a vehicle, price it, publish it — in seconds, not the 20 minutes it takes on a spreadsheet plus three WhatsApp threads.",
    metric: '< 30s', metricLabel: 'to list a vehicle' },
  { icon: Brain, tag: 'INTELLIGENT ASSISTANT', title: 'TwinOS', color: '#059669',
    desc: "The assistant layer running across the whole hub. It knows your inventory, your leads, your market — ask it anything, in plain language, get a straight answer.",
    metric: '24/7', metricLabel: 'always on' },
  { icon: Database, tag: 'DATA ENGINE', title: 'Market Intelligence Engine', color: '#B8860B',
    desc: "A proprietary GCC market data lake that never overwrites, only enriches. Every sync captures pricing, demand, and listing history — turning today's trade into tomorrow's edge.",
    metric: '∞', metricLabel: 'appends, never overwrites' },
  { icon: Bot, tag: 'SALES COPILOT', title: 'AI Twin', color: '#7C3AED',
    desc: "A virtual sales director working the night shift. Daily briefs, live recommendations, ready-to-send campaigns — waiting in your inbox before your first coffee.",
    metric: '92', metricLabel: 'avg. business health score' },
];

export default function LandingPage() {
  return (
    <div style={{ background: '#F8F9FB', color: '#111827', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        .ss-display { font-family: 'Oswald', 'Inter', sans-serif; text-transform: uppercase; }
        .ss-mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
        .ss-grid-bg {
          background-image:
            linear-gradient(rgba(17,24,39,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(17,24,39,0.035) 1px, transparent 1px);
          background-size: 44px 44px;
        }
        @keyframes ss-pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes ss-dash { to { stroke-dashoffset: -200; } }
        .ss-needle-glow { animation: ss-pulse 2.4s ease-in-out infinite; }
        .ss-route-line { stroke-dasharray: 4 6; animation: ss-dash 6s linear infinite; }
        .ss-hub-dot { animation: ss-pulse 2.2s ease-in-out infinite; }
      `}</style>

      {/* ══ NAV ══ */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="ss-display" style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '0.02em', color: '#111827' }}>
            SnapHub<span style={{ color: '#C1272D' }}>Trade.com</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="#pillars" style={{ fontSize: '0.82rem', color: '#6B7280', textDecoration: 'none' }} className="hidden-mobile">Platform</a>
            <a href="#routes" style={{ fontSize: '0.82rem', color: '#6B7280', textDecoration: 'none' }} className="hidden-mobile">GCC Network</a>
            <a href="#trust" style={{ fontSize: '0.82rem', color: '#6B7280', textDecoration: 'none' }} className="hidden-mobile">Security</a>
            <Link href="/login" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'white', textDecoration: 'none', padding: '9px 18px', background: '#C1272D', borderRadius: 9 }}>
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <section className="ss-grid-bg" style={{ position: 'relative', padding: '84px 24px 60px', background: 'radial-gradient(ellipse at 50% -10%, rgba(124,58,237,0.06), transparent 55%), white' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(280px,0.85fr)', gap: 48, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, background: '#F5F3FF', border: '1px solid #DDD6FE', marginBottom: 22 }}>
              <span className="ss-needle-glow" style={{ width: 6, height: 6, borderRadius: 99, background: '#7C3AED' }} />
              <span className="ss-mono" style={{ fontSize: '0.7rem', color: '#7C3AED', letterSpacing: '0.04em' }}>MANIFEST NO. 001 — NOW ONBOARDING GCC DEALERS &amp; BROKERS</span>
            </div>
            <h1 className="ss-display" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', fontWeight: 700, lineHeight: 1.04, margin: '0 0 20px', letterSpacing: '-0.01em', color: '#111827' }}>
              The AI Automotive<br />
              <span style={{ color: '#C1272D' }}>Trade Hub for the GCC.</span>
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#6B7280', lineHeight: 1.6, maxWidth: 520, margin: '0 0 32px' }}>
              SnapHubTrade.com connects dealers and brokers across the Gulf on one hub: stock managed in seconds,
              a market intelligence engine that never stops learning, and an AI sales director working while you sleep.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
              <a href="#cta" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 26px', background: '#C1272D', color: 'white', borderRadius: 11, fontWeight: 700, fontSize: '0.92rem', textDecoration: 'none', boxShadow: '0 8px 24px rgba(193,39,45,0.25)' }}>
                Request early access <ArrowRight size={16} />
              </a>
              <a href="#pillars" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 22px', background: 'white', color: '#111827', borderRadius: 11, fontWeight: 600, fontSize: '0.92rem', textDecoration: 'none', border: '1px solid #E5E7EB' }}>
                See how it works
              </a>
            </div>
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
              {[['<30s', 'to list a vehicle'], ['24/7', 'AI sales copilot'], ['10+', 'GCC trade hubs']].map(([n, l]) => (
                <div key={l as string}>
                  <p className="ss-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#111827', margin: 0 }}>{n}</p>
                  <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: '2px 0 0' }}>{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Signature gauge — light card, matches dashboard KPI cards elsewhere in the app */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 24, padding: '32px 28px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <p className="ss-mono" style={{ fontSize: '0.68rem', color: '#9CA3AF', letterSpacing: '0.08em', textAlign: 'center', margin: '0 0 18px' }}>LIVE — AI TWIN DAILY BRIEF</p>
              <RadialGauge value={92} label="Business Health" sublabel="Ahmed's Motors — this morning" color="#C1272D" />
            </div>
          </div>
        </div>
      </section>

      {/* ══ PILLARS ══ */}
      <section id="pillars" style={{ padding: '80px 24px', background: '#F8F9FB', borderTop: '1px solid #E5E7EB' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <span className="ss-mono" style={{ fontSize: '0.72rem', color: '#9CA3AF', letterSpacing: '0.1em' }}>FOUR SYSTEMS, ONE HUB</span>
              <h2 className="ss-display" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 700, margin: '10px 0 0', color: '#111827' }}>
                Built for dealers and brokers who move fast
              </h2>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 90}>
                <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 18, padding: '26px 24px', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: p.color + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <p.icon size={20} style={{ color: p.color }} />
                  </div>
                  <span className="ss-mono" style={{ fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.08em', color: p.color }}>{p.tag}</span>
                  <h3 className="ss-display" style={{ fontSize: '1.15rem', fontWeight: 600, margin: '6px 0 10px', textTransform: 'none', color: '#111827' }}>{p.title}</h3>
                  <p style={{ fontSize: '0.84rem', color: '#6B7280', lineHeight: 1.55, margin: '0 0 18px', flex: 1 }}>{p.desc}</p>
                  <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span className="ss-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: p.color }}>{p.metric}</span>
                    <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{p.metricLabel}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ GCC TRADE ROUTES — signature map ══ */}
      <section id="routes" style={{ padding: '80px 24px', background: 'white', borderTop: '1px solid #E5E7EB' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <span className="ss-mono" style={{ fontSize: '0.72rem', color: '#7C3AED', letterSpacing: '0.1em' }}>ONE HUB, TEN GATEWAYS</span>
              <h2 className="ss-display" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 700, margin: '10px 0 12px', color: '#111827' }}>
                Every deal in the Gulf, one network
              </h2>
              <p style={{ color: '#6B7280', maxWidth: 480, margin: '0 auto', fontSize: '0.95rem' }}>
                Dealers and brokers trade across borders on the same hub — from Dubai and Jebel Ali to Riyadh, Doha, Kuwait and Muscat.
              </p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div style={{ background: '#FAFAFA', border: '1px solid #E5E7EB', borderRadius: 20, padding: '28px 20px' }}>
              <svg viewBox="0 0 100 76" style={{ width: '100%', height: 'auto', display: 'block' }}>
                {HUBS.map((a, i) => HUBS.slice(i + 1).map((b, j) => (
                  <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    className="ss-route-line" stroke="rgba(124,58,237,0.14)" strokeWidth={0.25} />
                )))}
                {HUBS.map(h => (
                  <g key={h.code}>
                    <circle className="ss-hub-dot" cx={h.x} cy={h.y} r={1.6} fill="#C1272D" />
                    <circle cx={h.x} cy={h.y} r={3.2} fill="none" stroke="#C1272D" strokeWidth={0.25} opacity={0.35} />
                  </g>
                ))}
              </svg>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 10, marginTop: 20 }}>
                {HUBS.map(h => (
                  <div key={h.code} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={11} style={{ color: '#C1272D', flexShrink: 0 }} />
                    <span className="ss-mono" style={{ fontSize: '0.7rem', color: '#374151' }}>{h.code}</span>
                    <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{h.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ SPEC SHEET — before/after ══ */}
      <section style={{ padding: '80px 24px', background: '#FDFBF7', borderTop: '1px solid #E5E7EB' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <span className="ss-mono" style={{ fontSize: '0.72rem', color: '#92400E', letterSpacing: '0.1em' }}>THE OLD WAY VS. SNAPHUBTRADE.COM</span>
              <h2 className="ss-display" style={{ fontSize: 'clamp(1.7rem, 3vw, 2.3rem)', fontWeight: 700, margin: '10px 0 0', color: '#111827' }}>
                Read it like a trade manifest
              </h2>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div style={{ background: 'white', border: '1px solid #E5E1D8', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              {[
                ['Pricing a vehicle', 'Gut feeling, copy a competitor', 'Fair market value from real GCC market history'],
                ['A buyer\'s request', 'Buried in a WhatsApp thread', 'One inbox: accept, counter, reject, call — logged'],
                ['Marketing content', 'Written by hand, or outsourced', 'Generated by AI Twin in seconds, from real stock'],
                ['Cross-border trade', 'Separate contacts per country', 'One hub — dealers and brokers across the Gulf'],
                ['Morning routine', 'Check five apps, guess the plan', 'One Daily Brief: the plan is already written'],
              ].map((row, i) => (
                <div key={row[0]} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: i > 0 ? '1px solid #F0EEE7' : 'none' }}>
                  <div style={{ padding: '16px 18px', fontWeight: 700, fontSize: '0.84rem', color: '#111827', background: '#FAF9F6' }}>{row[0]}</div>
                  <div style={{ padding: '16px 18px', fontSize: '0.82rem', color: '#9CA3AF', borderLeft: '1px solid #F0EEE7' }}>{row[1]}</div>
                  <div style={{ padding: '16px 18px', fontSize: '0.82rem', color: '#065F46', fontWeight: 600, borderLeft: '1px solid #F0EEE7', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={13} style={{ color: '#059669', flexShrink: 0 }} /> {row[2]}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ AI TWIN — daily brief mockup: intentionally dark, a real window into the product ══ */}
      <section style={{ padding: '80px 24px', background: 'white', borderTop: '1px solid #E5E7EB' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 44 }}>
              <span className="ss-mono" style={{ fontSize: '0.72rem', color: '#7C3AED', letterSpacing: '0.1em' }}>MEET YOUR AI TWIN</span>
              <h2 className="ss-display" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 700, margin: '10px 0 12px', color: '#111827' }}>
                A sales director who never sleeps
              </h2>
              <p style={{ color: '#6B7280', maxWidth: 480, margin: '0 auto', fontSize: '0.95rem' }}>
                Every night it reads your inventory, your leads, and the market — every morning, it hands you the plan.
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div style={{ borderRadius: 20, overflow: 'hidden', background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 55%,#312E81 100%)', border: '1px solid #312E81' }}>
              <div style={{ padding: '24px 28px', display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 320px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bot size={17} style={{ color: '#A78BFA' }} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'white' }}>AI Twin Daily Brief</span>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, margin: '0 0 16px' }}>
                    Good morning. I analyzed Ahmed's Motors overnight — here's today's biggest opportunity.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      'Toyota Land Cruiser demand up 12% this week',
                      '3 vehicles are priced above fair market value',
                      '5 high-intent buyers viewed your stock overnight',
                    ].map(h => (
                      <div key={h} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <Sparkles size={12} style={{ color: '#C4B5FD', marginTop: 3, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.82)' }}>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 20 }}>
                  <RadialGauge value={92} size={130} label="Business" color="#C1272D" delay={200} dark />
                  <RadialGauge value={78} size={130} label="Inventory" color="#34D399" delay={350} dark />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ MARKET INTELLIGENCE ENGINE — ticking data lake ══ */}
      <section style={{ padding: '80px 24px', background: '#F8F9FB', borderTop: '1px solid #E5E7EB' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 44 }}>
              <span className="ss-mono" style={{ fontSize: '0.72rem', color: '#B8860B', letterSpacing: '0.1em' }}>MARKET INTELLIGENCE ENGINE</span>
              <h2 className="ss-display" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 700, margin: '10px 0 12px', color: '#111827' }}>
                It never overwrites. Only enriches.
              </h2>
              <p style={{ color: '#6B7280', maxWidth: 520, margin: '0 auto', fontSize: '0.95rem' }}>
                A proprietary GCC data lake tracks every listing's price history, lifetime, and demand — a private asset
                that gets more valuable with every sync, and belongs to no one else.
              </p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              {[
                { to: 12000, suffix: '+', label: 'market observations captured', color: '#3B82F6' },
                { to: 340, suffix: '+', label: 'vehicles with a permanent Market ID', color: '#B8860B' },
                { to: 98, suffix: '%', label: 'pricing confidence on tracked models', color: '#059669' },
                { to: 24, suffix: '/7', label: 'sync-ready, always current', color: '#7C3AED' },
              ].map(s => (
                <div key={s.label} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: '22px 18px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <p style={{ fontSize: '1.7rem', fontWeight: 700, margin: '0 0 6px', color: s.color }}>
                    <CountUp to={s.to} suffix={s.suffix} />
                  </p>
                  <p style={{ fontSize: '0.74rem', color: '#9CA3AF', margin: 0, lineHeight: 1.4 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ TRUST / SECURITY ══ */}
      <section id="trust" style={{ padding: '64px 24px', background: 'white', borderTop: '1px solid #E5E7EB' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <Reveal>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, justifyContent: 'center', alignItems: 'center' }}>
              {[
                { icon: ShieldCheck, text: 'Role-scoped access — dealers never see each other\'s data' },
                { icon: Gauge, text: '100+ automated regression tests before every release' },
                { icon: TrendingUp, text: 'Built on real production infrastructure, not a prototype' },
              ].map(t => (
                <div key={t.text} style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 280 }}>
                  <t.icon size={18} style={{ color: '#B8860B', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.4 }}>{t.text}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ FINAL CTA ══ */}
      <section id="cta" style={{ padding: '90px 24px', background: 'radial-gradient(ellipse at 50% 120%, rgba(193,39,45,0.06), transparent 60%), #F8F9FB', borderTop: '1px solid #E5E7EB' }}>
        <Reveal>
          <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
            <h2 className="ss-display" style={{ fontSize: 'clamp(2rem, 4.5vw, 3rem)', fontWeight: 700, margin: '0 0 16px', lineHeight: 1.08, color: '#111827' }}>
              Join the hub.
            </h2>
            <p style={{ fontSize: '1.02rem', color: '#6B7280', margin: '0 0 32px', lineHeight: 1.6 }}>
              SnapHubTrade.com is onboarding a first wave of GCC dealers and brokers. Request early access
              and we'll set up your dashboard, your AI Twin, and your first Market Sync personally.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
              <a href="mailto:hello@snaphubtrade.com" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '15px 30px', background: '#C1272D', color: 'white', borderRadius: 12, fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none', boxShadow: '0 10px 28px rgba(193,39,45,0.3)' }}>
                Request early access <ArrowRight size={16} />
              </a>
              <Link href="/register-dealer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '15px 26px', background: 'white', color: '#111827', borderRadius: 12, fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none', border: '1px solid #E5E7EB' }}>
                Register as a dealer
              </Link>
            </div>
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="mailto:hello@snaphubtrade.com" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9CA3AF', fontSize: '0.82rem', textDecoration: 'none' }}><Mail size={14} /> hello@snaphubtrade.com</a>
              <a href="https://wa.me/971500000000" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9CA3AF', fontSize: '0.82rem', textDecoration: 'none' }}><MessageCircle size={14} /> WhatsApp us</a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ padding: '28px 24px', borderTop: '1px solid #E5E7EB', textAlign: 'center', background: 'white' }}>
        <span className="ss-mono" style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
          © {new Date().getFullYear()} SnapHubTrade.com — The AI Automotive Trade Hub for the GCC
        </span>
      </footer>
    </div>
  );
}
