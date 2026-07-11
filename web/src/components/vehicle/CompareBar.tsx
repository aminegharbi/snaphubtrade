'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Scale, X } from 'lucide-react';

// Reflects the same 'compare_ids' localStorage list that VehicleCard's
// compare toggle writes to — lets someone pick 2-3 vehicles while browsing
// and jump into /compare with them all pre-loaded, instead of having to
// remember and re-search each one manually on the compare page itself.
export function CompareBar() {
  const pathname = usePathname() || '';
  const [ids, setIds] = useState<string[]>([]);

  const refresh = () => {
    try { setIds(JSON.parse(localStorage.getItem('compare_ids') || '[]')); }
    catch { setIds([]); }
  };

  useEffect(() => {
    refresh();
    window.addEventListener('compare-list-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('compare-list-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const clear = () => {
    localStorage.removeItem('compare_ids');
    setIds([]);
  };

  if (!ids.length || pathname.startsWith('/compare')) return null;

  return (
    <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 60, display: 'flex', alignItems: 'center', gap: 10, background: '#111827', borderRadius: 999, padding: '9px 10px 9px 18px', boxShadow: '0 12px 32px rgba(0,0,0,0.25)' }}>
      <Scale size={15} style={{ color: '#A78BFA' }} />
      <span style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600 }}>
        {ids.length} vehicle{ids.length > 1 ? 's' : ''} to compare
      </span>
      <a href={`/compare?ids=${ids.join(',')}`}
        style={{ padding: '7px 16px', background: '#C1272D', color: 'white', borderRadius: 999, fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' }}>
        Compare →
      </a>
      <button onClick={clear} title="Clear"
        style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <X size={13} />
      </button>
    </div>
  );
}
