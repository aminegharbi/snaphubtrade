'use client';
import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { AIAssistant } from '../assistant/AIAssistant';
import { CompareBar } from '../vehicle/CompareBar';
import { SessionProvider } from '@/contexts/SessionContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { LocaleProvider } from '@/contexts/LocaleContext';

const NO_NAV = ['/login', '/register-dealer', '/admin'];
const NO_ASSISTANT = ['/login', '/register-dealer', '/admin', '/dealer', '/broker'];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const path = usePathname() || '';
  const hide = NO_NAV.some(p => path.startsWith(p));
  const hideAssistant = NO_ASSISTANT.some(p => path.startsWith(p));
  return (
    <LocaleProvider>
      <CurrencyProvider>
        <SessionProvider>
          {!hide && <Navbar />}
          <main>{children}</main>
          {!hide && <Footer />}
          {!hideAssistant && <AIAssistant />}
          <CompareBar />
        </SessionProvider>
      </CurrencyProvider>
    </LocaleProvider>
  );
}
