# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Only need openssl for Prisma
RUN apk add --no-cache openssl

# Harden npm against flaky registry connections (ECONNRESET, timeouts) —
# these settings make npm retry transient network failures instead of
# failing the whole build on a single dropped connection.
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 300000

COPY package*.json ./
COPY prisma ./prisma/

# Install all deps (dev + prod) for compilation. Wrapped in a shell retry loop
# as a second line of defense in case a connection drops mid-download even
# after npm's own retry budget is exhausted.
RUN for i in 1 2 3; do npm install && break || { echo "npm install failed (attempt $i/3), retrying in 10s..."; sleep 10; }; done

# Generate Prisma client (NODE_TLS_REJECT_UNAUTHORIZED bypasses SSL cert errors on restricted networks)
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate

# Copy source and compile TypeScript
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl postgresql-client wget

RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 300000

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig*.json ./

# Install PRODUCTION deps only (no dev, no native build needed)
RUN for i in 1 2 3; do npm install --omit=dev && break || { echo "npm install failed (attempt $i/3), retrying in 10s..."; sleep 10; }; done

# ts-node + typescript are needed at runtime only to run prisma/seed-admin.ts
# (the admin bootstrap script) from start.sh — not saved to package.json.
RUN npm install --no-save ts-node typescript

# Copy pre-generated Prisma client from builder (avoids re-downloading engine binaries)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

COPY start.sh ./start.sh
COPY postgres-seeds ./postgres-seeds/
RUN chmod +x start.sh

EXPOSE 3001
CMD ["./start.sh"]
