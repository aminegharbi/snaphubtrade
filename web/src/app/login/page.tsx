'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Car, Eye, EyeOff, Loader2, Building2, Briefcase, User, Zap } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { emailError as validateEmail } from '@/lib/validation';
import { useLocale } from '@/contexts/LocaleContext';
import { translateValidationError } from '@/i18n/validationMessages';
import { GoogleSignInButton } from '@/components/common/GoogleSignInButton';

type LoginProfile = 'dealer' | 'broker' | 'buyer';

const TABS = [
  { key: 'dealer' as LoginProfile, label: 'Dealer',  icon: Building2, color: '#C1272D',
    demo: { email: 'dealer@demo.ae',  pass: 'Admin@Dubai2024' },
    reg: { href: '/register-dealer', label: 'Register as dealer' } },
  { key: 'broker' as LoginProfile, label: 'Broker',  icon: Briefcase,  color: '#1E40AF',
    demo: { email: 'ahmed@snaphubtrade.com', pass: 'Admin@Dubai2024' },
    reg: { href: '/broker', label: 'Join broker programme' } },
  { key: 'buyer' as LoginProfile,  label: 'Buyer',   icon: User,       color: '#007A3D',
    demo: { email: 'buyer@demo.ae', pass: 'Admin@Dubai2024' },
    reg: { href: '/join', label: 'Create account' } },
];

export default function LoginPage() {
  const { t, locale } = useLocale();
  const [profile, setProfile] = useState<LoginProfile>('dealer');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const emailRef = useRef<HTMLInputElement>(null);
  const { signIn } = useSession();

  const tab = TABS.find(t => t.key === profile)!;

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('profile') as LoginProfile | null;
    if (p && TABS.some(t => t.key === p)) setProfile(p);
  }, []);

  // Auto-focus email on tab change
  useEffect(() => { emailRef.current?.focus(); }, [profile]);

  const fillDemo = () => { setEmail(tab.demo.email); setPassword(tab.demo.pass); setError(''); };

  // Shared by the email/password submit below and the Google Sign-In button
  // — same session shape, same "return to what you were doing" redirect.
  const completeSignIn = (data: any) => {
    const profileType: 'dealer' | 'broker' | 'admin' | 'buyer' = data.profile_type || 'buyer';
    signIn({
      profile_type: profileType,
      profile_id: data.dealer?.id || data.broker?.id || data.user?.id || null,
      display_name: data.dealer?.company_name || data.broker?.full_name || data.user?.full_name || 'User',
      email: data.user?.email || email,
      dealer_id: data.dealer?.id || null,
      broker_id: data.broker?.id || null,
      affiliate_code: data.broker?.affiliate_code || null,
      access_token: data.access_token || null,
    });
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      window.location.href = redirect;
      return;
    }
    window.location.href = profileType === 'dealer' ? '/dealer/dashboard'
      : profileType === 'broker' ? '/broker/dashboard'
      : profileType === 'admin'  ? '/admin' : '/';
  };

  useEffect(() => {
    const onGoogleSuccess = (e: any) => completeSignIn(e.detail);
    window.addEventListener('google-signin-success', onGoogleSuccess);
    return () => window.removeEventListener('google-signin-success', onGoogleSuccess);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailMsg = validateEmail(email);
    if (emailMsg) { setError(translateValidationError(emailMsg, locale)); return; }
    if (!password) { setError(t('login.error.password_required')); return; }

    setLoading(true);
    try {
      const res  = await fetch('/api/v1/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message.join(', ') : (data.message || 'Login failed'));

      completeSignIn(data);
    } catch (err: any) {
      setError(err.message || t('login.error.invalid_credentials'));
    } finally { setLoading(false); }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: '2px solid #E5E7EB',
    borderRadius: 10, fontSize: '1rem', color: '#111827', background: 'white',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#111827' }}>
      {/* Top brand strip */}
      <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#C1272D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Car size={18} color="white" />
        </div>
        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'white' }}>
          SnapHub<span style={{ color: '#C1272D' }}>Trade.com</span>
        </span>
        <Link href="/" style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>
          ← Marketplace
        </Link>
      </div>

      {/* Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}>
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 32px 64px rgba(0,0,0,0.4)' }}>

          {/* Tab selector */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)' }}>
            {TABS.map(t => {
              const active = t.key === profile;
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => { setProfile(t.key); setError(''); }}
                  style={{ padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    border: 'none', borderBottom: `3px solid ${active ? t.color : '#F3F4F6'}`,
                    background: active ? t.color + '08' : 'white',
                    cursor: 'pointer', transition: 'all 0.15s' }}>
                  <Icon size={18} style={{ color: active ? t.color : '#9CA3AF' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: active ? t.color : '#9CA3AF' }}>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form body */}
          <div style={{ padding: '28px 28px 24px' }}>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
              {t('login.signin_as')} {tab.label}
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#9CA3AF', margin: '0 0 22px' }}>
              {tab.key === 'dealer' ? 'Access your inventory & market intelligence'
               : tab.key === 'broker' ? 'View commissions & opportunities'
               : 'Browse and save your favourite vehicles'}
            </p>

            {/* Quick demo fill */}
            <button onClick={fillDemo}
              style={{ width: '100%', padding: '9px 0', marginBottom: 18, border: `1.5px dashed ${tab.color}50`,
                borderRadius: 10, background: tab.color + '08', color: tab.color,
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Zap size={13} /> Use demo credentials
            </button>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Email
                </label>
                <input ref={emailRef} type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder={tab.demo.email} required style={inp} autoComplete="email" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required autoComplete="current-password"
                    style={{ ...inp, paddingRight: 44 }} />
                  <button type="button" onClick={() => setShow(!show)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <a href="/forgot-password" style={{ display: 'inline-block', marginTop: 8, fontSize: '0.8rem', color: '#C1272D', fontWeight: 600, textDecoration: 'none' }}>
                  Forgot password?
                </a>
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, fontSize: '0.85rem', color: '#C1272D', fontWeight: 500 }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{ padding: '14px 0', borderRadius: 12, border: 'none', background: tab.color,
                  color: 'white', fontWeight: 800, fontSize: '1rem', cursor: loading ? 'default' : 'pointer',
                  opacity: loading ? 0.75 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginTop: 4 }}>
                {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                {loading ? 'Signing in…' : `Sign in →`}
              </button>
            </form>

            <div style={{ marginTop: 20 }}>
              <GoogleSignInButton onError={setError} />
            </div>

            <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #F3F4F6', textAlign: 'center' }}>
              <p style={{ fontSize: '0.82rem', color: '#9CA3AF', margin: 0 }}>
                No account?{' '}
                <Link href={tab.reg.href} style={{ color: tab.color, fontWeight: 700, textDecoration: 'none' }}>
                  {tab.reg.label}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
