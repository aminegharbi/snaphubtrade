'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, Zap, RefreshCw, BarChart3, CheckCircle, AlertTriangle, Settings, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { usePriceFormatter } from '@/components/common/Price';

function StatBox({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="stat-card">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <p style={{ fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#6B7280', margin:0 }}>{label}</p>
        <div style={{ width:34, height:34, borderRadius:8, background:color+'15', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <p style={{ fontSize:'1.75rem', fontWeight:800, color:'#111827', margin:'0 0 2px' }}>{value}</p>
      {sub && <p style={{ fontSize:'0.75rem', color:'#9CA3AF', margin:0 }}>{sub}</p>}
    </div>
  );
}

export default function AdminSubscriptionsPage() {
  const formatPrice = usePriceFormatter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    Promise.all([
      api.get<any>('/subscription/admin/analytics'),
    ]).then(([a]) => { setAnalytics(a); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadSubs(); }, [statusFilter, planFilter, page]);

  const loadSubs = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit:'20' });
      if (statusFilter) params.set('status', statusFilter);
      if (planFilter) params.set('plan_slug', planFilter);
      const data = await api.get<any>(`/subscription/admin/subscriptions?${params}`);
      setSubs(data.items || []);
      setTotal(data.total || 0);
    } catch { setSubs([]); }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await api.patch(`/subscription/admin/subscriptions/${id}`, { status });
      setSubs(s => s.map(sub => sub.id === id ? { ...sub, status } : sub));
      showToast('Status updated');
    } catch { showToast('Failed'); }
    finally { setUpdatingId(''); }
  };

  const STATUS_CFG: Record<string,{color:string;bg:string}> = {
    active:    { color:'#065F46', bg:'#D1FAE5' },
    trial:     { color:'#1E40AF', bg:'#DBEAFE' },
    past_due:  { color:'#C1272D', bg:'#FEE2E2' },
    cancelled: { color:'#374151', bg:'#F3F4F6' },
    expired:   { color:'#6B7280', bg:'#F3F4F6' },
  };

  const PLAN_COLORS: Record<string,string> = { free:'#6B7280', pro:'#C1272D', enterprise:'#007A3D' };

  return (
    <div>
      {toast && <div style={{ position:'fixed', top:16, right:16, zIndex:50, background:'#111827', color:'white', padding:'10px 16px', borderRadius:10, fontSize:'0.875rem', fontWeight:500 }}>{toast}</div>}

      <div style={{ background:'white', borderBottom:'1px solid #E5E7EB', padding:'20px 32px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h1 style={{ fontWeight:700, fontSize:'1.1rem', color:'#111827', margin:0 }}>Subscription Management</h1>
            <p style={{ fontSize:'0.8rem', color:'#6B7280', margin:0 }}>SaaS analytics and dealer subscriptions</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <a href="/admin/plans" style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #E5E7EB', background:'white', textDecoration:'none', fontSize:'0.875rem', color:'#374151', display:'flex', alignItems:'center', gap:6 }}>
              <Settings size={14} /> Manage plans
            </a>
            <button onClick={loadSubs} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #E5E7EB', background:'white', cursor:'pointer', fontSize:'0.875rem', color:'#374151', display:'flex', alignItems:'center', gap:6 }}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding:'24px 32px' }}>
        {/* Analytics */}
        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'#9CA3AF' }}><RefreshCw size={20} style={{ animation:'spin 1s linear infinite', display:'block', margin:'0 auto' }} /></div>
        ) : analytics && (
          <>
            <div className="da-kpi-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
              <StatBox label="MRR" value={formatPrice(analytics.revenue?.mrr||0)} icon={DollarSign} color="#007A3D" sub="Monthly recurring revenue" />
              <StatBox label="ARR" value={formatPrice(analytics.revenue?.arr||0)} icon={TrendingUp} color="#C1272D" sub="Annual recurring revenue" />
              <StatBox label="Total dealers" value={analytics.dealers?.total} icon={Users} color="#3B82F6" sub={`${analytics.dealers?.new_this_month} new this month`} />
              <StatBox label="Conversion" value={`${analytics.rates?.conversion}%`} icon={BarChart3} color="#8B5CF6" sub="Free → paid conversion" />
            </div>

            {/* Plan breakdown */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginBottom:24 }}>
              {[
                { label:'Free', count:analytics.dealers?.free, color:'#6B7280' },
                { label:'Pro', count:analytics.dealers?.pro, color:'#C1272D' },
                { label:'Enterprise', count:analytics.dealers?.enterprise, color:'#007A3D' },
              ].map(plan => (
                <div key={plan.label} style={{ background:'white', border:`2px solid ${plan.color}25`, borderRadius:12, padding:16, display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:40, height:40, borderRadius:8, background:plan.color+'15', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontWeight:800, color:plan.color, fontSize:'0.9rem' }}>{plan.label[0]}</span>
                  </div>
                  <div>
                    <p style={{ fontWeight:800, fontSize:'1.5rem', color:'#111827', margin:0 }}>{plan.count}</p>
                    <p style={{ fontSize:'0.8rem', color:'#6B7280', margin:0 }}>{plan.label} dealers</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Subscriptions table */}
        <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid #F3F4F6', display:'flex', gap:10, flexWrap:'wrap' }}>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-white" style={{ width:140, fontSize:'0.875rem', padding:'7px 10px' }}>
              <option value="">All status</option>
              {['active','trial','past_due','cancelled','expired'].map(s => <option key={s} value={s} className="capitalize">{s.replace('_',' ')}</option>)}
            </select>
            <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1); }} className="input-white" style={{ width:120, fontSize:'0.875rem', padding:'7px 10px' }}>
              <option value="">All plans</option>
              {['free','pro','enterprise'].map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
            </select>
            <span style={{ fontSize:'0.8rem', color:'#9CA3AF', alignSelf:'center', marginLeft:'auto' }}>{total} subscriptions</span>
          </div>

          <table className="table-white">
            <thead>
              <tr>
                <th>Dealer</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Billing</th>
                <th>Renews</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subs.map(s => {
                const st = STATUS_CFG[s.status] || STATUS_CFG.cancelled;
                const planColor = PLAN_COLORS[s.plan?.slug] || '#6B7280';
                return (
                  <tr key={s.id}>
                    <td>
                      <div>
                        <p style={{ fontWeight:600, color:'#111827', margin:0, fontSize:'0.875rem' }}>{s.dealer?.company_name}</p>
                        <p style={{ color:'#9CA3AF', margin:0, fontSize:'0.75rem' }}>{s.dealer?.email}</p>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight:700, color:planColor, fontSize:'0.875rem' }}>{s.plan?.name}</span>
                    </td>
                    <td>
                      <span style={{ fontSize:'0.75rem', padding:'3px 10px', borderRadius:20, fontWeight:600, background:st.bg, color:st.color }}>
                        {s.status.replace('_',' ')}
                      </span>
                    </td>
                    <td><span style={{ fontSize:'0.875rem', color:'#6B7280', textTransform:'capitalize' }}>{s.billing_cycle}</span></td>
                    <td>
                      {s.current_period_end && <span style={{ fontSize:'0.8rem', color:'#6B7280' }}>{new Date(s.current_period_end).toLocaleDateString()}</span>}
                    </td>
                    <td>
                      <select value={s.status} disabled={updatingId === s.id}
                        onChange={e => updateStatus(s.id, e.target.value)}
                        style={{ padding:'5px 8px', border:'1px solid #E5E7EB', borderRadius:7, fontSize:'0.75rem', color:'#374151', cursor:'pointer' }}>
                        {['active','trial','past_due','cancelled','expired'].map(st2 => (
                          <option key={st2} value={st2}>{st2.replace('_',' ')}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {subs.length === 0 && (
            <div style={{ padding:'40px', textAlign:'center', color:'#9CA3AF' }}>
              <Users size={32} style={{ margin:'0 auto 12px', display:'block', opacity:0.3 }} />
              <p>No subscriptions found</p>
            </div>
          )}
        </div>

        {total > 20 && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:14 }}>
            <p style={{ fontSize:'0.875rem', color:'#6B7280' }}>{(page-1)*20+1}–{Math.min(page*20,total)} of {total}</p>
            <div style={{ display:'flex', gap:8 }}>
              {page > 1 && <button onClick={() => setPage(p=>p-1)} className="btn-secondary" style={{ padding:'7px 14px', fontSize:'0.875rem' }}>← Prev</button>}
              {page*20 < total && <button onClick={() => setPage(p=>p+1)} className="btn-secondary" style={{ padding:'7px 14px', fontSize:'0.875rem' }}>Next →</button>}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
