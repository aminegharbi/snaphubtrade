'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { Save, RefreshCw, Settings, Sliders, Globe, DollarSign } from 'lucide-react';
import { api } from '@/lib/api';

export default function ValuationAdminPage() {
  const [config, setConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { api.get('/valuations/config').then(setConfig).catch(() => {}); }, []);
  const set = (k: string, v: any) => setConfig((c: any) => ({ ...c, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/valuations/config', config);
      setToast('✓ Configuration saved');
      setTimeout(() => setToast(''), 3000);
    } catch { setToast('Error saving'); }
    finally { setSaving(false); }
  };

  if (!config) return <div style={{ padding: 48, textAlign: 'center', color: '#9CA3AF' }}><RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto' }} /><style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style></div>;

  const sl = (key: string, label: string, min: number, max: number, step: number, pct = false) => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>{label}</label>
        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#C1272D' }}>{pct ? `${(Number(config[key]) * 100).toFixed(0)}%` : config[key]}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={Number(config[key])}
        onChange={e => set(key, pct ? +e.target.value / 100 : +e.target.value)}
        style={{ width: '100%', accentColor: '#C1272D' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: 24 }}>
      {toast && <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 50, background: '#111827', color: 'white', padding: '10px 18px', borderRadius: 12, fontSize: '0.875rem', fontWeight: 500 }}>{toast}</div>}
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#111827', margin: '0 0 4px' }}>⚙️ Valuation Engine Config</h1>
            <p style={{ color: '#6B7280', margin: 0, fontSize: '0.875rem' }}>Control how AI market valuations are calculated</p>
          </div>
          <button onClick={save} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#C1272D', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700 }}>
            {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />} Save
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { title: '⚖️ Weight Factors', desc: 'How each factor influences the valuation (must sum ≈ 100%)', content: () => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {sl('weight_comparable_sales', 'Comparable sales (Dubizzle/DubiCars)', 0, 100, 5, true)}
                {sl('weight_market_demand', 'Market demand score', 0, 100, 5, true)}
                {sl('weight_mileage', 'Mileage adjustment', 0, 100, 5, true)}
                {sl('weight_year', 'Vehicle age / year', 0, 100, 5, true)}
                {sl('weight_condition', 'Condition estimate', 0, 100, 5, true)}
              </div>
            )},
            { title: '📉 Depreciation Rates', desc: 'Annual value loss by vehicle age', content: () => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {sl('depreciation_year1', 'Year 1 depreciation', 0, 100, 1, true)}
                {sl('depreciation_year2', 'Year 2 depreciation', 0, 100, 1, true)}
                {sl('depreciation_year3', 'Year 3 depreciation', 0, 100, 1, true)}
                {sl('depreciation_year4plus', 'Year 4+ depreciation (per year)', 0, 100, 1, true)}
              </div>
            )},
            { title: '🏷️ Deal Rating Thresholds', desc: 'When to show "Excellent Deal", "Fair Price" etc.', content: () => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {sl('excellent_deal_below', '🔥 Excellent Deal — below X% of market', 50, 100, 1, true)}
                {sl('good_deal_below', '✅ Good Deal — below X% of market', 50, 100, 1, true)}
                {sl('fair_price_below', '⚖️ Fair Price — below X% of market', 80, 130, 1, true)}
                {sl('above_market_below', '⚠️ Above Market — below X% of market', 100, 150, 1, true)}
              </div>
            )},
            { title: '🛣️ Mileage Penalty', desc: 'How mileage above baseline reduces value', content: () => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {sl('mileage_baseline_km', 'Baseline KM per year', 5000, 30000, 1000)}
                {sl('mileage_penalty_pct', 'Penalty per 10,000 km above baseline', 0, 100, 1, true)}
              </div>
            )},
          ].map(section => (
            <div key={section.title} style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
                <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>{section.title}</p>
                <p style={{ fontSize: '0.78rem', color: '#9CA3AF', margin: 0 }}>{section.desc}</p>
              </div>
              <div style={{ padding: '16px 18px' }}>{section.content()}</div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
