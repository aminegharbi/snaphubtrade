'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Edit3, Star, MapPin, Phone, Globe, Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { AdminDealerEditModal } from '@/components/admin/AdminDealerEditModal';

export default function AdminDealersPage() {
  const [dealers, setDealers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [zone, setZone] = useState('');
  const [countries, setCountries] = useState<any[]>([]);
  const [freeZones, setFreeZones] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [updating, setUpdating] = useState<string|null>(null);
  const [toast, setToast] = useState('');
  const [editingDealerId, setEditingDealerId] = useState<string|null>(null);

  useEffect(() => {
    api.get<any[]>('/countries').then(setCountries).catch(() => {});
  }, []);

  // Zone options depend on the selected country — reset zone when country changes.
  useEffect(() => {
    setZone('');
    if (!country) { setFreeZones([]); return; }
    api.get<any[]>(`/countries/${country}/free-zones`).then(setFreeZones).catch(() => setFreeZones([]));
  }, [country]);

  const load = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit:'20', page: String(page) });
      if (search) p.set('search', search);
      if (country) p.set('country', country);
      if (zone) p.set('zone', zone);
      const data = await api.get<any>(`/dealers?${p}`);
      setDealers(data.items||[]);
      setTotal(data.total||0);
    } catch { setDealers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, country, zone, page]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const toggleVerified = async (id: string, current: boolean) => {
    setUpdating(id);
    try {
      await api.patch(`/admin/dealers/${id}`, { verified: !current });
      setDealers(ds => ds.map(d => d.id===id ? {...d, verified:!current} : d));
      showToast(`Dealer ${!current ? 'verified' : 'unverified'}`);
    } catch { showToast('Update failed'); }
    finally { setUpdating(null); }
  };

  const updateTier = async (id: string, tier: string) => {
    setUpdating(id);
    try {
      await api.patch(`/admin/dealers/${id}`, { subscription_tier: tier });
      setDealers(ds => ds.map(d => d.id===id ? {...d, subscription_tier:tier} : d));
      showToast('Plan updated');
    } catch { showToast('Update failed'); }
    finally { setUpdating(null); }
  };

  const TIERS = ['free','starter','pro','enterprise'];
  const TIER_COLORS: Record<string,string> = { free:'#6b7280', starter:'#3B82F6', pro:'#8B5CF6', enterprise:'#C1272D' };

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg"
          style={{background:'#111827', color:'white'}}>{toast}</div>
      )}

      <div style={{background:'white', borderBottom:'1px solid #e5e7eb', padding:'20px 32px'}}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{color:'#111827'}}>Dealer Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">{total} dealers registered</p>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div style={{padding:'24px 32px'}}>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-48 max-w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
              placeholder="Search dealer…" className="input-white pl-9 text-sm py-2" />
          </div>
          <select value={country} onChange={e=>{setCountry(e.target.value);setPage(1);}}
            className="input-white text-sm py-2 w-44">
            <option value="">All countries</option>
            {countries.map((c:any) => <option key={c.id} value={c.code}>{c.name}</option>)}
          </select>
          {freeZones.length > 0 && (
            <select value={zone} onChange={e=>{setZone(e.target.value);setPage(1);}}
              className="input-white text-sm py-2 w-44">
              <option value="">All zones</option>
              {freeZones.map((z:any) => <option key={z.id} value={z.code}>{z.name}</option>)}
            </select>
          )}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : (
            <table className="table-white">
              <thead>
                <tr>
                  <th>Dealer</th>
                  <th>Contact</th>
                  <th>Zone</th>
                  <th>Plan</th>
                  <th>Rating</th>
                  <th>Verified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dealers.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div>
                        <p className="font-medium text-sm" style={{color:'#111827'}}>{d.company_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-48">{d.email}</p>
                      </div>
                    </td>
                    <td>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        {d.phone && <p className="flex items-center gap-1"><Phone size={10}/>{d.phone}</p>}
                        {d.website && <a href={d.website} target="_blank" className="flex items-center gap-1 text-blue-500 hover:underline"><Globe size={10}/>Website</a>}
                      </div>
                    </td>
                    <td>
                      <div className="text-xs text-gray-500 flex items-start gap-1">
                        <MapPin size={10} className="mt-0.5 shrink-0" />
                        <span className="line-clamp-2 max-w-32">
                          {d.address}
                          {d.country?.code && <span className="ml-1 font-semibold text-gray-400">· {d.country.code}</span>}
                        </span>
                      </div>
                    </td>
                    <td>
                      <select value={d.subscription_tier||'free'} disabled={updating===d.id}
                        onChange={e=>updateTier(d.id, e.target.value)}
                        className="text-xs rounded-lg px-2 py-1.5 border border-gray-200 font-medium"
                        style={{color: TIER_COLORS[d.subscription_tier||'free']}}>
                        {TIERS.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Star size={12} fill="#C1272D" style={{color:'#C1272D'}} />
                        <span className="text-sm font-medium">{Number(d.rating||0).toFixed(1)}</span>
                        <span className="text-xs text-gray-400">({d.review_count||0})</span>
                      </div>
                    </td>
                    <td>
                      <button onClick={()=>toggleVerified(d.id, d.verified)} disabled={updating===d.id}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={d.verified
                          ? {background:'#d1fae5', color:'#065f46'}
                          : {background:'#fee2e2', color:'#991b1b'}}>
                        {updating===d.id ? <Loader2 size={11} className="animate-spin" />
                          : d.verified ? <CheckCircle size={11}/> : <XCircle size={11}/>}
                        {d.verified ? 'Verified' : 'Unverified'}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button onClick={()=>setEditingDealerId(d.id)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
                          <Edit3 size={11} /> Edit
                        </button>
                        <a href={`/dealers/${d.slug}`} target="_blank"
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
                          View →
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">Showing {(page-1)*20+1}–{Math.min(page*20,total)} of {total}</p>
            <div className="flex gap-2">
              {page>1 && <button onClick={()=>setPage(p=>p-1)} className="btn-secondary px-3 py-1.5 text-sm">← Prev</button>}
              {page*20<total && <button onClick={()=>setPage(p=>p+1)} className="btn-secondary px-3 py-1.5 text-sm">Next →</button>}
            </div>
          </div>
        )}
      </div>

      {editingDealerId && (
        <AdminDealerEditModal
          dealerId={editingDealerId}
          onClose={() => setEditingDealerId(null)}
          onSaved={(updated) => {
            setDealers(ds => ds.map(d => d.id === updated.id ? { ...d, ...updated } : d));
            showToast('Dealer updated');
          }}
        />
      )}
    </div>
  );
}
