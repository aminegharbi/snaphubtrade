// ─── seed-admin.ts ──────────────────────────────────────────────────────────
// Bootstraps the FIRST admin account from environment variables. This is the
// only supported way to create an admin: /auth/register can never set
// role=admin (by design — see SECURITY_TODO.md), so without this script
// there would be no way to reach the admin panel on a fresh database at all.
//
// Idempotent: safe to run on every deploy. If an admin with ADMIN_EMAIL
// already exists, it does nothing (it does NOT reset the password — use
// `POST /admin/users/:id/reset-password` from an existing admin account for
// that, or ADMIN_FORCE_RESET=1 below for a genuine break-glass scenario).
//
// Usage:
//   ADMIN_EMAIL=admin@dubaiauto.ae ADMIN_PASSWORD='...' npx ts-node prisma/seed-admin.ts
// or, wired into `npx prisma db seed` (see package.json "prisma.seed").

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULL_NAME || 'Platform Admin';
  const forceReset = process.env.ADMIN_FORCE_RESET === '1';

  if (!email || !password) {
    console.log(
      'ℹ️  Skipping admin bootstrap: set ADMIN_EMAIL and ADMIN_PASSWORD ' +
      'environment variables to create/update the first admin account.',
    );
    return;
  }
  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters for a break-glass admin account.');
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  if (existing) {
    if (existing.role !== 'admin') {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'admin' } });
      console.log(`✅ Promoted existing user ${email} to admin.`);
    }
    if (forceReset) {
      await prisma.user.update({ where: { id: existing.id }, data: { password_hash } });
      console.log(`✅ Password reset for admin ${email} (ADMIN_FORCE_RESET=1).`);
    } else {
      console.log(`ℹ️  Admin ${email} already exists — leaving password untouched. Set ADMIN_FORCE_RESET=1 to override.`);
    }
    return;
  }

  await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password_hash,
      full_name: fullName,
      role: 'admin',
      email_verified: true,
    },
  });
  console.log(`✅ Admin account created: ${email}`);
}

main()
  .catch((e) => { console.error('❌ Admin bootstrap failed:', e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
