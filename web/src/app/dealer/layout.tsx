'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Share2, Scan, Clock, TrendingUp, Plus, ChevronRight, LogOut, Star, Smartphone, HeartHandshake, Receipt, Inbox, Globe2 } from 'lucide-react';
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

export default function DealerLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const path = usePathname() || '';
  const isTimeline = path.includes('/timeline/');
  const [pendingRequests, setPendingRequests] = useState(0);

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

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 63px)' }}>
      {/* Sidebar */}
      <aside style={{ width: 200, background: 'white', borderRight: '1px solid #E5E7EB', flexShrink: 0, position: 'sticky', top: 63, alignSelf: 'flex-start', height: 'calc(100vh - 63px)', overflowY: 'auto' }}>
        <div style={{ padding: '16px 12px' }}>
          <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', padding: '0 8px', marginBottom: 8 }}>Dealer portal</p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV.map(({ href, labelKey, icon: Icon }) => {
              const label = t(labelKey);
              const active = href === '/dealer/dashboard' ? path === '/dealer/dashboard' : path.startsWith(href);
              return (
                <Link key={href} href={href}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, textDecoration: 'none', fontSize: '0.8rem', fontWeight: active ? 600 : 400, color: active ? '#C1272D' : '#6B7280', background: active ? '#FFF1F2' : 'transparent', transition: 'all 0.12s' }}>
                  <Icon size={15} style={{ flexShrink: 0 }} />
                  {label}
                  {href === '/dealer/requests' && pendingRequests > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 800, padding: '1px 7px', borderRadius: 20, background: '#C1272D', color: 'white' }}>{pendingRequests}</span>
                  )}
                  {active && href !== '/dealer/requests' && <ChevronRight size={11} style={{ marginLeft: 'auto' }} />}
                </Link>
              );
            })}
          </nav>
          
          <div style={{ marginTop: 16, borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, textDecoration: 'none', fontSize: '0.8rem', color: '#9CA3AF' }}>
              <LogOut size={14} /> Back to site
            </Link>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
    </div>
  );
}
