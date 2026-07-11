'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import Link from 'next/link';
import { api } from '@/lib/api';
import { usePriceFormatter } from '@/components/common/Price';

const POWERTRAIN_INFO: Record<string, { color: string; icon: string }> = {
  ICE:  { color: '#6b7280', icon: '⛽' },
  MHEV: { color: '#60A5FA', icon: '⚡' },
  HEV:  { color: '#34D399', icon: '🔋' },
  PHEV: { color: '#A78BFA', icon: '🔌' },
  REEV: { color: '#FCD34D', icon: '🔄' },
  BEV:  { color: '#22D3EE', icon: '⚡' },
  FCEV: { color: '#F472B6', icon: '💧' },
};

const BODY_TYPES = ['SUV','Sedan','Hatchback','Coupe','Convertible','Wagon','Pickup','MPV','Van'];
const REGIONS = [
  { value:'', label:'All' },
  { value:'european', label:'🇪🇺 EU' },
  { value:'chinese', label:'🇨🇳 China' },
  { value:'us', label:'🇺🇸 US' },
  { value:'japanese', label:'🇯🇵 Japan' },
  { value:'korean', label:'🇰🇷 Korea' },
];
const POWERTRAINS = ['ICE','MHEV','HEV','PHEV','REEV','BEV','FCEV'];

export default function CatalogModelsPage() {
  const { t } = useLocale();
  const formatPrice = usePriceFormatter();
  const [filters, setFilters] = useState({ powertrain:'', region:'', body_type:'', export_popular:'', search:'' });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setFilters(f => ({ ...f, powertrain: p.get('powertrain')||'', region: p.get('region')||'' }));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let retryCount = 0;
    const fetchData = () => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '60' });
      Object.entries(filters).forEach(([k,v]) => { if(v) params.set(k,v); });
      api.get<any>(`/catalog/models?${params}`)
        .then(data => {
          setResult(data);
          // Auto-retry if empty (catalog DB still initializing)
          if ((!data?.items?.length) && retryCount < 5) {
            retryCount++;
            setTimeout(fetchData, 4000);
          }
        })
        .catch(() => {
          setResult({ items:[], total:0 });
          if (retryCount < 5) { retryCount++; setTimeout(fetchData, 4000); }
        })
        .finally(() => setLoading(false));
    };
    fetchData();
  }, [filters, page, mounted]);

  const sf = (k: string, v: string) => { setFilters(f=>({...f,[k]:v})); setPage(1); };

  return (
    <div className="min-h-screen" style={{background:'#f8f9fb'}}>
      {/* Header */}
      <div style={{background:'white', borderBottom:'1px solid #e5e7eb', padding:'28px 0'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <Link href="/catalog/brands" className="hover:text-gray-600">Catalog</Link>
            <span>/</span><span className="text-gray-600">All models</span>
          </div>
          <h1 className="text-2xl font-bold mb-4" style={{color:'#111827'}}>{t('catalog.models.title')}</h1>

          <input type="text" value={filters.search}
            onChange={e => sf('search', e.target.value)}
            placeholder="Search brand or model name…"
            className="input-white max-w-md mb-4 text-sm" />

          {/* Powertrain filter */}
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={() => sf('powertrain','')}
              className="px-3 py-1.5 rounded-lg text-xs border font-medium transition-all"
              style={!filters.powertrain
                ? {background:'#fff7ed', borderColor:'#C9922A', color:'#C9922A'}
                : {background:'white', borderColor:'#e5e7eb', color:'#6b7280'}}>
              All tech
            </button>
            {POWERTRAINS.map(code => {
              const info = POWERTRAIN_INFO[code];
              const active = filters.powertrain === code;
              return (
                <button key={code} onClick={() => sf('powertrain', active ? '' : code)}
                  className="px-3 py-1.5 rounded-lg text-xs border font-medium transition-all"
                  style={active
                    ? {background: info.color+'18', borderColor: info.color+'60', color: info.color}
                    : {background:'white', borderColor:'#e5e7eb', color:'#6b7280'}}>
                  {info.icon} {code}
                </button>
              );
            })}
          </div>

          {/* Region + body */}
          <div className="flex flex-wrap gap-2">
            {REGIONS.map(r => (
              <button key={r.value} onClick={() => sf('region', filters.region===r.value ? '' : r.value)}
                className="px-3 py-1 rounded text-xs border transition-all font-medium"
                style={filters.region===r.value
                  ? {background:'#fff7ed', borderColor:'#C9922A', color:'#C9922A'}
                  : {background:'white', borderColor:'#e5e7eb', color:'#6b7280'}}>
                {r.label}
              </button>
            ))}
            <span className="text-gray-300 self-center">|</span>
            {BODY_TYPES.map(bt => (
              <button key={bt} onClick={() => sf('body_type', filters.body_type===bt ? '' : bt)}
                className="px-3 py-1 rounded text-xs border transition-all font-medium"
                style={filters.body_type===bt
                  ? {background:'#fff7ed', borderColor:'#C9922A', color:'#C9922A'}
                  : {background:'white', borderColor:'#e5e7eb', color:'#6b7280'}}>
                {bt}
              </button>
            ))}
            <button onClick={() => sf('export_popular', filters.export_popular ? '' : 'true')}
              className="px-3 py-1 rounded text-xs border transition-all font-medium"
              style={filters.export_popular
                ? {background:'#eff6ff', borderColor:'#3B82F6', color:'#3B82F6'}
                : {background:'white', borderColor:'#e5e7eb', color:'#6b7280'}}>
              ✈ Export popular
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {!loading && result && (
          <p className="text-sm text-gray-400 mb-5">{result.total?.toLocaleString()} models found</p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({length:12}).map((_,i) => (
              <div key={i} className="shimmer rounded-xl h-36" />
            ))}
          </div>
        ) : result?.items?.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg font-medium text-gray-500 mb-1">No models found</p>
            <p className="text-sm text-gray-400">The catalog dataset may still be loading. Try refreshing.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {(result?.items || []).map((m: any) => {
                const pt = POWERTRAIN_INFO[m.powertrain] || POWERTRAIN_INFO.ICE;
                return (
                  <div key={m.id} className="card card-hover p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 mb-0.5">{m.brand_name}</p>
                        <h3 className="font-semibold text-sm leading-snug" style={{color:'#111827'}}>{m.name}</h3>
                      </div>
                      <span className="text-xs px-1.5 py-0.5 rounded font-bold ml-2 shrink-0"
                        style={{background: pt.color+'18', color: pt.color}}>
                        {m.powertrain}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2 text-xs text-gray-400">
                      {m.body_type && <span>{m.body_type}</span>}
                      {m.year_from && <span>· from {m.year_from}</span>}
                      {m.country && <span>· {m.country}</span>}
                    </div>

                    {m.range_km && (
                      <p className="text-xs font-medium mb-1" style={{color: pt.color}}>
                        ⚡ {m.range_km} km range{m.battery_kwh ? ` · ${m.battery_kwh} kWh` : ''}
                      </p>
                    )}

                    {m.engine_options?.[0] && (
                      <p className="text-xs text-gray-400 truncate mb-2">{m.engine_options[0]}</p>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-1">
                      {m.price_aed_min ? (
                        <p className="text-xs font-semibold" style={{color:'#C9922A'}}>
                          {formatPrice(Number(m.price_aed_min))}+
                        </p>
                      ) : <span/>}
                      {m.export_popular && (
                        <span className="text-xs text-blue-500">✈ Export</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {result?.pages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                {page > 1 && (
                  <button onClick={() => setPage(p=>p-1)} className="btn-secondary px-4 py-2 text-sm">← Prev</button>
                )}
                <span className="text-sm text-gray-400">Page {page} / {result.pages}</span>
                {page < result.pages && (
                  <button onClick={() => setPage(p=>p+1)} className="btn-secondary px-4 py-2 text-sm">Next →</button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
