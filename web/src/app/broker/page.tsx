'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import Link from 'next/link';
import { Briefcase, Users, Building2, ArrowRight, Check, Copy, Share2, TrendingUp, Globe, MessageCircle, Zap, Shield, Award, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';

// ─── Commission tables ────────────────────────────────────────────────────────

const BROKER_TIERS = [
  { tier: 'Starter',    deals: '1–5/mo',  rate: '1.5%', flat: 'AED 500',  color: '#6B7280', bg: '#F3F4F6' },
  { tier: 'Active',     deals: '6–15/mo', rate: '2.0%', flat: 'AED 750',  color: '#3B82F6', bg: '#DBEAFE' },
  { tier: 'Pro',        deals: '16–30/mo',rate: '2.5%', flat: 'AED 1,200',color: '#007A3D', bg: '#D1FAE5' },
  { tier: 'Elite',      deals: '31+/mo',  rate: '3.0%', flat: 'AED 2,000',color: '#C1272D', bg: '#FEE2E2' },
];

const DEALER_AFFILIATE = [
  { action: 'Refer a new dealer (Free plan)',    reward: 'AED 200 credit',    recurring: false },
  { action: 'Refer a dealer (Pro plan signup)',  reward: 'AED 800 + 5%/mo',  recurring: true  },
  { action: 'Refer a dealer (Enterprise)',       reward: 'AED 3,000 + 8%/mo',recurring: true  },
  { action: 'Broker → Dealer deal closed',       reward: '1.5–3% of deal',   recurring: false },
  { action: 'Dealer → Dealer stock transfer',    reward: 'AED 300 flat',     recurring: false },
  { action: 'Export deal facilitated',           reward: '2% of invoice',    recurring: false },
];

const BROKER_TYPES = [
  { id: 'independent', label: '🤝 Independent broker', desc: 'Individual who brings buyers to dealers' },
  { id: 'intermediary', label: '🏢 Intermediary company', desc: 'Company facilitating B2B deals' },
  { id: 'dealer_affiliate', label: '🚗 Dealer affiliate', desc: 'Existing dealer referring new dealers' },
  { id: 'export_agent', label: '✈️ Export agent', desc: 'Specialist in cross-border transactions' },
];

// ─── FAQ ─────────────────────────────────────────────────────────────────────

const FAQS = [
  { q: 'How do I receive my commission?', a: 'Commissions are paid monthly via bank transfer or IBAN. Minimum payout is AED 500. Elite brokers can request bi-weekly payments.' },
  { q: 'Do I need to be in UAE to join?', a: 'No. Brokers can be based anywhere in the world. Many of our top brokers are in Nigeria, Kenya, UK, and India, facilitating export deals.' },
  { q: 'Is there a fee to join?', a: 'Zero. The broker programme is completely free. You earn from every deal you facilitate, with no upfront cost.' },
  { q: 'How does the broker-broker programme work?', a: 'If you refer another broker to SnapHubTrade.com and they close deals, you earn 0.5% of their commissions for the first 12 months — unlimited referrals.' },
  { q: 'How is commission calculated?', a: 'For vehicle deals: commission = deal price × your tier rate. For dealer referrals: flat bonus + monthly percentage of their subscription. All tracked transparently in your dashboard.' },
  { q: 'What tools do I get as a broker?', a: 'Your own referral link, a unique affiliate code, shareable vehicle listings, WhatsApp deep-links, performance dashboard, deal tracker, and a dedicated broker support contact.' },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function BrokerPage() {
  const { t } = useLocale();
  const { signIn } = useSession();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    broker_type: '', company_name: '', full_name: '', email: '', password: '', phone: '',
    whatsapp: '', country: '', city: '', languages: [] as string[],
    specialties: [] as string[], monthly_deals: '', experience_years: '',
    existing_network: '', website: '', linkedin: '', referral_code: '',
    agree_terms: false,
  });
  // Pre-fill the referral code field when arriving via a broker's referral
  // link (?ref=CODE), same param name used across register-dealer and join.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) setForm(f => ({ ...f, referral_code: ref.toUpperCase() }));
  }, []);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState('');
  const [error, setError] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const sf = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const toggle = (k: 'languages' | 'specialties', v: string) =>
    setForm(f => ({ ...f, [k]: f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v] }));

  const genCode = (name: string) => {
    const prefix = name.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 5);
    return `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  };

  const submit = async () => {
    if (!form.full_name || !form.email || !form.broker_type) { setError('Please fill all required fields'); return; }
    if (!form.password || form.password.length < 8) { setError('Please set a password (min. 8 characters) so you can sign back in'); return; }
    if (!form.agree_terms) { setError('Please accept the terms'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/v1/broker/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name, email: form.email, password: form.password,
          phone: form.phone, whatsapp: form.whatsapp, company_name: form.company_name,
          broker_type: form.broker_type, country: form.country, city: form.city,
          languages: form.languages, specialties: form.specialties,
          referral_code: form.referral_code || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed — please try again');

      setAffiliateCode(data.affiliate_code);

      // Establish the live session immediately so the broker dashboard,
      // notification bell, and marketplace broker features are active
      // right after signup — no separate login step required.
      signIn({
        profile_type: 'broker', profile_id: data.id, display_name: data.full_name,
        email: data.email, broker_id: data.id, affiliate_code: data.affiliate_code,
      });

      setDone(true);
    } catch (e: any) { setError(e.message || 'Submission failed — please try again'); }
    finally { setSubmitting(false); }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(affiliateCode);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const inputCls = { width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: '0.9rem', color: '#111827', outline: 'none', background: '#FAFAFA' };
  const labelCls = { display: 'block' as const, fontSize: '0.75rem', fontWeight: 700 as const, color: '#374151', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.05em' };

  // ── Success screen ──────────────────────────────────────────────────────────

  if (done) return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '20px 24px' }}>
        <Link href="/" style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', textDecoration: 'none' }}>SnapHub<span style={{ color: '#C1272D' }}>Trade.com</span></Link>
      </div>
      <div style={{ maxWidth: 560, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Award size={36} color="#065F46" />
        </div>
        <h2 style={{ fontWeight: 800, fontSize: '1.5rem', color: '#111827', margin: '0 0 8px' }}>{t('broker.welcome')}</h2>
        <p style={{ color: '#6B7280', lineHeight: 1.7, margin: '0 0 28px' }}>Your broker account is under review. You'll hear back within 24h. In the meantime, here is your affiliate code:</p>

        <div style={{ background: 'white', border: '2px solid #C1272D', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your affiliate code</p>
          <p style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 900, color: '#C1272D', margin: '0 0 16px', letterSpacing: '0.1em' }}>{affiliateCode}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={copyCode}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: copied ? '#007A3D' : '#C1272D', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
              {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy code</>}
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent('Join SnapHubTrade.com — UAE\'s top vehicle marketplace. Use my broker code ' + affiliateCode + ' when you register: https://snaphubtrade.com/join')}`}
              target="_blank"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#25D366', color: 'white', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
              <MessageCircle size={14} /> Share on WhatsApp
            </a>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Your referral link', value: `snaphubtrade.com/join?ref=${affiliateCode}` },
            { label: 'Dealer signup link', value: `snaphubtrade.com/register-dealer?ref=${affiliateCode}` },
            { label: 'Broker signup link', value: `snaphubtrade.com/broker?ref=${affiliateCode}` },
          ].map(l => (
            <div key={l.label} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', textAlign: 'left' }}>
              <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l.label}</p>
              <p style={{ fontSize: '0.78rem', color: '#374151', margin: 0, fontFamily: 'monospace', wordBreak: 'break-all' }}>{l.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Link href="/marketplace" style={{ padding: '10px 20px', border: '1.5px solid #E5E7EB', borderRadius: 10, color: '#374151', textDecoration: 'none', fontWeight: 500, fontSize: '0.875rem' }}>Browse vehicles</Link>
          <Link href="/broker/dashboard" style={{ padding: '10px 20px', background: '#C1272D', color: 'white', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem' }}>Broker dashboard →</Link>
        </div>
      </div>
    </div>
  );

  // ── Main form ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '18px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', textDecoration: 'none' }}>SnapHub<span style={{ color: '#C1272D' }}>Trade.com</span></Link>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: '0.875rem' }}>
            <Link href="/join" style={{ color: '#6B7280', textDecoration: 'none' }}>User sign up</Link>
            <Link href="/register-dealer" style={{ color: '#6B7280', textDecoration: 'none' }}>Dealer sign up</Link>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #111827 0%, #1F2937 100%)', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(193,39,45,0.2)', border: '1px solid rgba(193,39,45,0.4)', borderRadius: 20, padding: '5px 14px', marginBottom: 16 }}>
          <Award size={13} color="#C1272D" />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#C1272D' }}>BROKER & AFFILIATE PROGRAMME</span>
        </div>
        <h1 style={{ color: 'white', fontWeight: 900, fontSize: 'clamp(1.5rem,4vw,2.2rem)', margin: '0 0 12px', lineHeight: 1.2 }}>
          Earn on every deal.<br />No limits. No cap.
        </h1>
        <p style={{ color: '#9CA3AF', fontSize: '1rem', margin: '0 0 28px', maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
          Join UAE's fastest-growing automotive affiliate network. Earn 1.5–3% on every vehicle deal, plus recurring commissions on dealer referrals.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[{ v: '3%', l: 'Max commission rate' }, { v: 'AED 2K', l: 'Elite broker monthly min' }, { v: '∞', l: 'Deals you can refer' }, { v: '24h', l: 'Commission payout' }].map(s => (
            <div key={s.l} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 20px', textAlign: 'center' }}>
              <p style={{ color: '#C1272D', fontWeight: 900, fontSize: '1.4rem', margin: '0 0 2px' }}>{s.v}</p>
              <p style={{ color: '#6B7280', fontSize: '0.75rem', margin: 0 }}>{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32 }}>

        {/* Left: Registration form */}
        <div>
          {/* Already registered? Sign in */}
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <p style={{ fontSize: '0.82rem', color: '#065F46', margin: 0, fontWeight: 500 }}>
              ✅ Already registered as a broker?
            </p>
            <a href="/login" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#065F46', textDecoration: 'none', padding: '6px 14px', background: 'white', border: '1px solid #BBF7D0', borderRadius: 8 }}>
              Sign in to your dashboard →
            </a>
          </div>

          {/* Progress */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? '#C1272D' : '#E5E7EB', transition: 'background 0.3s' }} />
            ))}
          </div>

          {error && <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#991B1B', fontSize: '0.875rem' }}>{error}</div>}

          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: 28 }}>

            {/* ── Step 1: Type + Identity ─────────────────────────────────── */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 4px', fontSize: '0.95rem' }}>Step 1 — Profile type</p>
                  <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.8rem' }}>Choose the role that best describes you</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {BROKER_TYPES.map(t => (
                    <button key={t.id} onClick={() => sf('broker_type', t.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, border: `2px solid ${form.broker_type === t.id ? '#C1272D' : '#E5E7EB'}`, background: form.broker_type === t.id ? '#FFF1F2' : 'white', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ fontSize: '1.25rem' }}>{t.label.slice(0, 2)}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.875rem' }}>{t.label.slice(3)}</p>
                        <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.78rem' }}>{t.desc}</p>
                      </div>
                      {form.broker_type === t.id && <Check size={16} style={{ color: '#C1272D', flexShrink: 0 }} />}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelCls}>Full name *</label>
                    <input value={form.full_name} onChange={e => sf('full_name', e.target.value)} placeholder="Your full name" style={inputCls} />
                  </div>
                  <div>
                    <label style={labelCls}>Company name</label>
                    <input value={form.company_name} onChange={e => sf('company_name', e.target.value)} placeholder="Optional" style={inputCls} />
                  </div>
                  <div>
                    <label style={labelCls}>Email *</label>
                    <input type="email" value={form.email} onChange={e => sf('email', e.target.value)} placeholder="you@company.com" style={inputCls} />
                  </div>
                  <div>
                    <label style={labelCls}>Password *</label>
                    <input type="password" value={form.password} onChange={e => sf('password', e.target.value)} placeholder="Min. 8 characters" style={inputCls} />
                  </div>
                  <div>
                    <label style={labelCls}>WhatsApp *</label>
                    <input type="tel" value={form.whatsapp} onChange={e => sf('whatsapp', e.target.value)} placeholder="+971 50 000 0000" style={inputCls} />
                  </div>
                  <div>
                    <label style={labelCls}>Country</label>
                    <input value={form.country} onChange={e => sf('country', e.target.value)} placeholder="UAE, Nigeria, UK…" style={inputCls} />
                  </div>
                  <div>
                    <label style={labelCls}>City</label>
                    <input value={form.city} onChange={e => sf('city', e.target.value)} placeholder="Dubai, Lagos, London…" style={inputCls} />
                  </div>
                </div>

                <button onClick={() => { if (!form.broker_type || !form.full_name || !form.email) { setError('Choose a type, enter name and email'); return; } setError(''); setStep(2); }}
                  style={{ padding: '12px 0', background: '#C1272D', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* ── Step 2: Expertise ───────────────────────────────────────── */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 4px', fontSize: '0.95rem' }}>Step 2 — Your expertise</p>
                  <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.8rem' }}>Help us understand your network</p>
                </div>

                <div>
                  <label style={labelCls}>Vehicle specialties</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {['SUV & 4x4', 'Luxury & Supercar', 'Pickup Trucks', 'Electric Vehicles', 'Japanese Imports', 'American Spec', 'Export / Africa', 'Export / Asia', 'Commercial Vans', 'Classic Cars'].map(v => (
                      <button key={v} onClick={() => toggle('specialties', v)}
                        style={{ padding: '6px 12px', borderRadius: 20, border: `1.5px solid ${form.specialties.includes(v) ? '#C1272D' : '#E5E7EB'}`, background: form.specialties.includes(v) ? '#FFF1F2' : 'white', color: form.specialties.includes(v) ? '#C1272D' : '#6B7280', cursor: 'pointer', fontWeight: 500, fontSize: '0.78rem' }}>
                        {form.specialties.includes(v) ? '✓ ' : ''}{v}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={labelCls}>Languages</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {['Arabic', 'English', 'French', 'Hausa', 'Hindi', 'Urdu', 'Turkish', 'Russian', 'Chinese'].map(v => (
                      <button key={v} onClick={() => toggle('languages', v)}
                        style={{ padding: '6px 12px', borderRadius: 20, border: `1.5px solid ${form.languages.includes(v) ? '#3B82F6' : '#E5E7EB'}`, background: form.languages.includes(v) ? '#DBEAFE' : 'white', color: form.languages.includes(v) ? '#1E40AF' : '#6B7280', cursor: 'pointer', fontWeight: 500, fontSize: '0.78rem' }}>
                        {form.languages.includes(v) ? '✓ ' : ''}{v}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelCls}>Est. monthly deals</label>
                    <select value={form.monthly_deals} onChange={e => sf('monthly_deals', e.target.value)} style={inputCls}>
                      <option value="">Select…</option>
                      {['1–5', '6–15', '16–30', '31–50', '50+'].map(v => <option key={v} value={v}>{v} deals/month</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelCls}>Years of experience</label>
                    <select value={form.experience_years} onChange={e => sf('experience_years', e.target.value)} style={inputCls}>
                      <option value="">Select…</option>
                      {['Less than 1', '1–3', '3–5', '5–10', '10+'].map(v => <option key={v} value={v}>{v} years</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={labelCls}>Describe your existing network</label>
                    <textarea value={form.existing_network} onChange={e => sf('existing_network', e.target.value)}
                      rows={3} placeholder="e.g. I have 200+ buyers in Nigeria seeking Toyota Land Cruisers and Nissan Patrols for fleet purchase…"
                      style={{ ...inputCls, resize: 'vertical' }} />
                  </div>
                  <div>
                    <label style={labelCls}>Website / social</label>
                    <input value={form.website} onChange={e => sf('website', e.target.value)} placeholder="https://…" style={inputCls} />
                  </div>
                  <div>
                    <label style={labelCls}>Referred by (code)</label>
                    <input value={form.referral_code} onChange={e => sf('referral_code', e.target.value.toUpperCase())} placeholder="e.g. BROKER-ABCD" style={{ ...inputCls, fontFamily: 'monospace' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep(1)} style={{ padding: '12px 20px', border: '1.5px solid #E5E7EB', borderRadius: 12, background: 'white', cursor: 'pointer', fontWeight: 500, color: '#374151' }}>← Back</button>
                  <button onClick={() => setStep(3)}
                    style={{ flex: 1, padding: '12px 0', background: '#C1272D', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    Continue <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Programme terms ─────────────────────────────────── */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 4px', fontSize: '0.95rem' }}>Step 3 — Programme terms</p>
                  <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.8rem' }}>Review your commission structure</p>
                </div>

                {/* Commission tier */}
                <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16 }}>
                  <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 12px', fontSize: '0.875rem' }}>Commission tiers — vehicle deals</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {BROKER_TIERS.map(t => (
                      <div key={t.tier} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: t.bg, border: `1px solid ${t.color}25` }}>
                        <span style={{ fontWeight: 700, color: t.color, width: 70, fontSize: '0.875rem' }}>{t.tier}</span>
                        <span style={{ color: '#6B7280', fontSize: '0.8rem', flex: 1 }}>{t.deals}</span>
                        <span style={{ fontWeight: 700, color: t.color, fontSize: '0.875rem' }}>{t.rate}</span>
                        <span style={{ color: '#9CA3AF', fontSize: '0.78rem' }}>or {t.flat} flat</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dealer affiliate rewards */}
                <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16 }}>
                  <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 12px', fontSize: '0.875rem' }}>Dealer affiliate programme</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {DEALER_AFFILIATE.map(r => (
                      <div key={r.action} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'white', border: '1px solid #E5E7EB' }}>
                        <span style={{ fontSize: '0.8rem', color: '#374151', flex: 1 }}>{r.action}</span>
                        <span style={{ fontWeight: 700, color: '#007A3D', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{r.reward}</span>
                        {r.recurring && <span style={{ fontSize: '0.68rem', background: '#DBEAFE', color: '#1E40AF', padding: '1px 6px', borderRadius: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>recurring</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Broker-broker programme */}
                <div style={{ background: '#FFF1F2', border: '1px solid #FECACA', borderRadius: 12, padding: 16 }}>
                  <p style={{ fontWeight: 700, color: '#C1272D', margin: '0 0 8px', fontSize: '0.875rem' }}>🤝 Broker-Broker Programme</p>
                  <p style={{ color: '#374151', fontSize: '0.85rem', lineHeight: 1.65, margin: 0 }}>
                    Refer other brokers to SnapHubTrade.com and earn <strong>0.5% of their commissions</strong> for 12 months — no cap, no limit on referrals. The more brokers you bring, the higher your passive income.
                  </p>
                </div>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.agree_terms} onChange={e => sf('agree_terms', e.target.checked)}
                    style={{ marginTop: 3, accentColor: '#C1272D', width: 16, height: 16, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8rem', color: '#374151', lineHeight: 1.6 }}>
                    I agree to the <a href="#" style={{ color: '#C1272D' }}>Broker Programme Terms</a> and <a href="#" style={{ color: '#C1272D' }}>Commission Agreement</a>. I confirm the information provided is accurate.
                  </span>
                </label>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep(2)} style={{ padding: '12px 20px', border: '1.5px solid #E5E7EB', borderRadius: 12, background: 'white', cursor: 'pointer', fontWeight: 500, color: '#374151' }}>← Back</button>
                  <button onClick={submit} disabled={submitting || !form.agree_terms}
                    style={{ flex: 1, padding: '12px 0', background: (!form.agree_terms || submitting) ? '#E5E7EB' : '#C1272D', color: (!form.agree_terms || submitting) ? '#9CA3AF' : 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: (!form.agree_terms || submitting) ? 'default' : 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {submitting ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</> : '🚀 Apply to the programme'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Info panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20 }}>
            <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 14px', fontSize: '0.9rem' }}>💼 What you get</p>
            {[
              { icon: TrendingUp, color: '#C1272D', t: 'Commission dashboard', d: 'Track every deal in real-time' },
              { icon: Globe, color: '#007A3D', t: 'Shareable vehicle links', d: 'Send dealers your branded listings' },
              { icon: MessageCircle, color: '#25D366', t: 'WhatsApp deep-links', d: 'One tap to contact any dealer' },
              { icon: Shield, color: '#8B5CF6', t: 'Verified badge', d: 'Earn trust with your clients' },
              { icon: Zap, color: '#F59E0B', t: 'Priority notifications', d: 'First to know about new stock' },
              { icon: Users, color: '#3B82F6', t: 'Sub-broker network', d: 'Build your own team of referrers' },
            ].map(b => (
              <div key={b.t} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: 7, background: b.color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <b.icon size={14} style={{ color: b.color }} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.82rem', color: '#111827', margin: 0 }}>{b.t}</p>
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0 }}>{b.d}</p>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #F3F4F6' }}>
              <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.875rem' }}>FAQ</p>
            </div>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ borderBottom: i < FAQS.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', flex: 1, lineHeight: 1.4 }}>{faq.q}</span>
                  {openFaq === i ? <ChevronUp size={14} style={{ color: '#9CA3AF', flexShrink: 0, marginLeft: 8 }} /> : <ChevronDown size={14} style={{ color: '#9CA3AF', flexShrink: 0, marginLeft: 8 }} />}
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 18px 14px', fontSize: '0.8rem', color: '#6B7280', lineHeight: 1.65 }}>{faq.a}</div>
                )}
              </div>
            ))}
          </div>

          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <p style={{ fontWeight: 700, color: '#065F46', margin: '0 0 4px', fontSize: '0.875rem' }}>Already a dealer?</p>
            <p style={{ color: '#065F46', margin: '0 0 10px', fontSize: '0.8rem' }}>The dealer-dealer programme lets you earn by referring new dealers to the platform.</p>
            <Link href="/register-dealer" style={{ color: '#007A3D', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none' }}>Register as dealer →</Link>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
