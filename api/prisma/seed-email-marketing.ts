// ─── seed-email-marketing.ts ─────────────────────────────────────────────────
// Seeds the professional email template library (acquisition, engagement,
// commercial, loyalty categories) and automation definitions (weekly
// reports, re-engagement) into the EXISTING email module — on FIRST start
// only, idempotent. Reuses EmailService directly against a raw PrismaClient,
// same pattern as seed-global-trade.ts.
//
// Usage: npx ts-node prisma/seed-email-marketing.ts

import { PrismaClient } from '@prisma/client';
import { EmailService } from '../src/modules/email/email.module';

const prisma = new PrismaClient();

async function main() {
  const svc = new EmailService(prisma as any);
  const templates = await svc.ensureTemplateLibrarySeeded();
  const automations = await svc.ensureAutomationsSeeded();
  console.log(templates.seeded
    ? `✅ Email template library seeded: ${templates.count} templates.`
    : 'ℹ️  Email templates already seeded — skipping.');
  console.log(`✅ Email automations ensured: ${automations.seeded} definitions.`);
}

main()
  .catch(e => { console.error('⚠️  Email marketing seed failed:', e.message); process.exit(0); })
  .finally(() => prisma.$disconnect());
