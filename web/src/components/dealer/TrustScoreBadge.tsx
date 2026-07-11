'use client';
import { useState, useEffect } from 'react';
import { Shield, Info, X } from 'lucide-react';

interface TrustScore {
  score: number; label: string; color: string;
  breakdown: Record<string, number>;
  verified: boolean; rating: number; review_count: number;
}

const FACTOR_LABELS: Record<string, string> = {
  verified: '✅ Verified status',
  rating: '⭐ Customer rating',
  reviews: '💬 Review count',
  freshness: '🆕 Inventory freshness',
  account_age: '📅 Account age (2+ years)',
  broker_activity: '🤝 Broker partnerships',
  activity: '📈 Listing activity',
};

export function TrustScoreBadge({ dealerId, size = 'md' }: { dealerId: string; size?: 'sm' | 'md' | 'lg' }) {
  const [data, setData] = useState<TrustScore | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/dealers/${dealerId}/trust-score`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.message) setData(d); })
      .catch(() => {});
  }, [dealerId]);

  if (!data) return null;

  const dims = size === 'sm' ? { ring: 28, font: '0.62rem', label: '0.6rem' } : size === 'lg' ? { ring: 56, font: '1rem', label: '0.72rem' } : { ring: 40, font: '0.78rem', label: '0.66rem' };
  const r = (dims.ring - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = ((100 - data.score) / 100) * circ;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setShowDetail(!showDetail)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <svg width={dims.ring} height={dims.ring} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={dims.ring/2} cy={dims.ring/2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={4} />
          <circle cx={dims.ring/2} cy={dims.ring/2} r={r} fill="none" stroke={data.color} strokeWidth={4}
            strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s' }} />
          <text x={dims.ring/2} y={dims.ring/2 + 4} textAnchor="middle" fill="#111827" fontSize={dims.font.replace('rem','')} fontWeight="800"
            style={{ transform: 'rotate(90deg)', transformOrigin: `${dims.ring/2}px ${dims.ring/2}px`, fontSize: dims.font }}>{data.score}</text>
        </svg>
        {size !== 'sm' && (
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontWeight: 700, color: data.color, margin: 0, fontSize: dims.font }}>{data.label}</p>
            <p style={{ color: '#9CA3AF', margin: 0, fontSize: dims.label }}>Trust Score</p>
          </div>
        )}
      </button>

      {showDetail && (
        <>
          <div onClick={() => setShowDetail(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 50, background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', boxShadow: '0 12px 32px rgba(0,0,0,0.15)', padding: 16, width: 260 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.875rem' }}>Trust Score breakdown</p>
              <button onClick={() => setShowDetail(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={13} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(data.breakdown).filter(([,v]) => v > 0).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: '#6B7280' }}>{FACTOR_LABELS[key] || key}</span>
                  <span style={{ fontWeight: 700, color: '#007A3D' }}>+{val}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>Total Score</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 900, color: data.color }}>{data.score}/100</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
