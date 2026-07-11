'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { Check, X, Zap, Star, Building2, ArrowRight, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Price } from '@/components/common/Price';

const CYCLE_DISCOUNT: Record<string,number> = { monthly:0, quarterly:10, yearly:20 };

function PricingCard({ plan, cycle, onSelect }: { plan:any; cycle:string; onSelect:(p:any)=>void }) {
  const isPopular = plan.badge === 'Most Popular';
  const isFree = plan.slug === 'free';

  const price = cycle === 'yearly' ? plan.price_yearly / 12
    : cycle === 'quarterly' ? plan.price_quarterly / 3
    : plan.price_monthly;

  const enabledFeatures = plan.features?.filter((pf:any) => pf.enabled) || [];
  const limits = Object.fromEntries((plan.limits||[]).map((l:any) => [l.limit_key, l.limit_value]));

  return (
    <div style={{
      background: 'white', border: `2px solid ${isPopular ? plan.color : '#E5E7EB'}`,
      borderRadius: 20, padding: 28, position: 'relative', display: 'flex', flexDirection: 'column',
      boxShadow: isPopular ? `0 8px 32px ${plan.color}20` : '0 2px 8px rgba(0,0,0,0.06)',
      transition: 'all 0.2s',
    }}>
      {plan.badge && (
        <div style={{ position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)', background:plan.color, color:'white', padding:'4px 16px', borderRadius:20, fontSize:'0.75rem', fontWeight:700, whiteSpace:'nowrap' }}>
          {plan.badge}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <p style={{ fontWeight:800, fontSize:'1.25rem', color:'#111827', margin:'0 0 4px' }}>{plan.name}</p>
        <p style={{ fontSize:'0.875rem', color:'#6B7280', margin:0 }}>{plan.tagline}</p>
      </div>

      {/* Price */}
      <div style={{ marginBottom:24 }}>
        {isFree ? (
          <div>
            <span style={{ fontSize:'2.5rem', fontWeight:900, color:'#111827' }}>Free</span>
            <p style={{ fontSize:'0.8rem', color:'#9CA3AF', margin:'4px 0 0' }}>No credit card required</p>
          </div>
        ) : (
          <div>
            <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
              <Price aed={Math.round(price)} style={{ fontSize:'2.5rem', fontWeight:900, color: plan.color }} />
              <span style={{ fontSize:'0.875rem', color:'#9CA3AF' }}>/mo</span>
            </div>
            {cycle !== 'monthly' && (
              <p style={{ fontSize:'0.8rem', color:'#065F46', margin:'4px 0 0', fontWeight:500 }}>
                Save {CYCLE_DISCOUNT[cycle]}% · billed {cycle}
              </p>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <button onClick={() => onSelect(plan)}
        style={{ padding:'13px 0', borderRadius:12, fontWeight:700, fontSize:'0.9rem', cursor:'pointer', marginBottom:24, border:'2px solid', borderColor: isFree ? '#E5E7EB' : plan.color, background: isFree ? 'white' : plan.color, color: isFree ? '#374151' : 'white', transition:'all 0.15s' }}>
        {isFree ? 'Get started free' : `Start ${plan.name}`} →
      </button>

      {/* Limits summary */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
        {limits.max_vehicles !== undefined && (
          <span style={{ fontSize:'0.75rem', padding:'3px 10px', borderRadius:20, background: plan.color+'10', color:plan.color, fontWeight:600 }}>
            {limits.max_vehicles === -1 ? '∞ Vehicles' : `${limits.max_vehicles} vehicles`}
          </span>
        )}
        {limits.ai_scans_monthly !== undefined && (
          <span style={{ fontSize:'0.75rem', padding:'3px 10px', borderRadius:20, background:'#F3F4F6', color:'#6B7280', fontWeight:500 }}>
            {limits.ai_scans_monthly === -1 ? '∞ AI scans' : `${limits.ai_scans_monthly} AI/mo`}
          </span>
        )}
        {limits.max_users !== undefined && (
          <span style={{ fontSize:'0.75rem', padding:'3px 10px', borderRadius:20, background:'#F3F4F6', color:'#6B7280', fontWeight:500 }}>
            {limits.max_users === -1 ? '∞ Users' : `${limits.max_users} user${limits.max_users>1?'s':''}`}
          </span>
        )}
      </div>

      {/* Features */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
        <p style={{ fontSize:'0.72rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Includes</p>
        {enabledFeatures.slice(0, 10).map((pf:any) => (
          <div key={pf.feature.key} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:16, flexShrink:0 }}>{pf.feature.icon||'✓'}</span>
            <span style={{ fontSize:'0.85rem', color:'#374151' }}>
              {pf.feature.name}
              {pf.limit_value !== null && pf.limit_value !== undefined && (
                <span style={{ color:'#9CA3AF', fontSize:'0.78rem' }}> ({pf.limit_value === -1 ? 'unlimited' : pf.limit_value + '/mo'})</span>
              )}
            </span>
          </div>
        ))}
        {enabledFeatures.length > 10 && (
          <p style={{ fontSize:'0.8rem', color:plan.color, fontWeight:500 }}>+ {enabledFeatures.length - 10} more features</p>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  const { t } = useLocale();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<'monthly'|'quarterly'|'yearly'>('monthly');
  const [allFeatures, setAllFeatures] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.get<any[]>('/subscription/plans'),
      api.get<any[]>('/subscription/features'),
    ]).then(([p, f]) => {
      setPlans(Array.isArray(p) ? p : []);
      setAllFeatures(Array.isArray(f) ? f : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSelect = (plan: any) => {
    if (plan.slug === 'free') { window.location.href = '/register-dealer'; return; }
    setSelected(plan);
    const target = `/dealer/subscription?upgrade=${plan.id}`;
    const dealerId = localStorage.getItem('dealer_id');
    if (!dealerId) {
      // Not signed in as a dealer — go through login and come straight back
      // to the upgrade flow instead of losing the selected plan.
      window.location.href = `/login?redirect=${encodeURIComponent(target)}`;
      return;
    }
    window.location.href = target;
  };

  const categories = [...new Set(allFeatures.map(f => f.category))];

  return (
    <div style={{ minHeight:'100vh', background:'#F9FAFB' }}>
      {/* Hero */}
      <div style={{ background:'white', borderBottom:'1px solid #E5E7EB', padding:'56px 24px 48px', textAlign:'center' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 14px', background:'#FFF1F2', borderRadius:20, border:'1px solid #FECACA', marginBottom:16 }}>
          <span style={{ color:'#C1272D', fontSize:'0.8rem', fontWeight:600 }}>🇦🇪 UAE Dealer Plans</span>
        </div>
        <h1 style={{ fontSize:'clamp(1.8rem, 4vw, 2.8rem)', fontWeight:900, color:'#111827', margin:'0 0 12px', lineHeight:1.15 }}>
          Simple, transparent pricing
        </h1>
        <p style={{ fontSize:'1rem', color:'#6B7280', maxWidth:480, margin:'0 auto 32px', lineHeight:1.6 }}>
          From free to enterprise — choose the plan that grows with your dealership.
        </p>

        {/* Billing cycle toggle */}
        <div style={{ display:'inline-flex', background:'#F3F4F6', borderRadius:12, padding:4, gap:2 }}>
          {(['monthly','quarterly','yearly'] as const).map(c => (
            <button key={c} onClick={() => setCycle(c)}
              style={{ padding:'8px 18px', borderRadius:8, border:'none', fontWeight:600, fontSize:'0.85rem', cursor:'pointer', transition:'all 0.15s',
                background: cycle===c ? 'white' : 'transparent',
                color: cycle===c ? '#111827' : '#6B7280',
                boxShadow: cycle===c ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}>
              {c.charAt(0).toUpperCase()+c.slice(1)}
              {c !== 'monthly' && <span style={{ marginLeft:6, fontSize:'0.7rem', color:'#007A3D', fontWeight:700 }}>-{CYCLE_DISCOUNT[c]}%</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'48px 16px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:60, color:'#9CA3AF' }}>
            <RefreshCw size={24} style={{ margin:'0 auto 12px', display:'block', animation:'spin 1s linear infinite' }} />
            <p>Loading plans…</p>
          </div>
        ) : (
          <>
            {/* Pricing cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:20, marginBottom:64 }}>
              {plans.map(plan => (
                <PricingCard key={plan.id} plan={plan} cycle={cycle} onSelect={handleSelect} />
              ))}
            </div>

            {/* Feature comparison table */}
            {plans.length > 0 && allFeatures.length > 0 && (
              <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:16, overflow:'hidden' }}>
                <div style={{ padding:'20px 24px', borderBottom:'1px solid #F3F4F6' }}>
                  <h2 style={{ fontWeight:800, color:'#111827', margin:0 }}>{t('pricing.features_table')}</h2>
                </div>
                {/* Header */}
                <div style={{ display:'grid', gridTemplateColumns:`2fr ${plans.map(()=>'1fr').join(' ')}`, borderBottom:'2px solid #E5E7EB' }}>
                  <div style={{ padding:'14px 24px' }}><span style={{ fontSize:'0.75rem', color:'#9CA3AF', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>Feature</span></div>
                  {plans.map(p => (
                    <div key={p.id} style={{ padding:'14px 16px', textAlign:'center' }}>
                      <p style={{ fontWeight:700, color:p.color, margin:0, fontSize:'0.9rem' }}>{p.name}</p>
                    </div>
                  ))}
                </div>

                {/* Feature rows by category */}
                {categories.map(cat => {
                  const catFeatures = allFeatures.filter(f => f.category === cat && f.is_visible);
                  if (!catFeatures.length) return null;
                  return (
                    <div key={cat}>
                      <div style={{ padding:'10px 24px 6px', background:'#F9FAFB', borderBottom:'1px solid #F3F4F6' }}>
                        <span style={{ fontSize:'0.72rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.06em' }}>{cat}</span>
                      </div>
                      {catFeatures.map((feature:any) => (
                        <div key={feature.key} style={{ display:'grid', gridTemplateColumns:`2fr ${plans.map(()=>'1fr').join(' ')}`, borderBottom:'1px solid #F9FAFB' }}>
                          <div style={{ padding:'11px 24px', display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:15 }}>{feature.icon}</span>
                            <span style={{ fontSize:'0.85rem', color:'#374151' }}>{feature.name}</span>
                          </div>
                          {plans.map((p:any) => {
                            const pf = p.features?.find((f:any) => f.feature?.key === feature.key);
                            const enabled = pf?.enabled;
                            const limit = pf?.limit_value;
                            return (
                              <div key={p.id} style={{ padding:'11px 16px', textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                {!pf || !enabled ? (
                                  <X size={16} color="#D1D5DB" />
                                ) : limit !== null && limit !== undefined ? (
                                  <span style={{ fontSize:'0.8rem', fontWeight:600, color:p.color }}>
                                    {limit === -1 ? '∞' : limit+'/mo'}
                                  </span>
                                ) : (
                                  <Check size={16} style={{ color:p.color }} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* FAQ */}
        <div style={{ marginTop:64, textAlign:'center', padding:'48px 0' }}>
          <h2 style={{ fontWeight:800, color:'#111827', marginBottom:32 }}>{t('pricing.faq')}</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:20, textAlign:'left' }}>
            {[
              { q:'Can I change plans anytime?', a:'Yes — upgrade or downgrade at any time. Changes take effect immediately.' },
              { q:'What payment methods are accepted?', a:'We accept Stripe, PayPal, Tabby, Tamara, Apple Pay and Google Pay.' },
              { q:'Is there a free trial?', a:'Pro and Enterprise plans come with a 14-day free trial. No credit card required.' },
              { q:'Do you offer VAT invoices?', a:'Yes — all invoices include VAT and are available for download in your billing portal.' },
            ].map((faq,i) => (
              <div key={i} style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:12, padding:'18px 20px' }}>
                <p style={{ fontWeight:700, color:'#111827', margin:'0 0 6px' }}>{faq.q}</p>
                <p style={{ color:'#6B7280', fontSize:'0.875rem', margin:0, lineHeight:1.6 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
