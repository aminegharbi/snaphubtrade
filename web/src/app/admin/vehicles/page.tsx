'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Search, Car, Loader2, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { usePriceFormatter } from '@/components/common/Price';

const STATUS_COLORS: Record<string,{bg:string;color:string}> = {
  available:{bg:'#d1fae5',color:'#065f46'},
  reserved:{bg:'#fef3c7',color:'#92400e'},
  sold:{bg:'#e5e7eb',color:'#374151'},
  draft:{bg:'#ede9fe',color:'#5b21b6'},
  exported:{bg:'#dbeafe',color:'#1e40af'},
};

export default function AdminVehiclesPage() {
  const formatPrice = usePriceFormatter();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState('');

  const showToast = (m:string) => { setToast(m); setTimeout(()=>setToast(''),3000); };

  const load = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(page), limit:'20' });
      if (search) p.set('query', search);
      if (status) p.set('status', status);
      else p.delete('status');
      const data = await api.get<any>(`/search?${p}&status=${status||'all'}`);
      setVehicles(data.items||[]);
      setTotal(data.total||0);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, status, page]);

  const deleteVehicle = async (id: string) => {
    if (!confirm('Delete this vehicle listing?')) return;
    try {
      await api.delete(`/vehicles/${id}`);
      setVehicles(v => v.filter(x=>x.id!==id));
      showToast('Vehicle deleted');
    } catch { showToast('Delete failed'); }
  };

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg"
          style={{background:'#111827', color:'white'}}>{toast}</div>
      )}

      <div style={{background:'white', borderBottom:'1px solid #e5e7eb', padding:'20px 32px'}}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{color:'#111827'}}>Vehicles</h1>
            <p className="text-sm text-gray-400 mt-0.5">{total} listings</p>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
            <RefreshCw size={14}/> Refresh
          </button>
        </div>
      </div>

      <div style={{padding:'24px 32px'}}>
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-48 max-w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
              placeholder="Search make, model…" className="input-white pl-9 text-sm py-2"/>
          </div>
          <select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}} className="input-white text-sm py-2 w-36">
            <option value="">All status</option>
            {['available','reserved','sold','draft','exported'].map(s=><option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-gray-400"/></div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Car size={32} className="mx-auto mb-3 opacity-40"/>
              <p>No vehicles found</p>
            </div>
          ) : (
            <table className="table-white">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Views</th>
                  <th>Dealer</th>
                  <th>Export</th>
                  <th>Listed</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v:any) => {
                  const sc = STATUS_COLORS[v.status]||STATUS_COLORS.available;
                  return (
                    <tr key={v.id}>
                      <td>
                        <div>
                          <p className="font-medium text-sm" style={{color:'#111827'}}>{v.year} {v.make} {v.model}</p>
                          <p className="text-xs text-gray-400">{v.trim||v.body_type||'—'} · {v.mileage_km===0?'New':`${v.mileage_km.toLocaleString()} km`}</p>
                        </div>
                      </td>
                      <td><span className="text-sm font-semibold" style={{color:'#C1272D'}}>{formatPrice(Number(v.price_aed))}</span></td>
                      <td><span className="badge text-xs capitalize" style={{background:sc.bg,color:sc.color}}>{v.status}</span></td>
                      <td><span className="text-sm text-gray-500">{v.view_count||0}</span></td>
                      <td><span className="text-xs text-gray-500 truncate max-w-24 block">{v.dealer?.company_name||'—'}</span></td>
                      <td><span className={`text-xs font-medium ${v.export_eligible?'text-blue-600':'text-gray-400'}`}>{v.export_eligible?'✈ Yes':'No'}</span></td>
                      <td><span className="text-xs text-gray-400">{new Date(v.created_at).toLocaleDateString()}</span></td>
                      <td>
                        <div className="flex items-center gap-1">
                          <a href={`/vehicle/${v.id}`} target="_blank"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all">
                            <Eye size={13}/>
                          </a>
                          <button onClick={()=>deleteVehicle(v.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {total>20 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">{(page-1)*20+1}–{Math.min(page*20,total)} of {total}</p>
            <div className="flex gap-2">
              {page>1 && <button onClick={()=>setPage(p=>p-1)} className="btn-secondary px-3 py-1.5 text-sm">← Prev</button>}
              {page*20<total && <button onClick={()=>setPage(p=>p+1)} className="btn-secondary px-3 py-1.5 text-sm">Next →</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
