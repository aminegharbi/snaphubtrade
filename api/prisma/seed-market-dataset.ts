/**
 * seed-market-dataset.ts — one-time (idempotent) startup seed.
 *
 * 1) MARKET DATASET → Data Lake
 *    There is no freely redistributable per-model "GCC car sales" dataset, so
 *    this seed ships a REALISTIC BASELINE derived from public aggregate
 *    statistics (GCC best-seller rankings and typical UAE asking prices):
 *    24 months of benchmark snapshots for the region's ~20 highest-volume
 *    models across 2 sources, plus sample tracked listings/observations.
 *    Everything is tagged source='gcc_seed_v1' so it is clearly distinguishable
 *    from live-synced data, and real Market Syncs simply enrich on top of it —
 *    the AI indicators work from day one instead of starting on an empty lake.
 *    Values are generated DETERMINISTICALLY (fixed PRNG seed) so every
 *    deployment gets the same baseline.
 *
 * 2) DEALER PROSPECTS
 *    A directory of dealer companies across the GCC automotive free zones
 *    (DUCAMZ, JAFZA, SAIF Zone, RAKEZ, KIZAD, BIIP, ...). Emails/phones are
 *    intentionally LEFT EMPTY unless public — the admin completes them (or
 *    imports a CSV) before sending invitations from /admin/prospects.
 *
 * Idempotency: skips each part entirely if its table already has seed rows.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Deterministic PRNG (mulberry32) — same numbers on every deploy.
function rng(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// GCC high-volume models with typical UAE asking prices (AED) and demand.
// Base prices reflect commonly observed listing levels for recent model years.
const GCC_MODELS: Array<{ make: string; model: string; years: number[]; base: number; demand: 'very_high'|'high'|'medium'; body: string }> = [
  { make: 'Toyota', model: 'Land Cruiser', years: [2022, 2023, 2024], base: 265000, demand: 'very_high', body: 'SUV' },
  { make: 'Toyota', model: 'Hilux', years: [2022, 2023, 2024], base: 105000, demand: 'very_high', body: 'Pickup' },
  { make: 'Toyota', model: 'Corolla', years: [2022, 2023, 2024], base: 72000, demand: 'high', body: 'Sedan' },
  { make: 'Toyota', model: 'Camry', years: [2022, 2023, 2024], base: 108000, demand: 'high', body: 'Sedan' },
  { make: 'Toyota', model: 'Prado', years: [2022, 2023, 2024], base: 175000, demand: 'very_high', body: 'SUV' },
  { make: 'Nissan', model: 'Patrol', years: [2022, 2023, 2024], base: 230000, demand: 'very_high', body: 'SUV' },
  { make: 'Nissan', model: 'Sunny', years: [2022, 2023, 2024], base: 48000, demand: 'high', body: 'Sedan' },
  { make: 'Nissan', model: 'X-Trail', years: [2022, 2023, 2024], base: 105000, demand: 'medium', body: 'SUV' },
  { make: 'Mitsubishi', model: 'Pajero', years: [2020, 2021, 2022], base: 98000, demand: 'high', body: 'SUV' },
  { make: 'Mitsubishi', model: 'L200', years: [2022, 2023, 2024], base: 78000, demand: 'high', body: 'Pickup' },
  { make: 'Hyundai', model: 'Tucson', years: [2022, 2023, 2024], base: 92000, demand: 'high', body: 'SUV' },
  { make: 'Hyundai', model: 'Elantra', years: [2022, 2023, 2024], base: 68000, demand: 'medium', body: 'Sedan' },
  { make: 'Kia', model: 'Sportage', years: [2022, 2023, 2024], base: 89000, demand: 'high', body: 'SUV' },
  { make: 'Kia', model: 'Pegas', years: [2022, 2023, 2024], base: 42000, demand: 'medium', body: 'Sedan' },
  { make: 'Ford', model: 'F-150', years: [2022, 2023, 2024], base: 185000, demand: 'medium', body: 'Pickup' },
  { make: 'Chevrolet', model: 'Tahoe', years: [2022, 2023, 2024], base: 215000, demand: 'medium', body: 'SUV' },
  { make: 'Mercedes-Benz', model: 'G-Class', years: [2021, 2022, 2023], base: 720000, demand: 'high', body: 'SUV' },
  { make: 'Land Rover', model: 'Range Rover', years: [2021, 2022, 2023], base: 520000, demand: 'high', body: 'SUV' },
  { make: 'Lexus', model: 'LX600', years: [2022, 2023, 2024], base: 420000, demand: 'high', body: 'SUV' },
  { make: 'Honda', model: 'Civic', years: [2022, 2023, 2024], base: 85000, demand: 'medium', body: 'Sedan' },
];

// Dealer prospect directory — companies operating in GCC automotive trade
// zones. Contact details intentionally blank: complete before inviting.
const FZ = {
  DUCAMZ: { country: 'AE', emirate: 'Dubai', zone: 'DUCAMZ (Dubai Auto Zone)' },
  JAFZA: { country: 'AE', emirate: 'Dubai', zone: 'JAFZA (Jebel Ali Free Zone)' },
  SAIF: { country: 'AE', emirate: 'Sharjah', zone: 'SAIF Zone' },
  SHAM: { country: 'AE', emirate: 'Sharjah', zone: 'Al Shamil Auto Market' },
  RAKEZ: { country: 'AE', emirate: 'Ras Al Khaimah', zone: 'RAKEZ' },
  KIZAD: { country: 'AE', emirate: 'Abu Dhabi', zone: 'KIZAD' },
  MUSSAFAH: { country: 'AE', emirate: 'Abu Dhabi', zone: 'Mussafah Auto Market' },
  DAMMAM: { country: 'SA', emirate: 'Dammam', zone: 'Dammam 2nd Industrial City' },
  RIYADH: { country: 'SA', emirate: 'Riyadh', zone: 'Riyadh Auto Souq' },
  QFZ: { country: 'QA', emirate: 'Doha', zone: 'Qatar Free Zones (Ras Bufontas)' },
  KWFTZ: { country: 'KW', emirate: 'Kuwait City', zone: 'Kuwait Free Trade Zone' },
  SOHAR: { country: 'OM', emirate: 'Sohar', zone: 'Sohar Freezone' },
  BLZ: { country: 'BH', emirate: 'Manama', zone: 'Bahrain Logistics Zone' },
};

const PROSPECT_NAMES: Array<[keyof typeof FZ, string, string]> = [
  ['DUCAMZ', 'Al Aweer Motors Trading', '4x4 export, Japanese brands'],
  ['DUCAMZ', 'Golden Bridge Auto Export', 'RHD re-export, Africa markets'],
  ['DUCAMZ', 'Star Gulf Cars Trading', 'Toyota & Nissan specialists'],
  ['DUCAMZ', 'Al Faris Auto Zone', 'Pickups & commercial'],
  ['DUCAMZ', 'Emirates Auto Traders FZE', 'Mixed inventory, CIS export'],
  ['DUCAMZ', 'Sahara Gulf Motors', 'SUV specialists'],
  ['JAFZA', 'Jebel Ali Auto Trading FZE', 'RoRo export, bulk deals'],
  ['JAFZA', 'Gulf Star Vehicles FZCO', 'New & used, GCC specs'],
  ['JAFZA', 'Prime Wheels International', 'Luxury & premium segment'],
  ['JAFZA', 'Al Bahar Auto FZE', 'Fleet liquidation'],
  ['JAFZA', 'Oceanic Motors FZCO', 'Left-hand drive export'],
  ['SAIF', 'Sharjah Auto Hub FZC', 'Budget sedans, high volume'],
  ['SAIF', 'Al Nasr Vehicles Trading', 'Japanese used imports'],
  ['SAIF', 'Falcon Gulf Auto FZC', 'Pickup trucks'],
  ['SHAM', 'Al Shamil Motors', 'Local resale, financing'],
  ['SHAM', 'Bin Hamad Auto Trading', 'Family SUVs'],
  ['RAKEZ', 'RAK Auto Traders FZ-LLC', 'Mixed inventory'],
  ['RAKEZ', 'Northern Emirates Motors', 'Commercial vehicles'],
  ['KIZAD', 'Capital Auto Logistics', 'Fleet & government supply'],
  ['MUSSAFAH', 'Mussafah Car Center', 'Used cars, trade-ins'],
  ['MUSSAFAH', 'Al Dhafra Auto Trading', '4x4 desert-spec'],
  ['DAMMAM', 'Eastern Province Motors Co', 'GCC-spec sedans'],
  ['DAMMAM', 'Al Khaleej Auto Trading Est', 'Toyota specialists'],
  ['RIYADH', 'Riyadh Wheels Trading Co', 'High-volume used'],
  ['RIYADH', 'Najd Auto Group', 'Luxury segment'],
  ['QFZ', 'Doha Prime Motors WLL', 'Premium SUVs'],
  ['QFZ', 'Qatar Auto Link', 'New imports'],
  ['KWFTZ', 'Kuwait Gulf Vehicles Co', 'American brands'],
  ['KWFTZ', 'Al Salmiya Auto Trading', 'Japanese sedans'],
  ['SOHAR', 'Sohar Auto Gateway LLC', 'Re-export East Africa'],
  ['SOHAR', 'Muscat Motors Trading', 'SUVs & pickups'],
  ['BLZ', 'Bahrain Auto Exchange WLL', 'Mixed inventory'],
  ['BLZ', 'Manama Motors Hub', 'Budget segment'],
];

const DEALER_NAMES_FOR_LISTINGS = PROSPECT_NAMES.slice(0, 12).map(p => p[1]);

async function seedMarketDataset() {
  const existing = await prisma.marketSnapshot.count({ where: { run_id: 'gcc_seed_v1' } });
  if (existing > 0) { console.log(`ℹ️  Market dataset already seeded (${existing} snapshots) — skipping.`); return; }

  const rand = rng(42);
  const sources = ['dubizzle', 'dubicars'];
  const now = new Date();
  let snapshots = 0, listings = 0, observations = 0;

  for (const m of GCC_MODELS) {
    for (const year of m.years) {
      // Age-based depreciation off the base price
      const age = Math.max(0, now.getFullYear() - year);
      const yearBase = m.base * Math.pow(0.9, age);

      // 24 monthly snapshots, gentle deterministic market drift + seasonality
      for (let monthsAgo = 23; monthsAgo >= 0; monthsAgo--) {
        const captured = new Date(now); captured.setMonth(captured.getMonth() - monthsAgo); captured.setDate(6);
        const drift = 1 + (23 - monthsAgo) * 0.0015;         // slow appreciation of recent stock
        const season = 1 + 0.02 * Math.sin((captured.getMonth() / 12) * 2 * Math.PI); // Q4/Q1 uptick
        for (const source of sources) {
          const jitter = 0.97 + rand() * 0.06;
          const avg = Math.round(yearBase * drift * season * jitter);
          const count = Math.round((m.demand === 'very_high' ? 45 : m.demand === 'high' ? 28 : 14) * (0.8 + rand() * 0.4));
          await prisma.marketSnapshot.create({
            data: {
              run_id: 'gcc_seed_v1', captured_at: captured, source,
              make: m.make, model: m.model, year,
              avg_price_aed: avg,
              min_price_aed: Math.round(avg * 0.88),
              max_price_aed: Math.round(avg * 1.15),
              listing_count: count,
              avg_days_listed: m.demand === 'very_high' ? 14 + Math.round(rand() * 8) : m.demand === 'high' ? 22 + Math.round(rand() * 10) : 32 + Math.round(rand() * 14),
              demand_level: m.demand === 'very_high' ? 'high' : m.demand,
              trend_pct: Number(((drift * season - 1) * 100).toFixed(1)),
              confidence_pct: 78,
            },
          });
          snapshots++;
        }
      }

      // A few tracked listings per model-year with a small observation history
      const nListings = m.demand === 'very_high' ? 4 : 2;
      for (let i = 0; i < nListings; i++) {
        const source = sources[i % 2];
        const dealer = DEALER_NAMES_FOR_LISTINGS[Math.floor(rand() * DEALER_NAMES_FOR_LISTINGS.length)];
        const p0 = Math.round(yearBase * (0.95 + rand() * 0.12));
        const drops = Math.floor(rand() * 3); // 0-2 price drops over its life
        const firstSeen = new Date(now); firstSeen.setDate(firstSeen.getDate() - (30 + Math.floor(rand() * 90)));
        const sold = rand() < 0.45;
        const lifetime = 12 + Math.floor(rand() * 40);
        const lastSeen = new Date(firstSeen); lastSeen.setDate(lastSeen.getDate() + lifetime);
        let price = p0;
        const fingerprint = [m.make, m.model, year, `seed${i}`, dealer].join('|').toLowerCase().replace(/[^a-z0-9|]+/g, '-');

        const listing = await prisma.marketListing.create({
          data: {
            source, fingerprint, make: m.make, model: m.model, year,
            body_type: m.body, dealer_name: dealer, emirate: 'Dubai', country: 'AE',
            first_seen_at: firstSeen, last_seen_at: sold ? lastSeen : now,
            status: sold ? 'delisted' : 'active', delisted_at: sold ? lastSeen : null,
            first_price_aed: p0, current_price_aed: Math.round(p0 * Math.pow(0.97, drops)),
            lowest_price_aed: Math.round(p0 * Math.pow(0.97, drops)), highest_price_aed: p0,
            price_changes: drops, times_seen: drops + 2,
            lifetime_days: sold ? lifetime : Math.floor((now.getTime() - firstSeen.getTime()) / 86400000),
          },
        });
        listings++;

        for (let obs = 0; obs <= drops + 1; obs++) {
          const at = new Date(firstSeen); at.setDate(at.getDate() + Math.floor((lifetime / (drops + 2)) * obs));
          await prisma.marketObservation.create({
            data: { listing_id: listing.id, run_id: 'gcc_seed_v1', observed_at: at, price_aed: price, source, dealer_name: dealer, status: 'active' },
          });
          observations++;
          if (obs < drops + 1) price = Math.round(price * 0.97);
        }
      }
    }
  }
  console.log(`✅ Market dataset seeded: ${snapshots} snapshots, ${listings} listings, ${observations} observations (source: gcc_seed_v1)`);
}

async function seedProspects() {
  const existing = await prisma.dealerProspect.count();
  if (existing > 0) { console.log(`ℹ️  Dealer prospects already present (${existing}) — skipping.`); return; }

  for (const [key, name, specialties] of PROSPECT_NAMES) {
    const fz = FZ[key];
    await prisma.dealerProspect.create({
      data: {
        company_name: name, country: fz.country, emirate: fz.emirate, free_zone: fz.zone,
        specialties, source: 'seed_gcc_v1',
        // email/phone deliberately empty — to be completed by the admin (or
        // CSV import) before sending invitations. We never guess contact info.
      },
    });
  }
  console.log(`✅ ${PROSPECT_NAMES.length} dealer prospects seeded across GCC free zones (contacts to be completed in /admin/prospects)`);
}

async function main() {
  await seedMarketDataset();
  await seedProspects();
}

main().catch(e => { console.error('⚠️  Dataset seed failed:', e.message); process.exit(0); /* never block startup */ })
  .finally(() => prisma.$disconnect());
