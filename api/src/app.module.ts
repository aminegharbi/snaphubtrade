import { Module, Controller, Get } from '@nestjs/common';
import { Public } from './shared/auth/public.decorator';

@Controller('health')
@Public()
export class HealthController {
  @Get()
  check() { return { status: 'ok', timestamp: new Date().toISOString() }; }

  @Get('ai')
  async checkAI() {
    const key = process.env.ANTHROPIC_API_KEY || '';
    const keyStatus = !key ? 'missing'
      : !key.startsWith('sk-ant-') ? 'invalid_format'
      : key.includes('your-key-here') ? 'placeholder'
      : 'set';

    if (keyStatus !== 'set') {
      return {
        status: 'error',
        key_status: keyStatus,
        key_preview: key ? key.slice(0, 14) + '...' : '(empty)',
        fix: 'Set ANTHROPIC_API_KEY=sk-ant-api03-... in your .env, then: docker-compose up --build',
      };
    }

    try {
      const { createAIClient, aiModel } = require('./shared/ai/ai-client');
      const client = createAIClient();
      const r = await client.messages.create({
        model: aiModel('haiku'),
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return {
        status: 'ok',
        key_preview: key.slice(0, 14) + '...',
        model: aiModel('haiku'),
        response: r.content[0]?.type === 'text' ? r.content[0].text : 'ok',
        usage: r.usage,
      };
    } catch (err: any) {
      return {
        status: 'error',
        key_preview: key.slice(0, 14) + '...',
        error: err?.message || String(err),
        http_status: err?.status,
        fix: err?.status === 401 ? 'Cle invalide — verifier console.anthropic.com/settings/keys'
           : err?.status === 403 ? 'Cle valide mais sans permissions'
           : err?.code === 'ENOTFOUND' ? 'Le container ne peut pas joindre api.anthropic.com — verifier reseau/proxy'
           : 'Voir le champ error ci-dessus',
      };
    }
  }
}

import { EmailMarketingModule } from './modules/email/email.module';
import { ExecutiveModule } from './modules/executive/executive.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppThrottlerGuard } from './shared/auth/app-throttler.guard';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { AuthSharedModule } from './shared/auth/auth-shared.module';
import { JwtAuthGuard } from './shared/auth/jwt-auth.guard';
import { RolesGuard } from './shared/auth/roles.guard';

import { PrismaModule } from './shared/prisma/prisma.module';
import { CurrencyModule } from './shared/currency/currency.module';
import { AuthModule } from './modules/auth/auth.module';
import { DealersModule } from './modules/dealers/dealers.module';
import { CountriesModule } from './modules/countries/countries.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { SearchModule } from './modules/search/search.module';
import { AiModule } from './modules/ai/ai.module';
import { MarketAnalyticsModule } from './modules/market-analytics/market-analytics.module';
import { MarketAnalysisModule } from './modules/market-analysis/market-analysis.module';
import { SavedSearchModule } from './modules/saved-search/saved-search.module';
import { TrendingModule } from './modules/vehicles/trending.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { PushModule } from './modules/push/push.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { AffiliateModule } from './modules/affiliate/affiliate.module';
import { CrmModule } from './modules/crm/crm.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { BrandsModelsModule } from './modules/catalog/brands-models.module';
import { DealerDashboardModule } from './modules/dealer-dashboard/dealer-dashboard.module';
import { AdminModule } from './modules/admin/admin.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { SmartSearchModule } from './modules/smart-search/smart-search.module';
import { ValuationModule } from './modules/valuation/valuation.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BrokerModule } from './modules/broker/broker.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { CollaborativeModule } from './modules/collaborative/collaborative.module';
import { BillingModule } from './modules/billing/billing.module';
import { AiTwinModule } from './modules/ai-twin/ai-twin.module';
import { MarketLakeModule } from './modules/market-lake/market-lake.module';
import { LeadsModule } from './modules/leads/leads.module';
import { ProspectsModule } from './modules/prospects/prospects.module';
import { GlobalTradeModule } from './modules/global-trade/global-trade.module';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global rate limit as a safety net; individual sensitive endpoints
    // (auth, password reset, etc.) apply their own stricter @Throttle().
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/static',
    }),
    PrismaModule,
    CurrencyModule,
    AuthSharedModule,
    ExecutiveModule,
    EmailMarketingModule,
    AuthModule,
    DealersModule,
    CountriesModule,
    VehiclesModule,
    SearchModule,
    AiModule,
    AlertsModule,
    CrmModule,
    PushModule,
    MarketingModule,
    AffiliateModule,
    AnalyticsModule,
    NotificationsModule,
    BrandsModelsModule,
    DealerDashboardModule,
    AdminModule,
    CollaborativeModule,
    SubscriptionModule,
    BillingModule,
    AiTwinModule,
    MarketLakeModule,
    LeadsModule,
    ProspectsModule,
    GlobalTradeModule,
    BrokerModule,
    ReservationsModule,
    SessionsModule,
    FeatureFlagsModule,
    SmartSearchModule,
    ValuationModule,
    ReportsModule,
    MarketAnalyticsModule,
    MarketAnalysisModule,
    SavedSearchModule,
    TrendingModule,
    AssistantModule,
  ],
  providers: [
    // Order matters: throttler first, then authentication, then role checks.
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
