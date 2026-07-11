#!/bin/sh
set -e

PG_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
PG_USER=$(echo "$DATABASE_URL" | sed -E 's|.*://([^:]+):.*|\1|')
PG_PASS=$(echo "$DATABASE_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')
PG_DB=$(echo "$DATABASE_URL"   | sed -E 's|.*/([^?]+).*|\1|')
export PGPASSWORD="$PG_PASS"

echo "==> Waiting for PostgreSQL..."
until pg_isready -h "$PG_HOST" -p 5432 -U "$PG_USER" -q 2>/dev/null; do sleep 1; done
echo "==> PostgreSQL ready"

# ── Phase 1: core tables ──────────────────────────────────────────────────────
# NOTE ON TIMEOUTS: these loops only matter on a genuinely FRESH Postgres
# volume, where the docker-entrypoint-initdb.d/*.sql scripts are still
# running in the background. On every RESTART of an existing deployment the
# data is already there, so each phase should pass on its very first check
# (sub-second). If a phase is still failing after ~20s, the data is not
# "still loading" — it is missing and waiting longer will never fix it (see
# the warning below) — so timeouts are kept short instead of the many
# minutes they used to be, and every phase now warns loudly instead of
# silently grinding through the full loop on every single restart.
echo "==> Phase 1: waiting for core tables..."
for i in $(seq 1 20); do
  V=$(psql -h "$PG_HOST" -U "$PG_USER" -d "$PG_DB" \
      -tAc "SELECT CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='vehicles') THEN (SELECT COUNT(*) FROM vehicles) ELSE 0 END" 2>/dev/null || echo 0)
  D=$(psql -h "$PG_HOST" -U "$PG_USER" -d "$PG_DB" \
      -tAc "SELECT CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='dealers') THEN (SELECT COUNT(*) FROM dealers) ELSE 0 END" 2>/dev/null || echo 0)
  if [ "$V" -gt "0" ] && [ "$D" -gt "5" ]; then
    echo "==> Phase 1 done: $V vehicles, $D dealers"; break
  fi
  echo "    Phase 1: vehicles=$V dealers=$D ($i/20)"; sleep 1
done

# Detect a stale/partially-seeded volume: if we timed out with low counts, the init
# scripts likely never ran (Postgres only runs docker-entrypoint-initdb.d on a FRESH
# volume). This is almost always fixed by: docker compose down -v && docker compose up -d
if [ "$V" -le "5" ] || [ "$D" -le "5" ]; then
  echo ""
  echo "⚠️  WARNING: Phase 1 timed out with vehicles=$V dealers=$D — expected ~120 vehicles, ~36 dealers."
  echo "⚠️  This usually means PostgreSQL is reusing an OLD data volume where init scripts already ran"
  echo "⚠️  (and may have failed) on a previous deploy. Postgres only executes /docker-entrypoint-initdb.d"
  echo "⚠️  scripts on a BRAND NEW empty volume — fixing the .sql files does nothing on an existing one."
  echo "⚠️  FIX: docker compose down -v && docker compose up -d   (the -v flag wipes the stale volume)"
  echo ""
fi

# ── Phase 2: catalog (brands + models) ───────────────────────────────────────
echo "==> Phase 2: waiting for catalog..."
for i in $(seq 1 20); do
  B=$(psql -h "$PG_HOST" -U "$PG_USER" -d "$PG_DB" \
      -tAc "SELECT CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='brands') THEN (SELECT COUNT(*) FROM brands) ELSE 0 END" 2>/dev/null || echo 0)
  M=$(psql -h "$PG_HOST" -U "$PG_USER" -d "$PG_DB" \
      -tAc "SELECT CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='models') THEN (SELECT COUNT(*) FROM models) ELSE 0 END" 2>/dev/null || echo 0)
  if [ "$B" -gt "50" ] && [ "$M" -gt "100" ]; then
    echo "==> Phase 2 done: $B brands, $M models"; break
  fi
  echo "    Phase 2: brands=$B models=$M ($i/20)"; sleep 1
done
if [ "$B" -le "50" ] || [ "$M" -le "100" ]; then
  echo "⚠️  WARNING: Phase 2 timed out with brands=$B models=$M — same stale-volume issue as Phase 1 above."
  echo "⚠️  Catalog data will stay empty on every future restart until the volume is recreated."
  echo "⚠️  FIX: docker compose down -v && docker compose up -d"
fi

# ── Phase 3: dealer social media ─────────────────────────────────────────────
echo "==> Phase 3: waiting for dealer social media..."
for i in $(seq 1 15); do
  SM=$(psql -h "$PG_HOST" -U "$PG_USER" -d "$PG_DB" \
       -tAc "SELECT CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='dealer_social_media') THEN (SELECT COUNT(*) FROM dealer_social_media) ELSE 0 END" 2>/dev/null || echo 0)
  if [ "$SM" -gt "5" ]; then echo "==> Phase 3 done: $SM social entries"; break; fi
  echo "    Phase 3: social=$SM ($i/15)"; sleep 1
done
if [ "$SM" -le "5" ]; then
  echo "⚠️  WARNING: Phase 3 timed out with social=$SM — same stale-volume issue as Phase 1 above."
fi

# ── Phase 4: brokers + vehicle stock (run last, depend on dealers) ────────────
echo "==> Phase 4: waiting for brokers + vehicle stock..."
for i in $(seq 1 15); do
  BR=$(psql -h "$PG_HOST" -U "$PG_USER" -d "$PG_DB" \
       -tAc "SELECT CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='brokers') THEN (SELECT COUNT(*) FROM brokers) ELSE 0 END" 2>/dev/null || echo 0)
  VH=$(psql -h "$PG_HOST" -U "$PG_USER" -d "$PG_DB" \
       -tAc "SELECT CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='vehicles') THEN (SELECT COUNT(*) FROM vehicles) ELSE 0 END" 2>/dev/null || echo 0)
  if [ "$BR" -gt "5" ] && [ "$VH" -gt "50" ]; then echo "==> Phase 4 done: $BR brokers, $VH vehicles"; break; fi
  echo "    Phase 4: brokers=$BR vehicles=$VH ($i/15)"; sleep 1
done
if [ "$BR" -le "5" ] || [ "$VH" -le "50" ]; then
  echo "⚠️  WARNING: Phase 4 timed out with brokers=$BR vehicles=$VH — same stale-volume issue as Phase 1 above."
fi

# ── Prisma db push ────────────────────────────────────────────────────────────
echo "==> Running prisma db push..."
npx prisma db push --skip-generate --accept-data-loss 2>&1
echo "==> Schema sync done"

# ── GCC countries & free zones seed ─────────────────────────────────────────
# Runs on EVERY start (not just fresh volumes) — prisma db push above creates
# the countries/free_zones tables and the new dealer/broker columns even on an
# existing deployment, but only this explicit seed populates the rows and
# backfills existing dealers to UAE. Safe to re-run: every INSERT uses
# ON CONFLICT DO NOTHING and the backfill only touches NULL country_id rows.
echo "==> Seeding GCC countries & free zones..."
psql -h "$PG_HOST" -U "$PG_USER" -d "$PG_DB" -f postgres-seeds/06_gcc_countries.sql 2>&1 \
  || echo "⚠️  GCC countries seed failed — check postgres-seeds/06_gcc_countries.sql. Continuing startup anyway."

# ── Admin bootstrap ───────────────────────────────────────────────────────────
# Creates (or promotes) the first admin account from ADMIN_EMAIL/ADMIN_PASSWORD.
# Idempotent — safe to run on every start. No-ops with a log line if those
# env vars aren't set. See prisma/seed-admin.ts for details.
if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  echo "==> Bootstrapping admin account ($ADMIN_EMAIL)..."
  npx ts-node prisma/seed-admin.ts || echo "⚠️  Admin bootstrap failed — see error above. Continuing startup anyway."
else
  echo "==> Skipping admin bootstrap (ADMIN_EMAIL/ADMIN_PASSWORD not set)."
fi

# ── GCC market dataset + dealer prospects seed ───────────────────────────────
# Idempotent: fills the Market Data Lake with a 24-month GCC baseline
# (source: gcc_seed_v1) and the free-zone dealer prospect directory on FIRST
# start only — skips instantly on every later start. Never blocks startup.
echo "==> Seeding GCC market dataset + dealer prospects (first run only)..."
npx ts-node prisma/seed-market-dataset.ts || echo "⚠️  Dataset seed failed — see error above. Continuing startup anyway."

# ── Global Trade Intelligence data lake seed ─────────────────────────────────
# Idempotent: seeds worldwide GCC→export routes, country trade profiles, 24
# months of flow history, and computes the initial AI layer (forecasts +
# opportunities) on FIRST start only. Never blocks startup.
echo "==> Seeding Global Trade Intelligence data lake (first run only)..."
npx ts-node prisma/seed-global-trade.ts || echo "⚠️  Global Trade Intelligence seed failed — see error above. Continuing startup anyway."

# ── Marketing template library + automations seed ────────────────────────────
# Idempotent: seeds the professional email template library (welcome,
# engagement, commercial, loyalty, weekly reports) and automation
# definitions on FIRST start only. Never blocks startup.
echo "==> Seeding email template library + automations (first run only)..."
npx ts-node prisma/seed-email-marketing.ts || echo "⚠️  Email marketing seed failed — see error above. Continuing startup anyway."

echo "==> Starting API on port ${PORT:-3001}..."
exec node dist/main.js
