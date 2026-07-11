'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { CheckCircle, AlertTriangle, CreditCard, TrendingUp, Zap, Users, Car, RefreshCw, ArrowRight, X, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { usePriceFormatter } from '@/components/common/Price';

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max === -1 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const warning = pct > 80;
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:'0.8rem', color:'#6B7280' }}>{value.toLocaleString()} used</span>
        <span style={{ fontSize:'0.8rem', fontWeight:600, color: warning ? '#C1272D' : '#374151' }}>
          {max === -1 ? '∞ unlimited' : `${max.toLocaleString()} max`}
        </span>
      </div>
      {max !== -1 && (
        <div style={{ height:6, background:'#F3F4F6', borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, background: warning ? '#C1272D' : color, borderRadius:3, transition:'width 0.5s' }} />
        </div>
      )}
    </div>
  );
}

function UpgradeModal({ currentPlan, plans, dealerId, onClose, onDone, initialPlanId }: any) {
  const formatPrice = usePriceFormatter();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [cycle, setCycle] = useState('monthly');
  const [coupon, setCoupon] = useState('');
  const [couponValid, setCouponValid] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialPlanId && plans?.length) {
      const match = plans.find((p: any) => p.id === initialPlanId);
      if (match) setSelectedPlan(match);
    }
  }, [initialPlanId, plans]);

  const validateCoupon = async () => {
    if (!coupon || !selectedPlan) return;
    try {
      const data = await api.post<any>('/subscription/coupon/validate', { code: coupon, plan_id: selectedPlan?.id });
      setCouponValid(data);
    } catch { setCouponValid({ valid: false, reason: 'Invalid coupon' }); }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) { setError('Select a plan'); return; }
    setProcessing(true); setError('');
    const price = cycle === 'yearly' ? Number(selectedPlan.price_yearly) : cycle === 'quarterly' ? Number(selectedPlan.price_quarterly) : Number(selectedPlan.price_monthly);
    try {
      if (price > 0) {
        // Paid plan — redirect to Stripe's hosted Checkout. The subscription
        // only actually activates once Stripe confirms payment (webhook);
        // there is no "success" to handle here, the browser is leaving the page.
        const { checkout_url } = await api.post<{ checkout_url: string }>(`/subscription/dealer/${dealerId}/checkout`, {
          plan_id: selectedPlan.id, billing_cycle: cycle,
          coupon_code: couponValid?.valid ? coupon : undefined,
        });
        if (checkout_url) { window.location.href = checkout_url; return; }
        throw new Error('Could not start checkout');
      }
      // Free plan — activates immediately, no payment involved.
      await api.post(`/subscription/dealer/${dealerId}/subscribe`, {
        plan_id: selectedPlan.id, billing_cycle: cycle,
        coupon_code: couponValid?.valid ? coupon : undefined,
      });
      onDone();
      onClose();
    } catch (e: any) { setError(e.message || 'Failed'); }
    finally { setProcessing(false); }
  };

  const upgradablePlans = plans.filter((p: any) => p.slug !== currentPlan?.slug && p.slug !== 'free');

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:540, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ padding:'18px 24px', borderBottom:'1px solid #F3F4F6', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <p style={{ fontWeight:800, color:'#111827', margin:0, fontSize:'1rem' }}>Upgrade your plan</p>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={18} color="#9CA3AF" /></button>
        </div>

        <div style={{ padding:24, display:'flex', flexDirection:'column', gap:20 }}>
          {error && <div style={{ background:'#FEE2E2', color:'#991B1B', padding:'10px 14px', borderRadius:8, fontSize:'0.875rem' }}>{error}</div>}

          {/* Billing cycle */}
          <div>
            <p style={{ fontSize:'0.72rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Billing cycle</p>
            <div style={{ display:'flex', gap:8 }}>
              {[{v:'monthly',l:'Monthly'},{v:'quarterly',l:'Quarterly -10%'},{v:'yearly',l:'Yearly -20%'}].map(o => (
                <button key={o.v} onClick={() => setCycle(o.v)}
                  style={{ flex:1, padding:'8px 12px', borderRadius:8, border:`1.5px solid ${cycle===o.v ? '#C1272D' : '#E5E7EB'}`, background: cycle===o.v ? '#FFF1F2' : 'white', color: cycle===o.v ? '#C1272D' : '#6B7280', fontWeight: cycle===o.v ? 700 : 400, fontSize:'0.8rem', cursor:'pointer' }}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          {/* Plan cards */}
          <div>
            <p style={{ fontSize:'0.72rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Choose plan</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {upgradablePlans.map((plan: any) => {
                const price = cycle === 'yearly' ? plan.price_yearly / 12 : cycle === 'quarterly' ? plan.price_quarterly / 3 : plan.price_monthly;
                const active = selectedPlan?.id === plan.id;
                return (
                  <button key={plan.id} onClick={() => setSelectedPlan(plan)}
                    style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:12, border:`2px solid ${active ? plan.color : '#E5E7EB'}`, background: active ? plan.color+'08' : 'white', cursor:'pointer', textAlign:'left' }}>
                    <div style={{ width:44, height:44, borderRadius:10, background:plan.color+'15', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span style={{ fontSize:'1.2rem', fontWeight:800, color:plan.color }}>{plan.name[0]}</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontWeight:700, color:'#111827', margin:'0 0 2px' }}>{plan.name}</p>
                      <p style={{ color:'#6B7280', margin:0, fontSize:'0.8rem' }}>{plan.tagline}</p>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <p style={{ fontWeight:800, color:plan.color, margin:0, fontSize:'1rem' }}>{formatPrice(Math.round(price))}</p>
                      <p style={{ color:'#9CA3AF', margin:0, fontSize:'0.75rem' }}>/mo</p>
                    </div>
                    {active && <Check size={18} style={{ color:plan.color, flexShrink:0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coupon */}
          <div>
            <p style={{ fontSize:'0.72rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Promo code</p>
            <div style={{ display:'flex', gap:8 }}>
              <input value={coupon} onChange={e => { setCoupon(e.target.value); setCouponValid(null); }}
                placeholder="Enter coupon code…" className="input-white" style={{ flex:1, fontSize:'0.875rem' }} />
              <button onClick={validateCoupon} style={{ padding:'10px 16px', border:'1px solid #E5E7EB', borderRadius:10, background:'white', cursor:'pointer', fontSize:'0.875rem', color:'#374151' }}>Apply</button>
            </div>
            {couponValid && (
              <p style={{ fontSize:'0.8rem', color: couponValid.valid ? '#065F46' : '#991B1B', marginTop:4 }}>
                {couponValid.valid ? `✓ ${couponValid.coupon?.discount_value}% discount applied` : `✗ ${couponValid.reason}`}
              </p>
            )}
          </div>
        </div>

        <div style={{ padding:'14px 24px', borderTop:'1px solid #F3F4F6', display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px 0', border:'1.5px solid #E5E7EB', borderRadius:10, background:'white', cursor:'pointer', fontWeight:500, color:'#374151' }}>Cancel</button>
          <button onClick={handleSubscribe} disabled={!selectedPlan || processing}
            style={{ flex:2, padding:'11px 0', background:'#C1272D', color:'white', border:'none', borderRadius:10, fontWeight:700, cursor: (!selectedPlan||processing) ? 'default' : 'pointer', opacity: (!selectedPlan||processing) ? 0.6 : 1, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {processing ? <RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }} /> : <Zap size={14} />}
            {processing ? 'Processing…' : 'Confirm upgrade'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DealerSubscriptionPage() {
  const { t } = useLocale();
  const formatPrice = usePriceFormatter();
  const [sub, setSub] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradePlanId, setUpgradePlanId] = useState('');
  const [dealerId, setDealerId] = useState('');

  useEffect(() => {
    const upgrade = new URLSearchParams(window.location.search).get('upgrade');
    if (upgrade) setUpgradePlanId(upgrade);
    // Intentionally not clearing the query string here: if the person isn't
    // logged in yet, the "Sign in" link below needs ?upgrade= intact to
    // carry the intent through login and back.
  }, []);

  useEffect(() => {
    if (upgradePlanId && dealerId) setShowUpgrade(true);
  }, [upgradePlanId, dealerId]);

  useEffect(() => {
    // No fake fallback ID here — a wrong/nonexistent dealer_id would either
    // 404 confusingly or, worse, silently show a DIFFERENT dealer's billing
    // data if it happened to match a real ID. If dealer_id is missing, the
    // user genuinely isn't logged in as a dealer and should see that plainly.
    const did = localStorage.getItem('dealer_id') || '';
    setDealerId(did);
    if (!did) { setError('You need to be signed in as a dealer to view your subscription.'); setLoading(false); }
  }, []);

  const loadAll = () => {
    if (!dealerId) return;
    setLoading(true); setError('');
    Promise.all([
      api.get<any>(`/subscription/dealer/${dealerId}`),
      api.get<any[]>('/subscription/plans'),
      api.get<any[]>(`/subscription/dealer/${dealerId}/invoices`),
    ]).then(([s, p, inv]) => {
      setSub(s); setPlans(Array.isArray(p) ? p : []); setInvoices(Array.isArray(inv) ? inv : []);
    }).catch((e: any) => {
      setError(e.message || 'Failed to load your subscription');
    }).finally(() => setLoading(false));
  };

  useEffect(loadAll, [dealerId]);

  // Handles the browser landing back from Stripe Checkout (success_url /
  // cancel_url both point here). Webhook activation may take a few seconds
  // to arrive, so on success we poll briefly instead of assuming it's instant.
  const [checkoutNotice, setCheckoutNotice] = useState<'success' | 'cancelled' | ''>('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('checkout');
    if (status === 'success' || status === 'cancelled') {
      setCheckoutNotice(status);
      window.history.replaceState({}, '', window.location.pathname);
      if (status === 'success' && dealerId) {
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          try {
            const s = await api.get<any>(`/subscription/dealer/${dealerId}`);
            if (s?.status === 'active') { setSub(s); clearInterval(poll); }
          } catch { /* keep trying */ }
          if (attempts >= 8) clearInterval(poll); // ~24s, then give up quietly
        }, 3000);
        return () => clearInterval(poll);
      }
    }
  }, [dealerId]);

  const reload = async () => {
    if (!dealerId) return;
    try {
      const s = await api.get<any>(`/subscription/dealer/${dealerId}`);
      setSub(s);
    } catch (e: any) {
      setError(e.message || 'Failed to refresh subscription');
    }
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'50vh' }}>
      <RefreshCw size={24} style={{ color:'#9CA3AF', animation:'spin 1s linear infinite' }} />
    </div>
  );

  if (error) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'50vh', gap:12, padding:24, textAlign:'center' }}>
      <AlertTriangle size={28} style={{ color:'#C1272D' }} />
      <p style={{ fontWeight:700, color:'#111827', margin:0 }}>Couldn't load your subscription</p>
      <p style={{ color:'#6B7280', fontSize:'0.875rem', margin:0, maxWidth:400 }}>{error}</p>
      {dealerId ? (
        <button onClick={loadAll} style={{ marginTop:6, padding:'8px 18px', borderRadius:9, border:'1px solid #E5E7EB', background:'white', fontSize:'0.85rem', fontWeight:700, cursor:'pointer' }}>
          Retry
        </button>
      ) : (
        <a href={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
          style={{ marginTop:6, padding:'9px 20px', borderRadius:9, border:'none', background:'#C1272D', color:'white', fontSize:'0.85rem', fontWeight:700, cursor:'pointer', textDecoration:'none' }}>
          Sign in
        </a>
      )}
    </div>
  );

  const plan = sub?.plan;
  const limits = Object.fromEntries((plan?.limits||[]).map((l:any) => [l.limit_key, l.limit_value]));
  const vehicleCount = sub?.usage?.vehicles_count || 0;
  const aiUsed = sub?.usage?.ai_recognition || 0;

  const STATUS_CFG: Record<string,{label:string;color:string;bg:string}> = {
    active:   { label:'Active',    color:'#065F46', bg:'#D1FAE5' },
    trial:    { label:'Trial',     color:'#1E40AF', bg:'#DBEAFE' },
    past_due: { label:'Past due',  color:'#C1272D', bg:'#FEE2E2' },
    cancelled:{ label:'Cancelled', color:'#374151', bg:'#F3F4F6' },
    expired:  { label:'Expired',   color:'#6B7280', bg:'#F3F4F6' },
    free:     { label:'Free',      color:'#6B7280', bg:'#F3F4F6' },
  };
  const statusKey = sub?.is_free ? 'free' : sub?.status || 'free';
  const stCfg = STATUS_CFG[statusKey] || STATUS_CFG.free;

  return (
    <div style={{ minHeight:'100vh', background:'#F9FAFB' }}>
      {showUpgrade && plan && (
        <UpgradeModal currentPlan={plan} plans={plans} dealerId={dealerId} initialPlanId={upgradePlanId} onClose={() => setShowUpgrade(false)} onDone={reload} />
      )}

      <div style={{ background:'white', borderBottom:'1px solid #E5E7EB', padding:'16px 24px' }}>
        <h1 style={{ fontWeight:700, fontSize:'1.1rem', color:'#111827', margin:0 }}>{t('dealer.subscription.title')}</h1>
        <p style={{ fontSize:'0.8rem', color:'#6B7280', margin:0 }}>Manage your SnapHubTrade.com plan and billing</p>
      </div>

      <div style={{ maxWidth:860, margin:'0 auto', padding:'28px 16px', display:'flex', flexDirection:'column', gap:20 }}>

        {checkoutNotice === 'success' && (
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:12, background:'#D1FAE5', color:'#065F46', fontSize:'0.85rem', fontWeight:600 }}>
            <CheckCircle size={16} /> Payment received — activating your plan (usually just a few seconds)…
          </div>
        )}
        {checkoutNotice === 'cancelled' && (
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:12, background:'#FEF3C7', color:'#92400E', fontSize:'0.85rem', fontWeight:600 }}>
            <AlertTriangle size={16} /> Checkout was cancelled — your plan hasn't changed.
          </div>
        )}

        {/* Current plan card */}
        <div style={{ background:'white', border:`2px solid ${plan?.color || '#E5E7EB'}`, borderRadius:16, padding:24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, flexWrap:'wrap', gap:12 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                <p style={{ fontWeight:800, fontSize:'1.25rem', color:'#111827', margin:0 }}>{plan?.name || 'Free'} Plan</p>
                <span style={{ fontSize:'0.75rem', padding:'3px 10px', borderRadius:20, fontWeight:600, background:stCfg.bg, color:stCfg.color }}>{stCfg.label}</span>
              </div>
              <p style={{ color:'#6B7280', fontSize:'0.875rem', margin:0 }}>{plan?.tagline}</p>
            </div>
            <button onClick={() => setShowUpgrade(true)}
              style={{ padding:'10px 20px', background:'#C1272D', color:'white', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontSize:'0.875rem' }}>
              <TrendingUp size={15} /> Upgrade plan
            </button>
          </div>

          {sub?.current_period_end && !sub?.is_free && (
            <div style={{ display:'flex', gap:6, alignItems:'center', padding:'8px 14px', background:'#F9FAFB', borderRadius:8, marginBottom:16, fontSize:'0.85rem' }}>
              <span style={{ color:'#6B7280' }}>Renews on</span>
              <span style={{ fontWeight:600, color:'#111827' }}>{new Date(sub.current_period_end).toLocaleDateString('en-AE', { day:'numeric', month:'long', year:'numeric' })}</span>
              {sub.days_remaining !== null && <span style={{ marginLeft:'auto', color: sub.days_remaining < 7 ? '#C1272D' : '#6B7280', fontWeight:500 }}>{sub.days_remaining} days left</span>}
            </div>
          )}

          {/* Usage meters */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div>
              <p style={{ fontSize:'0.8rem', fontWeight:600, color:'#374151', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                <Car size={14} color="#C1272D" /> Vehicles
              </p>
              <ProgressBar value={vehicleCount} max={limits.max_vehicles ?? 20} color={plan?.color || '#C1272D'} />
            </div>
            <div>
              <p style={{ fontSize:'0.8rem', fontWeight:600, color:'#374151', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                <Zap size={14} color="#C1272D" /> AI scans this month
              </p>
              <ProgressBar value={aiUsed} max={limits.ai_scans_monthly ?? 10} color={plan?.color || '#C1272D'} />
            </div>
            {limits.max_users && (
              <div>
                <p style={{ fontSize:'0.8rem', fontWeight:600, color:'#374151', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                  <Users size={14} color="#C1272D" /> Staff users
                </p>
                <ProgressBar value={1} max={limits.max_users} color={plan?.color || '#C1272D'} />
              </div>
            )}
          </div>
        </div>

        {/* Features included */}
        {plan?.features && (
          <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:16, padding:24 }}>
            <p style={{ fontWeight:700, color:'#111827', marginBottom:16 }}>Features included in {plan.name}</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {plan.features.filter((pf:any) => pf.enabled).map((pf:any) => (
                <div key={pf.feature.key} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:16 }}>{pf.feature.icon}</span>
                  <span style={{ fontSize:'0.875rem', color:'#374151' }}>{pf.feature.name}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid #F3F4F6' }}>
              <a href="/pricing" style={{ display:'flex', alignItems:'center', gap:6, color:'#C1272D', fontWeight:600, fontSize:'0.875rem', textDecoration:'none' }}>
                Compare all plans <ArrowRight size={14} />
              </a>
            </div>
          </div>
        )}

        {/* Invoices */}
        <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:16, overflow:'hidden' }}>
          <div style={{ padding:'16px 24px', borderBottom:'1px solid #F3F4F6' }}>
            <p style={{ fontWeight:700, color:'#111827', margin:0 }}>Billing history</p>
          </div>
          {invoices.length === 0 ? (
            <div style={{ padding:'32px 24px', textAlign:'center', color:'#9CA3AF' }}>
              <CreditCard size={32} style={{ margin:'0 auto 12px', display:'block', opacity:0.3 }} />
              <p style={{ fontWeight:500 }}>No invoices yet</p>
              <p style={{ fontSize:'0.875rem' }}>Your billing history will appear here</p>
            </div>
          ) : (
            <table className="table-white">
              <thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {invoices.map((inv:any) => (
                  <tr key={inv.id}>
                    <td><span style={{ fontFamily:'monospace', fontSize:'0.8rem', color:'#374151' }}>{inv.invoice_number}</span></td>
                    <td><span style={{ fontSize:'0.875rem', color:'#6B7280' }}>{new Date(inv.created_at).toLocaleDateString()}</span></td>
                    <td><span style={{ fontWeight:600, color:'#111827' }}>{formatPrice(Number(inv.amount_total))}</span></td>
                    <td>
                      <span style={{ fontSize:'0.75rem', padding:'2px 8px', borderRadius:20, fontWeight:500,
                        background: inv.status==='paid'?'#D1FAE5':inv.status==='open'?'#FEF3C7':'#F3F4F6',
                        color: inv.status==='paid'?'#065F46':inv.status==='open'?'#92400E':'#374151' }}>
                        {inv.status}
                      </span>
                    </td>
                    <td>{inv.pdf_url && <a href={inv.pdf_url} target="_blank" style={{ fontSize:'0.8rem', color:'#C1272D' }}>PDF</a>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
