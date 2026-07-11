'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

export function CurrencySelector({ compact = false, theme = 'dark' }: { compact?: boolean; theme?: 'dark' | 'light' }) {
  const { currency, setCurrency, supported, ratesLoading } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const current = supported.find(c => c.code === currency) || supported[0];
  const isLight = theme === 'light';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={ratesLoading}
        title={ratesLoading ? 'Loading exchange rates…' : 'Change display currency'}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: compact ? '5px 9px' : '7px 12px',
          borderRadius: 9,
          border: isLight ? '1px solid #E5E7EB' : '1px solid rgba(255,255,255,0.12)',
          background: isLight ? 'white' : 'rgba(255,255,255,0.04)',
          color: isLight ? '#374151' : 'white',
          fontSize: compact ? '0.78rem' : '0.85rem', fontWeight: 600,
          cursor: ratesLoading ? 'default' : 'pointer', opacity: ratesLoading ? 0.6 : 1,
        }}
      >
        <span>{current?.flag}</span>
        <span>{current?.code}</span>
        <ChevronDown size={13} style={{ opacity: 0.6, transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, zIndex: 200,
          background: isLight ? 'white' : '#16161f',
          border: isLight ? '1px solid #E5E7EB' : '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, minWidth: 190, padding: 6,
          boxShadow: isLight ? '0 12px 32px rgba(0,0,0,0.12)' : '0 12px 32px rgba(0,0,0,0.4)',
        }}>
          {supported.map(c => (
            <button
              key={c.code}
              onClick={() => { setCurrency(c.code); setOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 10px', borderRadius: 8, border: 'none',
                background: c.code === currency ? 'rgba(193,39,45,0.12)' : 'transparent',
                color: c.code === currency ? '#C1272D' : (isLight ? '#374151' : 'rgba(255,255,255,0.75)'),
                fontSize: '0.83rem', fontWeight: c.code === currency ? 700 : 500,
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={(e) => { if (c.code !== currency) e.currentTarget.style.background = isLight ? '#F9FAFB' : 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={(e) => { if (c.code !== currency) e.currentTarget.style.background = 'transparent'; }}
            >
              <span>{c.flag}</span>
              <span style={{ flex: 1 }}>{c.name}</span>
              <span style={{ opacity: 0.5, fontSize: '0.75rem' }}>{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
