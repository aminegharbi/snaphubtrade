'use client';
import { useEffect, useRef, useState } from 'react';

// Loads Google Identity Services, renders Google's own button, and posts
// the resulting ID token to our backend for verification. Hides itself
// entirely if NEXT_PUBLIC_GOOGLE_CLIENT_ID isn't set, so the rest of the
// login page works unchanged in environments where Google Sign-In hasn't
// been configured yet.
export function GoogleSignInButton({ onError }: { onError?: (msg: string) => void }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!clientId) return;

    const handleCredential = async (response: any) => {
      try {
        const res = await fetch('/api/v1/auth/google', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: response.credential }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Google sign-in failed');

        // Same session shape the email/password login flow writes, and the
        // same redirect-preserving logic — signInWithGoogle dispatches a
        // custom event the login page listens for, since this component
        // has no access to SessionContext's signIn directly across pages.
        window.dispatchEvent(new CustomEvent('google-signin-success', { detail: data }));
      } catch (err: any) {
        onError?.(err.message || 'Google sign-in failed');
      }
    };

    const init = () => {
      if (!(window as any).google || !ref.current) return;
      (window as any).google.accounts.id.initialize({ client_id: clientId, callback: handleCredential });
      (window as any).google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', width: 320, text: 'continue_with' });
      setReady(true);
    };

    if ((window as any).google) { init(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = init;
    document.head.appendChild(script);
    return () => { script.onload = null; };
  }, [clientId]);

  if (!clientId) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
        <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>or</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
      </div>
      <div ref={ref} style={{ minHeight: ready ? undefined : 40 }} />
    </div>
  );
}
