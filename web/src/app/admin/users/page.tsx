'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Search, User, Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const load = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(page), limit:'20' });
      if (search) p.set('search', search);
      if (role) p.set('role', role);
      const res = await fetch(`/api/v1/admin/users?${p}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.items||[]);
        setTotal(data.total||0);
      }
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, role, page]);

  const ROLE_COLORS: Record<string,string> = {
    super_admin:'#C1272D', dealer:'#3B82F6', buyer:'#6b7280', manager:'#8B5CF6'
  };

  const toggleVerified = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/v1/admin/users/${id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email_verified: !current })
      });
      if (res.ok) {
        setUsers(us => us.map(u => u.id===id ? {...u, email_verified:!current} : u));
        showToast('User updated');
      }
    } catch { showToast('Failed'); }
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
            <h1 className="text-xl font-bold" style={{color:'#111827'}}>User Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">{total} registered users</p>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div style={{padding:'24px 32px'}}>
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-48 max-w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
              placeholder="Search name or email…" className="input-white pl-9 text-sm py-2" />
          </div>
          <select value={role} onChange={e=>{setRole(e.target.value);setPage(1);}}
            className="input-white text-sm py-2 w-36">
            <option value="">All roles</option>
            <option value="buyer">Buyers</option>
            <option value="dealer">Dealers</option>
            <option value="super_admin">Admins</option>
          </select>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <User size={32} className="mx-auto mb-3 opacity-40" />
              <p>No users found. Admin users endpoint may need setup.</p>
              <p className="text-xs mt-2">Endpoint: GET /api/v1/admin/users</p>
            </div>
          ) : (
            <table className="table-white">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Verified</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div>
                        <p className="font-medium text-sm" style={{color:'#111827'}}>{u.full_name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </td>
                    <td>
                      <span className="badge text-xs font-medium px-2 py-1 rounded-full"
                        style={{background: (ROLE_COLORS[u.role]||'#6b7280')+'15', color: ROLE_COLORS[u.role]||'#6b7280'}}>
                        {u.role}
                      </span>
                    </td>
                    <td><span className="text-sm text-gray-500">{u.phone||'—'}</span></td>
                    <td>
                      <button onClick={()=>toggleVerified(u.id, u.email_verified)}
                        className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg"
                        style={u.email_verified ? {background:'#d1fae5',color:'#065f46'} : {background:'#fee2e2',color:'#991b1b'}}>
                        {u.email_verified ? <><CheckCircle size={11}/> Verified</> : <><XCircle size={11}/> Unverified</>}
                      </button>
                    </td>
                    <td><span className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString()}</span></td>
                    <td>
                      <button className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
