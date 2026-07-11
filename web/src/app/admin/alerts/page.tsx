'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Loader2, Search } from 'lucide-react';
import { usePriceFormatter } from '@/components/common/Price';

const MAKES = ['Toyota','Mercedes-Benz','BMW','Nissan','Porsche','Range Rover','Ford','Audi','Lexus','BYD'];
const CHANNELS = ['email','whatsapp','push','sms'];

export default function AdminAlertsPage() {
  const formatPrice = usePriceFormatter();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({
    user_email:'', make:'', model:'', year_min:'', year_max:'',
    max_price_aed:'', min_price_aed:'', fuel_type:'',
    channels: ['email'] as string[],
  });

  const showToast = (m:string) => { setToast(m); setTimeout(()=>setToast(''),3000); };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/alerts');
      if (res.ok) { const data = await res.json(); setAlerts(data.items||data||[]); }
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const sf = (k: string, v: any) => setForm(f=>({...f,[k]:v}));
  const toggleChannel = (ch: string) => sf('channels',
    form.channels.includes(ch) ? form.channels.filter(c=>c!==ch) : [...form.channels, ch]);

  const handleCreate = async () => {
    if (!form.user_email) { showToast('Email required'); return; }
    setCreating(true);
    try {
      // Find user then create alert
      const res = await fetch('/api/v1/alerts/subscribe', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          user_email: form.user_email,
          make: form.make||undefined,
          model: form.model||undefined,
          year_min: form.year_min ? +form.year_min : undefined,
          year_max: form.year_max ? +form.year_max : undefined,
          max_price_aed: form.max_price_aed ? +form.max_price_aed : undefined,
          min_price_aed: form.min_price_aed ? +form.min_price_aed : undefined,
          fuel_type: form.fuel_type||undefined,
          channels: form.channels,
        })
      });
      if (res.ok) {
        showToast('Alert created successfully');
        setShowForm(false);
        setForm({ user_email:'', make:'', model:'', year_min:'', year_max:'', max_price_aed:'', min_price_aed:'', fuel_type:'', channels:['email'] });
        load();
      } else { showToast('Failed to create alert'); }
    } catch { showToast('Error creating alert'); }
    finally { setCreating(false); }
  };

  const deleteAlert = async (id: string) => {
    try {
      await fetch(`/api/v1/alerts/${id}`, {method:'DELETE'});
      setAlerts(a => a.filter(al=>al.id!==id));
      showToast('Alert deleted');
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
            <h1 className="text-xl font-bold" style={{color:'#111827'}}>Alert Configuration</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage vehicle price and availability alerts for users</p>
          </div>
          <button onClick={()=>setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{background:'linear-gradient(135deg,#C1272D,#9B1C22)'}}>
            <Plus size={14}/> Create alert
          </button>
        </div>
      </div>

      <div style={{padding:'24px 32px'}}>
        {/* Create form */}
        {showForm && (
          <div className="card p-5 mb-6">
            <h2 className="font-semibold mb-4" style={{color:'#111827'}}>New alert</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <div className="md:col-span-3">
                <label className="text-xs text-gray-500 mb-1 block">User email *</label>
                <input value={form.user_email} onChange={e=>sf('user_email',e.target.value)}
                  placeholder="user@example.com" className="input-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Make</label>
                <select value={form.make} onChange={e=>sf('make',e.target.value)} className="input-white text-sm">
                  <option value="">Any make</option>
                  {MAKES.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Model</label>
                <input value={form.model} onChange={e=>sf('model',e.target.value)}
                  placeholder="Land Cruiser" className="input-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Fuel type</label>
                <select value={form.fuel_type} onChange={e=>sf('fuel_type',e.target.value)} className="input-white text-sm">
                  <option value="">Any</option>
                  {['petrol','diesel','hybrid','electric'].map(f=><option key={f} value={f} className="capitalize">{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Min price (AED)</label>
                <input type="number" value={form.min_price_aed} onChange={e=>sf('min_price_aed',e.target.value)}
                  placeholder="0" className="input-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Max price (AED)</label>
                <input type="number" value={form.max_price_aed} onChange={e=>sf('max_price_aed',e.target.value)}
                  placeholder="500000" className="input-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Year range</label>
                <div className="flex gap-2">
                  <input type="number" value={form.year_min} onChange={e=>sf('year_min',e.target.value)}
                    placeholder="2020" className="input-white text-sm" />
                  <input type="number" value={form.year_max} onChange={e=>sf('year_max',e.target.value)}
                    placeholder="2024" className="input-white text-sm" />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-2 block">Notification channels</label>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map(ch => (
                  <button key={ch} onClick={()=>toggleChannel(ch)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize"
                    style={form.channels.includes(ch)
                      ? {background:'#FFF1F2', borderColor:'#C1272D', color:'#C1272D'}
                      : {background:'white', borderColor:'#e5e7eb', color:'#6b7280'}}>
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={()=>setShowForm(false)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={creating}
                className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
                {creating && <Loader2 size={13} className="animate-spin" />}
                {creating ? 'Creating…' : 'Create alert'}
              </button>
            </div>
          </div>
        )}

        {/* Alert list */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Bell size={32} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No alerts configured</p>
              <p className="text-sm mt-1">Click "Create alert" to set up the first alert for a user</p>
            </div>
          ) : (
            <table className="table-white">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Criteria</th>
                  <th>Channels</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a:any) => (
                  <tr key={a.id}>
                    <td><span className="text-sm text-gray-600">{a.user_id}</span></td>
                    <td>
                      <div className="text-xs text-gray-600 space-y-0.5">
                        {a.make && <p><span className="font-medium">Make:</span> {a.make}{a.model ? ` ${a.model}` : ''}</p>}
                        {a.max_price_aed && <p><span className="font-medium">Max:</span> {formatPrice(Number(a.max_price_aed))}</p>}
                        {a.fuel_type && <p className="capitalize"><span className="font-medium">Fuel:</span> {a.fuel_type}</p>}
                        {!a.make && !a.max_price_aed && <p className="text-gray-400">Any vehicle</p>}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {(a.channels||[]).map((ch:string) => (
                          <span key={ch} className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600 capitalize">{ch}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className="badge text-xs" style={a.active ? {background:'#d1fae5',color:'#065f46'} : {background:'#e5e7eb',color:'#6b7280'}}>
                        {a.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td><span className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString()}</span></td>
                    <td>
                      <button onClick={()=>deleteAlert(a.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                        <Trash2 size={14}/>
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
