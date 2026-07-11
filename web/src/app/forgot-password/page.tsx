'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { emailError as validateEmail } from '@/lib/validation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const msg = validateEmail(email);
    if (msg) { setError(msg); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      // The backend always returns the same generic success response
      // regardless of whether the email exists, to avoid account
      // enumeration — so we always show the same confirmation here too.
      if (!res.ok) throw new Error('Something went wrong. Please try again.');
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0F0F14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#17171F', borderRadius: 18, padding: 32, border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ marginBottom: 20 }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>SnapHub<span style={{ color: '#C1272D' }}>Trade.com</span></span>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle2 size={40} style={{ color: '#22C55E', margin: '0 auto 16px' }} />
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', margin: '0 0 8px' }}>Check your email</h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 20px' }}>
              If an account exists for <strong style={{ color: 'white' }}>{email}</strong>, we've sent a link to reset your password. It expires in 1 hour.
            </p>
            <Link href="/login" style={{ color: '#C1272D', fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none' }}>← Back to sign in</Link>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', margin: '0 0 6px' }}>Reset your password</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: '0 0 24px' }}>
              Enter the email on your account — dealer, broker, or buyer — and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit}>
              <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Email</label>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoFocus
                  style={{ width: '100%', padding: '12px 14px 12px 40px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'white', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {error && <p style={{ color: '#F87171', fontSize: '0.8rem', margin: '4px 0 0' }}>{error}</p>}

              <button type="submit" disabled={loading}
                style={{ width: '100%', marginTop: 18, padding: '13px 0', borderRadius: 10, border: 'none', background: loading ? '#7f1d1d' : '#C1272D', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Send reset link'}
              </button>
            </form>

            <Link href="/login" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 20, color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', textDecoration: 'none', justifyContent: 'center' }}>
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
