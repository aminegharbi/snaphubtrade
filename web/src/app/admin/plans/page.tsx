'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Copy, Eye, EyeOff, RefreshCw, Check, X, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { usePriceFormatter } from '@/components/common/Price';

export default function AdminPlansPage() {
  const formatPrice = usePriceFormatter();
  const [plans, setPlans] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [editingFeatures, setEditingFeatures] = useState<string|null>(null); // plan id
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    Promise.all([
      api.get<any[]>('/subscription/plans?all=true'),
      api.get<any[]>('/subscription/features'),
    ]).then(([p, f]) => { setPlans(Array.isArray(p) ? p : []); setFeatures(Array.isArray(f) ? f : []); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const reload = () => {
    api.get<any[]>('/subscription/plans?all=true').then(p => setPlans(Array.isArray(p) ? p : [])).catch(() => {});
  };

  const toggleActive = async (plan: any) => {
    try {
      await api.patch(`/subscription/plans/${plan.id}`, { is_active: !plan.is_active });
      setPlans(ps => ps.map(p => p.id === plan.id ? { ...p, is_active: !p.is_active } : p));
      showToast(plan.is_active ? 'Plan hidden' : 'Plan activated');
    } catch { showToast('Failed'); }
  };

  const deletePlan = async (id: string) => {
    if (!confirm('Delete this plan? Active subscribers will not be affected.')) return;
    try {
      await api.delete(`/subscription/plans/${id}`);
      setPlans(ps => ps.filter(p => p.id !== id));
      showToast('Plan deleted');
    } catch (e: any) { showToast(e.message || 'Cannot delete — has active subscribers'); }
  };

  const duplicatePlan = async (id: string) => {
    try {
      const newPlan = await api.post<any>(`/subscription/plans/${id}/duplicate`, {});
      setPlans(ps => [...ps, newPlan]);
      showToast('Plan duplicated');
    } catch { showToast('Duplicate failed'); }
  };

  const savePlan = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        const updated = await api.patch<any>(`/subscription/plans/${editing.id}`, editing);
        setPlans(ps => ps.map(p => p.id === editing.id ? { ...p, ...updated } : p));
      } else {
        const created = await api.post<any>('/subscription/plans', editing);
        setPlans(ps => [...ps, created]);
      }
      setEditing(null);
      showToast('Plan saved');
    } catch (e: any) { showToast(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const savePlanFeatures = async (planId: string, planFeatures: any[]) => {
    setSaving(true);
    try {
      await fetch(`/api/v1/subscription/plans/${planId}/features`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: planFeatures }),
      });
      showToast('Features saved');
      reload();
      setEditingFeatures(null);
    } catch { showToast('Save failed'); }
    finally { setSaving(false); }
  };

  const categories = [...new Set(features.map(f => f.category))];

  return (
    <div>
      {toast && <div style={{ position:'fixed', top:16, right:16, zIndex:50, background:'#111827', color:'white', padding:'10px 16px', borderRadius:10, fontSize:'0.875rem', fontWeight:500 }}>{toast}</div>}

      {/* Edit plan modal */}
      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #F3F4F6', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <p style={{ fontWeight:700, color:'#111827', margin:0 }}>{editing.id ? 'Edit plan' : 'New plan'}</p>
              <button onClick={() => setEditing(null)} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={16} color="#9CA3AF" /></button>
            </div>
            <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
              {[
                { key:'name', label:'Plan name', type:'text', ph:'Pro' },
                { key:'slug', label:'Slug (unique)', type:'text', ph:'pro' },
                { key:'tagline', label:'Tagline', type:'text', ph:'Most popular for professional traders' },
                { key:'description', label:'Description', type:'text', ph:'Full description of the plan' },
                { key:'badge', label:'Badge text', type:'text', ph:'Most Popular' },
                { key:'color', label:'Brand color (hex)', type:'text', ph:'#C1272D' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize:'0.72rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 }}>{f.label}</label>
                  <input value={editing[f.key]||''} onChange={e => setEditing((ed: any) => ({ ...ed, [f.key]: e.target.value }))}
                    placeholder={f.ph} className="input-white" style={{ fontSize:'0.875rem' }} />
                </div>
              ))}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                {[
                  { key:'price_monthly', label:'Monthly price' },
                  { key:'price_quarterly', label:'Quarterly price' },
                  { key:'price_yearly', label:'Yearly price' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize:'0.72rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 }}>{f.label}</label>
                    <input type="number" value={editing[f.key]||0} onChange={e => setEditing((ed: any) => ({ ...ed, [f.key]: +e.target.value }))}
                      className="input-white" style={{ fontSize:'0.875rem' }} />
                  </div>
                ))}
              </div>

              {/* Stripe price IDs — required for a paid plan's Checkout to work at all.
                  Create matching recurring Prices in the Stripe Dashboard first,
                  then paste their IDs here (price_xxx). Leave empty while a plan
                  is free or still being drafted. */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { key:'stripe_price_monthly_id', label:'Stripe Price ID (monthly)', ph:'price_1AbCdE...' },
                  { key:'stripe_price_yearly_id', label:'Stripe Price ID (yearly)', ph:'price_1XyZaB...' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize:'0.72rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 }}>{f.label}</label>
                    <input value={editing[f.key]||''} onChange={e => setEditing((ed: any) => ({ ...ed, [f.key]: e.target.value }))}
                      placeholder={f.ph} className="input-white" style={{ fontSize:'0.8rem', fontFamily:'monospace' }} />
                  </div>
                ))}
              </div>
              {Number(editing.price_monthly||0) > 0 && !editing.stripe_price_monthly_id && (
                <p style={{ fontSize:'0.76rem', color:'#B45309', margin:0, display:'flex', gap:6, alignItems:'flex-start' }}>
                  ⚠️ This plan has a monthly price but no Stripe Price ID — dealers won't be able to check out on this cycle.
                </p>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={{ fontSize:'0.72rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 }}>Trial days</label>
                  <input type="number" value={editing.trial_days||0} onChange={e => setEditing((ed: any) => ({ ...ed, trial_days: +e.target.value }))}
                    className="input-white" style={{ fontSize:'0.875rem' }} />
                </div>
                <div>
                  <label style={{ fontSize:'0.72rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 }}>Sort order</label>
                  <input type="number" value={editing.sort_order||0} onChange={e => setEditing((ed: any) => ({ ...ed, sort_order: +e.target.value }))}
                    className="input-white" style={{ fontSize:'0.875rem' }} />
                </div>
              </div>
            </div>
            <div style={{ padding:'14px 20px', borderTop:'1px solid #F3F4F6', display:'flex', gap:10 }}>
              <button onClick={() => setEditing(null)} style={{ flex:1, padding:'10px 0', border:'1.5px solid #E5E7EB', borderRadius:10, background:'white', cursor:'pointer', fontWeight:500, color:'#374151' }}>Cancel</button>
              <button onClick={savePlan} disabled={saving}
                style={{ flex:2, padding:'10px 0', background:'#C1272D', color:'white', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity: saving ? 0.7 : 1 }}>
                {saving ? <RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }} /> : <Save size={14} />}
                {saving ? 'Saving…' : 'Save plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background:'white', borderBottom:'1px solid #E5E7EB', padding:'20px 32px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1 style={{ fontWeight:700, fontSize:'1.1rem', color:'#111827', margin:0 }}>Plan Management</h1>
          <p style={{ fontSize:'0.8rem', color:'#6B7280', margin:0 }}>Create and configure subscription plans</p>
        </div>
        <button onClick={() => setEditing({ name:'', slug:'', price_monthly:0, price_quarterly:0, price_yearly:0, trial_days:0, sort_order:0, color:'#C1272D' })}
          style={{ padding:'9px 16px', background:'#C1272D', color:'white', border:'none', borderRadius:10, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontSize:'0.875rem' }}>
          <Plus size={14} /> New plan
        </button>
      </div>

      <div style={{ padding:'24px 32px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'#9CA3AF' }}>
            <RefreshCw size={22} style={{ animation:'spin 1s linear infinite', display:'block', margin:'0 auto' }} />
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {plans.map(plan => (
              <div key={plan.id} style={{ background:'white', border:`2px solid ${plan.is_active ? plan.color+'40' : '#E5E7EB'}`, borderRadius:14, overflow:'hidden', opacity: plan.is_active ? 1 : 0.65 }}>
                {/* Plan header */}
                <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:12, borderBottom:'1px solid #F3F4F6' }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:plan.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ color:'white', fontWeight:800, fontSize:'0.9rem' }}>{plan.name[0]}</span>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <p style={{ fontWeight:700, color:'#111827', margin:0 }}>{plan.name}</p>
                      {plan.badge && <span style={{ fontSize:'0.7rem', padding:'2px 8px', borderRadius:20, background:plan.color+'15', color:plan.color, fontWeight:700, border:`1px solid ${plan.color}30` }}>{plan.badge}</span>}
                      {!plan.is_active && <span style={{ fontSize:'0.7rem', padding:'2px 8px', borderRadius:20, background:'#F3F4F6', color:'#6B7280', fontWeight:600 }}>Hidden</span>}
                    </div>
                    <p style={{ color:'#9CA3AF', margin:0, fontSize:'0.8rem' }}>{plan.tagline}</p>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <span style={{ fontSize:'0.9rem', fontWeight:800, color:plan.color }}>{formatPrice(Number(plan.price_monthly))}/mo</span>
                  </div>
                  <div style={{ display:'flex', gap:6, marginLeft:8 }}>
                    <button onClick={() => setEditing({ ...plan })} style={{ padding:6, borderRadius:7, border:'1px solid #E5E7EB', background:'white', cursor:'pointer' }} title="Edit"><Edit3 size={13} color="#6B7280" /></button>
                    <button onClick={() => duplicatePlan(plan.id)} style={{ padding:6, borderRadius:7, border:'1px solid #E5E7EB', background:'white', cursor:'pointer' }} title="Duplicate"><Copy size={13} color="#6B7280" /></button>
                    <button onClick={() => toggleActive(plan)} style={{ padding:6, borderRadius:7, border:'1px solid #E5E7EB', background:'white', cursor:'pointer' }} title={plan.is_active ? 'Hide' : 'Show'}>
                      {plan.is_active ? <Eye size={13} color="#6B7280" /> : <EyeOff size={13} color="#9CA3AF" />}
                    </button>
                    <button onClick={() => deletePlan(plan.id)} style={{ padding:6, borderRadius:7, border:'1px solid #FECACA', background:'#FEF2F2', cursor:'pointer' }} title="Delete"><Trash2 size={13} color="#DC2626" /></button>
                  </div>
                </div>

                {/* Features toggle */}
                <div style={{ padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:'0.78rem', color:'#6B7280' }}>{plan.features?.filter((f:any)=>f.enabled).length||0} features</span>
                    <span style={{ fontSize:'0.78rem', color:'#6B7280' }}>·</span>
                    <span style={{ fontSize:'0.78rem', color:'#6B7280' }}>{plan.limits?.length||0} limits</span>
                    {plan.limits?.find((l:any)=>l.limit_key==='max_vehicles') && (
                      <span style={{ fontSize:'0.78rem', padding:'2px 8px', borderRadius:20, background:'#F3F4F6', color:'#374151', fontWeight:500 }}>
                        {plan.limits.find((l:any)=>l.limit_key==='max_vehicles').limit_value === -1 ? '∞' : plan.limits.find((l:any)=>l.limit_key==='max_vehicles').limit_value} vehicles
                      </span>
                    )}
                  </div>
                  <button onClick={() => setEditingFeatures(editingFeatures===plan.id ? null : plan.id)}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:7, border:'1px solid #E5E7EB', background:'white', cursor:'pointer', fontSize:'0.8rem', color:'#374151' }}>
                    Manage features {editingFeatures===plan.id ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                  </button>
                </div>

                {/* Feature editor */}
                {editingFeatures === plan.id && (
                  <FeatureEditor plan={plan} features={features} categories={categories} onSave={savePlanFeatures} saving={saving} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

function FeatureEditor({ plan, features, categories, onSave, saving }: any) {
  const [localFeatures, setLocalFeatures] = useState<Record<string,{enabled:boolean;limit_value:number|null}>>(() => {
    const map: any = {};
    features.forEach((f: any) => {
      const pf = plan.features?.find((pff: any) => pff.feature_id === f.id || pff.feature?.id === f.id);
      map[f.id] = { enabled: !!pf?.enabled, limit_value: pf?.limit_value ?? null };
    });
    return map;
  });

  const [localLimits, setLocalLimits] = useState<Record<string,{name:string;value:number}>>(() => {
    const map: any = {};
    plan.limits?.forEach((l: any) => { map[l.limit_key] = { name: l.limit_name, value: l.limit_value }; });
    return map;
  });

  const LIMIT_KEYS = [
    { key:'max_vehicles', name:'Max Active Vehicles' },
    { key:'max_users', name:'Max Staff Users' },
    { key:'ai_scans_monthly', name:'AI Scans per Month' },
    { key:'max_photos', name:'Photos per Vehicle' },
    { key:'max_shares', name:'Shared Vehicles' },
  ];

  const handleSave = () => {
    const featuresList = Object.entries(localFeatures).map(([fid, val]) => ({
      feature_id: fid, enabled: val.enabled, limit_value: val.limit_value,
    }));
    onSave(plan.id, featuresList);
    // Also save limits
    const limitsList = Object.entries(localLimits).map(([key, val]) => ({
      limit_key: key, limit_name: val.name, limit_value: val.value,
    }));
    fetch(`/api/v1/subscription/plans/${plan.id}/limits`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ limits: limitsList }),
    });
  };

  return (
    <div style={{ borderTop:'1px solid #F3F4F6', padding:20 }}>
      {/* Limits */}
      <p style={{ fontSize:'0.72rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>Plan limits (-1 = unlimited)</p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:10, marginBottom:20 }}>
        {LIMIT_KEYS.map(lk => (
          <div key={lk.key}>
            <label style={{ fontSize:'0.75rem', color:'#6B7280', display:'block', marginBottom:4 }}>{lk.name}</label>
            <input type="number" min={-1}
              value={localLimits[lk.key]?.value ?? 0}
              onChange={e => setLocalLimits(prev => ({ ...prev, [lk.key]: { name: lk.name, value: +e.target.value } }))}
              className="input-white" style={{ fontSize:'0.875rem' }} />
          </div>
        ))}
      </div>

      {/* Features by category */}
      <p style={{ fontSize:'0.72rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>Features</p>
      {categories.map((cat: string) => {
        const catFeatures = features.filter((f: any) => f.category === cat);
        return (
          <div key={cat} style={{ marginBottom:16 }}>
            <p style={{ fontSize:'0.78rem', fontWeight:600, color:'#374151', marginBottom:8, textTransform:'capitalize' }}>{cat}</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:6 }}>
              {catFeatures.map((f: any) => {
                const lf = localFeatures[f.id] || { enabled:false, limit_value:null };
                return (
                  <div key={f.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8, border:`1px solid ${lf.enabled ? '#FECACA' : '#E5E7EB'}`, background: lf.enabled ? '#FFF1F2' : 'white' }}>
                    <input type="checkbox" checked={lf.enabled}
                      onChange={e => setLocalFeatures(prev => ({ ...prev, [f.id]: { ...lf, enabled: e.target.checked } }))}
                      style={{ accentColor:'#C1272D', width:14, height:14, flexShrink:0 }} />
                    <span style={{ fontSize:'0.78rem', color:'#374151', flex:1 }}>{f.icon} {f.name}</span>
                    {lf.enabled && (
                      <input type="number" placeholder="∞" value={lf.limit_value ?? ''}
                        onChange={e => setLocalFeatures(prev => ({ ...prev, [f.id]: { ...lf, limit_value: e.target.value ? +e.target.value : null } }))}
                        style={{ width:48, padding:'2px 5px', border:'1px solid #FECACA', borderRadius:5, fontSize:'0.72rem', color:'#C1272D', textAlign:'center' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <button onClick={handleSave} disabled={saving}
        style={{ marginTop:8, padding:'10px 24px', background:'#C1272D', color:'white', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontSize:'0.875rem', opacity: saving ? 0.7 : 1 }}>
        {saving ? <RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }} /> : <Save size={14} />}
        Save features & limits
      </button>
    </div>
  );
}
