'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Shield, Zap, Globe, ArrowRight, Star, TrendingUp, Car, RefreshCw } from 'lucide-react';
import type { Vehicle } from '@/lib/api';
import { VehicleCard, VehicleCardSkeleton } from '@/components/vehicle/VehicleCard';
import { TrendingMarket } from '@/components/home/TrendingMarket';
import { useLocale } from '@/contexts/LocaleContext';

export default function HomePage() {
  const { t } = useLocale();
  const [featured, setFeatured] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  useEffect(() => {
    let retry = 0;
    const fetchFeatured = async () => {
      try {
        const res = await fetch('/api/v1/vehicles/featured');
        if (res.status === 503 || res.status === 502) {
          if (retry++ < 8) setTimeout(fetchFeatured, 5000);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setFeatured(Array.isArray(data) ? data : []);
        }
      } catch {
        if (retry++ < 3) setTimeout(fetchFeatured, 5000);
      } finally {
        setLoadingVehicles(false);
      }
    };
    fetchFeatured();
  }, []);

  return (
    <div style={{background:'#f8f9fb'}}>
      {/* Hero */}
      <section style={{background:'white', borderBottom:'1px solid #e5e7eb', padding:'64px 0 48px'}}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-5"
            style={{background:'#FFF1F2', color:'#C1272D', border:'1px solid #FECACA'}}>
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            {t('home.badge')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight" style={{color:'#111827'}}>
            {t('home.title.line1')}<br/>
            <span style={{color:'#C1272D'}}>{t('home.title.line2')}</span>
          </h1>
          <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto">
            {t('home.subtitle')}
          </p>

          {/* Search */}
          <form action="/marketplace" method="GET"
            className="flex gap-2 max-w-lg mx-auto">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input name="query" placeholder={t('home.search.placeholder')}
                className="input-white pl-10 py-3 text-sm" />
            </div>
            <button type="submit" className="btn-primary px-5 py-3 text-sm whitespace-nowrap">
              {t('home.search.button')}
            </button>
          </form>

          {/* Quick links */}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {['Land Cruiser','G-Class','Patrol','F-150','Range Rover'].map(q => (
              <Link key={q} href={`/marketplace?query=${encodeURIComponent(q)}`}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:bg-gray-50"
                style={{background:'white', border:'1px solid #e5e7eb', color:'#6b7280'}}>
                {q}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Platform pillars — TwinOS / Market Intelligence Engine / AI Twin */}
      <section style={{background:'linear-gradient(135deg, #0F172A 0%, #1E1B4B 55%, #312E81 100%)', padding:'56px 0'}}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span style={{ fontSize:'0.7rem', fontWeight:800, letterSpacing:'0.1em', color:'#A78BFA', textTransform:'uppercase' }}>
              {t('home.pillars.eyebrow')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-2" style={{color:'white'}}>
              {t('home.pillars.title')}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                emoji:'⚡', title:t('home.pillar1.title'), tag:'Core',
                desc:t('home.pillar1.desc'),
                color:'#3B82F6',
              },
              {
                emoji:'🧠', title:t('home.pillar2.title'), tag:'Intelligent Assistant',
                desc:t('home.pillar2.desc'),
                color:'#10B981',
              },
              {
                emoji:'📊', title:t('home.pillar3.title'), tag:'Data Engine',
                desc:t('home.pillar3.desc'),
                color:'#F59E0B',
              },
              {
                emoji:'🤖', title:t('home.pillar4.title'), tag:'Sales Copilot',
                desc:t('home.pillar4.desc'),
                color:'#8B5CF6',
              },
            ].map(p => (
              <div key={p.title} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:18, padding:'22px 20px', backdropFilter:'blur(6px)' }}>
                <span style={{ fontSize:'1.6rem', display:'block', marginBottom:10 }}>{p.emoji}</span>
                <span style={{ fontSize:'0.62rem', fontWeight:800, letterSpacing:'0.06em', color:p.color, textTransform:'uppercase' }}>{p.tag}</span>
                <p style={{ fontWeight:800, fontSize:'1.02rem', color:'white', margin:'4px 0 8px' }}>{p.title}</p>
                <p style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.65)', lineHeight:1.55, margin:0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{background:'white', borderBottom:'1px solid #e5e7eb', padding:'20px 0'}}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { label:'Verified dealers', value:'35+' },
              { label:'Vehicles in stock', value:'2,000+' },
              { label:'Export destinations', value:'80+' },
              { label:'Free Zone zones', value:'3' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-2xl font-bold" style={{color:'#C1272D'}}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured vehicles */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{color:'#111827'}}>Featured vehicles</h2>
          <Link href="/marketplace" className="flex items-center gap-1 text-sm font-medium"
            style={{color:'#C1272D'}}>
            View all <ArrowRight size={14}/>
          </Link>
        </div>

        {loadingVehicles ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({length: 8}).map((_,i) => <VehicleCardSkeleton key={i} />)}
          </div>
        ) : featured.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.slice(0,8).map(v => <VehicleCard key={v.id} vehicle={v}/>)}
          </div>
        ) : (
          <div className="card p-10 text-center text-gray-400">
            <Car size={36} className="mx-auto mb-3 opacity-40"/>
            <p className="font-medium">No vehicles yet</p>
            <p className="text-sm mt-1">Dealers can add their stock via the dashboard</p>
            <Link href="/register-dealer" className="inline-block mt-4 btn-primary px-5 py-2.5 text-sm">
              Register as dealer
            </Link>
          </div>
        )}
      </section>

      {/* Trending Market widget */}
      <div style={{ background: 'white', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
        <TrendingMarket />
      </div>

      {/* Features */}
      <section style={{background:'white', borderTop:'1px solid #e5e7eb', padding:'48px 0'}}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl font-bold text-center mb-8" style={{color:'#111827'}}>
            {t('home.features.title')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon:Shield, color:'#C1272D', title:t('home.feature1.title'), desc:t('home.feature1.desc') },
              { icon:Zap, color:'#3B82F6', title:t('home.feature2.title'), desc:t('home.feature2.desc') },
              { icon:Globe, color:'#10B981', title:t('home.feature3.title'), desc:t('home.feature3.desc') },
            ].map(f => (
              <div key={f.title} className="card p-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{background: f.color+'12'}}>
                  <f.icon size={18} style={{color: f.color}}/>
                </div>
                <h3 className="font-semibold mb-1.5 text-sm" style={{color:'#111827'}}>{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA zones */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="text-xl font-bold mb-5" style={{color:'#111827'}}>Browse by free zone</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { zone:'dubai', label:'Dubai Free Zone', count:'15 dealers', color:'#C1272D', desc:'Sheikh Zayed Road, Al Quoz, DIFC' },
            { zone:'jafza', label:'Jebel Ali JAFZA', count:'10 dealers', color:'#3B82F6', desc:'Direct Jebel Ali Port access, RoRo shipping' },
            { zone:'sharjah', label:'Sharjah', count:'10 dealers', color:'#10B981', desc:'Industrial Areas 12–18, Sharjah Port' },
          ].map(z => (
            <Link key={z.zone} href={`/dealers?zone=${z.zone}`}
              className="card card-hover p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="badge text-xs" style={{background:z.color+'12',color:z.color,border:`1px solid ${z.color}25`}}>{z.count}</span>
                <ArrowRight size={14} style={{color:z.color}}/>
              </div>
              <p className="font-semibold text-sm" style={{color:'#111827'}}>{z.label}</p>
              <p className="text-xs text-gray-400">{z.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Export Opportunities + Compare CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/export" style={{ display:'block', borderRadius:18, padding:24, background:'linear-gradient(135deg, #111827, #1F2937)', textDecoration:'none', position:'relative', overflow:'hidden' }}>
            <span style={{ fontSize:'1.8rem', display:'block', marginBottom:10 }}>✈️</span>
            <p style={{ color:'white', fontWeight:800, fontSize:'1.1rem', margin:'0 0 6px' }}>Export Intelligence Hub</p>
            <p style={{ color:'#9CA3AF', fontSize:'0.85rem', margin:'0 0 14px', lineHeight:1.5 }}>8 destination markets · Real profit data · Shipping routes from JAFZA</p>
            <span style={{ color:'#C1272D', fontWeight:700, fontSize:'0.85rem' }}>Explore markets →</span>
          </Link>
          <Link href="/compare" style={{ display:'block', borderRadius:18, padding:24, background:'linear-gradient(135deg, #5B21B6, #8B5CF6)', textDecoration:'none' }}>
            <span style={{ fontSize:'1.8rem', display:'block', marginBottom:10 }}>⚖️</span>
            <p style={{ color:'white', fontWeight:800, fontSize:'1.1rem', margin:'0 0 6px' }}>AI Vehicle Comparison</p>
            <p style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.85rem', margin:'0 0 14px', lineHeight:1.5 }}>Compare up to 3 vehicles with AI-powered recommendations</p>
            <span style={{ color:'white', fontWeight:700, fontSize:'0.85rem' }}>Start comparing →</span>
          </Link>
        </div>
      </section>

      {/* AI Assistant CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div style={{ borderRadius:20, padding:'32px 28px', background:'linear-gradient(135deg, #FFF1F2, #FAFAFA)', border:'1px solid #FECACA', textAlign:'center' }}>
          <span style={{ fontSize:'2rem', display:'block', marginBottom:10 }}>🧠</span>
          <h3 style={{ fontWeight:800, fontSize:'1.2rem', color:'#111827', margin:'0 0 8px' }}>{t('home.cta.title')}</h3>
          <p style={{ color:'#6B7280', fontSize:'0.9rem', margin:'0 0 18px', maxWidth:440, marginLeft:'auto', marginRight:'auto' }}>
            {t('home.cta.desc')}
          </p>
          <span style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 22px', background:'#8B5CF6', color:'white', borderRadius:12, fontWeight:700, fontSize:'0.9rem' }}>
            💬 {t('home.cta.button')}
          </span>
        </div>
      </section>
    </div>
  );
}
