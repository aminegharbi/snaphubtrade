/**
 * useFeatureFlags — Shared hook for frontend feature gating
 * 
 * Fetches all enabled flags once on mount, caches for 60s.
 * Usage:
 *   const { isEnabled, loading } = useFeatureFlags();
 *   if (!isEnabled('smart_scan')) return null;
 */
'use client';
import { useState, useEffect, useCallback } from 'react';

type FlagMap = Record<string, {
  enabled: boolean;
  rollout_pct: number;
  target_plans: string[];
  target_roles: string[];
}>;

let cache: FlagMap | null = null;
let cacheTs = 0;
const CACHE_TTL = 60_000; // 60 seconds

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FlagMap>(cache || {});
  const [loading, setLoading] = useState(!cache);

  const load = useCallback(async (force = false) => {
    if (!force && cache && Date.now() - cacheTs < CACHE_TTL) {
      setFlags(cache);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/v1/feature-flags/public');
      if (res.ok) {
        const data: FlagMap = await res.json();
        cache = data;
        cacheTs = Date.now();
        setFlags(data);
      }
    } catch { /* use cache or defaults */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isEnabled = useCallback((key: string, context?: { plan?: string; role?: string }) => {
    const f = flags[key];
    if (!f || !f.enabled) return false;
    if (context?.plan && f.target_plans.length > 0 && !f.target_plans.includes(context.plan)) return false;
    if (context?.role && f.target_roles.length > 0 && !f.target_roles.includes(context.role)) return false;
    // Rollout %: deterministic by localStorage userId if present
    if (f.rollout_pct < 100) {
      try {
        const uid = typeof window !== 'undefined' ? localStorage.getItem('user_id') || '' : '';
        const hash = uid.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 100;
        if (hash >= f.rollout_pct) return false;
      } catch { /* skip rollout check */ }
    }
    return true;
  }, [flags]);

  return { flags, isEnabled, loading, refresh: () => load(true) };
}

// Static check (no hook) for server components
export async function checkFlag(key: string): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://api:3001/api/v1'}/feature-flags/public`);
    const data: FlagMap = await res.json();
    return data[key]?.enabled ?? false;
  } catch { return false; }
}
