'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

const REGION_LABELS: Record<string,{label:string;flag:string;color:string}> = {
  european: { label:'European', flag:'🇪🇺', color:'#3B82F6' },
  japanese: { label:'Japanese', flag:'🇯🇵', color:'#EF4444' },
  korean:   { label:'Korean',   flag:'🇰🇷', color:'#6366F1' },
  chinese:  { label:'Chinese',  flag:'🇨🇳', color:'#F59E0B' },
  us:       { label:'American', flag:'🇺🇸', color:'#10B981' },
};

export default function BrandsPage() {
  const { t } = useLocale();
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState('');
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let tries = 0;
    const fetch = () => {
      setLoading(true);
      const params = region ? `?region=${region}` : '';
      api.get<any[]>(`/catalog/brands${params}`)
        .then(data => {
          const arr = Array.isArray(data) ? data : [];
          setBrands(arr);
          if (arr.length === 0 && tries < 8) {
            tries++;
            setRetrying(true);
            setTimeout(() => { setRetrying(false); fetch(); }, 5000);
          }
        })
        .catch(() => {
          if (tries < 8) { tries++; setTimeout(fetch, 5000); }
        })
        .finally(() => setLoading(false));
    };
    fetch();
  }, [region]);

  const byRegion: Record<string,any[]> = {};
  for (const b of brands) {
    const r = b.region || 'other';
    if (!byRegion[r]) byRegion[r] = [];
    byRegion[r].push(b);
  }
  const regions = region ? [region] : Object.keys(REGION_LABELS).filter(r => byRegion[r]?.length);

  return (
    <div style={{ minHeight:'100vh', background:'#F9FAFB' }}>
      <div style={{ background:'white', borderBottom:'1px solid #E5E7EB', padding:'32px 0' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', padding:'0 20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <h1 style={{ fontSize:'1.5rem', fontWeight:800, color:'#111827', margin:0 }}>{t('catalog.brands.title')}</h1>
            {(loading || retrying) && <RefreshCw size={16} style={{ color:'#9CA3AF', animation:'spin 1s linear infinite' }} />}
          </div>
          <p style={{ color:'#6B7280', margin:'0 0 20px', fontSize:'0.875rem' }}>
            {brands.length > 0 ? `${brands.length} brands in the UAE market` : retrying ? 'Catalog loading from database — auto-retrying…' : 'Loading brands…'}
          </p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {[{ value:'', label:'All regions' }, ...Object.entries(REGION_LABELS).map(([v,l]) => ({ value:v, label:`${l.flag} ${l.label}` }))].map(opt => (
              <button key={opt.value} onClick={() => setRegion(opt.value)}
                style={{ padding:'6px 14px', borderRadius:8, fontSize:'0.8rem', fontWeight:500, cursor:'pointer', border:'1.5px solid', transition:'all 0.12s',
                  borderColor: region===opt.value ? '#C1272D' : '#E5E7EB',
                  background: region===opt.value ? '#FFF1F2' : 'white',
                  color: region===opt.value ? '#C1272D' : '#6B7280' }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1280, margin:'0 auto', padding:'32px 20px' }}>
        {brands.length === 0 && !loading ? (
          <div style={{ textAlign:'center', padding:'60px 0' }}>
            <p style={{ fontSize:'2rem', marginBottom:8 }}>📋</p>
            <p style={{ fontWeight:600, color:'#374151', marginBottom:4 }}>Catalog initializing…</p>
            <p style={{ fontSize:'0.875rem', color:'#9CA3AF', marginBottom:16 }}>
              The brand catalog is loading from the database (02_brands_models.sql takes ~5 minutes). Auto-retrying every 5s.
            </p>
            <button onClick={() => window.location.reload()}
              style={{ padding:'8px 18px', background:'#C1272D', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>
              Retry now
            </button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:32 }}>
            {regions.map(r => {
              const rb = byRegion[r] || [];
              if (!rb.length) return null;
              const info = REGION_LABELS[r] || { label:r, flag:'🌍', color:'#6B7280' };
              return (
                <section key={r}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                    <span style={{ fontSize:'1.25rem' }}>{info.flag}</span>
                    <h2 style={{ fontSize:'1.05rem', fontWeight:700, color:'#111827', margin:0 }}>{info.label}</h2>
                    <span style={{ fontSize:'0.8rem', color:'#9CA3AF' }}>— {rb.length} brands</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:12 }}>
                    {rb.map((b:any) => (
                      <div key={b.id} className="card card-hover" style={{ padding:14, textAlign:'center' }}>
                        <div style={{ width:40, height:40, borderRadius:10, background:info.color+'15', color:info.color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'1rem', margin:'0 auto 8px' }}>
                          {b.name.charAt(0)}
                        </div>
                        <p style={{ fontWeight:600, fontSize:'0.85rem', color:'#111827', margin:'0 0 4px', lineHeight:1.3 }}>{b.name}</p>
                        <p style={{ fontSize:'0.75rem', color:'#9CA3AF', margin:0 }}>{Number(b.model_count)||0} models</p>
                        {Number(b.ev_models||0) > 0 && (
                          <span style={{ display:'inline-block', marginTop:4, fontSize:'0.68rem', padding:'1px 6px', borderRadius:10, background:'#D1FAE5', color:'#065F46', fontWeight:600 }}>
                            {b.ev_models} EV
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
