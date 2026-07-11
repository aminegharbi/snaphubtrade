'use client';
import { useState, useEffect } from 'react';
import {
  Globe2, RefreshCw, Database, Radio, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, XCircle, Users, Ship, Clock, Target, Zap, Search,
} from 'lucide-react';
import { api } from '@/lib/api';
import { usePriceFormatter } from '@/components/common/Price';

type Overview = {
  kpis: { total_units_tracked: number; flow_records: number; routes: number; country_profiles: number; forecasts: number; active_opportunities: number; dealers_with_access: number };
  map_flows: { country: string; country_name: string; region: string; units: number; avg_price_aed: number; growth_pct: number; risk_score: number }[];
  flows_by_region: { region: string; units: number }[];
  sources: { id: string; name: string; kind: string; status: string; last_sync_at: string | null }[];
  recent_runs: { id: string; trigger: string; status: string; flows_added: number; forecasts_built: number; opportunities_built: number; started_at: string; finished_at: string | null; log: string | null }[];
};

type Opportunity = { id: string; dest_country: string; make: string | null; model: string | null; headline: string; rationale: string | null; profitability_score: number; risk_score: number; competition_score: number; est_margin_pct: number | null };

type DealerAccessRow = { id: string; company_name: string; verified: boolean; gti_enabled: boolean };

const TABS = [
  { key: 'map', label: '🌍 World Map', icon: Globe2 },
  { key: 'sources', label: 'Data Lake Monitor', icon: Database },
  { key: 'opportunities', label: 'AI Opportunities', icon: Zap },
  { key: 'access', label: 'Dealer Access', icon: Users },
] as const;

export default function AdminGlobalTradePage() {
  const formatPrice = usePriceFormatter();
  const [tab, setTab] = useState<typeof TABS[number]['key']>('map');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [dealers, setDealers] = useState<DealerAccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      const [ov, opp, dl] = await Promise.all([
        api.get<Overview>('/global-trade/admin/overview'),
        api.get<Opportunity[]>('/global-trade/admin/opportunities'),
        api.get<DealerAccessRow[]>('/global-trade/admin/dealer-access'),
      ]);
      setOverview(ov); setOpportunities(opp); setDealers(dl);
    } catch (e: any) { setNotice(e.message || 'Failed to load Global Trade Intelligence data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const runSync = async () => {
    setSyncing(true);
    try {
      await api.post('/global-trade/admin/sync', {});
      setNotice('Sync completed — AI layer recomputed.');
      await load();
    } catch (e: any) { setNotice(e.message || 'Sync failed'); }
    finally { setSyncing(false); }
  };

  const toggleDealer = async (dealerId: string, enabled: boolean) => {
    setDealers(ds => ds.map(d => d.id === dealerId ? { ...d, gti_enabled: enabled } : d));
    try { await api.post(`/global-trade/admin/dealer-access/${dealerId}`, { enabled }); }
    catch (e: any) { setNotice(e.message || 'Failed to update access'); load(); }
  };

  const filteredDealers = dealers.filter(d => d.company_name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center' }}><RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', color: '#9CA3AF' }} /></div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe2 size={20} style={{ color: '#0E7490' }} /> Global Trade Intelligence
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0' }}>Worldwide GCC automotive export data lake — flows, routes, AI forecasts and opportunities.</p>
        </div>
        <button onClick={runSync} disabled={syncing}
          style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: syncing ? '#9CA3AF' : '#0E7490', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: syncing ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={14} style={syncing ? { animation: 'spin 1s linear infinite' } : {}} /> {syncing ? 'Syncing…' : 'Run sync now'}
        </button>
      </div>

      {notice && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#ECFEFF', color: '#0E7490', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>{notice}</span>
          <button onClick={() => setNotice('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0E7490' }}>✕</button>
        </div>
      )}

      {/* Global KPIs */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Units tracked (24mo)', value: overview.kpis.total_units_tracked.toLocaleString(), color: '#0E7490' },
            { label: 'Countries covered', value: overview.kpis.country_profiles, color: '#111827' },
            { label: 'Active routes', value: overview.kpis.routes, color: '#111827' },
            { label: 'AI forecasts', value: overview.kpis.forecasts, color: '#7C3AED' },
            { label: 'Live opportunities', value: overview.kpis.active_opportunities, color: '#059669' },
            { label: 'Dealers with access', value: overview.kpis.dealers_with_access, color: '#C1272D' },
          ].map(k => (
            <div key={k.label} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: '1.3rem', fontWeight: 800, color: k.color, margin: 0 }}>{k.value}</p>
              <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: '2px 0 0' }}>{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: `1.5px solid ${tab === t.key ? '#0E7490' : '#E5E7EB'}`, background: tab === t.key ? '#ECFEFF' : 'white', color: tab === t.key ? '#0E7490' : '#6B7280', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* World Map tab (table-based — sortable by volume) */}
      {tab === 'map' && overview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 700, color: '#111827', margin: 0 }}>Export flows by destination</p>
                <p style={{ fontSize: '0.76rem', color: '#9CA3AF', margin: '2px 0 0' }}>Ranked by tracked units, most recent 24 months</p>
              </div>
            </div>
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              {overview.map_flows.map((f, i) => (
                <div key={f.country} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 20px', borderTop: '1px solid #F9FAFB' }}>
                  <span style={{ width: 24, fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 700 }}>#{i + 1}</span>
                  <div style={{ flex: '1 1 180px' }}>
                    <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.86rem' }}>{f.country_name}</p>
                    <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: 0 }}>{f.region}</p>
                  </div>
                  <div style={{ flex: '0 0 100px', textAlign: 'right' }}>
                    <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.84rem' }}>{f.units.toLocaleString()}</p>
                    <p style={{ fontSize: '0.68rem', color: '#9CA3AF', margin: 0 }}>units</p>
                  </div>
                  <div style={{ flex: '0 0 100px', textAlign: 'right', fontSize: '0.8rem', color: '#374151' }}>{formatPrice(f.avg_price_aed)}</div>
                  <div style={{ flex: '0 0 80px', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', color: f.growth_pct >= 0 ? '#059669' : '#DC2626', fontWeight: 700, fontSize: '0.78rem' }}>
                    {f.growth_pct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {f.growth_pct}%
                  </div>
                  <span style={{ flex: '0 0 70px', textAlign: 'center', padding: '3px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700, background: f.risk_score >= 65 ? '#FEE2E2' : f.risk_score >= 45 ? '#FEF3C7' : '#D1FAE5', color: f.risk_score >= 65 ? '#991B1B' : f.risk_score >= 45 ? '#92400E' : '#065F46' }}>
                    risk {f.risk_score}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {overview.flows_by_region.sort((a, b) => b.units - a.units).map(r => (
              <div key={r.region || 'other'} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px' }}>
                <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>{r.region || 'Other'}</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0E7490', margin: 0 }}>{r.units.toLocaleString()}</p>
                <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: 0 }}>units tracked</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Lake Monitor */}
      {tab === 'sources' && overview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6' }}>
              <p style={{ fontWeight: 700, color: '#111827', margin: 0 }}>Connected sources</p>
            </div>
            {overview.sources.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderTop: '1px solid #F9FAFB' }}>
                <Radio size={14} style={{ color: s.status === 'active' ? '#059669' : '#9CA3AF' }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: '#111827', margin: 0, fontSize: '0.85rem' }}>{s.name}</p>
                  <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: 0, textTransform: 'capitalize' }}>{s.kind.replace('_', ' ')}</p>
                </div>
                <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: s.status === 'active' ? '#D1FAE5' : '#F3F4F6', color: s.status === 'active' ? '#065F46' : '#6B7280', textTransform: 'capitalize' }}>{s.status}</span>
                <span style={{ fontSize: '0.72rem', color: '#9CA3AF', minWidth: 130, textAlign: 'right' }}>
                  {s.last_sync_at ? `Synced ${new Date(s.last_sync_at).toLocaleDateString()}` : 'Never synced'}
                </span>
              </div>
            ))}
          </div>

          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6' }}>
              <p style={{ fontWeight: 700, color: '#111827', margin: 0 }}>Sync history</p>
            </div>
            {overview.recent_runs.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderTop: '1px solid #F9FAFB' }}>
                {r.status === 'completed' ? <CheckCircle2 size={14} style={{ color: '#059669' }} /> : r.status === 'failed' ? <XCircle size={14} style={{ color: '#DC2626' }} /> : <RefreshCw size={14} style={{ color: '#9CA3AF' }} />}
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: '#111827', margin: 0, fontSize: '0.84rem', textTransform: 'capitalize' }}>{r.trigger} sync</p>
                  <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: 0 }}>{r.log || '—'}</p>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#374151' }}>{r.forecasts_built} forecasts · {r.opportunities_built} opportunities</span>
                <span style={{ fontSize: '0.72rem', color: '#9CA3AF', minWidth: 90, textAlign: 'right' }}>{new Date(r.started_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Opportunities */}
      {tab === 'opportunities' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {opportunities.map(o => (
            <div key={o.id} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, padding: '16px' }}>
              <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 6px', fontSize: '0.9rem' }}>{o.headline}</p>
              <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '0 0 10px', lineHeight: 1.4 }}>{o.rationale}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', padding: '3px 9px', borderRadius: 20, background: '#D1FAE5', color: '#065F46', fontWeight: 700 }}>Profit {o.profitability_score}</span>
                <span style={{ fontSize: '0.7rem', padding: '3px 9px', borderRadius: 20, background: '#FEF3C7', color: '#92400E', fontWeight: 700 }}>Risk {o.risk_score}</span>
                <span style={{ fontSize: '0.7rem', padding: '3px 9px', borderRadius: 20, background: '#DBEAFE', color: '#1E40AF', fontWeight: 700 }}>Comp {o.competition_score}</span>
                {o.est_margin_pct != null && <span style={{ fontSize: '0.7rem', padding: '3px 9px', borderRadius: 20, background: '#ECFEFF', color: '#0E7490', fontWeight: 700 }}>~{o.est_margin_pct}% margin</span>}
              </div>
            </div>
          ))}
          {!opportunities.length && <p style={{ color: '#9CA3AF' }}>No active opportunities — run a sync to recompute the AI layer.</p>}
        </div>
      )}

      {/* Dealer Access */}
      {tab === 'access' && (
        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6' }}>
            <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>Premium feature access — Global Trade Intelligence tab</p>
            <div style={{ position: 'relative', maxWidth: 320 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search dealer…" className="input-white" style={{ paddingLeft: 32, fontSize: '0.82rem' }} />
            </div>
          </div>
          <div style={{ maxHeight: 560, overflowY: 'auto' }}>
            {filteredDealers.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderTop: '1px solid #F9FAFB' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: '#111827', margin: 0, fontSize: '0.85rem' }}>{d.company_name}</p>
                </div>
                {d.verified && <CheckCircle2 size={13} style={{ color: '#059669' }} />}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.76rem', color: d.gti_enabled ? '#0E7490' : '#9CA3AF', fontWeight: 600 }}>{d.gti_enabled ? 'Enabled' : 'Disabled'}</span>
                  <div onClick={() => toggleDealer(d.id, !d.gti_enabled)}
                    style={{ width: 40, height: 22, borderRadius: 20, background: d.gti_enabled ? '#0E7490' : '#E5E7EB', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: d.gti_enabled ? 20 : 2, transition: 'left 0.2s' }} />
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
