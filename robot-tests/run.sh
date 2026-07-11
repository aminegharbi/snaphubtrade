#!/bin/sh
# run.sh — entrypoint for the Robot Framework container.
#
# Waits for the target stack to be reachable, then runs the suite and writes
# results to /opt/robot/results. Exits non-zero on any test failure so this
# can gate a CI/CD deploy step (`docker compose run --rm robot-tests` in a
# pipeline; a non-zero exit blocks the deploy).
set -e

BASE_URL="${BASE_URL:-http://nginx/api/v1}"
WEB_URL="${WEB_URL:-http://nginx}"
HEALTH_URL="${BASE_URL}/health"
MAX_WAIT_SECONDS="${MAX_WAIT_SECONDS:-120}"

# Tags: by default, run everything except the deliberately slow rate-limit
# suite (which takes ~2 minutes of real waiting to observe throttling
# windows) and the browser smoke suite (needs a real Chromium download via
# Playwright, which can fail in restricted/offline build environments —
# separate concern, run with --include ui explicitly once the image has
# working browser binaries: `docker compose run robot-tests --include ui`).
# Override with: docker compose run robot-tests --include slow
ROBOT_ARGS="${ROBOT_ARGS:---exclude slow --exclude ui}"

echo "==> Waiting for API health check at ${HEALTH_URL} (max ${MAX_WAIT_SECONDS}s)..."
elapsed=0
until curl -sf "${HEALTH_URL}" > /dev/null 2>&1; do
  if [ "$elapsed" -ge "$MAX_WAIT_SECONDS" ]; then
    echo "❌ Stack did not become healthy within ${MAX_WAIT_SECONDS}s — aborting."
    exit 1
  fi
  sleep 3
  elapsed=$((elapsed + 3))
  echo "    ...still waiting (${elapsed}s elapsed)"
done
echo "==> API is healthy."

if [ -z "${ADMIN_PASSWORD}" ] || [ "${ADMIN_PASSWORD}" = "CHANGE_ME_SET_VIA_CLI_OR_ENV" ]; then
  echo "⚠️  ADMIN_PASSWORD is not set — admin-tagged tests will fail to log in."
  echo "⚠️  Pass it via: docker compose run -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... robot-tests"
fi

echo "==> Running Robot Framework suite (args: ${ROBOT_ARGS})"
echo "==> BASE_URL=${BASE_URL}  WEB_URL=${WEB_URL}"

# shellcheck disable=SC2086
# Temporarily disable errexit: we need robot's actual exit code (non-zero on
# test failures is expected/normal), not an immediate script abort.
set +e
robot \
  --outputdir /opt/robot/results \
  --variable BASE_URL:"${BASE_URL}" \
  --variable WEB_URL:"${WEB_URL}" \
  --variable ADMIN_EMAIL:"${ADMIN_EMAIL:-admin@dubaiauto.ae}" \
  --variable ADMIN_PASSWORD:"${ADMIN_PASSWORD:-CHANGE_ME_SET_VIA_CLI_OR_ENV}" \
  --variable TEST_BYPASS_TOKEN:"${TEST_BYPASS_TOKEN:-}" \
  ${ROBOT_ARGS} \
  "$@" \
  tests/
exit_code=$?
set -e

echo ""
echo "==> Results written to /opt/robot/results (report.html, log.html, output.xml)"
if [ "$exit_code" -eq 0 ]; then
  echo "✅ All tests passed."
else
  echo "❌ Some tests failed (exit code ${exit_code}) — check report.html before deploying."
fi

exit $exit_code
