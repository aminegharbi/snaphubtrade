'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrustScoreBadge } from '@/components/dealer/TrustScoreBadge';
import { AlertSubscribeWidget } from '@/components/alerts/AlertSubscribe';
import { InvestmentScoreCard } from '@/components/vehicle/InvestmentChart';
import { ReservationWidget } from '@/components/vehicle/ReservationWidget';
import { BuyerInquiryWidget } from '@/components/vehicle/BuyerInquiryWidget';
import { Price, usePriceFormatter } from '@/components/common/Price';
import {
  ArrowLeft, Shield, Star, Phone, MessageCircle, Globe, CheckCircle,
  Gauge, Fuel, Settings2, Calendar, TrendingUp, TrendingDown,
  BarChart3, Zap, Award, Clock, Target, ChevronDown, ChevronUp,
  RefreshCw, AlertTriangle, ArrowUpRight, ArrowDownRight, DollarSign, Info
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Vehicle {
  id: string; make: string; model: string; year: number; trim?: string;
  body_type?: string; fuel_type?: string; transmission?: string; engine?: string;
  mileage_km: number; color_exterior?: string; color_interior?: string;
  price_aed: number; price_suggested_aed?: number; title?: string; description?: string;
  currency?: string;
  export_eligible: boolean; status: string; stock_quantity?: number;
  view_count: number; created_at: string;
  vehicle_images: Array<{ cdn_url: string; is_primary: boolean; position: number }>;
  promotions?: Array<{ id: string; original_price: number; promo_price: number; label?: string; ends_at?: string }>;
  dealer: { id: string; company_name: string; slug: string; verified: boolean; rating: number; review_count: number; phone?: string; whatsapp?: string; email?: string };
  price_history?: Array<{ price_aed: number; changed_at: string }>;
}

interface Valuation {
  estimated_value_aed: number; value_min_aed: number; value_max_aed: number;
  deal_rating: string; deal_score: number; confidence_score: number;
  market_demand: string; demand_score: number; avg_days_to_sell: number;
  price_trend_pct: number; price_trend_direction: string;
  market_score: number; investment_score: number; dealer_confidence: number; export_score: number;
  ai_reasoning: string; ai_strengths: string[]; ai_risks: string[];
  comparable_count: number; currency: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const DEAL_CFG: Record<string, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  excellent_deal: { label: 'Excellent Deal',  emoji: '🔥', color: '#065F46', bg: '#D1FAE5', border: '#6EE7B7' },
  good_deal:      { label: 'Good Deal',       emoji: '✅', color: '#1E40AF', bg: '#DBEAFE', border: '#93C5FD' },
  fair_price:     { label: 'Fair Price',      emoji: '⚖️', color: '#374151', bg: '#F3F4F6', border: '#D1D5DB' },
  above_market:   { label: 'Above Market',    emoji: '⚠️', color: '#92400E', bg: '#FEF3C7', border: '#FDE68A' },
  overpriced:     { label: 'Overpriced',      emoji: '🔴', color: '#991B1B', bg: '#FEE2E2', border: '#FCA5A5' },
};

const DEMAND_CFG: Record<string, { label: string; color: string; bg: string }> = {
  very_high: { label: 'Very High',  color: '#065F46', bg: '#D1FAE5' },
  high:      { label: 'High',       color: '#1E40AF', bg: '#DBEAFE' },
  medium:    { label: 'Medium',     color: '#92400E', bg: '#FEF3C7' },
  low:       { label: 'Low',        color: '#374151', bg: '#F3F4F6' },
  very_low:  { label: 'Very Low',   color: '#991B1B', bg: '#FEE2E2' },
};

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ value, label, color = '#C1272D', size = 64 }: { value: number; label: string; color?: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = ((100 - value) / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={6} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x={size/2} y={size/2 + 5} textAnchor="middle" fill="#111827" fontSize={size > 56 ? 15 : 12} fontWeight="800" style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}>{value}</text>
      </svg>
      <p style={{ fontSize: '0.68rem', color: '#6B7280', textAlign: 'center', margin: 0, lineHeight: 1.3, fontWeight: 600 }}>{label}</p>
    </div>
  );
}

// ─── Price Bar ────────────────────────────────────────────────────────────────

function PriceBar({ min, max, listed, estimated }: { min: number; max: number; listed: number; estimated: number }) {
  const range = max - min || 1;
  const pct = (v: number) => `${Math.max(0, Math.min(100, ((v - min) / range) * 100))}%`;
  return (
    <div style={{ padding: '16px 0', position: 'relative' }}>
      {/* Rail */}
      <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, position: 'relative', overflow: 'visible' }}>
        {/* Market range fill */}
        <div style={{ position: 'absolute', left: pct(min), right: `${100 - parseFloat(pct(max))}%`, top: 0, bottom: 0, background: 'linear-gradient(90deg, #D1FAE5, #DBEAFE)', borderRadius: 4 }} />
        {/* Estimated dot */}
        <div style={{ position: 'absolute', left: pct(estimated), top: '50%', transform: 'translate(-50%, -50%)', width: 14, height: 14, borderRadius: '50%', background: '#3B82F6', border: '2px solid white', boxShadow: '0 1px 4px rgba(59,130,246,0.4)', zIndex: 2 }} title="Market avg" />
        {/* Listed price dot */}
        <div style={{ position: 'absolute', left: pct(listed), top: '50%', transform: 'translate(-50%, -50%)', width: 18, height: 18, borderRadius: '50%', background: listed <= estimated ? '#007A3D' : '#C1272D', border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 3 }} title="Listed price" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>Market min</span>
        <div style={{ display: 'flex', gap: 16, fontSize: '0.72rem' }}>
          <span style={{ color: '#3B82F6', fontWeight: 600 }}>● Avg</span>
          <span style={{ color: listed <= estimated ? '#007A3D' : '#C1272D', fontWeight: 600 }}>● Listed</span>
        </div>
        <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>Market max</span>
      </div>
    </div>
  );
}

// ─── AI Valuation Widget ──────────────────────────────────────────────────────

function ValuationWidget({ vehicleId, listedPrice }: { vehicleId: string; listedPrice: number }) {
  const formatPrice = usePriceFormatter();
  const [val, setVal]         = useState<Valuation | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/valuations/vehicle/${vehicleId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && !data.error) setVal(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [vehicleId]);

  if (loading) return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '20px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <RefreshCw size={18} style={{ color: '#9CA3AF', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.875rem' }}>Computing market valuation…</p>
    </div>
  );

  if (!val) return null;

  const deal = DEAL_CFG[val.deal_rating] || DEAL_CFG.fair_price;
  const demand = DEMAND_CFG[val.market_demand] || DEMAND_CFG.medium;
  const diffPct = ((listedPrice - val.estimated_value_aed) / val.estimated_value_aed * 100);
  const isUnder = diffPct < 0;
  const TrendIcon = val.price_trend_direction === 'rising' ? TrendingUp : val.price_trend_direction === 'falling' ? TrendingDown : BarChart3;

  return (
    <div style={{ background: 'white', borderRadius: 16, border: `2px solid ${deal.border}`, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${deal.bg}, white)`, padding: '16px 20px', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: '1.1rem' }}>{deal.emoji}</span>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: deal.color }}>{deal.label}</span>
              <span style={{ fontSize: '0.72rem', background: 'rgba(0,0,0,0.06)', padding: '2px 8px', borderRadius: 20, color: '#6B7280' }}>
                {val.confidence_score}% confidence
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280' }}>
              Based on {val.comparable_count} comparable listings on Dubizzle + DubiCars
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Estimated value */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Market estimate</p>
            <p style={{ fontWeight: 900, fontSize: '1.4rem', color: '#111827', margin: 0 }}>{formatPrice(val.estimated_value_aed)}</p>
            <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: '2px 0 0' }}>Range: {formatPrice(val.value_min_aed)} – {formatPrice(val.value_max_aed)}</p>
          </div>
          <div style={{ background: isUnder ? '#F0FDF4' : '#FFF1F2', borderRadius: 12, padding: '14px 16px', border: `1px solid ${isUnder ? '#BBF7D0' : '#FECACA'}` }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Listed price</p>
            <p style={{ fontWeight: 900, fontSize: '1.4rem', color: isUnder ? '#007A3D' : '#C1272D', margin: 0 }}>{formatPrice(listedPrice)}</p>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: isUnder ? '#007A3D' : '#C1272D', margin: '2px 0 0' }}>
              {isUnder ? '▼' : '▲'} {Math.abs(diffPct).toFixed(1)}% {isUnder ? 'below' : 'above'} market
            </p>
          </div>
        </div>

        {/* Price bar */}
        <PriceBar min={val.value_min_aed} max={val.value_max_aed} listed={listedPrice} estimated={val.estimated_value_aed} />

        {/* Score rings */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(56px, 1fr))', gap: 8, margin: '16px 0' }}>
          <ScoreRing value={val.market_score} label="Market Score" color="#3B82F6" size={60} />
          <ScoreRing value={val.deal_score} label="Deal Score" color={deal.color} size={60} />
          <ScoreRing value={val.investment_score} label="Investment" color="#8B5CF6" size={60} />
          <ScoreRing value={val.export_score} label="Export Score" color="#007A3D" size={60} />
          <ScoreRing value={val.dealer_confidence} label="Dealer Trust" color="#F59E0B" size={60} />
        </div>

        {/* Market metrics row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
          <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendIcon size={16} style={{ color: val.price_trend_direction === 'rising' ? '#007A3D' : val.price_trend_direction === 'falling' ? '#C1272D' : '#6B7280', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '0.68rem', color: '#9CA3AF', margin: 0 }}>Price trend</p>
              <p style={{ fontWeight: 700, color: val.price_trend_direction === 'rising' ? '#007A3D' : val.price_trend_direction === 'falling' ? '#C1272D' : '#374151', margin: 0, fontSize: '0.82rem' }}>
                {val.price_trend_pct > 0 ? '+' : ''}{val.price_trend_pct?.toFixed(1)}%/mo
              </p>
            </div>
          </div>
          <div style={{ background: demand.bg, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} style={{ color: demand.color, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '0.68rem', color: '#9CA3AF', margin: 0 }}>Demand</p>
              <p style={{ fontWeight: 700, color: demand.color, margin: 0, fontSize: '0.82rem' }}>{demand.label}</p>
            </div>
          </div>
          <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} style={{ color: '#6B7280', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '0.68rem', color: '#9CA3AF', margin: 0 }}>Avg sell time</p>
              <p style={{ fontWeight: 700, color: '#374151', margin: 0, fontSize: '0.82rem' }}>{val.avg_days_to_sell} days</p>
            </div>
          </div>
        </div>

        {/* AI Reasoning */}
        {val.ai_reasoning && (
          <div style={{ background: 'linear-gradient(135deg, #F5F3FF, #FAFAFA)', borderRadius: 12, padding: '12px 14px', marginBottom: 12, border: '1px solid #EDE9FE' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>🤖</span>
              <p style={{ fontSize: '0.8rem', color: '#374151', margin: 0, lineHeight: 1.65, fontStyle: 'italic' }}>{val.ai_reasoning}</p>
            </div>
          </div>
        )}

        {/* Expand: strengths + risks */}
        <button onClick={() => setExpanded(!expanded)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '0.8rem', fontWeight: 600 }}>
          {expanded ? 'Less details' : 'More details'} {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {expanded && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
            {val.ai_strengths?.length > 0 && (
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>✓ Strengths</p>
                {val.ai_strengths.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <CheckCircle size={12} style={{ color: '#007A3D', flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: '0.78rem', color: '#374151', margin: 0 }}>{s}</p>
                  </div>
                ))}
              </div>
            )}
            {val.ai_risks?.length > 0 && (
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>⚠ Risks</p>
                {val.ai_risks.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <AlertTriangle size={12} style={{ color: '#C1272D', flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: '0.78rem', color: '#374151', margin: 0 }}>{r}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Image gallery ────────────────────────────────────────────────────────────

function ImageGallery({ images, title }: { images: any[]; title: string }) {
  const [active, setActive] = useState(0);
  const sorted = [...images].sort((a, b) => (a.is_primary ? -1 : b.is_primary ? 1 : a.position - b.position));
  const main = sorted[active];

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
      {main?.cdn_url ? (
        <img src={main.cdn_url} alt={title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', maxHeight: 460, display: 'block' }} />
      ) : (
        <div style={{ aspectRatio: '16/9', maxHeight: 460, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6' }}>
          <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
            <span style={{ fontSize: '4rem', display: 'block', marginBottom: 8 }}>🚗</span>
            <p style={{ fontSize: '0.875rem' }}>No photo available</p>
          </div>
        </div>
      )}
      {sorted.length > 1 && (
        <div style={{ display: 'flex', gap: 6, padding: '10px 12px', overflowX: 'auto' }}>
          {sorted.map((img, i) => (
            <button key={img.id || i} onClick={() => setActive(i)}
              style={{ flexShrink: 0, width: 80, height: 56, borderRadius: 8, overflow: 'hidden', border: `2px solid ${i === active ? '#C1272D' : 'transparent'}`, cursor: 'pointer', padding: 0 }}>
              <img src={img.cdn_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Vehicle Page ────────────────────────────────────────────────────────

export default function VehiclePage({ params }: { params: { id: string } }) {
  const formatPrice = usePriceFormatter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/vehicles/${params.id}`)
      .then(r => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then(data => { if (data) setVehicle(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <RefreshCw size={24} style={{ color: '#9CA3AF', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (notFound || !vehicle) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontWeight: 700, color: '#374151', fontSize: '1.1rem' }}>Vehicle not found</p>
      <Link href="/marketplace" style={{ color: '#C1272D', textDecoration: 'none', fontWeight: 600 }}>← Back to marketplace</Link>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const dealer = vehicle.dealer;
  const promo = vehicle.promotions?.[0];
  const listedPrice = promo ? Number(promo.promo_price) : Number(vehicle.price_aed);
  const promoPct = promo
    ? Math.max(1, Math.round((1 - Number(promo.promo_price) / Math.max(1, Number(promo.original_price))) * 100))
    : 0;
  const images = vehicle.vehicle_images || [];
  const whatsappMsg = encodeURIComponent(`Hi, I'm interested in the ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ' ' + vehicle.trim : ''} listed at ${formatPrice(listedPrice, { fromCurrency: vehicle.currency })} on SnapHubTrade.com.`);
  const specs = [
    { label: 'Year', value: vehicle.year, icon: Calendar },
    { label: 'Mileage', value: vehicle.mileage_km === 0 ? 'Brand new / 0 km' : `${Number(vehicle.mileage_km).toLocaleString()} km`, icon: Gauge },
    { label: 'Fuel type', value: vehicle.fuel_type, icon: Fuel },
    { label: 'Transmission', value: vehicle.transmission, icon: Settings2 },
    { label: 'Body type', value: vehicle.body_type, icon: Target },
    { label: 'Engine', value: vehicle.engine, icon: Zap },
    { label: 'Exterior', value: vehicle.color_exterior, icon: null },
    { label: 'Interior', value: vehicle.color_interior, icon: null },
  ].filter(s => s.value);

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: '0.8rem', color: '#9CA3AF' }}>
          <Link href="/marketplace" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#9CA3AF', textDecoration: 'none' }}>
            <ArrowLeft size={13} /> Marketplace
          </Link>
          <span>/</span>
          <Link href={`/marketplace?make=${vehicle.make}`} style={{ color: '#9CA3AF', textDecoration: 'none' }}>{vehicle.make}</Link>
          <span>/</span>
          <span style={{ color: '#374151', fontWeight: 500 }}>{vehicle.year} {vehicle.model}</span>
        </div>

        <div className="da-form-sidebar-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Gallery */}
            <ImageGallery images={images} title={vehicle.title || `${vehicle.year} ${vehicle.make} ${vehicle.model}`} />

            {/* Title + badges */}
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                <div>
                  <h1 style={{ fontWeight: 900, fontSize: '1.4rem', color: '#111827', margin: '0 0 6px', lineHeight: 1.2 }}>
                    {vehicle.title || `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ' ' + vehicle.trim : ''}`}
                  </h1>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {vehicle.export_eligible && <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 20, background: '#DBEAFE', color: '#1E40AF', fontWeight: 600 }}>✈ Export eligible</span>}
                    {vehicle.stock_quantity && vehicle.stock_quantity > 1 && <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 20, background: '#EDE9FE', color: '#5B21B6', fontWeight: 600 }}>×{vehicle.stock_quantity} in stock</span>}
                    <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 20, background: '#F3F4F6', color: '#374151', fontWeight: 600 }}>👁 {vehicle.view_count} views</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Price aed={listedPrice} from={vehicle.currency} style={{ fontWeight: 900, fontSize: '1.8rem', color: '#C1272D', lineHeight: 1 }} />
                  {promo ? (
                    <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:8 }}>
                      <Price aed={Number(promo.original_price)} from={vehicle.currency} style={{ fontSize: '0.82rem', color: '#9CA3AF', textDecoration: 'line-through' }} />
                      <span style={{ fontSize:'0.72rem', fontWeight:800, color:'#B91C1C', background:'#FEE2E2', padding:'2px 8px', borderRadius:20 }}>-{promoPct}%</span>
                    </div>
                  ) : vehicle.price_suggested_aed && Number(vehicle.price_suggested_aed) > Number(vehicle.price_aed) && (
                    <Price aed={Number(vehicle.price_suggested_aed)} from={vehicle.currency} style={{ fontSize: '0.82rem', color: '#9CA3AF', textDecoration: 'line-through' }} />
                  )}
                </div>
              </div>

              {promo && (
                <div style={{ marginTop:10, display:'inline-flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:20, background:'#FFF1F2', color:'#B91C1C', fontSize:'0.75rem', fontWeight:700 }}>
                  🏷️ Offre limitée{promo.ends_at ? ` · jusqu'au ${new Date(promo.ends_at).toLocaleDateString('fr-FR')}` : ''}
                </div>
              )}

              {/* Specs grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: '16px 0', borderTop: '1px solid #F3F4F6' }}>
                {specs.map(s => (
                  <div key={s.label} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {s.icon ? <s.icon size={14} style={{ color: '#6B7280' }} /> : <span style={{ fontSize: '0.7rem', color: '#6B7280' }}>🎨</span>}
                    </div>
                    <div>
                      <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</p>
                      <p style={{ fontWeight: 600, color: '#111827', margin: 0, fontSize: '0.875rem', textTransform: 'capitalize' }}>{String(s.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            {vehicle.description && (
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '20px 22px' }}>
                <h3 style={{ fontWeight: 700, color: '#111827', margin: '0 0 12px', fontSize: '0.95rem' }}>About this vehicle</h3>
                <p style={{ color: '#6B7280', lineHeight: 1.75, margin: 0, fontSize: '0.875rem' }}>{vehicle.description}</p>
              </div>
            )}

            {/* AI Market Valuation */}
            <div>
              <h3 style={{ fontWeight: 700, color: '#111827', margin: '0 0 12px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 28, height: 28, borderRadius: 7, background: '#EDE9FE', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>🤖</span>
                AI Market Valuation
              </h3>
              <ValuationWidget vehicleId={vehicle.id} listedPrice={listedPrice} />
            </div>

            <InvestmentScoreCard vehicleId={vehicle.id} />
          </div>

          {/* ── Right column ── */}
          <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* CTA card */}
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid #F3F4F6' }}>
                <Price aed={listedPrice} from={vehicle.currency} style={{ fontWeight: 900, fontSize: '1.6rem', color: '#C1272D', marginBottom: 4 }} />
                {promo && <Price aed={Number(promo.original_price)} from={vehicle.currency} style={{ fontSize: '0.78rem', color: '#9CA3AF', textDecoration: 'line-through', marginBottom: 4 }} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.8rem' }}>Listed price</p>
                  <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 20, fontWeight: 700, textTransform: 'capitalize',
                    background: vehicle.status === 'available' ? '#D1FAE5' : vehicle.status === 'reserved' ? '#DBEAFE' : '#F3F4F6',
                    color: vehicle.status === 'available' ? '#065F46' : vehicle.status === 'reserved' ? '#1E40AF' : '#6B7280' }}>
                    {vehicle.status}
                  </span>
                </div>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {dealer?.whatsapp && (
                  <a href={`https://wa.me/${dealer.whatsapp.replace(/\D/g, '')}?text=${whatsappMsg}`} target="_blank"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 0', background: '#25D366', color: 'white', borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: '0.95rem' }}>
                    <MessageCircle size={18} /> WhatsApp dealer
                  </a>
                )}
                {dealer?.phone && (
                  <a href={`tel:${dealer.phone}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', background: 'white', color: '#374151', border: '1.5px solid #E5E7EB', borderRadius: 12, textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                    <Phone size={16} /> {dealer.phone}
                  </a>
                )}
                <BuyerInquiryWidget vehicleId={vehicle.id} dealerId={dealer.id} vehiclePrice={Number(vehicle.price_aed)} />
              </div>
            </div>

            {/* Reservation (broker booking) */}
            <ReservationWidget vehicleId={vehicle.id} vehicleStatus={vehicle.status} />

            {/* Smart Alert */}
            <AlertSubscribeWidget make={vehicle.make} model={vehicle.model} priceMax={Number(vehicle.price_aed)} />

            {/* Dealer card */}
            {dealer && (
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color: '#C1272D', flexShrink: 0 }}>
                    {dealer.company_name?.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dealer.company_name}</p>
                      {dealer.verified && <Shield size={13} style={{ color: '#007A3D', flexShrink: 0 }} />}
                    </div>
                    <TrustScoreBadge dealerId={dealer.id} size="sm" />
                    {dealer.rating > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Star size={11} style={{ color: '#F59E0B' }} />
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>{Number(dealer.rating).toFixed(1)}</span>
                        <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>({dealer.review_count} reviews)</span>
                      </div>
                    )}
                  </div>
                </div>
                <Link href={`/dealers/${dealer.slug}`}
                  style={{ display: 'block', textAlign: 'center', padding: '8px 0', border: '1.5px solid #E5E7EB', borderRadius: 10, color: '#374151', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600 }}>
                  View dealer profile →
                </Link>
              </div>
            )}

            {/* Quick facts */}
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '16px 18px' }}>
              <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 12px', fontSize: '0.875rem' }}>Quick facts</p>
              {[
                { icon: Calendar,  label: 'Listed since', value: new Date(vehicle.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
                { icon: Globe,     label: 'Specs',         value: 'GCC Spec' },
                { icon: CheckCircle, label: 'Export',      value: vehicle.export_eligible ? 'Eligible' : 'Not eligible', color: vehicle.export_eligible ? '#007A3D' : '#9CA3AF' },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                  <span style={{ fontSize: '0.82rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <f.icon size={13} /> {f.label}
                  </span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: f.color || '#374151' }}>{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
