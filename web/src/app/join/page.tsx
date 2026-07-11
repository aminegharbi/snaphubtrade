'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import Link from 'next/link';
import { User, Mail, Phone, Globe, CheckCircle, ArrowRight, Star, Shield, Zap, Bell, Heart } from 'lucide-react';

const BENEFITS = [
  { icon: Star, color: '#C1272D', title: 'Save favourites', desc: 'Bookmark vehicles and track price drops' },
  { icon: Bell, color: '#3B82F6', title: 'Price alerts', desc: 'Get notified when a vehicle matches your budget' },
  { icon: Globe, color: '#007A3D', title: 'Export requests', desc: 'Request vehicles from any UAE dealer directly' },
  { icon: Shield, color: '#8B5CF6', title: 'Verified dealers', desc: 'Buy only from KYC-verified Free Zone dealers' },
  { icon: Zap, color: '#F59E0B', title: 'Quick compare', desc: 'Side-by-side specs for up to 4 vehicles' },
  { icon: Heart, color: '#EC4899', title: 'Saved searches', desc: 'Resume your search exactly where you left off' },
];

export default function JoinPage() {
  const { t } = useLocale();
  const [referralCode, setReferralCode] = useState('');
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) setReferralCode(ref);
  }, []);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', phone: '', whatsapp: '',
    nationality: '', city: '', preferred_lang: 'en',
    interests: [] as string[], budget_aed: '', referral_code: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const sf = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const toggleInterest = (v: string) =>
    setForm(f => ({ ...f, interests: f.interests.includes(v) ? f.interests.filter(x => x !== v) : [...f.interests, v] }));

  const submit = async () => {
    if (!form.full_name || !form.email) { setError('Name and email are required'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role: 'buyer', email_verified: false, referral_code: referralCode || undefined }),
      });
      if (res.ok) { setDone(true); }
      else { const d = await res.json(); setError(d.message || 'Registration failed'); }
    } catch { setError('Connection error — please try again'); }
    finally { setSubmitting(false); }
  };

  const inputStyle = { width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: '0.9rem', color: '#111827', outline: 'none', background: '#FAFAFA', transition: 'border-color 0.15s' };
  const labelStyle = { display: 'block' as const, fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.05em' };

  if (done) return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 440, padding: 32 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckCircle size={36} color="#065F46" />
        </div>
        <h2 style={{ fontWeight: 800, fontSize: '1.4rem', color: '#111827', marginBottom: 8 }}>{t('join.success.title')}</h2>
        <p style={{ color: '#6B7280', lineHeight: 1.6, marginBottom: 24 }}>
          Your account has been created. You can now save vehicles, set price alerts and contact UAE dealers directly.
        </p>
        <Link href="/marketplace" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: '#C1272D', color: 'white', borderRadius: 12, fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>
          Browse vehicles <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '24px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', textDecoration: 'none' }}>
            SnapHub<span style={{ color: '#C1272D' }}>Trade.com</span>
          </Link>
          <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>Already have an account? <Link href="/login" style={{ color: '#C1272D', fontWeight: 600 }}>Sign in</Link></p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32 }}>

        {/* Left: Form */}
        <div>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontWeight: 800, fontSize: '1.6rem', color: '#111827', margin: '0 0 8px' }}>{t('join.title')}</h1>
            <p style={{ color: '#6B7280', margin: 0 }}>Access 2,000+ vehicles from 35+ verified UAE dealers</p>
          </div>

          {/* Progress */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
            {[1, 2].map(s => (
              <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? '#C1272D' : '#E5E7EB', transition: 'background 0.3s' }} />
            ))}
          </div>

          {error && (
            <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#991B1B', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: 28 }}>
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 4px', fontSize: '0.95rem' }}>Personal information</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Full name *</label>
                    <input value={form.full_name} onChange={e => sf('full_name', e.target.value)} placeholder="Mohammed Al Rashid" style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#C1272D')} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email address *</label>
                    <input type="email" value={form.email} onChange={e => sf('email', e.target.value)} placeholder="email@example.com" style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#C1272D')} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input type="tel" value={form.phone} onChange={e => sf('phone', e.target.value)} placeholder="+971 50 000 0000" style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#C1272D')} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
                  </div>
                  <div>
                    <label style={labelStyle}>Password <span style={{ color:'#9CA3AF', fontWeight:400, textTransform:'none' }}>(optional)</span></label>
                    <input type="password" value={form.password} onChange={e => sf('password', e.target.value)} placeholder="Leave blank for passwordless login" style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#C1272D')} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
                  </div>
                  <div>
                    <label style={labelStyle}>WhatsApp</label>
                    <input type="tel" value={form.whatsapp} onChange={e => sf('whatsapp', e.target.value)} placeholder="+971 50 000 0000" style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#C1272D')} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
                  </div>
                  <div>
                    <label style={labelStyle}>Nationality</label>
                    <input value={form.nationality} onChange={e => sf('nationality', e.target.value)} placeholder="UAE, Nigerian, British…" style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#C1272D')} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
                  </div>
                  <div>
                    <label style={labelStyle}>City / Country</label>
                    <input value={form.city} onChange={e => sf('city', e.target.value)} placeholder="Dubai, Lagos, London…" style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#C1272D')} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Preferred language</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[{ v: 'en', l: '🇬🇧 English' }, { v: 'ar', l: '🇦🇪 العربية' }, { v: 'fr', l: '🇫🇷 Français' }].map(o => (
                      <button key={o.v} onClick={() => sf('preferred_lang', o.v)}
                        style={{ padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${form.preferred_lang === o.v ? '#C1272D' : '#E5E7EB'}`, background: form.preferred_lang === o.v ? '#FFF1F2' : 'white', color: form.preferred_lang === o.v ? '#C1272D' : '#6B7280', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setStep(2)} disabled={!form.full_name || !form.email}
                  style={{ padding: '12px 0', background: (!form.full_name || !form.email) ? '#E5E7EB' : '#C1272D', color: (!form.full_name || !form.email) ? '#9CA3AF' : 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: (!form.full_name || !form.email) ? 'default' : 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            )}

            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 4px', fontSize: '0.95rem' }}>Your vehicle preferences</p>
                <div>
                  <label style={labelStyle}>I'm looking for</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {['SUV', 'Sedan', 'Pickup', 'Luxury', 'Electric / EV', 'Export purchase', 'Fleet deal', 'Classic car'].map(v => (
                      <button key={v} onClick={() => toggleInterest(v)}
                        style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${form.interests.includes(v) ? '#C1272D' : '#E5E7EB'}`, background: form.interests.includes(v) ? '#FFF1F2' : 'white', color: form.interests.includes(v) ? '#C1272D' : '#6B7280', cursor: 'pointer', fontWeight: 500, fontSize: '0.8rem' }}>
                        {form.interests.includes(v) ? '✓ ' : ''}{v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Budget (AED)</label>
                  <select value={form.budget_aed} onChange={e => sf('budget_aed', e.target.value)} style={{ ...inputStyle }}>
                    <option value="">Select budget…</option>
                    {['Under 50,000', '50,000 – 100,000', '100,000 – 200,000', '200,000 – 500,000', '500,000 – 1,000,000', 'Above 1,000,000'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Referral / affiliate code <span style={{ color: '#9CA3AF', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                  <input value={form.referral_code} onChange={e => sf('referral_code', e.target.value.toUpperCase())} placeholder="e.g. BROKER-XYZ" style={{ ...inputStyle, fontFamily: 'monospace' }}
                    onFocus={e => (e.target.style.borderColor = '#C1272D')} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
                </div>

                <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '12px 16px', fontSize: '0.8rem', color: '#6B7280' }}>
                  By creating an account you agree to our <a href="#" style={{ color: '#C1272D' }}>Terms of Service</a> and <a href="#" style={{ color: '#C1272D' }}>Privacy Policy</a>.
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep(1)} style={{ padding: '12px 20px', border: '1.5px solid #E5E7EB', borderRadius: 12, background: 'white', cursor: 'pointer', fontWeight: 500, color: '#374151' }}>← Back</button>
                  <button onClick={submit} disabled={submitting}
                    style={{ flex: 1, padding: '12px 0', background: '#C1272D', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', fontSize: '0.9rem', opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? 'Creating account…' : '🇦🇪 Create my account'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Benefits */}
        <div>
          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: 24, marginBottom: 16 }}>
            <p style={{ fontWeight: 700, color: '#111827', marginBottom: 16, fontSize: '0.95rem' }}>🎁 Free membership benefits</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {BENEFITS.map(b => (
                <div key={b.title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: b.color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <b.icon size={15} style={{ color: b.color }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, color: '#111827', margin: '0 0 2px', fontSize: '0.875rem' }}>{b.title}</p>
                    <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.78rem' }}>{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: '#FFF1F2', border: '1px solid #FECACA', borderRadius: 12, padding: 16, fontSize: '0.8rem', color: '#374151' }}>
            <p style={{ fontWeight: 700, color: '#C1272D', margin: '0 0 6px' }}>💼 Are you a broker or dealer?</p>
            <p style={{ margin: '0 0 10px', color: '#6B7280' }}>Join our affiliate programme and earn commissions on every deal you refer.</p>
            <Link href="/broker" style={{ color: '#C1272D', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none' }}>Apply as broker / dealer →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
