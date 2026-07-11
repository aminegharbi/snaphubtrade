import { Controller, Get, Query } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { Public } from '../auth/public.decorator';

// Currency codes shown in the site-wide selector. AED first (platform's base
// currency), then the other 5 GCC currencies, then a few majors buyers from
// outside the Gulf commonly want when browsing export-eligible vehicles.
const SUPPORTED_CURRENCIES = [
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

// Public — every visitor needs this before they've even logged in, to browse
// the catalog in their preferred currency.
@Public()
@Controller('currency')
export class CurrencyController {
  constructor(private currency: CurrencyService) {}

  @Get('supported')
  getSupported() {
    return SUPPORTED_CURRENCIES;
  }

  // Live rates, base AED (matches every _aed-suffixed column in the schema).
  // Cached server-side for 1h by CurrencyService — safe to call often.
  @Get('rates')
  async getRates() {
    const rates = await this.currency.getRates();
    // Only return the rates we actually advertise as supported, so the
    // frontend never shows a currency it can't reliably convert.
    const filtered: Record<string, number> = {};
    for (const c of SUPPORTED_CURRENCIES) {
      filtered[c.code] = rates[c.code] ?? 1;
    }
    return { base: 'AED', rates: filtered, updated_at: new Date().toISOString() };
  }

  // Convenience single-value conversion, e.g. for server-rendered pages that
  // want one converted price without shipping the whole rates table.
  @Get('convert')
  async convert(@Query('amount') amount: string, @Query('to') to: string) {
    const result = await this.currency.toDisplay(Number(amount) || 0, to || 'AED');
    return result;
  }
}
