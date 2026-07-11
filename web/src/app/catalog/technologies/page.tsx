'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { RefreshCw } from 'lucide-react';
import { usePriceFormatter } from '@/components/common/Price';
import { api } from '@/lib/api';

const PT_COLORS: Record<string,string> = {
  ICE:'#6B7280', MHEV:'#60A5FA', HEV:'#34D399', PHEV:'#A78BFA', REEV:'#FCD34D', BEV:'#22D3EE', FCEV:'#F472B6'
};

export default function TechnologiesPage() {
  const { t } = useLocale();
  const formatPrice = usePriceFormatter();
  const [techs, setTechs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let tries = 0;
    const fetch = () => {
      api.get<any[]>('/catalog/technologies')
        .then(data => {
          const arr = Array.isArray(data) ? data : [];
          setTechs(arr);
          if (arr.length === 0 && tries < 8) { tries++; setTimeout(fetch, 5000); }
        })
        .catch(() => { if (tries < 8) { tries++; setTimeout(fetch, 5000); } })
        .finally(() => setLoading(false));
    };
    fetch();
  }, []);

  return (
    <div style={{ minHeight:'100vh', background:'#F9FAFB' }}>
      <div style={{ background:'white', borderBottom:'1px solid #E5E7EB', padding:'32px 0' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', padding:'0 20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <h1 style={{ fontSize:'1.5rem', fontWeight:800, color:'#111827', margin:0 }}>{t('catalog.technologies.title')}</h1>
            {loading && <RefreshCw size={16} style={{ color:'#9CA3AF', animation:'spin 1s linear infinite' }} />}
          </div>
          <p style={{ color:'#6B7280', margin:0, fontSize:'0.875rem' }}>ICE · Hybrid · PHEV · REEV · BEV · FCEV</p>
        </div>
      </div>
      <div style={{ maxWidth:1280, margin:'0 auto', padding:'32px 20px' }}>
        {techs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:'#9CA3AF' }}>
            <RefreshCw size={28} style={{ margin:'0 auto 12px', display:'block', animation:'spin 1s linear infinite' }} />
            <p style={{ fontWeight:500 }}>Loading technology data…</p>
            <p style={{ fontSize:'0.875rem' }}>Catalog initializing from database. Auto-retrying.</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:16 }}>
            {techs.map((t:any) => {
              const color = PT_COLORS[t.code] || '#6B7280';
              return (
                <div key={t.code} className="card" style={{ padding:20 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                    <div style={{ width:52, height:52, borderRadius:12, background:color, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:800, fontSize:'0.9rem', flexShrink:0 }}>
                      {t.code}
                    </div>
                    <div>
                      <p style={{ fontWeight:700, fontSize:'0.95rem', color:'#111827', margin:'0 0 2px' }}>{t.name}</p>
                      <p style={{ fontSize:'0.78rem', color:'#9CA3AF', margin:0 }}>{t.full_name}</p>
                    </div>
                  </div>
                  <p style={{ fontSize:'0.82rem', color:'#6B7280', lineHeight:1.6, margin:'0 0 14px' }}>{t.description}</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {[
                      { label:'Models', value: t.model_count ? `${t.model_count} models` : null },
                      { label:'Avg range', value: t.avg_range_km ? `${t.avg_range_km} km` : null },
                      { label:'From', value: t.min_price_aed ? formatPrice(Number(t.min_price_aed)) : null },
                      { label:'CO₂', value: t.co2_category || null },
                    ].filter(s => s.value).map(s => (
                      <div key={s.label} style={{ background:'#F9FAFB', borderRadius:8, padding:'8px 12px' }}>
                        <p style={{ fontSize:'0.68rem', color:'#9CA3AF', margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.label}</p>
                        <p style={{ fontWeight:600, fontSize:'0.85rem', color:'#111827', margin:0 }}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                  {t.example_brands?.length > 0 && (
                    <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid #F3F4F6' }}>
                      <p style={{ fontSize:'0.72rem', color:'#9CA3AF', margin:'0 0 4px' }}>Key brands</p>
                      <p style={{ fontSize:'0.82rem', color:'#374151', margin:0 }}>{t.example_brands.slice(0,5).join(' · ')}</p>
                    </div>
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
