import type { Metadata } from 'next';
import './globals.css';
import { LayoutWrapper } from '@/components/common/LayoutWrapper';

export const metadata: Metadata = {
  title: { default: 'SnapHubTrade.com — The AI Automotive Trade Hub for the GCC', template: '%s | SnapHubTrade.com' },
  description: 'The AI Automotive Trade Hub for the GCC: lightning-fast stock management for dealers and brokers, TwinOS intelligent assistant, Market Intelligence Engine, and your AI Twin sales copilot.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: '#f8f9fb', color: '#111827' }}>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
