// ─── seed-global-trade.ts ────────────────────────────────────────────────────
// Seeds the Global Trade Intelligence data lake (routes, country profiles,
// 24 months of GCC→world export flows) and computes the initial AI layer
// (forecasts + opportunities) on FIRST start only — idempotent, skips
// instantly once trade_routes has rows. Reuses GlobalTradeService directly
// against a raw PrismaClient so the seeding logic lives in exactly one place
// (the service), not duplicated here.
//
// Usage: npx ts-node prisma/seed-global-trade.ts

import { PrismaClient } from '@prisma/client';
import { GlobalTradeService } from '../src/modules/global-trade/global-trade.module';

const prisma = new PrismaClient();

// Seed-time notifications would only ever target dealers with GTI access,
// and none exist yet on a fresh database — a no-op stub is correct here,
// not a shortcut. Live sync runs (via the API) use the real NotificationsService.
const notificationsStub = { create: async () => null } as any;

async function main() {
  const svc = new GlobalTradeService(prisma as any, notificationsStub);
  const result = await svc.ensureSeeded();
  if (result.seeded) {
    console.log(`✅ Global Trade Intelligence seeded: ${result.flows} flow records, AI layer computed.`);
  } else {
    console.log('ℹ️  Global Trade Intelligence already seeded — skipping.');
  }
}

main()
  .catch(e => { console.error('⚠️  Global Trade Intelligence seed failed:', e.message); process.exit(0); /* never block startup */ })
  .finally(() => prisma.$disconnect());
