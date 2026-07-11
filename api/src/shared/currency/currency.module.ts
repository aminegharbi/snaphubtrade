import { Module, Global } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { CurrencyController } from './currency.controller';

// Global: every module needs currency conversion for display (vehicles,
// dealers, invoices, dashboards) — registering it once here avoids re-importing
// this tiny module in a dozen places.
@Global()
@Module({
  controllers: [CurrencyController],
  providers: [CurrencyService],
  exports: [CurrencyService],
})
export class CurrencyModule {}
