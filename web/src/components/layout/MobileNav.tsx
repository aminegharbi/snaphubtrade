'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Car, Search, User, LayoutDashboard, TrendingUp } from 'lucide-react';

interface Props { type?: 'public' | 'dealer' | 'broker'; }

const NAV: Record<string, { href:string; icon:any; label:string }[]> = {
  public: [
    { href:'/', icon:Home, label:'Home' },
    { href:'/marketplace', icon:Search, label:'Search' },
    { href:'/catalog', icon:Car, label:'Catalog' },
    { href:'/login', icon:User, label:'Sign in' },
  ],
  dealer: [
    { href:'/dealer/dashboard', icon:LayoutDashboard, label:'Dashboard' },
    { href:'/dealer/pricing', icon:TrendingUp, label:'Pricing' },
    { href:'/dealer/scan', icon:Car, label:'Scan' },
    { href:'/dealer/profile', icon:User, label:'Profile' },
  ],
  broker: [
    { href:'/broker/dashboard', icon:LayoutDashboard, label:'Dashboard' },
    { href:'/marketplace', icon:Search, label:'Browse' },
    { href:'/broker/dashboard', icon:TrendingUp, label:'Earnings' },
    { href:'/broker', icon:User, label:'Profile' },
  ],
};

export function MobileNav({ type = 'public' }: Props) {
  const path = usePathname();
  const links = NAV[type];
  return (
    <nav className="da-mobile-nav da-safe-bottom">
      {links.map(l => {
        const Icon = l.icon;
        const active = path === l.href;
        return (
          <Link key={l.label} href={l.href}
            style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'6px 2px', textDecoration:'none', color:active?'#C1272D':'#9CA3AF' }}>
            <Icon size={21} strokeWidth={active?2.5:1.8} />
            <span style={{ fontSize:'0.58rem', fontWeight:active?700:500 }}>{l.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
