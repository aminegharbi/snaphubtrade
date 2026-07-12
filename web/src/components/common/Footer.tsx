'use client';
import Link from 'next/link';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLocale } from '@/contexts/LocaleContext';

const UAE_STRIPE = 'linear-gradient(90deg, #C1272D 25%, #231F20 25%, #231F20 50%, #FFFFFF 50%, #FFFFFF 75%, #007A3D 75%)';

const COLS = [
  {
    title: 'Marketplace',
    links: [
      { href: '/marketplace',       label: 'Browse vehicles' },
      { href: '/dealers',           label: 'Find dealers' },
      { href: '/catalog/brands',    label: 'All brands' },
      { href: '/catalog/models',    label: 'Model database' },
      { href: '/pricing',           label: 'Pricing plans' },
    ],
  },
  {
    title: 'For Dealers',
    links: [
      { href: '/login',             label: 'Dealer sign in' },
      { href: '/register-dealer',   label: 'Register as dealer' },
      { href: '/dealer/dashboard',  label: 'Dealer dashboard' },
      { href: '/dealer/scan',       label: 'Smart Scan' },
      { href: '/dealer/pricing',    label: 'Pricing AI' },
      { href: '/dealer/subscription', label: 'My plan' },
    ],
  },
  {
    title: 'For Brokers',
    links: [
      { href: '/login?profile=broker', label: 'Broker sign in' },
      { href: '/broker',               label: 'Join the programme' },
      { href: '/broker/dashboard',     label: 'Broker dashboard' },
      { href: '/marketplace',          label: 'Browse vehicles' },
    ],
  },
  {
    title: 'Zones & Export',
    links: [
      { href: '/dealers?zone=dubai',   label: 'Dubai Free Zone' },
      { href: '/dealers?zone=jafza',   label: 'Jebel Ali JAFZA' },
      { href: '/dealers?zone=sharjah', label: 'Sharjah' },
      { href: '/export',               label: 'Export vehicles' },
      { href: '/catalog/technologies', label: 'Technologies' },
    ],
  },
];

export function Footer() {
  const { currency } = useCurrency();
  const { t } = useLocale();
  return (
    <footer style={{ background: 'white', borderTop: '1px solid #E5E7EB', marginTop: 48 }}>
      {/* UAE flag stripe */}
      <div style={{ height: 4, background: UAE_STRIPE }} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 20px 32px' }}>
        <div className="da-footer-grid" style={{ display: 'grid', gridTemplateColumns: 'auto repeat(4, 1fr)', gap: 32, marginBottom: 36 }}>

          {/* Brand */}
          <div style={{ minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#C1272D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontSize: '1rem', fontWeight: 800 }}>D</span>
              </div>
              <span style={{ fontWeight: 800, color: '#111827', fontSize: '1rem', letterSpacing: '-0.02em' }}>
                SnapHub<span style={{ color: '#C1272D' }}>Trade.com</span>
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#6B7280', lineHeight: 1.65, margin: '0 0 14px' }}>
              UAE's automotive marketplace.<br />Buy, sell and export from 35+ verified dealers.
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: 20, background: '#FFF1F2', color: '#C1272D', fontWeight: 700, border: '1px solid #FECACA' }}>🇦🇪 UAE</span>
              <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: 20, background: '#F3F4F6', color: '#6B7280', fontWeight: 500 }}>{currency}</span>
            </div>

            {/* Login shortcuts */}
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#D1D5DB', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Quick access</p>
              {[
                { href: '/login',              label: '🏢 Dealer login' },
                { href: '/login?profile=broker', label: '🤝 Broker login' },
                { href: '/admin',              label: '⚙️ Admin' },
              ].map(l => (
                <Link key={l.label} href={l.href}
                  style={{ fontSize: '0.78rem', color: '#9CA3AF', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Columns — display:contents on desktop so these still flow as
              direct items of the outer 5-col grid; becomes its own 2-col
              grid on mobile via .da-footer-links in the media query above. */}
          <div className="da-footer-links" style={{ display: 'contents' }}>
            {COLS.map(col => (
              <div key={col.title}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                  {col.title}
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {col.links.map(l => (
                    <li key={l.href + l.label}>
                      <Link href={l.href}
                        style={{ fontSize: '0.82rem', color: '#6B7280', textDecoration: 'none' }}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: '0.78rem', color: '#9CA3AF', margin: 0 }}>
            © 2024 SnapHubTrade.com. {t('footer.rights')}
          </p>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Dubai Free Zone · Jebel Ali JAFZA · Sharjah</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: '#C1272D' }} />
              <div style={{ width: 12, height: 12, borderRadius: 2, background: '#231F20' }} />
              <div style={{ width: 12, height: 12, borderRadius: 2, background: '#E5E7EB', border: '1px solid #d1d5db' }} />
              <div style={{ width: 12, height: 12, borderRadius: 2, background: '#007A3D' }} />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
