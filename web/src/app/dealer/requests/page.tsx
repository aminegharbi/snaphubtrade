'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import Link from 'next/link';
import { Inbox, Phone, MessageCircle, Mail, Check, X, RefreshCw, Clock, Car } from 'lucide-react';
import { usePriceFormatter } from '@/components/common/Price';
import { api } from '@/lib/api';

const DECISION_CFG: Record<string, { label: string; bg: string; color: string }> = {
  accepted:  { label: 'Accepted',  bg: '#D1FAE5', color: '#065F46' },
  countered: { label: 'Countered', bg: '#DBEAFE', color: '#1E40AF' },
  rejected:  { label: 'Rejected',  bg: '#FEE2E2', color: '#B91C1C' },
};

export default function DealerRequestsPage() {
  const { t } = useLocale();
  const formatPrice = usePriceFormatter();
  const [dealerId, setDealerId] = useState('');
  const [data, setData] = useState<{ total: number; pending_action: number; leads: any[] } | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'countered' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const did = localStorage.getItem('dealer_id') || '';
    localStorage.setItem('dealer_id', did);
    setDealerId(did);
  }, []);

  const load = useCallback(async () => {
    if (!dealerId) return;
    setLoading(true);
    try {
      const q = filter === 'all' ? '' : `?decision=${filter}`;
      const d = await api.get<any>(`/leads/dealer/${dealerId}${q}`);
      setData(d);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [dealerId, filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Inbox size={18} style={{ color: '#C1272D' }} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>{t('dealer.requests.title')}</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280' }}>
            {data ? `${data.pending_action} en attente d'action sur ${data.total} affichée${data.total > 1 ? 's' : ''}` : 'Chargement…'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '18px 0', flexWrap: 'wrap' }}>
        {[
          { key: 'pending', label: '🟡 En attente' },
          { key: 'all', label: 'Toutes' },
          { key: 'accepted', label: '✅ Acceptées' },
          { key: 'countered', label: '↔️ Contre-offres' },
          { key: 'rejected', label: '❌ Refusées' },
        ].map(t => (
          <button key={t.key} onClick={() => setFilter(t.key as any)}
            style={{ padding: '7px 14px', borderRadius: 10, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, border: filter === t.key ? '1.5px solid #C1272D' : '1px solid #E5E7EB', background: filter === t.key ? '#FFF1F2' : 'white', color: filter === t.key ? '#C1272D' : '#6B7280' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>Chargement des requêtes…</p>
      ) : !data?.leads.length ? (
        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
          <Inbox size={28} style={{ color: '#D1D5DB', margin: '0 auto 10px' }} />
          <p style={{ color: '#9CA3AF', fontSize: '0.85rem', margin: 0 }}>Aucune requête dans cette catégorie.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.leads.map((l: any) => {
            const dc = l.dealer_decision ? DECISION_CFG[l.dealer_decision] : null;
            return (
              <Link key={l.id} href={`/dealer/requests/${l.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#111827', fontSize: '0.88rem' }}>{l.buyer_name || 'Client anonyme'}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#9CA3AF' }}>{l.buyer_email || l.buyer_phone || 'Aucun contact fourni'}</p>
                  </div>
                  <div style={{ flex: '1 1 200px', minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, color: '#374151', fontSize: '0.8rem' }}>
                    <Car size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.vehicle ? `${l.vehicle.year} ${l.vehicle.make} ${l.vehicle.model}` : 'Demande générale'}</span>
                  </div>
                  {l.offer_price && (
                    <span style={{ fontWeight: 700, color: '#111827', fontSize: '0.85rem', flexShrink: 0 }}>{formatPrice(Number(l.offer_price))}</span>
                  )}
                  <span style={{ fontSize: '0.72rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <Clock size={11} /> {new Date(l.created_at).toLocaleDateString('fr-FR')}
                  </span>
                  {dc ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: dc.bg, color: dc.color, flexShrink: 0 }}>{dc.label}</span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: '#FEF3C7', color: '#92400E', flexShrink: 0 }}>À traiter</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
