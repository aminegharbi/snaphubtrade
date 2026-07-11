'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { Receipt } from 'lucide-react';
import { BillingPanel } from '@/components/dealer/BillingPanel';

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 50, padding: '10px 16px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 500, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', background: '#111827', color: 'white' }}>
      {msg}
    </div>
  );
}

export default function DealerBillingPage() {
  const { t } = useLocale();
  const [dealerId, setDealerId] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    const did = localStorage.getItem('dealer_id') || '';
    localStorage.setItem('dealer_id', did);
    setDealerId(did);
  }, []);

  const showToast = useCallback((m: string) => setToast(m), []);

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '28px 24px' }}>
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Receipt size={18} style={{ color: '#1E40AF' }} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>{t('dealer.billing.title')}</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280' }}>Devis et factures</p>
        </div>
      </div>

      {dealerId && <BillingPanel dealerId={dealerId} onToast={showToast} />}
    </div>
  );
}
