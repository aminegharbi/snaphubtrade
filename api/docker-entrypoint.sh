#!/bin/sh
set -e

# Bypass SSL cert verification for Prisma engine binary downloads on restricted networks
export NODE_TLS_REJECT_UNAUTHORIZED=0

echo "⏳ Waiting for PostgreSQL to be ready..."
until NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma db push --accept-data-loss --skip-generate 2>&1 | grep -qE "done|already"; do
  sleep 2
done

echo "✅ Database schema synced"
echo "🚀 Starting API..."
exec node dist/main.js
