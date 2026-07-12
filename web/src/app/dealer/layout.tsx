'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Share2, Scan, Clock, TrendingUp, Plus, ChevronRight, ChevronsLeft, ChevronsRight, LogOut, Star, Smartphone, HeartHandshake, Receipt, Inbox, Globe2, Menu, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';

const NAV = [
  { href: '/dealer/dashboard',      labelKey: 'dealer.nav.dashboard',        icon: LayoutDashboard },
  { href: '/dealer/requests',       labelKey: 'dealer.nav.requests',         icon: Inbox },
  { href: '/dealer/inventory/new',  labelKey: 'dealer.nav.add_vehicle',      icon: Plus, badge: '10s' },
  { href: '/dealer/shared',         labelKey: 'dealer.nav.shared_inventory', icon: Share2 },
  { href: '/dealer/scan',           labelKey: 'dealer.nav.smart_scan',       icon: Scan },
  { href: '/dealer/pricing',        labelKey: 'dealer.nav.pricing_ai',       icon: TrendingUp },
  { href: '/dealer/global-trade',   labelKey: 'dealer.nav.global_trade',     icon: Globe2 },
  { href: '/dealer/brokers',        labelKey: 'dealer.nav.brokers',          icon: HeartHandshake },
  { href: '/dealer/billing',        labelKey: 'dealer.nav.invoices',         icon: Receipt },
  { href: '/dealer/widget',         labelKey: 'dealer.nav.ios_widget',       icon: Smartphone },
  { href: '/dealer/subscription',   labelKey: 'dealer.nav.my_plan',          icon: Star },
];

const COLLAPSED_W = 60;
const EXPANDED_W = 200;
const HEADER_H = 63;

export default function DealerLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const path = usePathname() || '';
  const isTimeline = path.includes('/timeline/');
  const [pendingRequests, setPendingRequests] = useState(0);

  // Explicit JS viewport detection instead of CSS-only hidden/md:block —
  // guarantees exactly ONE of {mobile bar+drawer, desktop sidebar} ever
  // renders, with no possibility of both showing at once or a class not
  // being applied. Defaults to "not yet known" for the very first paint,
  // then corrects immediately after mount — see navChrome below.
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('dealer_sidebar_collapsed');
    if (saved === '1') setCollapsed(true);
  }, []);
  useEffect(() => { setMobileOpen(false); }, [path]); // close drawer on navigation

  const toggleCollapsed = () => {
    setCollapsed(c => { localStorage.setItem('dealer_sidebar_collapsed', !c ? '1' : '0'); return !c; });
  };

  useEffect(() => {
    const dealerId = typeof window !== 'undefined' ? localStorage.getItem('dealer_id') : null;
    if (!dealerId) return;
    const load = () => api.get<any>(`/leads/dealer/${dealerId}?decision=pending`).then(d => setPendingRequests(d?.pending_action || 0)).catch(() => {});
    load();
    const iv = setInterval(load, 20000);
    return () => clearInterval(iv);
  }, []);

  // Don't show sidebar on timeline detail pages (they have their own header)
  if (isTimeline) return <>{children}</>;

  const renderNavItem = (item: typeof NAV[number], opts: { iconOnly: boolean; onNavigate?: () => void }) => {
    const { href, labelKey, icon: Icon, badge } = item;
    const label = t(labelKey);
    const active = href === '/dealer/dashboard' ? path === '/dealer/dashboard' : path.startsWith(href);
    return (
      <Link key={href} href={href} onClick={opts.onNavigate} title={opts.iconOnly ? label : undefined}
        style={{
          position: 'relative', display: 'flex', alignItems: 'center', gap: 8,
          padding: opts.iconOnly ? '10px' : '8px 10px', borderRadius: 8, textDecoration: 'none',
          fontSize: '0.8rem', fontWeight: active ? 600 : 400,
          color: active ? '#C1272D' : '#6B7280', background: active ? '#FFF1F2' : 'transparent',
          justifyContent: opts.iconOnly ? 'center' : 'flex-start',
        }}>
        <Icon size={15} style={{ flexShrink: 0 }} />
        {!opts.iconOnly && <>
          {label}
          {badge && (
            <span style={{ marginLeft: 'auto', fontSize: '0.62rem', fontWeight: 800, padding: '1px 6px', borderRadius: 20, background: active ? '#C1272D' : '#FEF3C7', color: active ? 'white' : '#92400E', letterSpacing: '0.02em' }}>⚡{badge}</span>
          )}
          {href === '/dealer/requests' && pendingRequests > 0 && (
            <span style={{ marginLeft: badge ? 6 : 'auto', fontSize: '0.65rem', fontWeight: 800, padding: '1px 7px', borderRadius: 20, background: '#C1272D', color: 'white' }}>{pendingRequests}</span>
          )}
          {active && href !== '/dealer/requests' && !badge && <ChevronRight size={11} style={{ marginLeft: 'auto' }} />}
        </>}
        {opts.iconOnly && badge && (
          <span style={{ position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: '50%', background: '#F59E0B' }} />
        )}
        {opts.iconOnly && href === '/dealer/requests' && pendingRequests > 0 && (
          <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: '#C1272D' }} />
        )}
      </Link>
    );
  };

  // Until we know the real viewport (first client paint), render nothing for
  // the nav chrome rather than guessing — avoids ever flashing the wrong
  // variant. children render immediately regardless, so there's no blank page.
  const navChrome = !mounted ? null : isMobile ? (
    <>
      <div style={{ position: 'sticky', top: HEADER_H, zIndex: 30, width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'white', borderBottom: '1px solid #E5E7EB' }}>
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', flexShrink: 0 }}>
          <Menu size={17} color="#374151" />
        </button>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>
          {t(NAV.find(n => path === n.href || (n.href !== '/dealer/dashboard' && path.startsWith(n.href)))?.labelKey || 'dealer.nav.dashboard')}
        </span>
      </div>

      {mobileOpen && (
        <div style={{ position: 'fixed', top: HEADER_H, left: 0, right: 0, bottom: 0, zIndex: 60, background: 'rgba(0,0,0,0.3)', display: 'flex' }}
          onClick={() => setMobileOpen(false)}>
          <aside onClick={e => e.stopPropagation()} style={{ width: 240, maxWidth: '80vw', background: 'white', height: '100%', overflowY: 'auto', boxShadow: '4px 0 20px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '14px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', marginBottom: 8 }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', margin: 0 }}>Dealer portal</p>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={18} color="#6B7280" />
              </button>
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px' }}>
              {NAV.map(item => renderNavItem(item, { iconOnly: false, onNavigate: () => setMobileOpen(false) }))}
            </nav>
            <div style={{ margin: '14px 12px 0' }}>
              <Link href="/dealer/dashboard" onClick={() => setMobileOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, textDecoration: 'none', background: 'linear-gradient(135deg,#1E1B4B,#312E81)' }}>
                <span style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: '#34D399', flexShrink: 0 }}>
                  <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#34D399', opacity: 0.6, animation: 'aiTwinPulse 2s infinite' }} />
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>🤖 AI Twin is active</span>
              </Link>
            </div>
            <div style={{ margin: '10px 12px 0', borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
              <Link href="/" onClick={() => setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, textDecoration: 'none', fontSize: '0.8rem', color: '#9CA3AF' }}>
                <LogOut size={14} /> Back to site
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  ) : (
    <aside style={{ width: collapsed ? COLLAPSED_W : EXPANDED_W, background: 'white', borderRight: '1px solid #E5E7EB', flexShrink: 0, position: 'sticky', top: HEADER_H, alignSelf: 'flex-start', height: `calc(100vh - ${HEADER_H}px)`, overflowY: 'auto', overflowX: 'hidden' }}>
      <div style={{ padding: collapsed ? '16px 8px' : '16px 12px' }}>
        {!collapsed && <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', padding: '0 8px', marginBottom: 8 }}>Dealer portal</p>}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => renderNavItem(item, { iconOnly: collapsed }))}
        </nav>

        <div style={{ marginTop: 14 }}>
          <Link href="/dealer/dashboard" title={collapsed ? 'AI Twin is active' : undefined}
            style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 8, padding: collapsed ? '10px' : '9px 10px', borderRadius: 10, textDecoration: 'none', background: 'linear-gradient(135deg,#1E1B4B,#312E81)' }}>
            <span style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: '#34D399', flexShrink: 0 }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#34D399', opacity: 0.6, animation: 'aiTwinPulse 2s infinite' }} />
            </span>
            {!collapsed && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>🤖 AI Twin active</span>}
          </Link>
        </div>

        <div style={{ marginTop: 10, borderTop: '1px solid #F3F4F6', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Link href="/" title={collapsed ? 'Back to site' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: collapsed ? '10px' : '8px 10px', borderRadius: 8, textDecoration: 'none', fontSize: '0.8rem', color: '#9CA3AF', justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <LogOut size={14} /> {!collapsed && 'Back to site'}
          </Link>
          <button onClick={toggleCollapsed} title={collapsed ? 'Expand menu' : 'Collapse menu'}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: collapsed ? '10px' : '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: '0.8rem', color: '#9CA3AF', cursor: 'pointer', justifyContent: collapsed ? 'center' : 'flex-start', width: '100%' }}>
            {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />} {!collapsed && 'Collapse'}
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: `calc(100vh - ${HEADER_H}px)` }}>
      {navChrome}
      <main style={{ flex: 1, minWidth: 0, width: '100%' }}>{children}</main>
    </div>
  );
}
