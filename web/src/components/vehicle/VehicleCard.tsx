'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Heart, Gauge, MessageCircle, Shield, Star, TrendingUp, TrendingDown, Zap, Clock, BarChart3, Bookmark, Scale } from 'lucide-react';
import type { Vehicle } from '@/lib/api';
import { useSession } from '@/contexts/SessionContext';
import { usePriceFormatter } from '@/components/common/Price';

// ─── Deal badge config ────────────────────────────────────────────────────────

const DEAL_CFG: Record<string, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  excellent_deal: { label: 'Excellent Deal',  emoji: '🔥', color: '#065F46', bg: '#D1FAE5', border: '#6EE7B7' },
  good_deal:      { label: 'Good Deal',       emoji: '✅', color: '#1E40AF', bg: '#DBEAFE', border: '#93C5FD' },
  fair_price:     { label: 'Fair Price',      emoji: '⚖️', color: '#374151', bg: '#F3F4F6', border: '#D1D5DB' },
  above_market:   { label: 'Above Market',    emoji: '⚠️', color: '#92400E', bg: '#FEF3C7', border: '#FDE68A' },
  overpriced:     { label: 'Overpriced',      emoji: '🔴', color: '#991B1B', bg: '#FEE2E2', border: '#FCA5A5' },
};

const DEMAND_COLOR: Record<string, string> = {
  very_high: '#065F46', high: '#1E40AF', medium: '#92400E', low: '#374151', very_low: '#991B1B',
};

// ─── Tiny score pill ─────────────────────────────────────────────────────────

function ScorePill({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${color}18`, border: `2px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 900, color }}>{value}</span>
      </div>
      <span style={{ fontSize: '0.58rem', color: '#9CA3AF', textAlign: 'center', lineHeight: 1.2, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

// ─── Main VehicleCard ─────────────────────────────────────────────────────────

export function VehicleCard({ vehicle: v }: { vehicle: Vehicle }) {
  const formatPrice = usePriceFormatter();
  const { profile } = useSession();
  const isBroker = profile.profile_type === 'broker';
  const [saved, setSaved] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [justReserved, setJustReserved] = useState(false);
  const [inCompare, setInCompare] = useState(false);
  useEffect(() => {
    try {
      const ids: string[] = JSON.parse(localStorage.getItem('compare_ids') || '[]');
      setInCompare(ids.includes(v.id));
    } catch { /* ignore malformed storage */ }
  }, [v.id]);

  // Shared compare list, capped at 3 — same storage key /compare reads on load.
  const toggleCompare = () => {
    let ids: string[] = [];
    try { ids = JSON.parse(localStorage.getItem('compare_ids') || '[]'); } catch { /* start fresh */ }
    if (ids.includes(v.id)) {
      ids = ids.filter(id => id !== v.id);
    } else {
      if (ids.length >= 3) ids = ids.slice(1); // drop the oldest to make room
      ids = [...ids, v.id];
    }
    localStorage.setItem('compare_ids', JSON.stringify(ids));
    setInCompare(ids.includes(v.id));
    window.dispatchEvent(new Event('compare-list-changed'));
  };
  const img    = v.vehicle_images?.find((i: any) => i.is_primary)?.cdn_url || v.vehicle_images?.[0]?.cdn_url;
  const dealer = (v as any).dealer;
  const val    = (v as any).valuations?.[0] ?? null;

  // Deal badge
  const deal = val?.deal_rating ? DEAL_CFG[val.deal_rating] : null;
  const promo = v.promotions?.[0];

  // Price vs market
  const mktEst  = val ? Number(val.estimated_value_aed) : 0;
  const myPrice = Number(v.price_aed);
  const displayPrice = promo ? Number(promo.promo_price) : myPrice;
  const promoPct = promo
    ? Math.max(1, Math.round((1 - Number(promo.promo_price) / Math.max(1, Number(promo.original_price))) * 100))
    : 0;
  const diffPct = mktEst > 0 ? ((myPrice - mktEst) / mktEst * 100) : 0;
  const isUnder = diffPct < -2;

  // Trend
  const TrendIcon = val?.price_trend_direction === 'rising' ? TrendingUp : val?.price_trend_direction === 'falling' ? TrendingDown : null;
  const trendColor = val?.price_trend_direction === 'rising' ? '#007A3D' : '#C1272D';

  const whatsappMsg = encodeURIComponent(`Hi, I'm interested in the ${v.year} ${v.make} ${v.model} at ${formatPrice(displayPrice, { fromCurrency: v.currency })} on SnapHubTrade.com.`);

  // Broker-only: reserve straight from the marketplace card, no need to open
  // the vehicle detail page first. Mirrors ReservationWidget's booking logic.
  const quickReserve = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (reserving || (v as any).status !== 'available') return;
    setReserving(true);
    try {
      const res = await fetch('/api/v1/reservations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: v.id, broker_id: profile.broker_id,
          reserved_by_name: profile.display_name, reserved_by_contact: profile.email,
        }),
      });
      if (res.ok) setJustReserved(true);
    } catch { /* best-effort — broker can retry from the detail page */ }
    finally { setReserving(false); }
  };

  return (
    <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: deal ? `1.5px solid ${deal.border}` : '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.12)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)')}>

      {/* ── Image ── */}
      <div style={{ position: 'relative', aspectRatio: '4/3', background: '#F3F4F6', overflow: 'hidden' }}>
        {img ? (
          <img src={img} alt={v.title || `${v.year} ${v.make} ${v.model}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D1D5DB' }}>
            <span style={{ fontSize: '3rem' }}>🚗</span>
          </div>
        )}

        {/* Deal badge — top left */}
        {deal && (
          <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: deal.bg, border: `1px solid ${deal.border}`, backdropFilter: 'blur(8px)' }}>
            <span style={{ fontSize: '0.7rem' }}>{deal.emoji}</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: deal.color }}>{deal.label}</span>
          </div>
        )}

        {promo && (
          <div style={{ position: 'absolute', top: deal ? 38 : 8, left: 8, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: 'rgba(185,28,28,0.92)', backdropFilter: 'blur(8px)' }}>
            <span style={{ fontSize: '0.68rem' }}>🏷️</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'white' }}>-{promoPct}%</span>
          </div>
        )}

        {/* Reserved overlay — diagonal-free, sits top-right when no deal badge competes for top-left */}
        {(v as any).status === 'reserved' && (
          <div style={{ position: 'absolute', top: deal || promo ? 68 : 8, left: 8, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: 'rgba(30,64,175,0.92)', backdropFilter: 'blur(8px)' }}>
            <span style={{ fontSize: '0.68rem' }}>🔖</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'white' }}>Reserved</span>
          </div>
        )}

        {/* Save button */}
        <button onClick={e => { e.preventDefault(); setSaved(!saved); }}
          style={{ position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Heart size={14} fill={saved ? '#C1272D' : 'none'} style={{ color: saved ? '#C1272D' : '#9CA3AF' }} />
        </button>

        {/* Compare toggle — adds/removes this vehicle from the shared compare
            list (localStorage, max 3) and jumps straight to /compare pre-filled. */}
        <button onClick={e => { e.preventDefault(); e.stopPropagation(); toggleCompare(); }}
          title={inCompare ? 'Remove from compare' : 'Add to compare'}
          style={{ position: 'absolute', top: 46, right: 8, width: 32, height: 32, borderRadius: '50%', background: inCompare ? '#C1272D' : 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Scale size={14} style={{ color: inCompare ? 'white' : '#9CA3AF' }} />
        </button>

        {/* Export badge */}
        {v.export_eligible && (
          <div style={{ position: 'absolute', bottom: 8, right: 8, padding: '3px 8px', borderRadius: 8, background: 'rgba(30,64,175,0.9)', backdropFilter: 'blur(4px)' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'white' }}>✈ Export</span>
          </div>
        )}

        {/* Price overlay */}
        <div style={{ position: 'absolute', bottom: 8, left: 8, padding: '4px 10px', borderRadius: 10, background: 'linear-gradient(135deg, rgba(193,39,45,0.95), rgba(155,28,34,0.95))', backdropFilter: 'blur(4px)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'white' }}>{formatPrice(displayPrice, { fromCurrency: v.currency })}</span>
          {promo && <span style={{ marginLeft: 6, fontSize: '0.67rem', color: 'rgba(255,255,255,0.85)', textDecoration: 'line-through' }}>{formatPrice(myPrice, { fromCurrency: v.currency })}</span>}
        </div>

        {/* Stock quantity — stacks below deal/reserved badges if present */}
        {(v as any).stock_quantity > 1 && (
          <div style={{ position: 'absolute', top: (deal ? 30 : 0) + (promo ? 30 : 0) + ((v as any).status === 'reserved' ? 30 : 0) + 8, left: 8, padding: '2px 7px', borderRadius: 8, background: 'rgba(91,33,182,0.85)', backdropFilter: 'blur(4px)' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'white' }}>×{(v as any).stock_quantity}</span>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>

        {/* Title */}
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {v.year} {v.make} {v.model}{v.trim ? ` ${v.trim}` : ''}
          </h3>
          <div style={{ display: 'flex', gap: 10, fontSize: '0.75rem', color: '#9CA3AF' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Gauge size={10} />
              {v.mileage_km === 0 ? 'New' : `${Number(v.mileage_km).toLocaleString()} km`}
            </span>
            {v.fuel_type && <span style={{ textTransform: 'capitalize' }}>{v.fuel_type}</span>}
            {v.body_type && <span>{v.body_type}</span>}
          </div>
        </div>

        {/* AI Valuation row */}
        {val && (
          <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Valuation</span>
              {TrendIcon && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', fontWeight: 700, color: trendColor }}>
                  <TrendIcon size={10} />
                  {val.price_trend_pct > 0 ? '+' : ''}{Number(val.price_trend_pct).toFixed(1)}%/mo
                </span>
              )}
            </div>

            {/* Price vs market */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.68rem', color: '#9CA3AF', margin: '0 0 1px' }}>Market est.</p>
                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', margin: 0 }}>{formatPrice(mktEst)}</p>
              </div>
              {mktEst > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.68rem', color: '#9CA3AF', margin: '0 0 1px' }}>vs market</p>
                  <p style={{ fontSize: '0.82rem', fontWeight: 800, color: isUnder ? '#007A3D' : diffPct > 8 ? '#C1272D' : '#F59E0B', margin: 0 }}>
                    {isUnder ? '▼' : '▲'} {Math.abs(diffPct).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>

            {/* Score pills */}
            {(val.market_score || val.investment_score || val.avg_days_to_sell) && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-around', marginTop: 8, paddingTop: 8, borderTop: '1px solid #E5E7EB' }}>
                {val.market_score && <ScorePill value={val.market_score} label="Market" color="#3B82F6" />}
                {val.deal_score && <ScorePill value={val.deal_score} label="Deal" color={deal?.color || '#374151'} />}
                {val.investment_score && <ScorePill value={val.investment_score} label="Invest" color="#8B5CF6" />}
                {val.avg_days_to_sell && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#6B7280' }}>{val.avg_days_to_sell}d</span>
                    </div>
                    <span style={{ fontSize: '0.58rem', color: '#9CA3AF', fontWeight: 600 }}>Sell time</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Dealer row */}
        {dealer && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#9CA3AF' }}>
            {dealer.verified && <Shield size={10} style={{ color: '#007A3D', flexShrink: 0 }} />}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dealer.company_name}</span>
            {dealer.rating > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                <Star size={9} fill="#C1272D" style={{ color: '#C1272D' }} />
                <span style={{ color: '#C1272D', fontWeight: 700 }}>{Number(dealer.rating).toFixed(1)}</span>
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          <Link href={`/vehicle/${v.id}`}
            style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: '0.8rem', fontWeight: 600, textAlign: 'center', textDecoration: 'none', background: '#F9FAFB', color: '#374151', border: '1px solid #E5E7EB', transition: 'background 0.15s' }}>
            View details
          </Link>
          {/* Broker-only: one-click reservation straight from the marketplace listing */}
          {isBroker && (v as any).status === 'available' && !justReserved && (
            <button onClick={quickReserve} disabled={reserving}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px 14px', borderRadius: 10, background: reserving ? '#9CA3AF' : '#007A3D', color: 'white', border: 'none', cursor: reserving ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
              <Bookmark size={12} /> {reserving ? 'Reserving…' : 'Reserve 24h'}
            </button>
          )}
          {isBroker && justReserved && (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px 14px', borderRadius: 10, background: '#D1FAE5', color: '#065F46', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
              ✓ Reserved
            </span>
          )}
          {!isBroker && dealer?.whatsapp && (
            <a href={`https://wa.me/${dealer.whatsapp.replace(/\D/g, '')}?text=${whatsappMsg}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px 14px', borderRadius: 10, background: '#25D366', color: 'white', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700 }}>
              <MessageCircle size={12} /> WA
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function VehicleCardSkeleton() {
  return (
    <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
      <div style={{ aspectRatio: '4/3', background: '#F3F4F6', animation: 'shimmer 1.5s infinite' }} />
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ height: 16, background: '#F3F4F6', borderRadius: 6, width: '70%', animation: 'shimmer 1.5s infinite' }} />
        <div style={{ height: 12, background: '#F3F4F6', borderRadius: 6, width: '50%', animation: 'shimmer 1.5s infinite' }} />
        <div style={{ height: 68, background: '#F3F4F6', borderRadius: 10, animation: 'shimmer 1.5s infinite' }} />
        <div style={{ height: 36, background: '#F3F4F6', borderRadius: 10, animation: 'shimmer 1.5s infinite' }} />
      </div>
      <style>{`@keyframes shimmer{0%{opacity:1}50%{opacity:0.6}100%{opacity:1}}`}</style>
    </div>
  );
}
