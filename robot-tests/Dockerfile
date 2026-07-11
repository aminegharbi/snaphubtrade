# ─── Robot Framework E2E test runner for DubaiAuto ────────────────────────────
# Runs the full API/security/UI regression suite against a running stack
# (see docker-compose.yml -> `robot-tests` service, or run standalone with
# BASE_URL/WEB_URL pointing at any environment: local, staging, prod-canary).
FROM python:3.12-slim

WORKDIR /opt/robot

# System deps: browsers need these even headless; curl for the wait-for-stack
# script; Node.js/npm is required by `rfbrowser init` itself (it installs the
# Playwright Node driver under the hood), not just for running browsers.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl wget gnupg ca-certificates \
    libglib2.0-0 libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libdbus-1-3 libxcb1 libxkbcommon0 libx11-6 libxcomposite1 \
    libxdamage1 libxext6 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
    libcairo2 libasound2 \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# --skip-browsers still needs Node/npm to install the RF Browser Node package;
# it only skips downloading the (heavy) Chromium/Firefox/WebKit binaries.
# Only the 07_smoke_ui suite needs a real browser — everything else (API
# suites: auth, security, dealers, vehicles, admin, broker, leads, ai-twin,
# market-lake) uses RequestsLibrary and doesn't touch Browser at all. If this
# init step ever fails again, the whole suite must not be blocked by it —
# hence `|| true` as a last resort so API-only test runs still work; the smoke
# UI suite would then fail loudly on its own with a clear "Browser not
# initialized" error instead of silently building a broken image.
RUN pip install --no-cache-dir -r requirements.txt \
    && (rfbrowser init --skip-browsers || rfbrowser init chromium || true)

COPY . .

# Belt-and-suspenders: never depend on the host filesystem preserving the
# executable bit (zip extraction, Windows checkouts, and some CI artifact
# systems strip it, causing "exec: ./run.sh: permission denied" at runtime
# even though the file looks fine in the repo).
RUN chmod +x ./run.sh

# Results are written here — mount this as a volume to get the HTML report
# and log out of the container (see docker-compose.yml).
RUN mkdir -p /opt/robot/results

ENTRYPOINT ["./run.sh"]
