*** Settings ***
Documentation    Central place for environment configuration.
...              Every value can be overridden from the command line, e.g.:
...              robot --variable BASE_URL:https://staging.dubaiauto.ae/api/v1 tests/
...              This is what makes the same suite runnable against local /
...              staging / a pre-prod canary without touching any test file.

*** Variables ***
# API base URL. Inside docker-compose, points at nginx (the real prod path —
# testing through the reverse proxy catches CORS/routing bugs that hitting
# the api container directly would miss).
${BASE_URL}             http://nginx/api/v1
${WEB_URL}              http://nginx

# Seeded UAE demo data (from postgres/*.sql) — used by read-only tests that
# don't want to create fixtures. If your environment doesn't have the demo
# seed loaded, override these or skip tests tagged "requires-seed-data".
${SEED_DEALER_SLUG}     ${EMPTY}
${SEED_VEHICLE_ID}      ${EMPTY}

# Break-glass admin account bootstrapped by prisma/seed-admin.ts —
# see api/.env ADMIN_EMAIL / ADMIN_PASSWORD. MUST be overridden per
# environment; the placeholder below will fail fast and loudly rather than
# silently skip admin-locked tests.
${ADMIN_EMAIL}          admin@dubaiauto.ae
${ADMIN_PASSWORD}       CHANGE_ME_SET_VIA_CLI_OR_ENV

# OPTIONAL — shared secret matching the API's TEST_BYPASS_TOKEN env var (see
# AppThrottlerGuard). Empty by default: the suite then runs against real
# production rate limits and may hit some 429s if it moves faster than the
# configured auth limits (5 registrations/min, 8 logins/min per IP). Set the
# same value on both sides to let the suite create its fixture accounts
# without tripping them — never set this in a real deployment's own .env.
${TEST_BYPASS_TOKEN}    ${EMPTY}

# Timeouts
# NOTE: plain seconds as a number, NOT Robot's "15s" time format — RequestsLibrary's
# Create Session does float(timeout) internally and cannot parse a unit suffix.
${DEFAULT_TIMEOUT}      15
${RATE_LIMIT_WINDOW}    65s
