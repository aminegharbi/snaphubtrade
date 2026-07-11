'use client';
import Link from 'next/link';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useSession } from '@/contexts/SessionContext';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Menu, X, Car, ChevronDown, BarChart3, Shield, Scan, Zap, LogOut, Briefcase, User, Building2 } from 'lucide-react';
import { CurrencySelector } from './CurrencySelector';
import { LanguageSelector } from './LanguageSelector';

const UAE_STRIPE = 'linear-gradient(90deg, #C1272D 25%, #231F20 25%, #231F20 50%, #FFFFFF 50%, #FFFFFF 75%, #007A3D 75%)';

const PROFILE_CFG: Record<string, { label: string; color: string; bg: string; icon: any; dashboardHref: string }> = {
  broker: { label: 'Broker', color: '#007A3D', bg: '#F0FDF4', icon: Briefcase, dashboardHref: '/broker/dashboard' },
  dealer: { label: 'Dealer', color: '#1E40AF', bg: '#EFF6FF', icon: Building2, dashboardHref: '/dealer/dashboard' },
  admin:  { label: 'Admin',  color: '#C1272D', bg: '#FFF1F2', icon: Shield, dashboardHref: '/admin' },
  buyer:  { label: 'Member', color: '#6B7280', bg: '#F9FAFB', icon: User, dashboardHref: '/' },
};

function IdentityMenu() {
  const { profile, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (profile.profile_type === 'guest') {
    return (
      <Link href="/login"
        style={{ padding: '7px 18px', background: '#C1272D', color: 'white', borderRadius: 10, fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 6px rgba(193,39,45,0.3)' }}>
        Sign in
      </Link>
    );
  }

  const cfg = PROFILE_CFG[profile.profile_type] || PROFILE_CFG.buyer;
  const Icon = cfg.icon;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px 5px 6px', borderRadius: 11, border: `1.5px solid ${cfg.color}30`, background: cfg.bg, cursor: 'pointer' }}>
        <span style={{ position: 'relative', width: 26, height: 26, borderRadius: '50%', background: cfg.color, color: 'white', fontWeight: 800, fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {profile.avatar_label}
          <span style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: '#22C55E', border: '1.5px solid white' }} />
        </span>
        <span className="hidden sm:flex" style={{ flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#111827', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.display_name}</span>
          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
        </span>
        <ChevronDown size={12} style={{ color: cfg.color, flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 220, background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, boxShadow: '0 12px 32px rgba(0,0,0,0.14)', overflow: 'hidden', zIndex: 100 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon size={14} style={{ color: cfg.color }} />
            <div>
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#111827', margin: 0 }}>{profile.display_name}</p>
              {profile.email && <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: 0 }}>{profile.email}</p>}
            </div>
          </div>
          <Link href={cfg.dashboardHref} onClick={() => setOpen(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: '0.82rem', color: '#374151', textDecoration: 'none' }}
            className="hover:bg-gray-50">
            <BarChart3 size={13} /> {cfg.label} dashboard
          </Link>
          {profile.profile_type === 'broker' && profile.affiliate_code && (
            <div style={{ padding: '0 14px 10px', fontSize: '0.7rem', color: '#9CA3AF' }}>
              Code: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#007A3D' }}>{profile.affiliate_code}</span>
            </div>
          )}
          <button onClick={() => { signOut(); setOpen(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: '0.82rem', color: '#C1272D', background: 'none', border: 'none', borderTop: '1px solid #F3F4F6', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const { isEnabled } = useFeatureFlags();
  const { profile } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState('');
  const router = useRouter();

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) { router.push(`/marketplace?query=${encodeURIComponent(q.trim())}`); setMobileOpen(false); }
  };

  const isDealer = profile.profile_type === 'dealer';
  const isBroker = profile.profile_type === 'broker';
  const isAdmin = profile.profile_type === 'admin';

  return (
    <header style={{ background: 'white', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      {/* UAE flag stripe */}
      <div style={{ height: 3, background: UAE_STRIPE }} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 58, gap: 12 }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0, marginRight: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: '#C1272D', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(193,39,45,0.35)' }}>
            <Car size={17} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#111827', letterSpacing: '-0.02em' }}>
            SnapHub<span style={{ color: '#C1272D' }}>Trade.com</span>
          </span>
        </Link>

        {/* Search bar */}
        <form onSubmit={onSearch} style={{ flex: 1, maxWidth: 380 }} className="hidden sm:block">
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
            <input
              type="text" value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search make, model…"
              style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: '0.85rem', color: '#111827', outline: 'none', background: '#F9FAFB', transition: 'border-color 0.15s' }}
              onFocus={e => (e.target.style.borderColor = '#C1272D')}
              onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
            />
          </div>
        </form>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 4 }} className="hidden lg:flex">
          {[
            { href: '/pricing',     label: 'Pricing' },
            { href: '/marketplace', label: 'Marketplace' },
            { href: '/compare',     label: 'Compare' },
            { href: '/export',      label: 'Export Hub' },
            { href: '/dealers',     label: 'Dealers' },
          ].map(l => (
            <Link key={l.href} href={l.href}
              style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500, color: '#374151', textDecoration: 'none', transition: 'background 0.1s' }}
              className="hover:bg-gray-100">
              {l.label}
            </Link>
          ))}

          {/* "Join" only shown to guests — logged-in users already have a profile */}
          {profile.profile_type === 'guest' && (
            <Link href="/join"
              className="hidden lg:flex"
              style={{ alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500, color: '#374151', textDecoration: 'none' }}>
              Join
            </Link>
          )}
          {isEnabled('broker_programme') && !isBroker && (
            <Link href="/broker"
              className="hidden lg:flex"
              style={{ alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, color: '#007A3D', textDecoration: 'none', background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              💼 Brokers
            </Link>
          )}
          {/* Broker: quick link to their reservations */}
          {isBroker && (
            <Link href="/broker/dashboard?tab=reservations"
              className="hidden lg:flex"
              style={{ alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, color: '#007A3D', textDecoration: 'none', background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              🔖 My reservations
            </Link>
          )}
          {/* Catalog dropdown */}
          <div style={{ position: 'relative' }} className="group">
            <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500, color: '#374151', background: 'none', border: 'none', cursor: 'pointer' }} className="hover:bg-gray-100">
              Catalog <ChevronDown size={13} />
            </button>
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, width: 190, background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', padding: '6px', opacity: 0, pointerEvents: 'none', transition: 'opacity 0.15s, transform 0.15s', transform: 'translateY(-4px)', zIndex: 100 }}
              className="group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0">
              {[
                { href: '/catalog/brands', label: '🏷 All Brands' },
                { href: '/catalog/models', label: '🚗 Model Database' },
                { href: '/catalog/technologies', label: '⚡ Technologies' },
              ].map(l => (
                <Link key={l.href} href={l.href}
                  style={{ display: 'block', padding: '9px 12px', fontSize: '0.875rem', color: '#374151', textDecoration: 'none', borderRadius: 8, transition: 'background 0.1s' }}
                  className="hover:bg-gray-50">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          {/* Dealer-only quick actions */}
          {isDealer && (
            <>
              <Link href="/dealer/scan"
                className="hidden md:flex"
                style={{ alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, color: '#C1272D', textDecoration: 'none', background: '#FFF1F2', border: '1px solid #FECACA' }}>
                <Zap size={13} /> Scan
              </Link>
            </>
          )}
          {/* Admin-only quick link */}
          {isAdmin && (
            <Link href="/admin"
              className="hidden lg:flex"
              style={{ alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500, color: '#374151', textDecoration: 'none' }}>
              <Shield size={14} /> Admin
            </Link>
          )}

          <div className="hidden sm:block"><LanguageSelector compact theme="light" /></div>
          <div className="hidden sm:block"><CurrencySelector compact theme="light" /></div>

          <IdentityMenu />

          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden"
            style={{ padding: 8, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: '#374151' }}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{ background: 'white', borderTop: '1px solid #F3F4F6', padding: '12px 16px 16px' }}>
          <div className="sm:hidden" style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <LanguageSelector compact theme="light" />
            <CurrencySelector compact theme="light" />
          </div>
          <form onSubmit={onSearch} style={{ marginBottom: 10 }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…"
                style={{ width: '100%', paddingLeft: 30, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: '0.875rem', color: '#111827', outline: 'none' }} />
            </div>
          </form>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { href: '/pricing',            label: 'Pricing' },
              { href: '/marketplace',        label: 'Marketplace' },
              { href: '/compare',            label: '⚖️ Compare' },
              { href: '/export',             label: '✈️ Export Hub' },
              { href: '/dealers',            label: 'Dealers' },
              { href: '/catalog/brands',     label: 'Brands' },
              { href: '/catalog/models',     label: 'Models' },
              { href: '/catalog/technologies', label: 'Technologies' },
              ...(isDealer ? [
                { href: '/dealer/dashboard',   label: '📊 Dealer dashboard' },
                { href: '/dealer/scan',        label: '⚡ Smart Scan' },
                { href: '/dealer/shared',      label: '🔗 Shared Inventory' },
                { href: '/dealer/subscription', label: '💳 My Plan' },
              ] : []),
              ...(isBroker ? [
                { href: '/broker/dashboard',   label: '💼 Broker dashboard' },
                { href: '/broker/dashboard?tab=reservations', label: '🔖 My reservations' },
              ] : []),
              ...(isAdmin ? [{ href: '/admin', label: '🛡 Admin' }] : []),
              ...(profile.profile_type === 'guest' ? [
                { href: '/join',  label: '👤 Create account' },
                { href: '/broker', label: '💼 Broker programme' },
              ] : []),
            ].map(l => (
              <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                style={{ display: 'block', padding: '10px 12px', borderRadius: 8, fontSize: '0.875rem', color: '#374151', textDecoration: 'none', fontWeight: 500 }}
                className="hover:bg-gray-50">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
