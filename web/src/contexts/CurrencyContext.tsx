'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export interface SupportedCurrency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

interface RatesResponse {
  base: string;
  rates: Record<string, number>;
  updated_at: string;
}

interface CurrencyContextValue {
  currency: string;                 // currently selected display currency, e.g. 'SAR'
  setCurrency: (code: string) => void;
  supported: SupportedCurrency[];
  rates: Record<string, number>;    // AED -> code
  ratesLoading: boolean;
  // Converts an amount already denominated in AED into the selected currency.
  convert: (amountAed: number) => number;
  // Converts an amount denominated in `fromCurrency` into the selected currency
  // (goes through AED as the pivot, same as the backend does).
  convertFrom: (amount: number, fromCurrency: string) => number;
  // Formats an AED amount as "SAR 12,345" in the selected currency, one call.
  format: (amountAed: number, opts?: { fromCurrency?: string; maximumFractionDigits?: number }) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = 'display_currency';
const DEFAULT_CURRENCY = 'AED';

// Used only if the /currency/rates call hasn't resolved yet — matches the
// backend's own fallback table so numbers are directionally sane even before
// the first successful fetch, never a jarring "0 SAR" flash.
const FALLBACK_RATES: Record<string, number> = {
  AED: 1, SAR: 1.02, QAR: 0.99, BHD: 0.102, KWD: 0.083, OMR: 0.105,
  USD: 0.272, EUR: 0.251, GBP: 0.215, INR: 22.6,
};

const FALLBACK_SUPPORTED: SupportedCurrency[] = [
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', flag: '🇦🇪' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', flag: '🇸🇦' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QAR', flag: '🇶🇦' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BHD', flag: '🇧🇭' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KWD', flag: '🇰🇼' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'OMR', flag: '🇴🇲' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
];

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState(DEFAULT_CURRENCY);
  const [supported, setSupported] = useState<SupportedCurrency[]>(FALLBACK_SUPPORTED);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [ratesLoading, setRatesLoading] = useState(true);

  // Restore the visitor's last choice on mount (client-side only).
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved) setCurrencyState(saved);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/v1/currency/supported').then(r => r.json()).catch(() => FALLBACK_SUPPORTED),
      fetch('/api/v1/currency/rates').then(r => r.json()).catch(() => null),
    ]).then(([sup, ratesRes]: [SupportedCurrency[], RatesResponse | null]) => {
      if (cancelled) return;
      if (Array.isArray(sup) && sup.length) setSupported(sup);
      if (ratesRes?.rates) setRates(ratesRes.rates);
    }).finally(() => !cancelled && setRatesLoading(false));
    return () => { cancelled = true; };
  }, []);

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, code);
  }, []);

  const convert = useCallback((amountAed: number) => {
    if (!amountAed && amountAed !== 0) return 0;
    const rate = rates[currency] ?? 1;
    return currency === 'AED' ? amountAed : Math.round(amountAed * rate * 100) / 100;
  }, [rates, currency]);

  const convertFrom = useCallback((amount: number, fromCurrency: string) => {
    if (!amount && amount !== 0) return 0;
    // Pivot through AED: amount_in_from -> AED -> selected currency.
    const fromRate = rates[fromCurrency] ?? 1;
    const amountAed = fromCurrency === 'AED' ? amount : amount / fromRate;
    return convert(amountAed);
  }, [rates, convert]);

  const format = useCallback((amountAed: number, opts?: { fromCurrency?: string; maximumFractionDigits?: number }) => {
    const converted = opts?.fromCurrency ? convertFrom(amountAed, opts.fromCurrency) : convert(amountAed);
    const maxFrac = opts?.maximumFractionDigits ?? 0;
    const numberFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: maxFrac });
    return `${currency} ${numberFmt.format(converted)}`;
  }, [convert, convertFrom, currency]);

  const value = useMemo<CurrencyContextValue>(() => ({
    currency, setCurrency, supported, rates, ratesLoading, convert, convertFrom, format,
  }), [currency, setCurrency, supported, rates, ratesLoading, convert, convertFrom, format]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
}
