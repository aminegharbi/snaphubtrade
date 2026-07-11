'use client';
import { useLocale } from '@/contexts/LocaleContext';

// Lets a Server Component render a translated string without converting the
// whole page to a Client Component: <T k="dealers.title" /> instead of
// literal text. Falls back through useLocale()'s own EN → key chain.
export function T({ k }: { k: string }) {
  const { t } = useLocale();
  return <>{t(k)}</>;
}
