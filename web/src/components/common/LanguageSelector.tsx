'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';

export function LanguageSelector({ compact = false, theme = 'dark', anchor = 'right' }: { compact?: boolean; theme?: 'dark' | 'light'; anchor?: 'left' | 'right' }) {
  const { locale, setLocale, supported } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const current = supported.find(l => l.code === locale) || supported[0];
  const isLight = theme === 'light';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Change language / تغيير اللغة"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: compact ? '5px 9px' : '7px 12px',
          borderRadius: 9,
          border: isLight ? '1px solid #E5E7EB' : '1px solid rgba(255,255,255,0.12)',
          background: isLight ? 'white' : 'rgba(255,255,255,0.04)',
          color: isLight ? '#374151' : 'white',
          fontSize: compact ? '0.78rem' : '0.85rem', fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <span>{current?.flag}</span>
        <span>{current?.code.toUpperCase()}</span>
        <ChevronDown size={13} style={{ opacity: 0.6, transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', [anchor === 'left' ? 'insetInlineStart' : 'insetInlineEnd']: 0, zIndex: 200,
          background: isLight ? 'white' : '#16161f',
          border: isLight ? '1px solid #E5E7EB' : '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, minWidth: 160, padding: 6,
          boxShadow: isLight ? '0 12px 32px rgba(0,0,0,0.12)' : '0 12px 32px rgba(0,0,0,0.4)',
        }}>
          {supported.map(l => (
            <button
              key={l.code}
              onClick={() => { setLocale(l.code); setOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 10px', borderRadius: 8, border: 'none',
                background: l.code === locale ? 'rgba(193,39,45,0.12)' : 'transparent',
                color: isLight ? '#111827' : 'white',
                fontSize: '0.85rem', fontWeight: l.code === locale ? 700 : 500,
                cursor: 'pointer', textAlign: 'start',
              }}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
