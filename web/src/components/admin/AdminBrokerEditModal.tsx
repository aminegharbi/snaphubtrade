'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, KeyRound, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { emailError, phoneError, requiredError, passwordError, hasErrors } from '@/lib/validation';

interface Props {
  brokerId: string;
  onClose: () => void;
  onSaved: (updated: any) => void;
}

const FIELDS: { key: string; label: string; type?: string }[] = [
  { key: 'full_name', label: 'Nom complet' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'company_name', label: 'Company (optional)' },
  { key: 'country', label: 'Country' },
  { key: 'city', label: 'City' },
];

const STATUSES = ['pending', 'active', 'suspended', 'rejected'];
const TIERS = ['Starter', 'Silver', 'Gold', 'Platinum'];

export function AdminBrokerEditModal({ brokerId, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [broker, setBroker] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('pending');
  const [tier, setTier] = useState('Starter');
  const [commissionRate, setCommissionRate] = useState('0.015');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');

  const [pwMode, setPwMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwDone, setPwDone] = useState(false);
  const [pwErr, setPwErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get<any>(`/admin/brokers/${brokerId}`)
      .then((b) => {
        if (cancelled) return;
        setBroker(b);
        setForm({
          full_name: b.full_name || '', email: b.email || '', phone: b.phone || '',
          whatsapp: b.whatsapp || '', company_name: b.company_name || '',
          country: b.country || '', city: b.city || '',
        });
        setStatus(b.status || 'pending');
        setTier(b.tier || 'Starter');
        setCommissionRate(String(b.commission_rate ?? '0.015'));
      })
      .catch(() => setErr('Unable to load broker profile'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [brokerId]);

  const sf = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    const nameErr = requiredError(form.full_name, 'Name', 2, 120);
    if (nameErr) e.full_name = nameErr;
    if (form.email) { const m = emailError(form.email); if (m) e.email = m; }
    const ph = phoneError(form.phone); if (ph) e.phone = ph;
    return e;
  };

  const save = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (hasErrors(validationErrors)) return;
    setSaving(true); setErr('');
    try {
      const updated = await api.patch(`/admin/brokers/${brokerId}`, {
        ...form,
        status,
        tier,
        commission_rate: Number(commissionRate),
      });
      onSaved(updated);
      onClose();
    } catch (e: any) {
      setErr(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    const msg = passwordError(newPassword);
    if (msg) { setPwErr(msg); return; }
    if (!broker?.user?.id) { setPwErr("This broker has no linked user account"); return; }
    setPwSaving(true); setPwErr('');
    try {
      await api.post(`/admin/users/${broker.user.id}/reset-password`, { new_password: newPassword });
      setPwDone(true);
      setNewPassword('');
    } catch (e: any) {
      setPwErr(e.message || 'Password reset failed');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #E5E7EB' }}>
          <p style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>Edit broker</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={18} /></button>
        </div>

        {loading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" /></div>
        ) : (
          <div style={{ padding: 22 }}>
            {err && <p style={{ color: '#C1272D', fontSize: '0.82rem', marginBottom: 12 }}>{err}</p>}

            <div style={{ display: 'grid', gap: 12 }}>
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 600, display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input
                    type={f.type || 'text'}
                    value={form[f.key] ?? ''}
                    onChange={(e) => sf(f.key, e.target.value)}
                    className="input-white w-full"
                    style={{ fontSize: '0.85rem' }}
                  />
                  {errors[f.key] && <p style={{ color: '#C1272D', fontSize: '0.72rem', marginTop: 3 }}>{errors[f.key]}</p>}
                </div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 600, display: 'block', marginBottom: 4 }}>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-white w-full" style={{ fontSize: '0.85rem' }}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 600, display: 'block', marginBottom: 4 }}>Tier</label>
                  <select value={tier} onChange={(e) => setTier(e.target.value)} className="input-white w-full" style={{ fontSize: '0.85rem' }}>
                    {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Taux de commission ({(Number(commissionRate) * 100).toFixed(1)}%)
                </label>
                <input
                  type="number" step="0.001" min="0" max="1"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="input-white w-full"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary" style={{ flex: 1 }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
              </button>
            </div>

            {/* Password reset */}
            <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #E5E7EB' }}>
              {!pwMode ? (
                <button
                  onClick={() => setPwMode(true)}
                  disabled={!broker?.user?.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 600, color: broker?.user?.id ? '#1E40AF' : '#9CA3AF', background: 'none', border: 'none', cursor: broker?.user?.id ? 'pointer' : 'not-allowed' }}
                >
                  <KeyRound size={14} /> Reset password
                </button>
              ) : (
                <div>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <KeyRound size={13} /> New password
                  </p>
                  {pwDone ? (
                    <p style={{ color: '#007A3D', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Check size={14} /> Password reset successfully.
                    </p>
                  ) : (
                    <>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 8 characters, uppercase + digit"
                        className="input-white w-full"
                        style={{ fontSize: '0.85rem' }}
                      />
                      {pwErr && <p style={{ color: '#C1272D', fontSize: '0.72rem', marginTop: 4 }}>{pwErr}</p>}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button onClick={() => setPwMode(false)} className="btn-secondary" style={{ flex: 1, fontSize: '0.8rem' }}>Cancel</button>
                        <button onClick={resetPassword} disabled={pwSaving} className="btn-primary" style={{ flex: 1, fontSize: '0.8rem' }}>
                          {pwSaving ? <Loader2 size={13} className="animate-spin" /> : 'Confirm'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
