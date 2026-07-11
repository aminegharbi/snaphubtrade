import { Injectable } from '@nestjs/common';

// GCC currency codes this platform actively supports, plus a few common
// international ones buyers/dealers might want (matches what the existing
// valuation module already used as its offline fallback).
const FALLBACK_RATES: Record<string, number> = {
  AED: 1, SAR: 1.02, QAR: 0.99, BHD: 0.102, KWD: 0.083, OMR: 0.105,
  USD: 0.272, EUR: 0.251, GBP: 0.215, INR: 22.6,
};

/**
 * Shared FX rate service — base currency AED (matches every `_aed`-suffixed
 * column already in the schema, so no existing aggregation query needs to
 * change). Originally lived as a private copy inside ValuationService;
 * extracted here so vehicles, dealer dashboards, and invoices can all convert
 * for DISPLAY purposes without duplicating the fetch/cache logic.
 *
 * This service is for DISPLAY conversions only (e.g. "show this AED price to
 * a Saudi buyer in SAR"). It does NOT change what currency a transaction is
 * actually recorded in — that's the `currency` column on Vehicle/BrokerDeal/
 * Invoice, set once at creation time from the dealer's country.
 */
@Injectable()
export class CurrencyService {
  private cache: { rates: Record<string, number>; ts: number } | null = null;

  async getRates(): Promise<Record<string, number>> {
    if (this.cache && Date.now() - this.cache.ts < 3_600_000) {
      return this.cache.rates;
    }
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/AED');
      const data: any = await res.json();
      if (data?.rates && data.result === 'success') {
        this.cache = { rates: data.rates, ts: Date.now() };
        return data.rates;
      }
    } catch {
      /* network error — fall through to fallback rates below */
    }
    // Only used if the live API is unreachable — not a pricing decision.
    return FALLBACK_RATES;
  }

  /** Converts an AED amount to `targetCurrency` using the latest cached rate. */
  async convertFromAed(amountAed: number, targetCurrency: string): Promise<number> {
    if (!targetCurrency || targetCurrency.toUpperCase() === 'AED') return amountAed;
    const rates = await this.getRates();
    const rate = rates[targetCurrency.toUpperCase()];
    if (!rate) return amountAed; // unknown currency — safest fallback is no conversion, not a crash
    return Math.round(amountAed * rate * 100) / 100;
  }

  /** Returns { amount, currency, fx_rate } — the shape used across API responses. */
  async toDisplay(amountAed: number, targetCurrency: string) {
    const rates = await this.getRates();
    const currency = (targetCurrency || 'AED').toUpperCase();
    const rate = rates[currency] || 1;
    const amount = currency === 'AED' ? amountAed : Math.round(amountAed * rate * 100) / 100;
    return { amount, currency, fx_rate: rate };
  }
}
