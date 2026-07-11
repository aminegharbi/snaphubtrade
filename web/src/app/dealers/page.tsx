import Link from 'next/link';
import { Shield, Star, Globe, Phone, MessageCircle, CheckCircle, Instagram, Facebook, Youtube, MapPin, Search } from 'lucide-react';
import { api, type Dealer } from '@/lib/api';
import { T } from '@/components/common/T';

export const dynamic = 'force-dynamic';

interface DealerWithMeta extends Dealer {
  vehicle_count: number;
  social_media: { platform: string; url: string; handle: string }[];
}

interface Country {
  id: string;
  code: string;
  name: string;
}

// A few flag emoji for a bit of visual polish — purely decorative, falls back
// gracefully to just the country name if a code isn't in the map.
const COUNTRY_FLAGS: Record<string, string> = {
  AE: '🇦🇪', SA: '🇸🇦', QA: '🇶🇦', BH: '🇧🇭', KW: '🇰🇼', OM: '🇴🇲',
};

function SocialIcon({ platform }: { platform: string }) {
  if (platform === 'instagram') return <Instagram size={14} />;
  if (platform === 'facebook') return <Facebook size={14} />;
  if (platform === 'youtube') return <Youtube size={14} />;
  return <Globe size={14} />;
}

function SocialColors(platform: string) {
  if (platform === 'instagram') return { color: '#E1306C', bg: 'rgba(225,48,108,0.1)' };
  if (platform === 'facebook') return { color: '#1877F2', bg: 'rgba(24,119,242,0.1)' };
  if (platform === 'youtube') return { color: '#FF0000', bg: 'rgba(255,0,0,0.1)' };
  return { color: '#6B7280', bg: 'rgba(107,114,128,0.1)' };
}

function DealerCard({ dealer }: { dealer: DealerWithMeta }) {
  const zoneLabel = dealer.free_zone?.name || dealer.country?.name || 'GCC';

  return (
    <div className="glass-card rounded-2xl p-5 hover:border-white/15 transition-all flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(193,39,45,0.15)', color: '#C1272D' }}>
              {zoneLabel}
            </span>
            {dealer.verified && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle size={10} /> Verified
              </span>
            )}
          </div>
          <h3 className="font-semibold text-white text-sm leading-snug">{dealer.company_name}</h3>
        </div>
        <div className="shrink-0 ml-3 text-right">
          <div className="flex items-center gap-1 justify-end">
            <Star size={11} style={{ color: '#C1272D' }} fill="#C1272D" />
            <span className="text-xs font-semibold text-white">{Number(dealer.rating).toFixed(1)}</span>
          </div>
          <p className="text-xs text-white/30 mt-0.5">{dealer.review_count} reviews</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-white/40 leading-relaxed mb-3 line-clamp-3 flex-1">{dealer.description}</p>

      {/* Address */}
      {dealer.address && (
        <div className="flex items-start gap-1.5 mb-3 text-xs text-white/30">
          <MapPin size={11} className="shrink-0 mt-0.5" />
          <span className="line-clamp-2">{dealer.address}</span>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-white/40 mb-4 pb-4 border-b border-white/5">
        <span>{dealer.vehicle_count || 0} vehicles</span>
        {dealer.languages?.length > 0 && (
          <span className="flex items-center gap-1">
            <Globe size={10} />
            {dealer.languages.slice(0,3).join(' · ')}
          </span>
        )}
      </div>

      {/* Social media */}
      {dealer.social_media?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {dealer.social_media.map((s) => {
            const sc = SocialColors(s.platform);
            return (
              <a key={s.platform} href={s.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}25` }}>
                <SocialIcon platform={s.platform} />
                {s.handle || s.platform}
              </a>
            );
          })}
        </div>
      )}

      {/* CTAs */}
      <div className="flex gap-2">
        {dealer.whatsapp && (
          <a href={`https://wa.me/${dealer.whatsapp.replace(/\D/g, '')}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-90 flex-1 justify-center"
            style={{ background: 'rgba(37,211,102,0.12)', color: '#25D366', border: '1px solid rgba(37,211,102,0.2)' }}>
            <MessageCircle size={13} /> WhatsApp
          </a>
        )}
        <Link href={`/dealers/${dealer.slug}`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-white/10 text-white/60 hover:text-white hover:border-white/25 transition-all flex-1 justify-center">
          View profile →
        </Link>
      </div>
    </div>
  );
}

export default async function DealersPage({ searchParams }: { searchParams: { country?: string; zone?: string; search?: string } }) {
  const country = searchParams?.country || '';
  const zone = searchParams?.zone || '';
  const search = searchParams?.search || '';

  let dealers: DealerWithMeta[] = [];
  let total = 0;
  let countries: Country[] = [];

  try {
    const params = new URLSearchParams({ limit: '100' });
    if (country) params.set('country', country);
    if (zone) params.set('zone', zone);
    if (search) params.set('search', search);
    const [dealersRes, countriesRes] = await Promise.all([
      api.get<any>(`/dealers?${params}`),
      api.get<Country[]>('/countries'),
    ]);
    dealers = dealersRes.items || [];
    total = dealersRes.total || 0;
    countries = countriesRes || [];
  } catch {
    dealers = [];
  }

  // Group by country (was hardcoded to 3 UAE zones — now scales to every GCC
  // market a dealer is registered in).
  const byCountry: Record<string, DealerWithMeta[]> = {};
  for (const d of dealers) {
    const code = d.country?.code || 'OTHER';
    if (!byCountry[code]) byCountry[code] = [];
    byCountry[code].push(d);
  }
  const activeGroups = Object.entries(byCountry).filter(([, ds]) => ds.length > 0);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-white/5 py-10" style={{ background: '#0D0D14' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white mb-2"><T k="dealers.title" /></h1>
          <p className="text-white/40 mb-6">
            {total} verified dealers across {countries.length || 6} Gulf markets
          </p>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex gap-1.5 flex-wrap">
              <a href="/dealers"
                className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                style={!country
                  ? { background: 'rgba(193,39,45,0.15)', color: '#C1272D', borderColor: 'rgba(193,39,45,0.35)' }
                  : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.08)' }}>
                All countries
              </a>
              {countries.map((c) => (
                <a key={c.id} href={`/dealers?country=${c.code}${search ? `&search=${search}` : ''}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                  style={country === c.code
                    ? { background: 'rgba(193,39,45,0.15)', color: '#C1272D', borderColor: 'rgba(193,39,45,0.35)' }
                    : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.08)' }}>
                  {COUNTRY_FLAGS[c.code] || ''} {c.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">
        {activeGroups.map(([code, groupDealers]) => {
          const countryName = countries.find((c) => c.code === code)?.name || 'Other';
          return (
            <section key={code}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-6 rounded-full" style={{ background: '#C1272D' }} />
                <h2 className="text-lg font-bold text-white">{COUNTRY_FLAGS[code] || ''} {countryName}</h2>
                <span className="text-sm text-white/30">— {groupDealers.length} dealers</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groupDealers.map(d => <DealerCard key={d.id} dealer={d} />)}
              </div>
            </section>
          );
        })}

        {dealers.length === 0 && (
          <div className="text-center py-24">
            <p className="text-4xl mb-4">🏢</p>
            <p className="text-white/40">No dealers found. Try removing filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
