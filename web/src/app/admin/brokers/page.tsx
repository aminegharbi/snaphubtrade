'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Search, Edit3, Phone, Loader2, RefreshCw, Award } from 'lucide-react';
import { api } from '@/lib/api';
import { AdminBrokerEditModal } from '@/components/admin/AdminBrokerEditModal';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:    { bg: '#d1fae5', text: '#065f46' },
  pending:   { bg: '#fef3c7', text: '#92400e' },
  suspended: { bg: '#fee2e2', text: '#991b1b' },
  rejected:  { bg: '#f3f4f6', text: '#374151' },
};

export default function AdminBrokersPage() {
  const [brokers, setBrokers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState('');
  const [editingBrokerId, setEditingBrokerId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: '20', page: String(page) });
      if (search) p.set('search', search);
      const data = await api.get<any>(`/admin/brokers?${p}`);
      setBrokers(data.items || []);
      setTotal(data.total || 0);
    } catch { setBrokers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, page]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg"
          style={{ background: '#111827', color: 'white' }}>{toast}</div>
      )}

      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '20px 32px' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#111827' }}>Broker Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">{total} brokers registered</p>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-48 max-w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search broker…" className="input-white pl-9 text-sm py-2" />
          </div>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : (
            <table className="table-white">
              <thead>
                <tr>
                  <th>Broker</th>
                  <th>Contact</th>
                  <th>Code affiliation</th>
                  <th>Palier</th>
                  <th>Commission</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {brokers.map(b => {
                  const colors = STATUS_COLORS[b.status] || STATUS_COLORS.pending;
                  return (
                    <tr key={b.id}>
                      <td>
                        <div>
                          <p className="font-medium text-sm" style={{ color: '#111827' }}>{b.full_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-48">{b.email}</p>
                        </div>
                      </td>
                      <td>
                        <div className="text-xs text-gray-500 space-y-0.5">
                          {b.phone && <p className="flex items-center gap-1"><Phone size={10} />{b.phone}</p>}
                        </div>
                      </td>
                      <td><span className="text-xs font-mono text-gray-600">{b.affiliate_code}</span></td>
                      <td>
                        <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#B8860B' }}>
                          <Award size={11} /> {b.tier}
                        </span>
                      </td>
                      <td><span className="text-xs font-medium">{(Number(b.commission_rate) * 100).toFixed(1)}%</span></td>
                      <td>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: colors.bg, color: colors.text }}>
                          {b.status}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => setEditingBrokerId(b.id)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
                          <Edit3 size={11} /> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {total > 20 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
            <div className="flex gap-2">
              {page > 1 && <button onClick={() => setPage(p => p - 1)} className="btn-secondary px-3 py-1.5 text-sm">← Prev</button>}
              {page * 20 < total && <button onClick={() => setPage(p => p + 1)} className="btn-secondary px-3 py-1.5 text-sm">Next →</button>}
            </div>
          </div>
        )}
      </div>

      {editingBrokerId && (
        <AdminBrokerEditModal
          brokerId={editingBrokerId}
          onClose={() => setEditingBrokerId(null)}
          onSaved={(updated) => {
            setBrokers(bs => bs.map(b => b.id === updated.id ? { ...b, ...updated } : b));
            showToast('Broker updated');
          }}
        />
      )}
    </div>
  );
}
