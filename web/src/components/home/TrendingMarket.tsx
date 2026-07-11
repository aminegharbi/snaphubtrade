'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, Eye, Heart, Sparkles, TrendingDown, DollarSign, RefreshCw } from 'lucide-react';
import { VehicleCard } from '@/components/vehicle/VehicleCard';

const TABS = [
  { key: 'most_viewed',     label: '🔥 Most Viewed',    icon: Eye },
  { key: 'fastest_selling', label: '⚡ Fastest Selling',  icon: TrendingUp },
  { key: 'most_saved',      label: '❤️ Most Saved',      icon: Heart },
  { key: 'newest_inventory',label: '🆕 Newest',          icon: Sparkles },
  { key: 'price_drops',     label: '📉 Price Drops',     icon: TrendingDown },
  { key: 'most_expensive',  label: '💎 Most Expensive',  icon: DollarSign },
];

export function TrendingMarket() {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState('most_viewed');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/trending')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const items = data?.[tab] || [];

  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '1.4rem', color: '#111827', margin: '0 0 4px' }}>📊 Trending in UAE Market</h2>
          <p style={{ color: '#6B7280', margin: 0, fontSize: '0.875rem' }}>Real-time insights updated automatically</p>
        </div>
        <Link href="/marketplace" style={{ color: '#C1272D', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>View all →</Link>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${tab === t.key ? '#C1272D' : '#E5E7EB'}`, background: tab === t.key ? '#FFF1F2' : 'white', color: tab === t.key ? '#C1272D' : '#6B7280', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><RefreshCw size={20} style={{ color: '#9CA3AF', animation: 'spin 1s linear infinite' }} /></div>
      ) : items.length === 0 ? (
        <p style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>No data available for this category yet</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {items.slice(0, 6).map((v: any) => (
            <div key={v.id} style={{ position: 'relative' }}>
              {tab === 'price_drops' && v.drop_pct && (
                <div style={{ position: 'absolute', top: -8, right: -8, zIndex: 5, background: '#C1272D', color: 'white', borderRadius: 20, padding: '3px 10px', fontSize: '0.7rem', fontWeight: 800, boxShadow: '0 2px 8px rgba(193,39,45,0.4)' }}>
                  -{v.drop_pct}%
                </div>
              )}
              <VehicleCard vehicle={v} />
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </section>
  );
}
