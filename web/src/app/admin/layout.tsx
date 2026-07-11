'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Car, Store, Bell, Settings, CreditCard, LayoutGrid,
  ChevronRight, LogOut, Shield, Flag, TrendingUp, Globe, HeartHandshake, Mail
} from 'lucide-react';
import { CurrencySelector } from '@/components/common/CurrencySelector';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/dealers', label: 'Dealers', icon: Store },
  { href: '/admin/brokers', label: 'Brokers', icon: HeartHandshake },
  { href: '/admin/prospects', label: '📨 Prospects', icon: Mail },
  { href: '/admin/global-trade', label: '🌍 Global Trade Intelligence', icon: Globe },
  { href: '/admin/email', label: '📣 Marketing & Campaigns', icon: Mail },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/vehicles', label: 'Vehicles', icon: Car },
  { href: '/admin/alerts',        label: 'Alerts',        icon: Bell },
  { href: '/admin/sessions',      label: '🟢 Active Sessions', icon: Users },
  { href: '/admin/subscriptions', label: 'Subscriptions',  icon: CreditCard },
  { href: '/admin/plans',         label: 'Plans',          icon: LayoutGrid },
  { href: '/admin/features',      label: '🚩 Feature Flags',  icon: Flag },
  { href: '/admin/market-analytics', label: '📊 Market Analytics', icon: TrendingUp },
  { href: '/admin/market-analysis', label: '🔍 AI Market Analysis', icon: Globe },
  { href: '/admin/ai-twin',       label: '🤖 AI Twin Dealer', icon: Shield },
  { href: '/admin/valuation',     label: '⚙️ Valuation Config', icon: Settings },
];

function Sidebar() {
  const path = usePathname();
  return (
    <aside style={{ background:'white', borderRight:'1px solid #e5e7eb', width:220, minHeight:'100vh', position:'fixed', top:0, left:0, zIndex:30 }}>
      {/* Logo */}
      <div style={{ padding:'20px 20px 16px', borderBottom:'1px solid #f3f4f6' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'linear-gradient(135deg,#C9922A,#A8761E)'}}>
            <Shield size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{color:'#111827'}}>SnapHubTrade.com</p>
            <p className="text-xs text-gray-400">Admin Portal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="p-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/admin' ? path === '/admin' : path?.startsWith(href);
          return (
            <Link key={href} href={href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={active
                ? { background:'#fff7ed', color:'#C1272D' }
                : { color:'#6b7280' }}>
              <Icon size={16} />
              {label}
              {active && <ChevronRight size={12} className="ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{position:'absolute', bottom:0, left:0, right:0, padding:'12px', borderTop:'1px solid #f3f4f6', display:'flex', flexDirection:'column', gap:8}}>
        <CurrencySelector compact theme="light" />
        <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors">
          <LogOut size={14} /> Back to site
        </Link>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#f8f9fb' }}>
      <Sidebar />
      <main style={{ marginLeft:220, flex:1, minHeight:'100vh' }}>
        {children}
      </main>
    </div>
  );
}
