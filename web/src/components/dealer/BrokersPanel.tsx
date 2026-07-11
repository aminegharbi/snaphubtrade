'use client';
import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePriceFormatter } from '@/components/common/Price';

export function BrokersPanel({ dealerId }: { dealerId: string }) {
  const formatPrice = usePriceFormatter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!dealerId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/broker/dealer/${dealerId}/stats`);
      setData(res.ok ? await res.json() : null);
    } catch { setData(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [dealerId]);

  if (loading) {
    return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><RefreshCw size={20} style={{ color:'#9CA3AF', animation:'spin 1s linear infinite' }} /></div>;
  }

  if (!data || data.total_broker_deals === 0) {
    return (
      <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'48px 24px', textAlign:'center' }}>
        <p style={{ fontSize:'2rem', margin:'0 0 8px' }}>🤝</p>
        <p style={{ fontWeight:700, color:'#111827', margin:'0 0 4px' }}>No broker sales yet</p>
        <p style={{ color:'#9CA3AF', fontSize:'0.85rem', margin:'0 0 16px' }}>Once a broker sells one of your vehicles, their performance shows up here.</p>
        <a href="/broker" style={{ fontSize:'0.82rem', fontWeight:700, color:'#C1272D', textDecoration:'none' }}>Invite brokers →</a>
      </div>
    );
  }

  const { top_brokers = [], other_brokers = [] } = data;
  const medals = ['🥇', '🥈', '🥉'];
  const medalBg = ['#FEF3C7', '#F3F4F6', '#FDE9D9'];

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:14, marginBottom:20 }}>
        {[
          { label:'Brokers who sold', value:data.total_brokers_count, color:'#1E40AF' },
          { label:'Total deals',      value:data.total_broker_deals,  color:'#374151' },
          { label:'This month',       value:data.broker_deals_this_month, color:'#C1272D' },
          { label:'Revenue via brokers', value:formatPrice(Number(data.total_revenue_via_brokers)), color:'#007A3D' },
        ].map(s => (
          <div key={s.label} style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'14px 16px' }}>
            <p style={{ fontSize:'0.68rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', color:'#9CA3AF', margin:'0 0 6px' }}>{s.label}</p>
            <p style={{ fontSize:'1.35rem', fontWeight:800, color:s.color, margin:0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Top 3 brokers — podium */}
      {top_brokers.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <p style={{ fontSize:'0.78rem', fontWeight:700, color:'#111827', margin:'0 0 12px' }}>Top brokers</p>
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(top_brokers.length,3)}, 1fr)`, gap:14 }}>
            {top_brokers.map((b: any, i: number) => (
              <div key={b.broker_id} style={{ background:'white', border: i===0?'1.5px solid #FDE68A':'1px solid #E5E7EB', borderRadius:16, padding:'18px 16px', position:'relative' }}>
                <div style={{ width:36, height:36, borderRadius:10, background:medalBg[i]||'#F9FAFB', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', marginBottom:10 }}>
                  {medals[i] || '•'}
                </div>
                <p style={{ fontWeight:800, color:'#111827', margin:'0 0 2px', fontSize:'0.95rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.broker_name}</p>
                <p style={{ color:'#9CA3AF', margin:'0 0 12px', fontSize:'0.75rem' }}>{b.affiliate_code} · {b.tier}{b.country ? ` · ${b.country}` : ''}</p>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                  <div>
                    <p style={{ fontWeight:700, color:'#374151', margin:0, fontSize:'1.1rem' }}>{b.deals_count}</p>
                    <p style={{ color:'#9CA3AF', margin:0, fontSize:'0.68rem' }}>deal{b.deals_count !== 1 ? 's' : ''}</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontWeight:700, color:'#007A3D', margin:0, fontSize:'0.9rem' }}>{formatPrice(Number(b.total_revenue || 0))}</p>
                    <p style={{ color:'#9CA3AF', margin:0, fontSize:'0.68rem' }}>revenue</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All other brokers who sold */}
      {other_brokers.length > 0 && (
        <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid #F3F4F6', background:'#FAFAFA' }}>
            <p style={{ fontWeight:700, color:'#111827', margin:0, fontSize:'0.85rem' }}>Other brokers who sold ({other_brokers.length})</p>
          </div>
          <table className="table-white" style={{ width:'100%' }}>
            <thead>
              <tr>
                <th>Broker</th>
                <th>Tier</th>
                <th>Deals</th>
                <th>Revenue</th>
                <th>Commission paid</th>
              </tr>
            </thead>
            <tbody>
              {other_brokers.map((b: any) => (
                <tr key={b.broker_id}>
                  <td>
                    <p style={{ fontWeight:600, color:'#111827', margin:0, fontSize:'0.85rem' }}>{b.broker_name}</p>
                    <p style={{ color:'#9CA3AF', margin:0, fontSize:'0.72rem' }}>{b.affiliate_code}{b.country ? ` · ${b.country}` : ''}</p>
                  </td>
                  <td><span style={{ fontSize:'0.75rem', fontWeight:600, color:'#B8860B' }}>{b.tier}</span></td>
                  <td><span style={{ fontSize:'0.82rem', fontWeight:700 }}>{b.deals_count}</span></td>
                  <td><span style={{ fontSize:'0.82rem', fontWeight:700, color:'#007A3D' }}>{formatPrice(Number(b.total_revenue || 0))}</span></td>
                  <td><span style={{ fontSize:'0.82rem', color:'#6B7280' }}>{formatPrice(Number(b.commissions_paid || 0))}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
