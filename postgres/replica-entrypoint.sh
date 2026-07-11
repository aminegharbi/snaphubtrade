#!/bin/sh
# replica-entrypoint.sh
# Runs a Postgres hot standby that streams WAL from the primary.
#
# On first start (empty $PGDATA): clones the primary via pg_basebackup and
# writes standby.signal so Postgres starts in standby/read-only mode.
# On subsequent restarts: $PGDATA already has a valid standby setup, so we
# skip straight to starting Postgres — it resumes streaming from where it
# left off (using the replication slot, so no WAL is lost across restarts).
set -e

PGDATA="/var/lib/postgresql/data"

wait_for_primary() {
  echo "==> Waiting for primary ($PRIMARY_HOST:$PRIMARY_PORT)..."
  # -d postgres: without an explicit dbname, libpq defaults to a database
  # named after the user ("replicator"), which doesn't exist — only the
  # ROLE does. The always-present "postgres" maintenance db is a safe target
  # just to check connectivity/readiness.
  until pg_isready -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -U "$PGUSER" -d postgres -q 2>/dev/null; do
    sleep 2
  done
  echo "==> Primary is ready."
}

if [ -z "$(ls -A "$PGDATA" 2>/dev/null)" ]; then
  wait_for_primary

  echo "==> Empty data directory — cloning primary via pg_basebackup..."
  # -R writes postgresql.auto.conf + standby.signal for us (recovery config).
  # -C creates a replication slot named after this replica so the primary
  # retains WAL for it even if the replica is briefly disconnected/restarted.
  # Run as the 'postgres' user via gosu — Postgres refuses to run as root,
  # and this entrypoint replaces the image's default (which normally does
  # that re-exec for us).
  until gosu postgres pg_basebackup \
      -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -U "$PGUSER" \
      -D "$PGDATA" -Fp -Xs -P -R \
      -C -S dubaiauto_replica_slot; do
    echo "==> pg_basebackup failed, retrying in 5s..."
    sleep 5
  done

  chmod 0700 "$PGDATA"
  echo "==> Clone complete. Starting as hot standby (read-only)."
else
  echo "==> Existing data directory found — resuming standby from last position."
fi

exec docker-entrypoint.sh postgres
