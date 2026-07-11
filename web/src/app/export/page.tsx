'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import Link from 'next/link';
import { TrendingUp, Globe, Ship, Clock, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { usePriceFormatter } from '@/components/common/Price';

const EXPORT_DATA = [
  {
    country: 'Nigeria', flag: '🇳🇬', region: 'West Africa',
    top_models: ['Toyota Land Cruiser','Toyota Hilux','Nissan Patrol','Toyota HiAce','Toyota LC70'],
    avg_profit_aed: 28000, shipping_cost_aed: 8500, transit_days: 14,
    demand: 'very_high', import_duty: '35%', port: 'Lagos (Apapa)',
    notes: 'Largest export market. Toyota LC70 and Hilux dominate. RoRo from JAFZA weekly.',
    monthly_units: 1240,
  },
  {
    country: 'Ghana', flag: '🇬🇭', region: 'West Africa',
    top_models: ['Toyota Land Cruiser','Nissan Patrol','Toyota Hilux','Toyota Fortuner'],
    avg_profit_aed: 22000, shipping_cost_aed: 8000, transit_days: 16,
    demand: 'very_high', import_duty: '20%', port: 'Tema Port',
    notes: 'Fast-growing market. Low duty makes Ghana very profitable. LC popular for NGOs.',
    monthly_units: 680,
  },
  {
    country: 'Kenya', flag: '🇰🇪', region: 'East Africa',
    top_models: ['Toyota Land Cruiser','Toyota Hilux','Mitsubishi Pajero','Toyota Fortuner'],
    avg_profit_aed: 19000, shipping_cost_aed: 9200, transit_days: 18,
    demand: 'high', import_duty: '25%', port: 'Mombasa',
    notes: 'Nairobi-based dealers active on Dubizzle UAE. Strong SUV demand for safari industry.',
    monthly_units: 520,
  },
  {
    country: 'Tanzania', flag: '🇹🇿', region: 'East Africa',
    top_models: ['Toyota Hilux','Toyota Land Cruiser','Toyota HiAce'],
    avg_profit_aed: 18000, shipping_cost_aed: 9800, transit_days: 20,
    demand: 'high', import_duty: '25%', port: 'Dar es Salaam',
    notes: 'Mining & agriculture drive Hilux demand. HiAce buses popular for transport sector.',
    monthly_units: 380,
  },
  {
    country: 'Senegal', flag: '🇸🇳', region: 'West Africa',
    top_models: ['Toyota Land Cruiser','Nissan Patrol','Toyota Hilux'],
    avg_profit_aed: 20000, shipping_cost_aed: 9000, transit_days: 16,
    demand: 'high', import_duty: '20%', port: 'Dakar',
    notes: 'French-speaking market. Growing middle class driving luxury SUV demand.',
    monthly_units: 290,
  },
  {
    country: 'United Kingdom', flag: '🇬🇧', region: 'Europe',
    top_models: ['Toyota Land Cruiser','Range Rover','BMW X5','Porsche Cayenne'],
    avg_profit_aed: 42000, shipping_cost_aed: 5500, transit_days: 10,
    demand: 'medium', import_duty: '6.5%', port: 'Southampton',
    notes: 'High-end JDM and GCC spec imports. Strong demand for Land Cruiser GXR.',
    monthly_units: 140,
  },
  {
    country: 'India', flag: '🇮🇳', region: 'South Asia',
    top_models: ['Toyota Land Cruiser','Toyota Hilux','Isuzu D-Max'],
    avg_profit_aed: 15000, shipping_cost_aed: 4000, transit_days: 8,
    demand: 'medium', import_duty: '100%+', port: 'Mumbai / Nhava Sheva',
    notes: 'Very high import duty limits profitability. Specialist market for certified importers only.',
    monthly_units: 95,
  },
  {
    country: 'Australia', flag: '🇦🇺', region: 'Pacific',
    top_models: ['Toyota Land Cruiser','Toyota HiLux','Toyota HiAce'],
    avg_profit_aed: 35000, shipping_cost_aed: 11000, transit_days: 22,
    demand: 'medium', import_duty: '5%', port: 'Melbourne / Sydney',
    notes: 'Low duty, strong GCC spec appetite. Right-hand drive only — LC70 extremely popular.',
    monthly_units: 180,
  },
];

const DEMAND_CFG: Record<string,{label:string;color:string;bg:string}> = {
  very_high:{label:'Very High',color:'#065F46',bg:'#D1FAE5'},
  high:{label:'High',color:'#1E40AF',bg:'#DBEAFE'},
  medium:{label:'Medium',color:'#92400E',bg:'#FEF3C7'},
};

function StatCard({label,value,icon:Icon,color}:{label:string;value:string;icon:any;color:string}) {
  return (
    <div style={{background:'white',border:'1px solid #E5E7EB',borderRadius:12,padding:'14px 16px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
        <p style={{fontSize:'0.7rem',fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.06em',margin:0}}>{label}</p>
        <Icon size={14} style={{color}} />
      </div>
      <p style={{fontWeight:800,fontSize:'1.2rem',color,margin:0}}>{value}</p>
    </div>
  );
}

export default function ExportPage() {
  const { t } = useLocale();
  const formatPrice = usePriceFormatter();
  const [region, setRegion] = useState('');
  const [expanded, setExpanded] = useState<string|null>(null);

  const filtered = region ? EXPORT_DATA.filter(c => c.region === region) : EXPORT_DATA;
  const regions = [...new Set(EXPORT_DATA.map(c => c.region))];
  const totalMonthly = EXPORT_DATA.reduce((s,c) => s+c.monthly_units, 0);
  const avgProfit = Math.round(EXPORT_DATA.reduce((s,c)=>s+c.avg_profit_aed,0)/EXPORT_DATA.length);

  return (
    <div style={{minHeight:'100vh',background:'#F9FAFB'}}>
      <div style={{background:'linear-gradient(135deg, #111827, #1F2937)',padding:'40px 24px',color:'white',textAlign:'center'}}>
        <h1 style={{fontWeight:900,fontSize:'clamp(1.4rem,4vw,2rem)',margin:'0 0 10px'}}>{t('export.title')}</h1>
        <p style={{color:'#9CA3AF',margin:'0 0 28px',fontSize:'1rem'}}>Real market demand · Profitability · Shipping routes from JAFZA</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))',gap:12,maxWidth:700,margin:'0 auto'}}>
          {[
            {label:'Destination markets',value:'8 countries',icon:Globe,color:'#60A5FA'},
            {label:'Monthly exports',value:totalMonthly.toLocaleString()+' units',icon:Ship,color:'#34D399'},
            {label:'Avg profit/vehicle',value:formatPrice(avgProfit),icon:DollarSign,color:'#C1272D'},
            {label:'Fastest route',value:'UK / India 8-10d',icon:Clock,color:'#FBBF24'},
          ].map(s => (
            <div key={s.label} style={{background:'rgba(255,255,255,0.08)',borderRadius:12,padding:'14px 12px',textAlign:'center'}}>
              <s.icon size={18} style={{color:s.color,display:'block',margin:'0 auto 6px'}} />
              <p style={{fontWeight:800,fontSize:'1.1rem',color:s.color,margin:'0 0 2px'}}>{s.value}</p>
              <p style={{fontSize:'0.68rem',color:'rgba(255,255,255,0.5)',margin:0}}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{maxWidth:1100,margin:'0 auto',padding:'28px 20px'}}>
        {/* Region filter */}
        <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
          {['', ...regions].map(r => (
            <button key={r} onClick={() => setRegion(r)}
              style={{padding:'6px 16px',borderRadius:20,border:'1.5px solid',fontSize:'0.82rem',fontWeight:600,cursor:'pointer',borderColor:region===r?'#C1272D':'#E5E7EB',background:region===r?'#FFF1F2':'white',color:region===r?'#C1272D':'#6B7280'}}>
              {r||'All regions'} {r&&`(${EXPORT_DATA.filter(c=>c.region===r).length})`}
            </button>
          ))}
          <Link href="/marketplace?export_eligible=true"
            style={{marginLeft:'auto',padding:'6px 16px',borderRadius:20,background:'#C1272D',color:'white',textDecoration:'none',fontSize:'0.82rem',fontWeight:700}}>
            Browse export vehicles →
          </Link>
        </div>

        {/* Country cards */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {filtered.map(c => {
            const demand = DEMAND_CFG[c.demand]||DEMAND_CFG.medium;
            const isExpanded = expanded === c.country;
            return (
              <div key={c.country} style={{background:'white',border:'1px solid #E5E7EB',borderRadius:16,overflow:'hidden'}}>
                <button onClick={() => setExpanded(isExpanded ? null : c.country)}
                  style={{width:'100%',padding:'16px 20px',display:'flex',alignItems:'center',gap:14,background:'none',border:'none',cursor:'pointer',textAlign:'left'}}>
                  <span style={{fontSize:'1.8rem'}}>{c.flag}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                      <p style={{fontWeight:700,color:'#111827',margin:0,fontSize:'0.95rem'}}>{c.country}</p>
                      <span style={{fontSize:'0.7rem',padding:'2px 8px',borderRadius:20,fontWeight:700,background:demand.bg,color:demand.color}}>{demand.label}</span>
                      <span style={{fontSize:'0.72rem',color:'#9CA3AF'}}>{c.region}</span>
                    </div>
                    <p style={{color:'#9CA3AF',margin:0,fontSize:'0.78rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.notes}</p>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(46px,1fr))',gap:16,flexShrink:1,minWidth:0}}>
                    {[
                      {label:'Avg profit',value:formatPrice(c.avg_profit_aed),color:'#007A3D'},
                      {label:'Shipping',value:formatPrice(c.shipping_cost_aed),color:'#374151'},
                      {label:'Transit',value:c.transit_days+'d',color:'#3B82F6'},
                    ].map(s => (
                      <div key={s.label} style={{textAlign:'right'}}>
                        <p style={{fontSize:'0.68rem',color:'#9CA3AF',margin:'0 0 1px'}}>{s.label}</p>
                        <p style={{fontWeight:800,color:s.color,margin:0,fontSize:'0.875rem'}}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                  {isExpanded ? <ChevronUp size={16} style={{color:'#9CA3AF',flexShrink:0}} /> : <ChevronDown size={16} style={{color:'#9CA3AF',flexShrink:0}} />}
                </button>
                {isExpanded && (
                  <div style={{borderTop:'1px solid #F3F4F6',padding:'16px 20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                    <div>
                      <p style={{fontSize:'0.72rem',fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.06em',margin:'0 0 10px'}}>Top exported models</p>
                      {c.top_models.map((m,i) => (
                        <div key={m} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                          <span style={{width:20,height:20,borderRadius:'50%',background:'#F3F4F6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.65rem',fontWeight:800,color:'#6B7280',flexShrink:0}}>{i+1}</span>
                          <Link href={`/marketplace?query=${encodeURIComponent(m)}&export_eligible=true`}
                            style={{fontSize:'0.82rem',fontWeight:600,color:'#C1272D',textDecoration:'none'}}>{m}</Link>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p style={{fontSize:'0.72rem',fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.06em',margin:'0 0 10px'}}>Details</p>
                      {[
                        {label:'Import duty',value:c.import_duty},
                        {label:'Main port',value:c.port},
                        {label:'Monthly volume',value:c.monthly_units.toLocaleString()+' units'},
                        {label:'Estimated profit',value:formatPrice(c.avg_profit_aed - c.shipping_cost_aed)+' net'},
                      ].map(d => (
                        <div key={d.label} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #F9FAFB'}}>
                          <span style={{fontSize:'0.78rem',color:'#9CA3AF'}}>{d.label}</span>
                          <span style={{fontSize:'0.82rem',fontWeight:700,color:'#374151'}}>{d.value}</span>
                        </div>
                      ))}
                      <Link href={`/marketplace?export_eligible=true&query=${encodeURIComponent(c.top_models[0])}`}
                        style={{display:'block',textAlign:'center',marginTop:12,padding:'9px 0',background:'#C1272D',color:'white',borderRadius:10,textDecoration:'none',fontWeight:700,fontSize:'0.82rem'}}>
                        Find {c.country} export vehicles →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
