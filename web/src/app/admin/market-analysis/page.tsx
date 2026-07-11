'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Save, Plus, Trash2, Zap, CheckCircle2, XCircle, Clock,
  AlertTriangle, Globe, Database, History, Play, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { usePriceFormatter } from '@/components/common/Price';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TrackedModel { make: string; model: string; year_range: [number, number]; }

interface Config {
  enabled: boolean;
  sources: string[];
  auto_refresh_enabled: boolean;
  refresh_interval_hours: number;
  min_confidence_pct: number;
  tracked_models: TrackedModel[];
  last_refreshed_at: string | null;
  last_refresh_status: string;
  last_refresh_summary: string | null;
  ai_model: string;
}

interface Benchmark {
  id: string; make: string; model: string; year: number; source: string;
  avg_price_aed: string; listing_count: number; demand_level: string;
  trend_pct: string; confidence_pct: number; fetched_at: string; expires_at: string;
}

interface Run {
  id: string; triggered_by: string; status: string;
  models_requested: number; models_updated: number; models_failed: number;
  summary: string | null; started_at: string; completed_at: string | null;
}

const SOURCES = [
  { key: 'dubizzle', label: 'Dubizzle UAE', color: '#C1272D' },
  { key: 'dubicars',  label: 'DubiCars UAE', color: '#1E40AF' },
];

const STATUS_CFG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  success: { color: '#065F46', bg: '#D1FAE5', icon: CheckCircle2, label: 'Success' },
  partial: { color: '#92400E', bg: '#FEF3C7', icon: AlertTriangle, label: 'Partial' },
  failed:  { color: '#991B1B', bg: '#FEE2E2', icon: XCircle, label: 'Failed' },
  running: { color: '#1E40AF', bg: '#DBEAFE', icon: RefreshCw, label: 'Running' },
  never_run: { color: '#6B7280', bg: '#F3F4F6', icon: Clock, label: 'Never run' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MarketAnalysisAdminPage() {
  const formatPrice = usePriceFormatter();
  const [config, setConfig]       = useState<Config | null>(null);
  const [stats, setStats]         = useState<any>(null);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [runs, setRuns]           = useState<Run[]>([]);
  const [saving, setSaving]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast]         = useState('');
  const [newModel, setNewModel]   = useState({ make: '', model: '', year_min: 2023, year_max: 2025 });
  const [tab, setTab]             = useState<'config' | 'data' | 'history' | 'lake'>('config');

  // ── Market Data Lake state ──
  const [lake, setLake]           = useState<any>(null);
  const [lakeCfg, setLakeCfg]     = useState<any>(null);
  const [jobs, setJobs]           = useState<any[]>([]);
  const [syncing, setSyncing]     = useState(false);

  const loadLake = useCallback(async () => {
    const [ov, lc, jb] = await Promise.all([
      api.get<any>('/market-lake/overview').catch(() => null),
      api.get<any>('/market-lake/admin/config').catch(() => null),
      api.get<any[]>('/market-lake/jobs?limit=10').catch(() => []),
    ]);
    if (ov) setLake(ov);
    if (lc) setLakeCfg(lc);
    setJobs(Array.isArray(jb) ? jb : []);
    // Reflect a job in progress after page reloads
    if (Array.isArray(jb) && jb.some((j: any) => ['queued', 'running'].includes(j.status))) setSyncing(true);
    else setSyncing(false);
  }, []);

  const load = useCallback(async () => {
    const [c, s, b, r] = await Promise.all([
      api.get<Config>('/market-analysis/config').catch(() => null),
      api.get<any>('/market-analysis/stats').catch(() => null),
      api.get<Benchmark[]>('/market-analysis/benchmarks').catch(() => []),
      api.get<Run[]>('/market-analysis/runs?limit=15').catch(() => []),
    ]);
    if (c) setConfig(c);
    if (s) setStats(s);
    setBenchmarks(b || []);
    setRuns(r || []);
    await loadLake();
  }, [loadLake]);

  useEffect(() => { load(); }, [load]);

  // Poll job status while a Market Sync is queued/running so the admin sees
  // live progress without refreshing the page.
  useEffect(() => {
    if (!syncing) return;
    const t = setInterval(() => loadLake(), 5000);
    return () => clearInterval(t);
  }, [syncing, loadLake]);

  const launchMarketSync = async () => {
    try {
      await api.post('/market-lake/sync', {});
      setSyncing(true);
      showToast('🗄️ Market Sync queued — benchmarks + Data Lake ingestion + AI recalculation. Runs in background (2-5 min).');
      await loadLake();
    } catch (e: any) { showToast(e.message || 'Failed to queue Market Sync'); }
  };

  const saveLakeConfig = async () => {
    if (!lakeCfg) return;
    try {
      const updated = await api.put<any>('/market-lake/admin/config', {
        providers: lakeCfg.providers,
        retention_days: Number(lakeCfg.retention_days),
        delist_after_days: Number(lakeCfg.delist_after_days),
        match_price_tolerance: Number(lakeCfg.match_price_tolerance),
        sample_listings_per_model: Number(lakeCfg.sample_listings_per_model),
        auto_recalculate: lakeCfg.auto_recalculate,
      });
      setLakeCfg(updated);
      showToast('✓ Data Lake configuration saved');
    } catch (e: any) { showToast(e.message || 'Failed to save Data Lake config'); }
  };

  const toggleProvider = (key: string) => {
    setLakeCfg((c: any) => c ? { ...c, providers: (c.providers || []).map((p: any) => p.key === key ? { ...p, enabled: !p.enabled } : p) } : c);
  };


  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const setField = (k: keyof Config, v: any) => setConfig(c => c ? { ...c, [k]: v } : c);

  const toggleSource = (key: string) => {
    if (!config) return;
    const sources = config.sources.includes(key) ? config.sources.filter(s => s !== key) : [...config.sources, key];
    setField('sources', sources);
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.patch('/market-analysis/config', { ...config, actor: 'admin' });
      showToast('✓ Configuration saved');
    } catch { showToast('Error saving configuration'); }
    finally { setSaving(false); }
  };

  const addModel = async () => {
    if (!newModel.make || !newModel.model) { showToast('Enter make and model'); return; }
    try {
      const updated = await api.post<Config>('/market-analysis/config/models', {
        make: newModel.make, model: newModel.model, year_range: [newModel.year_min, newModel.year_max],
      });
      setConfig(updated);
      setNewModel({ make: '', model: '', year_min: 2023, year_max: 2025 });
      showToast('✓ Model added to tracking list');
    } catch (e: any) { showToast(e.message || 'Failed to add model'); }
  };

  const removeModel = async (make: string, model: string) => {
    try {
      const updated = await api.post<Config>('/market-analysis/config/models/remove', { make, model });
      setConfig(updated);
      showToast('Model removed');
    } catch { showToast('Failed to remove model'); }
  };

  const runRefresh = async () => {
    setRefreshing(true);
    showToast('🤖 AI is searching Dubizzle & DubiCars… this can take 1-3 minutes');
    try {
      const result = await api.post<any>('/market-analysis/refresh', { actor: 'admin' });
      showToast(`✓ Refresh complete — ${result.updated} updated, ${result.failed} failed`);
      await load();
    } catch (e: any) { showToast(e.message || 'Refresh failed'); }
    finally { setRefreshing(false); }
  };

  if (!config) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <RefreshCw size={22} style={{ color: '#9CA3AF', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const lastStatusCfg = STATUS_CFG[config.last_refresh_status] || STATUS_CFG.never_run;

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: 24 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 50, background: '#111827', color: 'white', padding: '10px 18px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 500, maxWidth: 380, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#111827', margin: '0 0 4px' }}>🔍 AI Market Analysis</h1>
            <p style={{ color: '#6B7280', margin: 0, fontSize: '0.875rem' }}>
              Live competitor pricing from Dubizzle & DubiCars — fetched and kept current by AI web search
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setConfig(c => c ? { ...c, enabled: !c.enabled } : c)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 12, border: `1.5px solid ${config.enabled ? '#BBF7D0' : '#E5E7EB'}`, background: config.enabled ? '#F0FDF4' : 'white', color: config.enabled ? '#065F46' : '#9CA3AF', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
              {config.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
              {config.enabled ? 'Enabled' : 'Disabled'}
            </button>
            <button onClick={save} disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: '#111827', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
              {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />} Save
            </button>
          </div>
        </div>

        {/* Stats row */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Tracked models', value: stats.tracked_model_count, color: '#374151' },
              { label: 'Live benchmarks', value: stats.total_benchmarks, color: '#1E40AF' },
              { label: 'Fresh data', value: stats.fresh_benchmarks, color: '#065F46' },
              { label: 'Stale (needs refresh)', value: stats.stale_benchmarks, color: stats.stale_benchmarks > 0 ? '#C1272D' : '#9CA3AF' },
              { label: 'Avg AI confidence', value: `${stats.avg_confidence_pct}%`, color: '#8B5CF6' },
            ].map(s => (
              <div key={s.label} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: '12px 14px' }}>
                <p style={{ fontSize: '0.68rem', color: '#9CA3AF', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                <p style={{ fontWeight: 800, fontSize: '1.3rem', color: s.color, margin: 0 }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Refresh action card */}
        <div style={{ background: 'linear-gradient(135deg, #1F2937, #111827)', borderRadius: 16, padding: '20px 24px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: '1.2rem' }}>🤖</span>
              <p style={{ color: 'white', fontWeight: 700, margin: 0, fontSize: '0.95rem' }}>AI Refresh — pulls live prices from Dubizzle & DubiCars</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: lastStatusCfg.bg, color: lastStatusCfg.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                <lastStatusCfg.icon size={11} /> {lastStatusCfg.label}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>
                {config.last_refreshed_at ? `Last run: ${new Date(config.last_refreshed_at).toLocaleString()}` : 'Never run yet'}
              </span>
            </div>
            {config.last_refresh_summary && (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', margin: '6px 0 0' }}>{config.last_refresh_summary}</p>
            )}
          </div>
          <button onClick={runRefresh} disabled={refreshing || !config.enabled}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: refreshing || !config.enabled ? 'rgba(255,255,255,0.1)' : '#C1272D', color: refreshing || !config.enabled ? 'rgba(255,255,255,0.4)' : 'white', border: 'none', borderRadius: 12, cursor: refreshing || !config.enabled ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
            {refreshing ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={16} />}
            {refreshing ? 'Refreshing…' : 'Run AI refresh now'}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid #E5E7EB' }}>
          {[
            { key: 'config', label: '⚙️ Configuration' },
            { key: 'lake', label: `🗄️ Data Lake${lake ? ` (${(lake.listings_tracked||0).toLocaleString()} tracked)` : ''}` },
            { key: 'data', label: `📊 Live Data (${benchmarks.length})` },
            { key: 'history', label: `📋 Run History (${runs.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              style={{ padding: '10px 16px', border: 'none', borderBottom: `2px solid ${tab === t.key ? '#C1272D' : 'transparent'}`, background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: tab === t.key ? '#C1272D' : '#9CA3AF' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Configuration tab ── */}
        {tab === 'config' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Sources */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, padding: 18 }}>
              <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 4px', fontSize: '0.9rem' }}>Data sources</p>
              <p style={{ color: '#9CA3AF', fontSize: '0.78rem', margin: '0 0 14px' }}>Which platforms the AI searches for pricing data</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SOURCES.map(s => (
                  <button key={s.key} onClick={() => toggleSource(s.key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${config.sources.includes(s.key) ? s.color + '40' : '#E5E7EB'}`, background: config.sources.includes(s.key) ? s.color + '0C' : 'white', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${config.sources.includes(s.key) ? s.color : '#D1D5DB'}`, background: config.sources.includes(s.key) ? s.color : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {config.sources.includes(s.key) && <CheckCircle2 size={12} style={{ color: 'white' }} />}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Refresh settings */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, padding: 18 }}>
              <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 14px', fontSize: '0.9rem' }}>Refresh settings</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>Refresh interval (hours)</label>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#C1272D' }}>{config.refresh_interval_hours}h</span>
                  </div>
                  <input type="range" min={1} max={168} step={1} value={config.refresh_interval_hours}
                    onChange={e => setField('refresh_interval_hours', +e.target.value)} style={{ width: '100%', accentColor: '#C1272D' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>Minimum AI confidence to accept data</label>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#C1272D' }}>{config.min_confidence_pct}%</span>
                  </div>
                  <input type="range" min={0} max={100} step={5} value={config.min_confidence_pct}
                    onChange={e => setField('min_confidence_pct', +e.target.value)} style={{ width: '100%', accentColor: '#C1272D' }} />
                  <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: '4px 0 0' }}>AI results below this confidence are discarded, not saved</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={config.auto_refresh_enabled} onChange={e => setField('auto_refresh_enabled', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#C1272D' }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>Auto-refresh on schedule</span>
                </label>
              </div>
            </div>

            {/* Tracked models — full width */}
            <div style={{ gridColumn: '1 / -1', background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, padding: 18 }}>
              <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 4px', fontSize: '0.9rem' }}>Tracked vehicle models</p>
              <p style={{ color: '#9CA3AF', fontSize: '0.78rem', margin: '0 0 14px' }}>The AI fetches Dubizzle/DubiCars pricing only for these make/model/year combinations</p>

              {/* Add model form */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <input value={newModel.make} onChange={e => setNewModel(m => ({ ...m, make: e.target.value }))} placeholder="Make (e.g. Toyota)"
                  style={{ flex: '1 1 140px', padding: '8px 12px', border: '1.5px solid #E5E7EB', borderRadius: 9, fontSize: '0.82rem', outline: 'none' }} />
                <input value={newModel.model} onChange={e => setNewModel(m => ({ ...m, model: e.target.value }))} placeholder="Model (e.g. Land Cruiser)"
                  style={{ flex: '1 1 160px', padding: '8px 12px', border: '1.5px solid #E5E7EB', borderRadius: 9, fontSize: '0.82rem', outline: 'none' }} />
                <input type="number" value={newModel.year_min} onChange={e => setNewModel(m => ({ ...m, year_min: +e.target.value }))} placeholder="Year from"
                  style={{ width: 90, padding: '8px 12px', border: '1.5px solid #E5E7EB', borderRadius: 9, fontSize: '0.82rem', outline: 'none' }} />
                <input type="number" value={newModel.year_max} onChange={e => setNewModel(m => ({ ...m, year_max: +e.target.value }))} placeholder="Year to"
                  style={{ width: 90, padding: '8px 12px', border: '1.5px solid #E5E7EB', borderRadius: 9, fontSize: '0.82rem', outline: 'none' }} />
                <button onClick={addModel} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#111827', color: 'white', border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}>
                  <Plus size={13} /> Add
                </button>
              </div>

              {/* Model list */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {config.tracked_models.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px 6px 12px', borderRadius: 20, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{m.make} {m.model}</span>
                    <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{m.year_range[0]}–{m.year_range[1]}</span>
                    <button onClick={() => removeModel(m.make, m.model)} style={{ width: 20, height: 20, borderRadius: '50%', border: 'none', background: '#FEE2E2', color: '#C1272D', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
                {config.tracked_models.length === 0 && <p style={{ color: '#9CA3AF', fontSize: '0.82rem' }}>No models tracked yet — add one above</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── Live data tab ── */}
        {/* ── DATA LAKE TAB — proprietary historical intelligence engine ── */}
        {tab === 'lake' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Market Sync launcher */}
            <div style={{ background: 'linear-gradient(135deg, #1E1B4B, #312E81)', borderRadius: 16, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <p style={{ color: 'white', fontWeight: 700, margin: '0 0 4px', fontSize: '0.95rem' }}>🗄️ Full Market Sync — benchmarks + Data Lake + AI recalculation</p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', margin: 0 }}>
                  Refreshes live benchmarks, appends historical snapshots, ingests real listings into the Data Lake with intelligent matching (permanent Market Intelligence IDs), then recalculates all AI indicators. Runs as a background job.
                </p>
                {jobs[0] && ['queued','running'].includes(jobs[0].status) && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#C4B5FD', fontSize: '0.74rem', fontWeight: 700 }}>{jobs[0].progress_note || 'Queued…'}</span>
                      <span style={{ color: '#C4B5FD', fontSize: '0.74rem', fontWeight: 700 }}>{jobs[0].progress_pct}%</span>
                    </div>
                    <div style={{ width: 320, maxWidth: '100%', height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${jobs[0].progress_pct}%`, height: '100%', background: '#A78BFA', borderRadius: 3, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                )}
              </div>
              <button onClick={launchMarketSync} disabled={syncing}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: syncing ? 'rgba(255,255,255,0.1)' : '#8B5CF6', color: syncing ? 'rgba(255,255,255,0.4)' : 'white', border: 'none', borderRadius: 12, cursor: syncing ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                {syncing ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Database size={16} />}
                {syncing ? 'Sync in progress…' : 'Launch Market Sync'}
              </button>
            </div>

            {/* Lake overview KPIs */}
            {lake && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                {[
                  { label: 'Vehicles tracked (MI IDs)', value: (lake.listings_tracked||0).toLocaleString(), color: '#7C3AED' },
                  { label: 'Active on market', value: (lake.active_listings||0).toLocaleString(), color: '#1E40AF' },
                  { label: 'Sold / delisted', value: (lake.delisted_listings||0).toLocaleString(), color: '#374151' },
                  { label: 'Observations (append-only)', value: (lake.total_observations||0).toLocaleString(), color: '#007A3D' },
                  { label: 'Benchmark snapshots', value: (lake.benchmark_snapshots||0).toLocaleString(), color: '#B8860B' },
                  { label: 'Price changes captured', value: (lake.total_price_changes||0).toLocaleString(), color: '#C1272D' },
                  { label: 'Observed avg selling time', value: lake.avg_observed_selling_days ? `${lake.avg_observed_selling_days}d` : '—', color: '#065F46' },
                  { label: 'Health', value: lake.health === 'healthy' ? '✅ Healthy' : '⚠️ Degraded', color: lake.health === 'healthy' ? '#065F46' : '#C1272D' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: '12px 14px' }}>
                    <p style={{ fontSize: '0.66rem', color: '#9CA3AF', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                    <p style={{ fontWeight: 800, fontSize: '1.15rem', color: s.color, margin: 0 }}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Data Lake configuration */}
            {lakeCfg && (
              <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, padding: 20 }}>
                <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 14px', fontSize: '0.9rem' }}>⚙️ Data Lake configuration</p>

                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Data providers (modular — new providers plug in here)</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {(lakeCfg.providers || []).map((p: any) => (
                    <button key={p.key} onClick={() => toggleProvider(p.key)}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', border: `1.5px solid ${p.enabled ? '#BBF7D0' : '#E5E7EB'}`, background: p.enabled ? '#F0FDF4' : 'white', color: p.enabled ? '#065F46' : '#9CA3AF' }}>
                      {p.enabled ? <ToggleRight size={15} /> : <ToggleLeft size={15} />} {p.label || p.key}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
                  {[
                    { key: 'retention_days', label: 'Historical retention (days)', hint: 'observations kept in the lake' },
                    { key: 'delist_after_days', label: 'Delist after (days unseen)', hint: '≈ sold/removed detection' },
                    { key: 'match_price_tolerance', label: 'Matching price tolerance (%)', hint: 'intelligent vehicle matching' },
                    { key: 'sample_listings_per_model', label: 'Listings ingested per model', hint: 'per provider per sync' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#374151', marginBottom: 4 }}>{f.label}</label>
                      <input type="number" value={lakeCfg[f.key] ?? ''} onChange={e => setLakeCfg((c: any) => ({ ...c, [f.key]: e.target.value }))}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none' }} />
                      <p style={{ fontSize: '0.68rem', color: '#9CA3AF', margin: '3px 0 0' }}>{f.hint}</p>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => setLakeCfg((c: any) => ({ ...c, auto_recalculate: !c.auto_recalculate }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', border: `1.5px solid ${lakeCfg.auto_recalculate ? '#BBF7D0' : '#E5E7EB'}`, background: lakeCfg.auto_recalculate ? '#F0FDF4' : 'white', color: lakeCfg.auto_recalculate ? '#065F46' : '#9CA3AF' }}>
                    {lakeCfg.auto_recalculate ? <ToggleRight size={15} /> : <ToggleLeft size={15} />} Auto-recalculate AI indicators after each sync
                  </button>
                  <button onClick={saveLakeConfig}
                    style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: '#111827', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
                    <Save size={14} /> Save Data Lake config
                  </button>
                </div>
              </div>
            )}

            {/* Sync jobs monitoring */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px', borderBottom: '1px solid #F3F4F6', background: '#F9FAFB' }}>
                <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.88rem' }}>📡 Market Sync jobs — monitoring</p>
              </div>
              {jobs.length === 0 ? (
                <p style={{ padding: '28px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.82rem', margin: 0 }}>No sync jobs yet — launch your first Market Sync above.</p>
              ) : jobs.map((j: any) => {
                const jc = STATUS_CFG[j.status] || STATUS_CFG.running;
                const r = j.result || {};
                return (
                  <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderTop: '1px solid #F9FAFB', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: jc.bg, color: jc.color, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <jc.icon size={11} /> {j.status}
                    </span>
                    <span style={{ fontSize: '0.76rem', color: '#374151', fontWeight: 600, flexShrink: 0 }}>{j.type}</span>
                    <span style={{ fontSize: '0.74rem', color: '#9CA3AF', flexShrink: 0 }}>{new Date(j.queued_at).toLocaleString()}</span>
                    <span style={{ fontSize: '0.74rem', color: '#6B7280', flex: 1, minWidth: 200 }}>
                      {j.status === 'running' ? (j.progress_note || 'Running…')
                        : j.error_detail ? `Error: ${j.error_detail}`
                        : r.updated !== undefined ? `${r.updated ?? 0} benchmarks · ${r.snapshots_appended ?? 0} snapshots · ${r.listings_ingested ?? 0} listings (${r.new_market_ids ?? 0} new MI IDs, ${r.price_changes_detected ?? 0} price changes) · ${r.delisted ?? 0} delisted`
                        : '—'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#9CA3AF', flexShrink: 0 }}>by {j.triggered_by || 'admin'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'data' && (
          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
            {benchmarks.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
                <Database size={28} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.4 }} />
                <p style={{ fontWeight: 600, marginBottom: 4 }}>No live data yet</p>
                <p style={{ fontSize: '0.82rem' }}>Run an AI refresh to fetch real Dubizzle/DubiCars prices</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    {['Vehicle', 'Source', 'Avg price', 'Listings', 'Demand', 'Trend', 'Confidence', 'Updated'].map(h => (
                      <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {benchmarks.map(b => {
                    const stale = new Date(b.expires_at) < new Date();
                    const srcColor = b.source === 'dubizzle' ? '#C1272D' : '#1E40AF';
                    return (
                      <tr key={b.id} style={{ borderTop: '1px solid #F9FAFB' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: '0.82rem', color: '#111827', whiteSpace: 'nowrap' }}>{b.year} {b.make} {b.model}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: srcColor + '12', color: srcColor }}>{b.source}</span>
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, fontSize: '0.82rem', color: '#374151' }}>{formatPrice(Number(b.avg_price_aed))}</td>
                        <td style={{ padding: '10px 14px', fontSize: '0.82rem', color: '#6B7280' }}>{b.listing_count}</td>
                        <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: '#6B7280', textTransform: 'capitalize' }}>{(b.demand_level || '').replace('_', ' ')}</td>
                        <td style={{ padding: '10px 14px', fontSize: '0.82rem', fontWeight: 600, color: Number(b.trend_pct) > 0 ? '#007A3D' : '#C1272D' }}>{Number(b.trend_pct) > 0 ? '+' : ''}{Number(b.trend_pct).toFixed(1)}%</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: b.confidence_pct >= 80 ? '#065F46' : b.confidence_pct >= 60 ? '#92400E' : '#991B1B' }}>{b.confidence_pct}%</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: stale ? '#FEE2E2' : '#D1FAE5', color: stale ? '#991B1B' : '#065F46' }}>
                            {stale ? 'Stale' : new Date(b.fetched_at).toLocaleDateString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Run history tab ── */}
        {tab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {runs.length === 0 ? (
              <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
                <History size={28} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.4 }} />
                <p>No refresh runs yet</p>
              </div>
            ) : runs.map(r => {
              const cfg = STATUS_CFG[r.status] || STATUS_CFG.never_run;
              const StatusIcon = cfg.icon;
              return (
                <div key={r.id} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <StatusIcon size={11} /> {cfg.label}
                  </span>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <p style={{ fontWeight: 600, color: '#111827', margin: 0, fontSize: '0.85rem' }}>
                      {r.models_updated} updated · {r.models_failed} failed · of {r.models_requested} requested
                    </p>
                    <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.75rem' }}>
                      Triggered by {r.triggered_by || 'system'} · {new Date(r.started_at).toLocaleString()}
                    </p>
                  </div>
                  {r.summary && (
                    <details style={{ fontSize: '0.78rem', color: '#6B7280', maxWidth: 320 }}>
                      <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#374151' }}>View log</summary>
                      <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.72rem', marginTop: 6, fontFamily: 'inherit', color: '#9CA3AF' }}>{r.summary}</pre>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
