'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Check, X, RefreshCw, Phone, MessageCircle, Mail, Car,
  Clock, User, Send, Undo2, DollarSign,
} from 'lucide-react';
import { usePriceFormatter } from '@/components/common/Price';
import { api } from '@/lib/api';

const DECISION_CFG: Record<string, { label: string; bg: string; color: string }> = {
  accepted:  { label: 'Acceptée',   bg: '#D1FAE5', color: '#065F46' },
  countered: { label: 'Contre-offre envoyée', bg: '#DBEAFE', color: '#1E40AF' },
  rejected:  { label: 'Refusée',    bg: '#FEE2E2', color: '#B91C1C' },
};

const ACTIVITY_LABEL: Record<string, string> = {
  created: '📩 Requête reçue', accepted: '✅ Acceptée', countered: '↔️ Contre-offre',
  rejected: '❌ Refusée', reopened: '🔄 Rouverte',
  contact_call: '📞 Appel', contact_whatsapp: '💬 WhatsApp', contact_email: '✉️ Email', note: '📝 Note',
};

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 50, padding: '10px 16px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 500, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', background: '#111827', color: 'white' }}>
      {msg}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 440, padding: 22, boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>{title}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const formatPrice = usePriceFormatter();
  const id = params?.id as string;

  const [dealerId, setDealerId] = useState('');
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<'accept' | 'counter' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const [counterPrice, setCounterPrice] = useState('');

  useEffect(() => {
    const did = localStorage.getItem('dealer_id') || '';
    localStorage.setItem('dealer_id', did);
    setDealerId(did);
  }, []);

  const load = useCallback(async () => {
    if (!dealerId || !id) return;
    try { setLead(await api.get<any>(`/leads/dealer/${dealerId}/${id}`)); }
    catch { setLead(null); }
    finally { setLoading(false); }
  }, [dealerId, id]);

  useEffect(() => { load(); }, [load]);

  const runAction = async (fn: () => Promise<any>, successMsg: string) => {
    setBusy(true);
    try { await fn(); setToast(successMsg); setModal(null); setNote(''); setCounterPrice(''); await load(); }
    catch (e: any) { setToast(e.message || 'Action échouée'); }
    finally { setBusy(false); }
  };

  const accept = () => runAction(() => api.post(`/leads/dealer/${dealerId}/${id}/accept`, { note: note || undefined }), '✅ Requête acceptée — le client a été notifié');
  const counter = () => {
    const price = Number(counterPrice);
    if (!price || price <= 0) { setToast('Merci d\'indiquer un prix valide'); return; }
    return runAction(() => api.post(`/leads/dealer/${dealerId}/${id}/counter`, { price, note: note || undefined }), '↔️ Contre-offre envoyée au client');
  };
  const reject = () => runAction(() => api.post(`/leads/dealer/${dealerId}/${id}/reject`, { note: note || undefined }), '❌ Requête refusée — le client a été notifié');
  const reopen = () => runAction(() => api.post(`/leads/dealer/${dealerId}/${id}/reopen`, {}), '🔄 Requête rouverte');

  const contact = async (channel: 'call' | 'whatsapp' | 'email') => {
    setBusy(true);
    try {
      const r = await api.post<{ deep_link: string | null }>(`/leads/dealer/${dealerId}/${id}/contact`, { channel });
      if (r.deep_link) window.open(r.deep_link, '_blank');
      else setToast(channel === 'call' ? 'Aucun numéro de téléphone renseigné' : channel === 'whatsapp' ? 'Aucun numéro WhatsApp renseigné' : 'Aucun email renseigné');
      await load();
    } catch (e: any) { setToast(e.message || 'Action échouée'); }
    finally { setBusy(false); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Chargement…</div>;
  if (!lead) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: '#9CA3AF', marginBottom: 12 }}>Requête introuvable.</p>
      <Link href="/dealer/requests" style={{ color: '#C1272D', fontWeight: 700, fontSize: '0.85rem' }}>← Retour aux requêtes</Link>
    </div>
  );

  const dc = lead.dealer_decision ? DECISION_CFG[lead.dealer_decision] : null;

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '24px 20px' }}>
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}

      <Link href="/dealer/requests" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6B7280', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', marginBottom: 16 }}>
        <ArrowLeft size={14} /> Retour aux requêtes
      </Link>

      {/* Header card */}
      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: 22, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={16} style={{ color: '#9CA3AF' }} />
              <p style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: '#111827' }}>{lead.buyer_name || 'Client anonyme'}</p>
            </div>
            <p style={{ margin: '4px 0 0 24px', fontSize: '0.8rem', color: '#6B7280' }}>
              {[lead.buyer_email, lead.buyer_phone].filter(Boolean).join(' · ') || 'Aucun contact fourni'}
            </p>
          </div>
          {dc && <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '5px 14px', borderRadius: 20, background: dc.bg, color: dc.color, whiteSpace: 'nowrap' }}>{dc.label}</span>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 6px', padding: '12px 14px', background: '#F9FAFB', borderRadius: 12 }}>
          <Car size={15} style={{ color: '#6B7280', flexShrink: 0 }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>
            {lead.vehicle ? `${lead.vehicle.year} ${lead.vehicle.make} ${lead.vehicle.model}` : 'Demande générale (pas de véhicule précisé)'}
          </span>
          {lead.vehicle?.price_aed && <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#6B7280' }}>Prix affiché : {formatPrice(Number(lead.vehicle.price_aed))}</span>}
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', margin: '10px 0 0', fontSize: '0.82rem' }}>
          {lead.offer_price && (
            <div>
              <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Offre du client</p>
              <p style={{ margin: '2px 0 0', fontWeight: 800, color: '#111827', fontSize: '1rem' }}>{formatPrice(Number(lead.offer_price))}</p>
            </div>
          )}
          {lead.dealer_counter_price && (
            <div>
              <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Votre contre-offre</p>
              <p style={{ margin: '2px 0 0', fontWeight: 800, color: '#1E40AF', fontSize: '1rem' }}>{formatPrice(Number(lead.dealer_counter_price))}</p>
            </div>
          )}
          <div>
            <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Reçue le</p>
            <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#374151' }}>{new Date(lead.created_at).toLocaleString('fr-FR')}</p>
          </div>
        </div>

        {lead.notes && (
          <p style={{ margin: '14px 0 0', padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 10, fontSize: '0.82rem', color: '#92400E' }}>
            💬 « {lead.notes} »
          </p>
        )}
      </div>

      {/* Contact actions — always available */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => contact('call')} disabled={busy || !lead.buyer_phone}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 11, border: '1px solid #E5E7EB', background: 'white', cursor: lead.buyer_phone ? 'pointer' : 'not-allowed', opacity: lead.buyer_phone ? 1 : 0.4, fontWeight: 700, fontSize: '0.82rem', color: '#374151' }}>
          <Phone size={14} /> Appeler
        </button>
        <button onClick={() => contact('whatsapp')} disabled={busy || !(lead.buyer_whatsapp || lead.buyer_phone)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 11, border: '1px solid #BBF7D0', background: '#F0FDF4', cursor: (lead.buyer_whatsapp || lead.buyer_phone) ? 'pointer' : 'not-allowed', opacity: (lead.buyer_whatsapp || lead.buyer_phone) ? 1 : 0.4, fontWeight: 700, fontSize: '0.82rem', color: '#065F46' }}>
          <MessageCircle size={14} /> WhatsApp
        </button>
        <button onClick={() => contact('email')} disabled={busy || !lead.buyer_email}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 11, border: '1px solid #DBEAFE', background: '#EFF6FF', cursor: lead.buyer_email ? 'pointer' : 'not-allowed', opacity: lead.buyer_email ? 1 : 0.4, fontWeight: 700, fontSize: '0.82rem', color: '#1E40AF' }}>
          <Mail size={14} /> Email
        </button>
      </div>

      {/* Decision actions */}
      {!lead.dealer_decision ? (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <button onClick={() => setModal('accept')} disabled={busy}
            style={{ flex: '1 1 150px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 12, border: 'none', background: '#059669', color: 'white', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
            <Check size={16} /> Accepter
          </button>
          <button onClick={() => setModal('counter')} disabled={busy}
            style={{ flex: '1 1 150px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 12, border: 'none', background: '#1E40AF', color: 'white', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
            <RefreshCw size={16} /> Contre-offre
          </button>
          <button onClick={() => setModal('reject')} disabled={busy}
            style={{ flex: '1 1 150px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 12, border: '1px solid #FEE2E2', background: 'white', color: '#B91C1C', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
            <X size={16} /> Refuser
          </button>
        </div>
      ) : (
        <button onClick={reopen} disabled={busy}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 11, border: '1px solid #E5E7EB', background: 'white', color: '#374151', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', marginBottom: 24 }}>
          <Undo2 size={14} /> Rouvrir cette requête
        </button>
      )}

      {/* Timeline */}
      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #F3F4F6', background: '#F9FAFB' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>Historique</p>
        </div>
        <div style={{ padding: '4px 18px' }}>
          {(lead.activities || []).map((a: any, i: number) => (
            <div key={a.id} style={{ display: 'flex', gap: 12, padding: '11px 0', borderTop: i > 0 ? '1px solid #F9FAFB' : 'none' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', flexShrink: 0, width: 150 }}>{ACTIVITY_LABEL[a.type] || a.type}</span>
              <span style={{ fontSize: '0.8rem', color: '#6B7280', flex: 1 }}>{a.note || '—'}</span>
              <span style={{ fontSize: '0.72rem', color: '#9CA3AF', flexShrink: 0 }}>{new Date(a.created_at).toLocaleString('fr-FR')}</span>
            </div>
          ))}
          {!lead.activities?.length && <p style={{ padding: '16px 0', color: '#9CA3AF', fontSize: '0.8rem' }}>Aucune activité.</p>}
        </div>
      </div>

      {/* ── Modals ── */}
      {modal === 'accept' && (
        <Modal title="Accepter la requête" onClose={() => setModal(null)}>
          <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '0 0 10px' }}>Le client recevra une confirmation par email.</p>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Message optionnel pour le client…"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: '0.84rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none', marginBottom: 14 }} />
          <button onClick={accept} disabled={busy} style={{ width: '100%', padding: '11px 0', borderRadius: 11, border: 'none', background: '#059669', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
            {busy ? 'Envoi…' : 'Confirmer l\'acceptation'}
          </button>
        </Modal>
      )}

      {modal === 'counter' && (
        <Modal title="Envoyer une contre-offre" onClose={() => setModal(null)}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: 5 }}>Votre prix (AED)</label>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <DollarSign size={14} style={{ position: 'absolute', left: 12, top: 12, color: '#9CA3AF' }} />
            <input type="number" value={counterPrice} onChange={e => setCounterPrice(e.target.value)} placeholder={lead.offer_price ? String(Math.round(Number(lead.offer_price) * 1.05)) : ''}
              style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Message optionnel pour le client…"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: '0.84rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none', marginBottom: 14 }} />
          <button onClick={counter} disabled={busy} style={{ width: '100%', padding: '11px 0', borderRadius: 11, border: 'none', background: '#1E40AF', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Send size={14} /> {busy ? 'Envoi…' : 'Envoyer la contre-offre'}
          </button>
        </Modal>
      )}

      {modal === 'reject' && (
        <Modal title="Refuser la requête" onClose={() => setModal(null)}>
          <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '0 0 10px' }}>Le client recevra une notification polie du refus.</p>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Raison optionnelle…"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: '0.84rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none', marginBottom: 14 }} />
          <button onClick={reject} disabled={busy} style={{ width: '100%', padding: '11px 0', borderRadius: 11, border: 'none', background: '#B91C1C', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
            {busy ? 'Envoi…' : 'Confirmer le refus'}
          </button>
        </Modal>
      )}
    </div>
  );
}
