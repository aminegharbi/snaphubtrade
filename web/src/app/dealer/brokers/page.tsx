'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { HeartHandshake } from 'lucide-react';
import { BrokersPanel } from '@/components/dealer/BrokersPanel';

export default function DealerBrokersPage() {
  const { t } = useLocale();
  const [dealerId, setDealerId] = useState('');

  useEffect(() => {
    const did = localStorage.getItem('dealer_id') || '';
    localStorage.setItem('dealer_id', did);
    setDealerId(did);
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HeartHandshake size={18} style={{ color: '#5B21B6' }} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>{t('dealer.brokers.title')}</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280' }}>Broker performance and revenue generated through your network</p>
        </div>
      </div>

      {dealerId && <BrokersPanel dealerId={dealerId} />}
    </div>
  );
}
