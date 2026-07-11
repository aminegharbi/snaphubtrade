'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lock, Eye, EyeOff, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { passwordError as validatePassword } from '@/lib/validation';

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) { setError('This reset link is invalid — request a new one.'); return; }
    const msg = validatePassword(password);
    if (msg) { setError(msg); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message.join(', ') : (data.message || 'Reset failed'));
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'This reset link is invalid or has expired.');
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
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', margin: '0 0 8px' }}>Password updated</h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 20px' }}>
              You can now sign in with your new password.
            </p>
            <Link href="/login" style={{ display: 'inline-block', padding: '11px 26px', background: '#C1272D', color: 'white', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>
              Sign in
            </Link>
          </div>
        ) : !token ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <AlertTriangle size={36} style={{ color: '#F87171', margin: '0 auto 16px' }} />
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: '0 0 8px' }}>Invalid reset link</h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 20px' }}>
              This link is missing its token. Request a new password reset email.
            </p>
            <Link href="/forgot-password" style={{ color: '#C1272D', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none' }}>Request a new link →</Link>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', margin: '0 0 6px' }}>Choose a new password</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: '0 0 24px' }}>This link is valid for one use, within 1 hour of being sent.</p>

            <form onSubmit={handleSubmit}>
              <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'block', marginBottom: 6 }}>New password</label>
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" autoFocus
                  style={{ width: '100%', padding: '12px 40px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'white', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }} />
                <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex' }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Confirm password</label>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                <input type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password"
                  style={{ width: '100%', padding: '12px 14px 12px 40px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'white', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {error && <p style={{ color: '#F87171', fontSize: '0.8rem', margin: '4px 0 0' }}>{error}</p>}

              <button type="submit" disabled={loading}
                style={{ width: '100%', marginTop: 18, padding: '13px 0', borderRadius: 10, border: 'none', background: loading ? '#7f1d1d' : '#C1272D', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
