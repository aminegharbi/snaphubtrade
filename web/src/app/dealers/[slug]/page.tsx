export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Phone, Mail, Globe, CheckCircle, Star, MessageCircle, ArrowLeft, Instagram, Facebook, Youtube, Car } from 'lucide-react';
import { api } from '@/lib/api';
import { VehicleCard } from '@/components/vehicle/VehicleCard';
import { TrustScoreBadge } from '@/components/dealer/TrustScoreBadge';

export default async function DealerSlugPage({ params }: { params: { slug: string } }) {
  let dealer: any = null;
  try { dealer = await api.get<any>(`/dealers/${params.slug}`); }
  catch { notFound(); }
  if (!dealer) notFound();

  const social = dealer.social_media || [];
  const vehicles = dealer.vehicles || [];

  const socialIcon = (platform: string) => {
    if (platform === 'instagram') return <Instagram size={14} />;
    if (platform === 'facebook') return <Facebook size={14} />;
    if (platform === 'youtube') return <Youtube size={14} />;
    return <Globe size={14} />;
  };
  const socialColor = (platform: string) => {
    if (platform === 'instagram') return { color:'#E1306C', bg:'rgba(225,48,108,0.08)' };
    if (platform === 'facebook') return { color:'#1877F2', bg:'rgba(24,119,242,0.08)' };
    if (platform === 'youtube') return { color:'#FF0000', bg:'rgba(255,0,0,0.08)' };
    return { color:'#6B7280', bg:'#F3F4F6' };
  };

  return (
    <div style={{ minHeight:'100vh', background:'#F9FAFB' }}>
      {/* Hero band - UAE colors */}
      <div style={{ background:'white', borderBottom:'1px solid #E5E7EB', padding:'24px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Link href="/dealers"
            style={{ display:'inline-flex', alignItems:'center', gap:6, color:'#9CA3AF', textDecoration:'none', fontSize:'0.875rem', marginBottom:20 }}>
            <ArrowLeft size={14} /> All dealers
          </Link>

          <div style={{ display:'flex', alignItems:'flex-start', gap:20, flexWrap:'wrap' }}>
            {/* Logo */}
            <div style={{ width:72, height:72, borderRadius:16, background: dealer.logo_url ? 'transparent' : '#C1272D', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden', border:'1px solid #E5E7EB' }}>
              {dealer.logo_url
                ? <img src={dealer.logo_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <span style={{ color:'white', fontSize:'1.75rem', fontWeight:900 }}>{dealer.company_name?.[0]}</span>}
            </div>

            <TrustScoreBadge dealerId={dealer.id} size="lg" />

            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:4 }}>
                <h1 style={{ fontWeight:800, fontSize:'1.4rem', color:'#111827', margin:0 }}>{dealer.company_name}</h1>
                {dealer.verified && (
                  <span style={{ display:'flex', alignItems:'center', gap:4, background:'#D1FAE5', color:'#065F46', padding:'3px 10px', borderRadius:20, fontSize:'0.75rem', fontWeight:600 }}>
                    <CheckCircle size={11} /> Verified dealer
                  </span>
                )}
                {dealer.subscription_tier && dealer.subscription_tier !== 'free' && (
                  <span style={{ background:'#FFF1F2', color:'#C1272D', padding:'3px 10px', borderRadius:20, fontSize:'0.75rem', fontWeight:700, border:'1px solid #FECACA' }}>
                    {dealer.subscription_tier.toUpperCase()}
                  </span>
                )}
              </div>

              {dealer.rating > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={14} fill={i <= Math.round(dealer.rating) ? '#C1272D' : 'none'} style={{ color:'#C1272D' }} />
                  ))}
                  <span style={{ fontSize:'0.875rem', fontWeight:600, color:'#111827' }}>{Number(dealer.rating).toFixed(1)}</span>
                  <span style={{ fontSize:'0.875rem', color:'#9CA3AF' }}>· {dealer.review_count} reviews</span>
                </div>
              )}

              <p style={{ color:'#6B7280', fontSize:'0.9rem', lineHeight:1.6, margin:'0 0 12px', maxWidth:600 }}>
                {dealer.description}
              </p>

              {/* Contact row */}
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                {dealer.whatsapp && (
                  <a href={`https://wa.me/${dealer.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'#25D366', color:'white', textDecoration:'none', fontWeight:600, fontSize:'0.875rem' }}>
                    <MessageCircle size={15} /> WhatsApp
                  </a>
                )}
                {dealer.phone && (
                  <a href={`tel:${dealer.phone}`}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, border:'1px solid #E5E7EB', color:'#374151', textDecoration:'none', fontSize:'0.875rem', background:'white' }}>
                    <Phone size={14} /> {dealer.phone}
                  </a>
                )}
                {dealer.email && (
                  <a href={`mailto:${dealer.email}`}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, border:'1px solid #E5E7EB', color:'#374151', textDecoration:'none', fontSize:'0.875rem', background:'white' }}>
                    <Mail size={14} /> Email
                  </a>
                )}
                {dealer.website && (
                  <a href={dealer.website} target="_blank" rel="noopener noreferrer"
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, border:'1px solid #E5E7EB', color:'#374151', textDecoration:'none', fontSize:'0.875rem', background:'white' }}>
                    <Globe size={14} /> Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:24 }}>
          {/* Left: vehicles */}
          <div>
            <h2 style={{ fontWeight:700, color:'#111827', marginBottom:16, fontSize:'1rem' }}>
              Available inventory · {vehicles.length} vehicles
            </h2>
            {vehicles.length === 0 ? (
              <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:'48px', textAlign:'center' }}>
                <Car size={36} style={{ color:'#D1D5DB', margin:'0 auto 12px', display:'block' }} />
                <p style={{ color:'#6B7280', fontWeight:500 }}>No vehicles listed yet</p>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:16 }}>
                {vehicles.map((v: any) => <VehicleCard key={v.id} vehicle={{ ...v, dealer }} />)}
              </div>
            )}
          </div>

          {/* Right: info panel */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Social media */}
            {social.length > 0 && (
              <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:18 }}>
                <p style={{ fontWeight:700, color:'#111827', marginBottom:12, fontSize:'0.875rem' }}>Social media</p>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {social.map((s: any) => {
                    const sc = socialColor(s.platform);
                    return (
                      <a key={s.platform} href={s.url} target="_blank" rel="noopener noreferrer"
                        style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, textDecoration:'none', border:'1px solid #E5E7EB', background:sc.bg, color:sc.color, fontWeight:500, fontSize:'0.875rem' }}>
                        {socialIcon(s.platform)}
                        <span>{s.handle || s.platform}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Details */}
            <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:18 }}>
              <p style={{ fontWeight:700, color:'#111827', marginBottom:12, fontSize:'0.875rem' }}>Dealer info</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {dealer.address && (
                  <div style={{ display:'flex', gap:8 }}>
                    <MapPin size={14} style={{ color:'#9CA3AF', flexShrink:0, marginTop:2 }} />
                    <span style={{ fontSize:'0.85rem', color:'#374151', lineHeight:1.5 }}>{dealer.address}</span>
                  </div>
                )}
                {dealer.free_zone_license && (
                  <div>
                    <p style={{ fontSize:'0.72rem', color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 2px' }}>License</p>
                    <p style={{ fontSize:'0.85rem', color:'#374151', margin:0, fontFamily:'monospace' }}>{dealer.free_zone_license}</p>
                  </div>
                )}
                {dealer.languages?.length > 0 && (
                  <div>
                    <p style={{ fontSize:'0.72rem', color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 6px' }}>Languages</p>
                    <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                      {dealer.languages.map((l: string) => (
                        <span key={l} style={{ padding:'2px 8px', borderRadius:5, background:'#F3F4F6', color:'#374151', fontSize:'0.75rem', fontWeight:500 }}>{l.toUpperCase()}</span>
                      ))}
                    </div>
                  </div>
                )}
                {dealer.export_destinations?.length > 0 && (
                  <div>
                    <p style={{ fontSize:'0.72rem', color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 6px' }}>Export markets</p>
                    <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                      {dealer.export_destinations.map((d: string) => (
                        <span key={d} style={{ padding:'2px 8px', borderRadius:5, background:'#DBEAFE', color:'#1E40AF', fontSize:'0.75rem', fontWeight:500 }}>{d}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
