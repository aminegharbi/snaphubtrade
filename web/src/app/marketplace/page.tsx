'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, SlidersHorizontal, X, ChevronDown, TrendingUp, TrendingDown,
  Zap, Award, BarChart3, Car, RefreshCw, MessageCircle, Target, Globe
} from 'lucide-react';
import { usePriceFormatter } from '@/components/common/Price';
import { type Vehicle, type SearchResult } from '@/lib/api';
import { VehicleCard, VehicleCardSkeleton } from '@/components/vehicle/VehicleCard';
import { useSession } from '@/contexts/SessionContext';
import { useLocale } from '@/contexts/LocaleContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAKES = ['Toyota','Mercedes-Benz','BMW','Range Rover','Porsche','Nissan','Ford','Rolls-Royce','Lamborghini','Ferrari','Audi','Lexus','Cadillac','Chevrolet','GMC','BYD','MG','Tesla','Mitsubishi','Isuzu','Kia','Hyundai','Honda'];
const BODY_TYPES = ['SUV','Sedan','Pickup','Coupe','Convertible','Van','Hatchback'];
const FUEL_TYPES = ['petrol','diesel','hybrid','electric','phev'];
const SORTS = [
  { value: 'newest',     label: '🆕 Newest first' },
  { value: 'price_asc',  label: '💰 Price: Low → High' },
  { value: 'price_desc', label: '💎 Price: High → Low' },
  { value: 'popular',    label: '🔥 Most viewed' },
  { value: 'mileage',    label: '🛣️ Lowest mileage' },
];

const DEAL_FILTERS = [
  { value: '',                label: 'All deals' },
  { value: 'excellent_deal',  label: '🔥 Excellent Deal' },
  { value: 'good_deal',       label: '✅ Good Deal' },
  { value: 'fair_price',      label: '⚖️ Fair Price' },
];

const DEAL_CFG: Record<string, { color: string; bg: string; border: string }> = {
  excellent_deal: { color: '#065F46', bg: '#D1FAE5', border: '#6EE7B7' },
  good_deal:      { color: '#1E40AF', bg: '#DBEAFE', border: '#93C5FD' },
  fair_price:     { color: '#374151', bg: '#F3F4F6', border: '#D1D5DB' },
  above_market:   { color: '#92400E', bg: '#FEF3C7', border: '#FDE68A' },
  overpriced:     { color: '#991B1B', bg: '#FEE2E2', border: '#FCA5A5' },
};

// ─── Market Insights Bar ──────────────────────────────────────────────────────

function MarketInsightsBar() {
  const insights = [
    { icon: TrendingUp,  color: '#007A3D', text: 'Toyota LC 2026: +8.2%/mo ↑', bg: '#D1FAE5' },
    { icon: Zap,         color: '#C1272D', text: 'BYD Atto 3: Fastest selling — 10 days avg', bg: '#FEE2E2' },
    { icon: TrendingUp,  color: '#007A3D', text: 'Nissan Patrol 2025: +5.4%/mo ↑', bg: '#D1FAE5' },
    { icon: Award,       color: '#8B5CF6', text: '47 Excellent Deals live now', bg: '#EDE9FE' },
    { icon: Globe,       color: '#1E40AF', text: 'Export deals: LC70 & Hilux top exported this week', bg: '#DBEAFE' },
    { icon: TrendingDown,color: '#C1272D', text: 'C-Class 2024: -1.4%/mo — good time to buy', bg: '#FEE2E2' },
  ];

  return (
    <div style={{ background: '#111827', borderBottom: '1px solid #1F2937', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 0, animation: 'scroll 40s linear infinite', whiteSpace: 'nowrap' }}>
        {[...insights, ...insights].map((ins, i) => (
          <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 24px', borderRight: '1px solid #1F2937', flexShrink: 0 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: ins.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ins.icon size={11} style={{ color: ins.color }} />
            </div>
            <span style={{ fontSize: '0.75rem', color: '#D1D5DB', fontWeight: 500 }}>{ins.text}</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function ResultsStats({ result }: { result: SearchResult | null }) {
  const formatPrice = usePriceFormatter();
  if (!result) return null;

  const items = (result as any).items || [];
  const deals = items.filter((v: any) => v.valuations?.[0]?.deal_rating === 'excellent_deal' || v.valuations?.[0]?.deal_rating === 'good_deal');
  const avgPrice = items.length > 0 ? Math.round(items.reduce((s: number, v: any) => s + Number(v.price_aed), 0) / items.length) : 0;
  const exportReady = items.filter((v: any) => v.export_eligible).length;

  return (
    <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: '#6B7280', flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontWeight: 700, color: '#111827' }}>{result.total?.toLocaleString()} vehicles</span>
      {deals.length > 0 && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#007A3D', fontWeight: 600 }}>
          🔥 {deals.length} great deals on this page
        </span>
      )}
      {avgPrice > 0 && <span>Avg: {formatPrice(avgPrice)}</span>}
      {exportReady > 0 && <span>✈ {exportReady} export ready</span>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const { t } = useLocale();
  const { profile } = useSession();
  const formatPrice = usePriceFormatter();
  const isBroker = profile.profile_type === 'broker';
  const [filters, setFilters] = useState({
    query: '', make: '', body_type: '', fuel_type: '',
    price_min: '', price_max: '', export_eligible: '', sort: 'newest',
    deal_filter: '',
  });
  const [result,   setResult]  = useState<SearchResult | null>(null);
  const [loading,  setLoading] = useState(true);
  const [page,     setPage]    = useState(1);
  const [showAdv,  setShowAdv] = useState(false);
  const [mounted,  setMounted] = useState(false);
  const [affiliateBroker, setAffiliateBroker] = useState<any>(null);
  const [showSaveSearch, setShowSaveSearch] = useState(false);
  const [saveSearchEmail, setSaveSearchEmail] = useState('');
  const [savedDone, setSavedDone] = useState(false);
  const [smartQuery, setSmartQuery] = useState('');
  const [parsed, setParsed] = useState<any>(null);
  const [searchTip, setSearchTip] = useState('');
  const [suggestions] = useState([
    { label: '🔥 Best deals',           query: 'excellent deal SUV' },
    { label: '✈️ Export pickup',         query: 'pickup export africa' },
    { label: '⚡ EV cheap',             query: 'electric under 130000' },
    { label: '💎 Luxury 500K',          query: 'luxury under 500000' },
    { label: '👨‍👩‍👧 Family SUV',            query: 'family SUV 200000' },
    { label: '📈 Investment car',        query: 'low depreciation toyota' },
  ]);
  const [useSmartSearch, setUseSmartSearch] = useState(false);

  // Init from URL
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setFilters(f => ({
      ...f,
      query:          p.get('query') || '',
      make:           p.get('make') || '',
      body_type:      p.get('body_type') || '',
      fuel_type:      p.get('fuel_type') || '',
      price_min:      p.get('price_min') || '',
      price_max:      p.get('price_max') || '',
      export_eligible:p.get('export_eligible') || '',
      sort:           p.get('sort') || 'newest',
    }));
    const ref = p.get('ref') || localStorage.getItem('affiliate_ref') || '';
    if (ref) {
      localStorage.setItem('affiliate_ref', ref);
      fetch(`/api/v1/broker/code/${ref}`)
        .then(r => r.ok ? r.json() : null)
        .then(b => { if (b && !b.message) setAffiliateBroker(b); })
        .catch(() => {});
    }
    setMounted(true);
  }, []);

  const sf = (k: string, v: string) => { setFilters(f => ({ ...f, [k]: v })); setPage(1); };

  const doSmartSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/smart-search?q=${encodeURIComponent(q)}&limit=24&page=1`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setParsed(data.parsed);
        setSearchTip(data.search_tip || '');
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  const doSearch = useCallback(async (f: typeof filters, pg: number, retry = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: '24', sort: f.sort });
      if (f.query)          params.set('query', f.query);
      if (f.make)           params.set('make', f.make);
      if (f.body_type)      params.set('body_type', f.body_type);
      if (f.fuel_type)      params.set('fuel_type', f.fuel_type);
      if (f.price_min)      params.set('price_min', f.price_min);
      if (f.price_max)      params.set('price_max', f.price_max);
      if (f.export_eligible)params.set('export_eligible', f.export_eligible);

      const res = await fetch(`/api/v1/search?${params}`);
      if (res.status === 503 || res.status === 502) {
        if (retry < 8) setTimeout(() => doSearch(f, pg, retry + 1), 5000);
        return;
      }
      if (!res.ok) { setResult(null); return; }
      const data = await res.json();

      // Client-side deal filter (applied after API)
      if (f.deal_filter && data.items) {
        data.items = data.items.filter((v: any) => v.valuations?.[0]?.deal_rating === f.deal_filter);
      }
      setResult(data);
    } catch {
      if (retry < 3) setTimeout(() => doSearch(f, pg, retry + 1), 5000);
      else setResult(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (mounted) doSearch(filters, page); }, [filters, page, mounted, doSearch]);

  const items = (result as any)?.items || [];
  const activeFilterCount = [filters.make, filters.body_type, filters.fuel_type, filters.price_min, filters.price_max, filters.export_eligible, filters.deal_filter].filter(Boolean).length;

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>

      {/* Market insights ticker */}
      <MarketInsightsBar />

      {/* Broker mode banner — visible only to logged-in brokers */}
      {isBroker && (
        <div style={{ background: 'linear-gradient(90deg, #F0FDF4, #ECFDF5)', borderBottom: '1px solid #BBF7D0', padding: '9px 24px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1rem' }}>🤝</span>
            <p style={{ flex: 1, margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#065F46' }}>
              Broker tools active — click <strong>Reserve 24h</strong> on any available listing to hold it for a client.
            </p>
            <a href="/broker/dashboard" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#007A3D', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              My dashboard →
            </a>
          </div>
        </div>
      )}

      {/* Affiliate banner */}
      {affiliateBroker && (
        <div style={{ background: '#FFF1F2', borderBottom: '1px solid #FECACA', padding: '10px 24px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#C1272D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
              {affiliateBroker.full_name?.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, color: '#111827', margin: 0, fontSize: '0.875rem' }}>
                Referred by <span style={{ color: '#C1272D' }}>{affiliateBroker.full_name}</span>
                {affiliateBroker.country && <span style={{ color: '#9CA3AF', fontWeight: 400 }}> · {affiliateBroker.country}</span>}
                <span style={{ marginLeft: 8, fontSize: '0.72rem', padding: '1px 7px', borderRadius: 10, background: '#FEE2E2', color: '#C1272D', fontWeight: 700 }}>{affiliateBroker.tier}</span>
              </p>
              <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.75rem' }}>Verified SnapHubTrade.com broker · {affiliateBroker.specialties?.slice(0,2).join(' · ')}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {affiliateBroker.whatsapp && (
                <a href={`https://wa.me/${affiliateBroker.whatsapp.replace(/\D/g,'')}`} target="_blank"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#25D366', color: 'white', borderRadius: 8, textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}>
                  <MessageCircle size={13} /> Contact broker
                </a>
              )}
              <button onClick={() => setAffiliateBroker(null)}
                style={{ padding: '6px 10px', border: '1px solid #FECACA', background: 'white', borderRadius: 8, cursor: 'pointer', color: '#9CA3AF', fontSize: '0.8rem' }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* Search header */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          {/* Smart search toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
            <button onClick={() => { setUseSmartSearch(false); setParsed(null); setSearchTip(''); }}
              style={{ padding: '5px 12px', borderRadius: 20, border: '1.5px solid', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', borderColor: !useSmartSearch ? '#C1272D' : '#E5E7EB', background: !useSmartSearch ? '#FFF1F2' : 'white', color: !useSmartSearch ? '#C1272D' : '#6B7280' }}>
              Standard search
            </button>
            <button onClick={() => setUseSmartSearch(true)}
              style={{ padding: '5px 12px', borderRadius: 20, border: '1.5px solid', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', borderColor: useSmartSearch ? '#8B5CF6' : '#E5E7EB', background: useSmartSearch ? '#EDE9FE' : 'white', color: useSmartSearch ? '#5B21B6' : '#6B7280', display: 'flex', alignItems: 'center', gap: 5 }}>
              🤖 AI Smart Search <span style={{ fontSize: '0.68rem', background: '#C1272D', color: 'white', padding: '1px 5px', borderRadius: 8 }}>NEW</span>
            </button>
          </div>

          {/* AI Smart search bar */}
          {useSmartSearch && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem' }}>🤖</span>
                  <input value={smartQuery} onChange={e => setSmartQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && doSmartSearch(smartQuery)}
                    placeholder={t('marketplace.ai_search.placeholder')}
                    style={{ width: '100%', padding: '12px 12px 12px 38px', border: '2px solid #8B5CF6', borderRadius: 12, fontSize: '0.9rem', outline: 'none', color: '#374151', background: '#FAFAFA' }} />
                </div>
                <button onClick={() => doSmartSearch(smartQuery)}
                  style={{ padding: '12px 20px', background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                  Search AI
                </button>
              </div>
              {/* Suggestion chips */}
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {suggestions.map(s => (
                  <button key={s.query} onClick={() => { setSmartQuery(s.query); doSmartSearch(s.query); }}
                    style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid #E5E7EB', background: 'white', color: '#6B7280', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}>
                    {s.label}
                  </button>
                ))}
              </div>
              {/* Parsed query display */}
              {parsed && (
                <div style={{ marginTop: 8, padding: '10px 14px', background: '#F5F3FF', borderRadius: 10, border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.85rem' }}>🤖</span>
                  <p style={{ fontSize: '0.8rem', color: '#5B21B6', margin: 0 }}>
                    <strong>Understood:</strong> {parsed.interpreted_as}
                    {parsed.price_max && ` · Max ${formatPrice(Number(parsed.price_max))}`}
                    {parsed.make && ` · ${parsed.make}`}
                    {parsed.fuel_type && ` · ${parsed.fuel_type}`}
                    {parsed.export_eligible && ' · Export eligible'}
                  </p>
                </div>
              )}
              {/* AI search tip */}
              {searchTip && (
                <div style={{ marginTop: 6, padding: '10px 14px', background: '#FFFBEB', borderRadius: 10, border: '1px solid #FDE68A' }}>
                  <p style={{ fontSize: '0.8rem', color: '#92400E', margin: 0 }}>{searchTip}</p>
                </div>
              )}
            </div>
          )}

          {/* Main search row */}
          <div style={{ display: useSmartSearch ? 'none' : 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                value={filters.query}
                onChange={e => sf('query', e.target.value)}
                placeholder={t('marketplace.search.placeholder')}
                style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: '0.9rem', outline: 'none', color: '#374151', background: '#FAFAFA' }}
                onFocus={e => (e.target.style.borderColor = '#C1272D')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
              {filters.query && (
                <button onClick={() => sf('query', '')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2 }}>
                  <X size={14} />
                </button>
              )}
            </div>
            <button onClick={() => setShowSaveSearch(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', border: '1.5px solid #E5E7EB', borderRadius: 12, background: 'white', color: '#374151', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
              🔖 Save search
            </button>
            <button onClick={() => setShowAdv(!showAdv)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', border: `1.5px solid ${showAdv || activeFilterCount > 0 ? '#C1272D' : '#E5E7EB'}`, borderRadius: 12, background: showAdv || activeFilterCount > 0 ? '#FFF1F2' : 'white', color: showAdv || activeFilterCount > 0 ? '#C1272D' : '#374151', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
              <SlidersHorizontal size={14} />
              Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </button>
          </div>

          {/* Quick filters row */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
            {/* Deal filter chips */}
            {DEAL_FILTERS.map(d => (
              <button key={d.value} onClick={() => sf('deal_filter', d.value)}
                style={{ flexShrink: 0, padding: '5px 14px', borderRadius: 20, border: `1.5px solid ${filters.deal_filter === d.value ? '#C1272D' : '#E5E7EB'}`, background: filters.deal_filter === d.value ? '#FFF1F2' : 'white', color: filters.deal_filter === d.value ? '#C1272D' : '#6B7280', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                {d.label}
              </button>
            ))}
            <div style={{ width: 1, background: '#E5E7EB', flexShrink: 0 }} />
            {/* Body type chips */}
            {['SUV', 'Pickup', 'Sedan', 'Luxury'].map(bt => (
              <button key={bt} onClick={() => sf('body_type', filters.body_type === bt.toLowerCase() ? '' : bt.toLowerCase())}
                style={{ flexShrink: 0, padding: '5px 14px', borderRadius: 20, border: `1.5px solid ${filters.body_type === bt.toLowerCase() ? '#374151' : '#E5E7EB'}`, background: filters.body_type === bt.toLowerCase() ? '#111827' : 'white', color: filters.body_type === bt.toLowerCase() ? 'white' : '#6B7280', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}>
                {bt}
              </button>
            ))}
            <button onClick={() => sf('export_eligible', filters.export_eligible ? '' : 'true')}
              style={{ flexShrink: 0, padding: '5px 14px', borderRadius: 20, border: `1.5px solid ${filters.export_eligible ? '#1E40AF' : '#E5E7EB'}`, background: filters.export_eligible ? '#DBEAFE' : 'white', color: filters.export_eligible ? '#1E40AF' : '#6B7280', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
              ✈ Export ready
            </button>
            <button onClick={() => sf('fuel_type', filters.fuel_type === 'electric' ? '' : 'electric')}
              style={{ flexShrink: 0, padding: '5px 14px', borderRadius: 20, border: `1.5px solid ${filters.fuel_type === 'electric' ? '#065F46' : '#E5E7EB'}`, background: filters.fuel_type === 'electric' ? '#D1FAE5' : 'white', color: filters.fuel_type === 'electric' ? '#065F46' : '#6B7280', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}>
              ⚡ EV only
            </button>
          </div>

          {/* Advanced filters panel */}
          {showAdv && (
            <div style={{ marginTop: 12, padding: 16, background: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {/* Make */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>{t('marketplace.filter.make')}</label>
                <div style={{ position: 'relative' }}>
                  <select value={filters.make} onChange={e => sf('make', e.target.value)}
                    style={{ width: '100%', padding: '8px 28px 8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 9, fontSize: '0.8rem', appearance: 'none', background: 'white', color: '#374151', outline: 'none' }}>
                    <option value="">{t('marketplace.filter.make.all')}</option>
                    {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Fuel */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>{t('marketplace.filter.fuel')}</label>
                <div style={{ position: 'relative' }}>
                  <select value={filters.fuel_type} onChange={e => sf('fuel_type', e.target.value)}
                    style={{ width: '100%', padding: '8px 28px 8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 9, fontSize: '0.8rem', appearance: 'none', background: 'white', color: '#374151', outline: 'none' }}>
                    <option value="">{t('marketplace.filter.fuel.any')}</option>
                    {FUEL_TYPES.map(f => <option key={f} value={f} style={{ textTransform: 'capitalize' }}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                  </select>
                  <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Price min */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>{t('marketplace.filter.price_min')}</label>
                <input type="number" value={filters.price_min} onChange={e => sf('price_min', e.target.value)} placeholder={t('marketplace.filter.price_min.placeholder')}
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 9, fontSize: '0.8rem', background: 'white', color: '#374151', outline: 'none' }} />
              </div>

              {/* Price max */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>{t('marketplace.filter.price_max')}</label>
                <input type="number" value={filters.price_max} onChange={e => sf('price_max', e.target.value)} placeholder={t('marketplace.filter.price_max.placeholder')}
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 9, fontSize: '0.8rem', background: 'white', color: '#374151', outline: 'none' }} />
              </div>

              {/* Sort */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>{t('marketplace.filter.sort')}</label>
                <div style={{ position: 'relative' }}>
                  <select value={filters.sort} onChange={e => sf('sort', e.target.value)}
                    style={{ width: '100%', padding: '8px 28px 8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 9, fontSize: '0.8rem', appearance: 'none', background: 'white', color: '#374151', outline: 'none' }}>
                    {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Reset */}
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={() => {
                  setFilters({ query: '', make: '', body_type: '', fuel_type: '', price_min: '', price_max: '', export_eligible: '', sort: 'newest', deal_filter: '' });
                  setPage(1);
                }}
                  style={{ width: '100%', padding: '8px 0', border: '1.5px solid #E5E7EB', borderRadius: 9, background: 'white', color: '#C1272D', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  {t('marketplace.filter.reset')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px' }}>
        {/* Stats + sort row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <ResultsStats result={result} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Sort:</span>
            <div style={{ position: 'relative' }}>
              <select value={filters.sort} onChange={e => sf('sort', e.target.value)}
                style={{ padding: '6px 26px 6px 10px', border: '1.5px solid #E5E7EB', borderRadius: 9, fontSize: '0.8rem', appearance: 'none', background: 'white', color: '#374151', outline: 'none', cursor: 'pointer' }}>
                {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>

        {/* Loading API */}
        {loading && !result && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {Array.from({ length: 12 }).map((_, i) => <VehicleCardSkeleton key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9CA3AF' }}>
            <Car size={40} style={{ display: 'block', margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ fontWeight: 700, color: '#374151', fontSize: '1.1rem', margin: '0 0 8px' }}>{t('marketplace.empty')}</p>
            <p style={{ fontSize: '0.875rem', margin: '0 0 20px' }}>Try adjusting your filters or search terms</p>
            <button onClick={() => { setFilters({ query: '', make: '', body_type: '', fuel_type: '', price_min: '', price_max: '', export_eligible: '', sort: 'newest', deal_filter: '' }); setPage(1); }}
              style={{ padding: '10px 20px', background: '#C1272D', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>
              Clear all filters
            </button>
          </div>
        )}

        {/* Vehicle grid */}
        {items.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(285px, 1fr))', gap: 18, position: 'relative' }}>
            {loading && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(249,250,251,0.7)', zIndex: 5, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={24} style={{ color: '#C1272D', animation: 'spin 1s linear infinite' }} />
              </div>
            )}
            {items.map((v: Vehicle) => <VehicleCard key={v.id} vehicle={v} />)}
          </div>
        )}

        {/* Pagination */}
        {result && result.total > 24 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '9px 20px', border: '1.5px solid #E5E7EB', borderRadius: 10, background: 'white', cursor: page === 1 ? 'default' : 'pointer', color: page === 1 ? '#D1D5DB' : '#374151', fontWeight: 600, fontSize: '0.875rem' }}>
              ← Previous
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {Array.from({ length: Math.min(7, Math.ceil(result.total / 24)) }, (_, i) => {
                const pg = i + 1;
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    style={{ width: 36, height: 36, borderRadius: 9, border: `1.5px solid ${page === pg ? '#C1272D' : '#E5E7EB'}`, background: page === pg ? '#C1272D' : 'white', color: page === pg ? 'white' : '#374151', cursor: 'pointer', fontWeight: page === pg ? 700 : 500, fontSize: '0.875rem' }}>
                    {pg}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setPage(p => p + 1)} disabled={page * 24 >= result.total}
              style={{ padding: '9px 20px', border: '1.5px solid #E5E7EB', borderRadius: 10, background: 'white', cursor: page * 24 >= result.total ? 'default' : 'pointer', color: page * 24 >= result.total ? '#D1D5DB' : '#374151', fontWeight: 600, fontSize: '0.875rem' }}>
              Next →
            </button>
          </div>
        )}
      </div>
      {/* Save search modal */}
      {showSaveSearch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => e.target === e.currentTarget && setShowSaveSearch(false)}>
          <div style={{ background: 'white', borderRadius: 18, padding: 24, maxWidth: 380, width: '100%' }}>
            {savedDone ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>✅</div>
                <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>{t('marketplace.save_search.title')}</p>
                <p style={{ color: '#9CA3AF', fontSize: '0.875rem', margin: '0 0 16px' }}>We'll email you when new matches appear</p>
                <button onClick={() => { setShowSaveSearch(false); setSavedDone(false); }}
                  style={{ padding: '8px 20px', background: '#C1272D', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>Done</button>
              </div>
            ) : (
              <>
                <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 6px', fontSize: '1rem' }}>🔖 Save this search</p>
                <p style={{ color: '#9CA3AF', fontSize: '0.82rem', margin: '0 0 16px' }}>Get notified by email when new matching vehicles are listed</p>
                <input value={saveSearchEmail} onChange={e => setSaveSearchEmail(e.target.value)} placeholder="your@email.com"
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: '0.875rem', outline: 'none', marginBottom: 12 }} />
                <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 12px', fontSize: '0.78rem', color: '#6B7280', marginBottom: 16 }}>
                  Filters: {filters.make || 'Any make'} · {filters.body_type || 'Any type'} · {filters.price_max ? `Under ${formatPrice(Number(filters.price_max))}` : 'Any price'}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowSaveSearch(false)} style={{ flex: 1, padding: '10px 0', border: '1.5px solid #E5E7EB', borderRadius: 10, background: 'white', cursor: 'pointer', fontWeight: 500, color: '#374151' }}>Cancel</button>
                  <button onClick={async () => {
                    if (!saveSearchEmail) return;
                    await fetch('/api/v1/saved-searches', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: saveSearchEmail, filters, label: filters.query || filters.make || 'My Search', notify: true }) });
                    setSavedDone(true);
                  }} disabled={!saveSearchEmail}
                    style={{ flex: 1, padding: '10px 0', background: !saveSearchEmail ? '#E5E7EB' : '#C1272D', color: !saveSearchEmail ? '#9CA3AF' : 'white', border: 'none', borderRadius: 10, cursor: !saveSearchEmail ? 'default' : 'pointer', fontWeight: 700 }}>
                    Save search
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
