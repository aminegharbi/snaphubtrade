'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, KeyRound, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { emailError, phoneError, requiredError, passwordError, hasErrors } from '@/lib/validation';

interface Props {
  dealerId: string;
  onClose: () => void;
  onSaved: (updated: any) => void;
}

const FIELDS: { key: string; label: string; type?: string }[] = [
  { key: 'company_name', label: 'Company name' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'website', label: 'Website' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'free_zone_license', label: 'Free zone license number' },
];

interface Country { id: string; code: string; name: string; }
interface FreeZone { id: string; code: string; name: string; city: string | null; }

export function AdminDealerEditModal({ dealerId, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dealer, setDealer] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [freeZones, setFreeZones] = useState<FreeZone[]>([]);
  const [countryId, setCountryId] = useState('');
  const [freeZoneId, setFreeZoneId] = useState('');

  const [pwMode, setPwMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwDone, setPwDone] = useState(false);
  const [pwErr, setPwErr] = useState('');

  useEffect(() => {
    api.get<Country[]>('/countries').then(setCountries).catch(() => {});
  }, []);

  // Reload free zones whenever the selected country changes, preserving the
  // dealer's existing free_zone_id if it still belongs to the newly selected country.
  useEffect(() => {
    const selected = countries.find((c) => c.id === countryId);
    if (!selected) { setFreeZones([]); return; }
    api.get<FreeZone[]>(`/countries/${selected.code}/free-zones`)
      .then((zones) => {
        setFreeZones(zones);
        if (!zones.some((z) => z.id === freeZoneId)) setFreeZoneId('');
      })
      .catch(() => setFreeZones([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryId, countries]);

  useEffect(() => {
    let cancelled = false;
    api.get<any>(`/admin/dealers/${dealerId}`)
      .then((d) => {
        if (cancelled) return;
        setDealer(d);
        setForm({
          company_name: d.company_name || '', email: d.email || '', phone: d.phone || '',
          whatsapp: d.whatsapp || '', website: d.website || '', address: d.address || '',
          city: d.city || '', free_zone_license: d.free_zone_license || '',
        });
        setCountryId(d.country_id || '');
        setFreeZoneId(d.free_zone_id || '');
      })
      .catch(() => setErr('Unable to load dealer profile'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [dealerId]);

  const sf = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    const nameErr = requiredError(form.company_name, 'Company name', 2, 150);
    if (nameErr) e.company_name = nameErr;
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
      const updated = await api.patch(`/admin/dealers/${dealerId}`, {
        ...form,
        country_id: countryId || null,
        free_zone_id: freeZoneId || null,
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
    if (!dealer?.user?.id) { setPwErr("This dealer has no linked user account"); return; }
    setPwSaving(true); setPwErr('');
    try {
      await api.post(`/admin/users/${dealer.user.id}/reset-password`, { new_password: newPassword });
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
          <p style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>Edit dealer</p>
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

              <div>
                <label style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 600, display: 'block', marginBottom: 4 }}>Country</label>
                <select value={countryId} onChange={(e) => setCountryId(e.target.value)} className="input-white w-full" style={{ fontSize: '0.85rem' }}>
                  <option value="">— Not set —</option>
                  {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {freeZones.length > 0 && (
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 600, display: 'block', marginBottom: 4 }}>Free zone</label>
                  <select value={freeZoneId} onChange={(e) => setFreeZoneId(e.target.value)} className="input-white w-full" style={{ fontSize: '0.85rem' }}>
                    <option value="">Not in a free zone</option>
                    {freeZones.map((z) => <option key={z.id} value={z.id}>{z.name}{z.city ? ` — ${z.city}` : ''}</option>)}
                  </select>
                </div>
              )}
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
                  disabled={!dealer?.user?.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 600, color: dealer?.user?.id ? '#1E40AF' : '#9CA3AF', background: 'none', border: 'none', cursor: dealer?.user?.id ? 'pointer' : 'not-allowed' }}
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
