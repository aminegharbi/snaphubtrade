'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Share2, Scan, Clock, TrendingUp, Plus, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, LogOut, Star, Smartphone, HeartHandshake, Receipt, Inbox, Globe2, Menu, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';

const NAV = [
  { href: '/dealer/dashboard',      labelKey: 'dealer.nav.dashboard',        icon: LayoutDashboard },
  { href: '/dealer/requests',       labelKey: 'dealer.nav.requests',         icon: Inbox },
  { href: '/dealer/inventory/new',  labelKey: 'dealer.nav.add_vehicle',      icon: Plus },
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

export default function DealerLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const path = usePathname() || '';
  const isTimeline = path.includes('/timeline/');
  const [pendingRequests, setPendingRequests] = useState(0);

  // Desktop collapse/expand — persisted so it stays put across navigation.
  const [collapsed, setCollapsed] = useState(false);
  // Mobile off-canvas drawer — closed by default, opened via the mobile top bar.
  const [mobileOpen, setMobileOpen] = useState(false);

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
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  // Don't show sidebar on timeline detail pages (they have their own header)
  if (isTimeline) return <>{children}</>;

  const width = collapsed ? COLLAPSED_W : EXPANDED_W;

  const navItems = (onNavigate?: () => void) => NAV.map(({ href, labelKey, icon: Icon }) => {
    const label = t(labelKey);
    const active = href === '/dealer/dashboard' ? path === '/dealer/dashboard' : path.startsWith(href);
    return (
      <Link key={href} href={href} onClick={onNavigate} title={collapsed && !onNavigate ? label : undefined}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: collapsed && !onNavigate ? '10px' : '8px 10px', borderRadius: 8, textDecoration: 'none', fontSize: '0.8rem', fontWeight: active ? 600 : 400, color: active ? '#C1272D' : '#6B7280', background: active ? '#FFF1F2' : 'transparent', transition: 'all 0.12s', justifyContent: collapsed && !onNavigate ? 'center' : 'flex-start' }}>
        <Icon size={15} style={{ flexShrink: 0 }} />
        {(!collapsed || onNavigate) && <>
          {label}
          {href === '/dealer/requests' && pendingRequests > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 800, padding: '1px 7px', borderRadius: 20, background: '#C1272D', color: 'white' }}>{pendingRequests}</span>
          )}
          {active && href !== '/dealer/requests' && <ChevronRight size={11} style={{ marginLeft: 'auto' }} />}
        </>}
        {collapsed && !onNavigate && href === '/dealer/requests' && pendingRequests > 0 && (
          <span style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: '50%', background: '#C1272D' }} />
        )}
      </Link>
    );
  });

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 63px)' }}>
      {/* Mobile top bar — hamburger to open the drawer + current section label */}
      <div className="md:hidden" style={{ position: 'sticky', top: 63, zIndex: 30, width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'white', borderBottom: '1px solid #E5E7EB' }}>
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', flexShrink: 0 }}>
          <Menu size={17} color="#374151" />
        </button>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>
          {t(NAV.find(n => path === n.href || (n.href !== '/dealer/dashboard' && path.startsWith(n.href)))?.labelKey || 'dealer.nav.dashboard')}
        </span>
      </div>

      {/* Desktop sidebar — collapsible, persisted */}
      <aside className="hidden md:block" style={{ width, background: 'white', borderRight: '1px solid #E5E7EB', flexShrink: 0, position: 'sticky', top: 63, alignSelf: 'flex-start', height: 'calc(100vh - 63px)', overflowY: 'auto', overflowX: 'hidden', transition: 'width 0.18s ease' }}>
        <div style={{ padding: collapsed ? '16px 8px' : '16px 12px' }}>
          {!collapsed && <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', padding: '0 8px', marginBottom: 8 }}>Dealer portal</p>}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {navItems()}
          </nav>

          <div style={{ marginTop: 16, borderTop: '1px solid #F3F4F6', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Link href="/" title={collapsed ? 'Back to site' : undefined}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: collapsed ? '10px' : '8px 10px', borderRadius: 8, textDecoration: 'none', fontSize: '0.8rem', color: '#9CA3AF', justifyContent: collapsed ? 'center' : 'flex-start' }}>
              <LogOut size={14} /> {!collapsed && 'Back to site'}
            </Link>
            <button onClick={toggleCollapsed} title={collapsed ? 'Expand menu' : 'Collapse menu'}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: collapsed ? '10px' : '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', textDecoration: 'none', fontSize: '0.8rem', color: '#9CA3AF', cursor: 'pointer', justifyContent: collapsed ? 'center' : 'flex-start', width: '100%' }}>
              {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />} {!collapsed && 'Collapse'}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, top: 63, zIndex: 60, background: 'rgba(0,0,0,0.3)' }} onClick={() => setMobileOpen(false)}>
          <aside onClick={e => e.stopPropagation()} style={{ width: 240, maxWidth: '80vw', background: 'white', height: 'calc(100vh - 63px)', overflowY: 'auto', boxShadow: '4px 0 20px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '14px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', marginBottom: 8 }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', margin: 0 }}>Dealer portal</p>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={18} color="#6B7280" />
              </button>
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px' }}>
              {navItems(() => setMobileOpen(false))}
            </nav>
            <div style={{ margin: '16px 12px 0', borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
              <Link href="/" onClick={() => setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, textDecoration: 'none', fontSize: '0.8rem', color: '#9CA3AF' }}>
                <LogOut size={14} /> Back to site
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
    </div>
  );
}
