'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Car, Loader2, Check } from 'lucide-react';
import { emailError, phoneError, passwordError, requiredError, hasErrors } from '@/lib/validation';
import { useLocale } from '@/contexts/LocaleContext';
import { translateValidationError } from '@/i18n/validationMessages';

interface Country {
  id: string;
  code: string;
  name: string;
  phone_prefix: string;
}
interface FreeZone {
  id: string;
  code: string;
  name: string;
  city: string | null;
}

export default function RegisterDealerPage() {
  const { t, locale } = useLocale();
  const [referralCode, setReferralCode] = useState('');
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) setReferralCode(ref.toUpperCase());
  }, []);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '', city: '' });
  const [countries, setCountries] = useState<Country[]>([]);
  const [freeZones, setFreeZones] = useState<FreeZone[]>([]);
  const [countryId, setCountryId] = useState('');
  const [freeZoneId, setFreeZoneId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const sf = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Load the GCC country list once — dealer registration is no longer UAE-only.
  useEffect(() => {
    fetch('/api/v1/countries')
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data: Country[]) => {
        if (!Array.isArray(data)) return; // defensive: never let a non-array response reach state
        setCountries(data);
        const uae = data.find(c => c.code === 'AE');
        if (uae) setCountryId(uae.id); // sensible default, still changeable
      })
      .catch(() => {}); // keep the empty default — form still usable, just without prefill
  }, []);

  // Reload free zones whenever the selected country changes.
  useEffect(() => {
    const selected = countries.find(c => c.id === countryId);
    if (!selected) { setFreeZones([]); return; }
    fetch(`/api/v1/countries/${selected.code}/free-zones`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data: FreeZone[]) => { setFreeZones(Array.isArray(data) ? data : []); setFreeZoneId(''); })
      .catch(() => setFreeZones([]));
  }, [countryId, countries]);

  const validate = () => {
    const errors: Record<string, string> = {};
    const nameErr = requiredError(form.full_name, 'Name / company', 2, 120);
    if (nameErr) errors.full_name = nameErr;
    const mailErr = emailError(form.email);
    if (mailErr) errors.email = mailErr;
    const phErr = phoneError(form.phone, true);
    if (phErr) errors.phone = phErr;
    const pwErr = passwordError(form.password);
    if (pwErr) errors.password = pwErr;
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errors = validate();
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          email: form.email.trim().toLowerCase(),
          role: 'dealer',
          country_id: countryId || undefined,
          free_zone_id: freeZoneId || undefined,
          referral_code: referralCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message.join(', ') : (data.message || 'Registration failed'));
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F9FAFB' }}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(16,185,129,0.15)' }}>
          <Check size={28} className="text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('register.success.title')}</h2>
        <p className="text-gray-500 text-sm mb-6">Your dealer profile is ready.</p>
        <Link href="/login" className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: '#C1272D' }}>
          Sign in
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#F9FAFB' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#C1272D' }}>
              <Car size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl">SnapHub<span style={{ color: '#C1272D' }}>Trade.com</span></span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('register.title')}</h1>
          <p className="text-sm text-gray-500">Create your dealer account — free</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { key: 'full_name', label: t('register.field.company'), placeholder: 'Al Rashid Motors LLC', type: 'text' },
            { key: 'email', label: t('register.field.email'), placeholder: 'you@company.ae', type: 'email' },
            { key: 'phone', label: t('register.field.phone'), placeholder: '+971 50 123 4567', type: 'tel' },
            { key: 'password', label: t('register.field.password'), placeholder: 'Min 8 characters', type: 'password' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-500 mb-1.5 block uppercase tracking-wider">{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]} onChange={e => sf(f.key, e.target.value)}
                placeholder={f.placeholder} required className="input-white w-full" />
              {fieldErrors[f.key] && (
                <p className="text-xs text-red-400 mt-1">{translateValidationError(fieldErrors[f.key], locale)}</p>
              )}
            </div>
          ))}

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block uppercase tracking-wider">{t('register.field.country')}</label>
            <select value={countryId} onChange={e => setCountryId(e.target.value)} className="input-white w-full">
              {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {freeZones.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block uppercase tracking-wider">{t('register.field.free_zone')}</label>
              <select value={freeZoneId} onChange={e => setFreeZoneId(e.target.value)} className="input-white w-full">
                <option value="">{t('register.field.free_zone.none')}</option>
                {freeZones.map(z => <option key={z.id} value={z.id}>{z.name}{z.city ? ` — ${z.city}` : ''}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block uppercase tracking-wider">{t('register.field.city')}</label>
            <input type="text" value={form.city} onChange={e => sf('city', e.target.value)}
              placeholder="Dubai, Riyadh, Doha..." className="input-white w-full" />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block uppercase tracking-wider">{t('register.field.referral')}</label>
            <input type="text" value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())}
              placeholder={t('register.field.referral.placeholder')} className="input-white w-full" style={{ fontFamily:'monospace' }} />
            <p className="text-xs text-gray-400 mt-1">{t('register.field.referral.hint')}</p>
          </div>

          {error && (
            <div className="rounded-lg p-3 text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.1)' }}>{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: '#C1272D' }}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? t('register.button.creating') : t('register.button.submit')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          {t('register.already_have_account')} <Link href="/login" className="text-gray-700 hover:text-gray-900 font-semibold">{t('register.sign_in')}</Link>
        </div>
      </div>
    </div>
  );
}
