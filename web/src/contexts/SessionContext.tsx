'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export type ProfileType = 'broker' | 'dealer' | 'buyer' | 'admin' | 'guest';

export interface SessionProfile {
  profile_type: ProfileType;
  profile_id: string | null;
  display_name: string;
  email: string | null;
  avatar_label: string;
  dealer_id?: string | null;
  broker_id?: string | null;
  affiliate_code?: string | null;
}

interface SessionContextValue {
  profile: SessionProfile;
  sessionToken: string | null;
  loading: boolean;
  signIn: (profile: Omit<SessionProfile, 'avatar_label'> & { access_token?: string | null }) => void;
  signOut: () => void;
}

const GUEST_PROFILE: SessionProfile = {
  profile_type: 'guest', profile_id: null, display_name: 'Guest', email: null, avatar_label: 'G',
};

const SessionContext = createContext<SessionContextValue>({
  profile: GUEST_PROFILE, sessionToken: null, loading: true,
  signIn: () => {}, signOut: () => {},
});

export function useSession() {
  return useContext(SessionContext);
}

const HEARTBEAT_MS = 30_000;

// Patches window.fetch exactly once so every existing call site in the app
// (there are ~40 spread across pages/components) automatically sends the
// JWT the backend now requires, without having to rewrite each call.
// Only same-origin /api/v1/* requests are touched; external requests are untouched.
let fetchPatched = false;
function ensureAuthFetchPatched() {
  if (fetchPatched || typeof window === 'undefined') return;
  fetchPatched = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const isApiCall = url.includes('/api/v1/');
    if (isApiCall) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const headers = new Headers(init.headers || (typeof input !== 'string' && !(input instanceof URL) ? (input as Request).headers : undefined));
        if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
        init = { ...init, headers };
      }
    }
    return originalFetch(input, init);
  };
}

function resolveLocalProfile(): SessionProfile {
  if (typeof window === 'undefined') return GUEST_PROFILE;

  const brokerId = localStorage.getItem('broker_id');
  const dealerId = localStorage.getItem('dealer_id');
  const userName = localStorage.getItem('user_name');
  const userEmail = localStorage.getItem('user_email');
  const isAdmin = localStorage.getItem('is_admin') === 'true';

  if (isAdmin) {
    return { profile_type: 'admin', profile_id: null, display_name: userName || 'Admin', email: userEmail, avatar_label: 'A' };
  }
  if (brokerId) {
    return {
      profile_type: 'broker', profile_id: brokerId, display_name: userName || 'Broker', email: userEmail,
      broker_id: brokerId, affiliate_code: localStorage.getItem('affiliate_code'),
      avatar_label: (userName || 'B').charAt(0).toUpperCase(),
    };
  }
  if (dealerId) {
    return {
      profile_type: 'dealer', profile_id: dealerId, display_name: userName || 'Dealer', email: userEmail,
      dealer_id: dealerId, avatar_label: (userName || 'D').charAt(0).toUpperCase(),
    };
  }
  if (userName) {
    return { profile_type: 'buyer', profile_id: null, display_name: userName, email: userEmail, avatar_label: userName.charAt(0).toUpperCase() };
  }
  return GUEST_PROFILE;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  ensureAuthFetchPatched();
  const [profile, setProfile] = useState<SessionProfile>(GUEST_PROFILE);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const openSession = useCallback(async (p: SessionProfile, page?: string) => {
    if (p.profile_type === 'guest') { setLoading(false); return; }
    try {
      const existingToken = localStorage.getItem('session_token') || undefined;
      const res = await fetch('/api/v1/sessions/open', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_token: existingToken,
          profile_type: p.profile_type, profile_id: p.profile_id,
          display_name: p.display_name, email: p.email, current_page: page,
        }),
      });
      const data = await res.json();
      if (data?.session_token) {
        localStorage.setItem('session_token', data.session_token);
        setSessionToken(data.session_token);
      }
    } catch { /* presence is best-effort, never block the UI on it */ }
    finally { setLoading(false); }
  }, []);

  // Resolve profile from localStorage on mount AND on every route change —
  // covers demo-mode dashboards that write dealer_id/broker_id to localStorage
  // lazily (after their own data load) rather than through the login flow.
  useEffect(() => {
    const p = resolveLocalProfile();
    setProfile(prev => {
      if (prev.profile_type === p.profile_type && prev.profile_id === p.profile_id) return prev;
      return p;
    });
    if (p.profile_type !== 'guest' && !localStorage.getItem('session_token')) {
      openSession(p, pathname || undefined);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Heartbeat loop
  useEffect(() => {
    if (profile.profile_type === 'guest') return;
    const token = localStorage.getItem('session_token');
    if (!token) return;

    const beat = () => {
      fetch('/api/v1/sessions/heartbeat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: token, current_page: pathname }),
      }).catch(() => {});
    };
    beat();
    heartbeatRef.current = setInterval(beat, HEARTBEAT_MS);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [profile.profile_type, pathname]);

  const signIn = useCallback((p: Omit<SessionProfile, 'avatar_label'> & { access_token?: string | null }) => {
    const { access_token, ...profileFields } = p;
    const full: SessionProfile = { ...profileFields, avatar_label: (p.display_name || '?').charAt(0).toUpperCase() };
    setProfile(full);
    if (access_token) localStorage.setItem('auth_token', access_token);
    if (p.profile_type === 'broker' && p.profile_id) localStorage.setItem('broker_id', p.profile_id);
    if (p.profile_type === 'dealer' && p.profile_id) localStorage.setItem('dealer_id', p.profile_id);
    if (p.profile_type === 'admin') localStorage.setItem('is_admin', 'true');
    if (p.display_name) localStorage.setItem('user_name', p.display_name);
    if (p.email) localStorage.setItem('user_email', p.email);
    if (p.affiliate_code) localStorage.setItem('affiliate_code', p.affiliate_code);
    openSession(full, pathname || undefined);
  }, [openSession, pathname]);

  const signOut = useCallback(() => {
    const token = localStorage.getItem('session_token');
    if (token) fetch('/api/v1/sessions/close', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_token: token }),
    }).catch(() => {});
    ['broker_id', 'dealer_id', 'is_admin', 'user_name', 'user_email', 'affiliate_code', 'session_token', 'auth_token'].forEach(k => localStorage.removeItem(k));
    setProfile(GUEST_PROFILE);
    setSessionToken(null);
  }, []);

  return (
    <SessionContext.Provider value={{ profile, sessionToken, loading, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}
