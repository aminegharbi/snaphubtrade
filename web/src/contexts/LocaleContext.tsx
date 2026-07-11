'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Locale, LOCALES, translations } from '@/i18n/translations';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  dir: 'ltr' | 'rtl';
  supported: typeof LOCALES;
  // Looks up `key` in the current locale, falls back to English, then the
  // raw key — so a page that hasn't been translated yet never breaks.
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);
const STORAGE_KEY = 'display_locale';
const DEFAULT_LOCALE: Locale = 'en';

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY) as Locale | null) : null;
    if (saved && LOCALES.some(l => l.code === saved)) setLocaleState(saved);
  }, []);

  const dir = useMemo<'ltr' | 'rtl'>(() => LOCALES.find(l => l.code === locale)?.dir || 'ltr', [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore storage errors */ }
  }, []);

  const t = useCallback((key: string) => {
    return translations[locale]?.[key] ?? translations.en[key] ?? key;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, dir, supported: LOCALES, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider');
  return ctx;
}
