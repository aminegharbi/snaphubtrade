'use client';

import { useCurrency } from '@/contexts/CurrencyContext';

interface PriceProps {
  /** Amount in AED (the platform's base currency) — always pass the raw
   * `_aed`-suffixed value here, conversion is handled internally. */
  aed?: number | string | null;
  /** If the amount is actually denominated in a different currency (e.g. a
   * vehicle listed in SAR), pass it here — the component pivots through AED
   * automatically, same as the backend does. */
  from?: string;
  className?: string;
  style?: React.CSSProperties;
  maximumFractionDigits?: number;
  /** Render just the number, no currency code — for cases building custom layout. */
  hideCurrency?: boolean;
}

/**
 * Drop-in replacement for every hardcoded "AED {value.toLocaleString()}"
 * across the site. Reads the visitor's selected display currency from
 * CurrencyContext and converts live — this single component is what makes
 * the currency selector actually apply everywhere instead of just changing
 * a dropdown that nothing listens to.
 */
export function Price({ aed, from, className, style, maximumFractionDigits = 0, hideCurrency }: PriceProps) {
  const { currency, convert, convertFrom } = useCurrency();
  const amount = Number(aed) || 0;
  const converted = from ? convertFrom(amount, from) : convert(amount);
  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(converted);

  return (
    <span className={className} style={style}>
      {hideCurrency ? formatted : `${currency} ${formatted}`}
    </span>
  );
}

/** Non-JSX version for places that need a plain string (alt text, WhatsApp
 * message templates, PDF generation, etc.) rather than a rendered element. */
export function usePriceFormatter() {
  const { format } = useCurrency();
  return format;
}
