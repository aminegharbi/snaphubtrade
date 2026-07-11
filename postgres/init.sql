-- ============================================================
-- DubaiAuto Platform — Database Schema
-- Clean version: no TimescaleDB, no UUID type, TEXT ids
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ─── Users ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255),
  full_name       VARCHAR(255) NOT NULL,
  phone           VARCHAR(50),
  whatsapp        VARCHAR(50),
  avatar_url      VARCHAR(500),
  role            VARCHAR(30) NOT NULL DEFAULT 'buyer',
  mfa_secret      VARCHAR(255),
  mfa_enabled     BOOLEAN DEFAULT FALSE,
  email_verified  BOOLEAN DEFAULT FALSE,
  preferred_lang  VARCHAR(5) DEFAULT 'en',
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Dealers ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dealers (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id             TEXT REFERENCES users(id) ON DELETE CASCADE,
  company_name        VARCHAR(255) NOT NULL,
  slug                VARCHAR(255) UNIQUE NOT NULL,
  description         TEXT,
  logo_url            VARCHAR(500),
  cover_url           VARCHAR(500),
  phone               VARCHAR(50),
  whatsapp            VARCHAR(50),
  email               VARCHAR(255),
  website             VARCHAR(500),
  address             TEXT,
  free_zone_license   VARCHAR(100),
  languages           TEXT[] DEFAULT ARRAY['en'],
  export_destinations TEXT[] DEFAULT ARRAY[]::TEXT[],
  certifications      TEXT[] DEFAULT ARRAY[]::TEXT[],
  verified            BOOLEAN DEFAULT FALSE,
  verified_at         TIMESTAMPTZ,
  rating              DECIMAL(3,2) DEFAULT 0,
  review_count        INT DEFAULT 0,
  subscription_tier   VARCHAR(20) DEFAULT 'free',
  subscription_ends   TIMESTAMPTZ,
  stripe_customer_id  VARCHAR(255),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Dealer Reviews ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dealer_reviews (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  dealer_id   TEXT REFERENCES dealers(id) ON DELETE CASCADE,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Vehicles ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vehicles (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  dealer_id             TEXT REFERENCES dealers(id) ON DELETE CASCADE,
  vin                   VARCHAR(17),
  make                  VARCHAR(100) NOT NULL,
  model                 VARCHAR(100) NOT NULL,
  year                  SMALLINT NOT NULL,
  generation            VARCHAR(100),
  trim                  VARCHAR(100),
  body_type             VARCHAR(50),
  fuel_type             VARCHAR(30),
  transmission          VARCHAR(30),
  engine                VARCHAR(100),
  horsepower            INT,
  torque                INT,
  doors                 SMALLINT,
  seats                 SMALLINT,
  mileage_km            INT DEFAULT 0,
  color_exterior        VARCHAR(100),
  color_interior        VARCHAR(100),
  wheels                VARCHAR(100),
  country_origin        VARCHAR(100),
  specs                 JSONB DEFAULT '{}',
  features              TEXT[] DEFAULT ARRAY[]::TEXT[],
  price_aed             DECIMAL(12,2) NOT NULL,
  price_min_aed         DECIMAL(12,2),
  price_suggested_aed   DECIMAL(12,2),
  negotiable            BOOLEAN DEFAULT TRUE,
  status                VARCHAR(30) DEFAULT 'draft',
  export_eligible       BOOLEAN DEFAULT FALSE,
  title                 VARCHAR(500),
  description           TEXT,
  seo_keywords          TEXT,
  ai_confidence         DECIMAL(4,3),
  ai_raw_result         JSONB,
  duplicate_hash        VARCHAR(64),
  view_count            INT DEFAULT 0,
  favorite_count        INT DEFAULT 0,
  es_indexed_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Vehicle Images ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vehicle_images (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id  TEXT REFERENCES vehicles(id) ON DELETE CASCADE,
  s3_key      VARCHAR(500) NOT NULL,
  cdn_url     VARCHAR(500),
  thumb_url   VARCHAR(500),
  is_primary  BOOLEAN DEFAULT FALSE,
  position    SMALLINT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Price History (plain table — no hypertable) ──────────────────────────────

CREATE TABLE IF NOT EXISTS price_history (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id  TEXT REFERENCES vehicles(id) ON DELETE CASCADE,
  price_aed   DECIMAL(12,2) NOT NULL,
  changed_by  TEXT REFERENCES users(id),
  changed_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Leads ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  dealer_id       TEXT REFERENCES dealers(id) ON DELETE CASCADE,
  vehicle_id      TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  buyer_name      VARCHAR(255),
  buyer_email     VARCHAR(255),
  buyer_phone     VARCHAR(50),
  buyer_whatsapp  VARCHAR(50),
  stage           VARCHAR(20) DEFAULT 'new',
  channel         VARCHAR(50) DEFAULT 'website',
  notes           TEXT,
  offer_price     DECIMAL(12,2),
  source_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Lead Activities ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_activities (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id     TEXT REFERENCES leads(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  note        TEXT,
  created_by  TEXT REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Promotions ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS promotions (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  dealer_id       TEXT,
  vehicle_id      TEXT REFERENCES vehicles(id) ON DELETE CASCADE,
  type            VARCHAR(50) DEFAULT 'price_reduction',
  original_price  DECIMAL(12,2),
  promo_price     DECIMAL(12,2),
  label           VARCHAR(100),
  starts_at       TIMESTAMPTZ DEFAULT NOW(),
  ends_at         TIMESTAMPTZ,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Favorites ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS favorites (
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id  TEXT REFERENCES vehicles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, vehicle_id)
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_vehicles_dealer    ON vehicles(dealer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status    ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_make      ON vehicles(make);
CREATE INDEX IF NOT EXISTS idx_vehicles_price     ON vehicles(price_aed);
CREATE INDEX IF NOT EXISTS idx_vehicles_created   ON vehicles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_dealer       ON leads(dealer_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_images_vid ON vehicle_images(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_price_history_vid  ON price_history(vehicle_id);

-- ─── Seed: Admin user ─────────────────────────────────────────────────────────
-- Password: Admin@Dubai2024 (bcrypt hash)

INSERT INTO users (id, email, password_hash, full_name, role, email_verified)
VALUES (
  'admin-user-001',
  'admin@dubaiauto.ae',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu',
  'Platform Admin',
  'super_admin',
  true
) ON CONFLICT (email) DO NOTHING;

-- ─── Seed: Demo dealer user ───────────────────────────────────────────────────

INSERT INTO users (id, email, password_hash, full_name, role, phone, whatsapp, email_verified)
VALUES (
  'dealer-user-001',
  'dealer@demo.ae',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu',
  'Mohammed Al Rashid',
  'dealer',
  '+971501234567',
  '+971501234567',
  true
) ON CONFLICT (email) DO NOTHING;

INSERT INTO dealers (
  id, user_id, company_name, slug, description,
  phone, whatsapp, email, verified, subscription_tier,
  languages, export_destinations, rating, review_count
) VALUES (
  'dealer-001',
  'dealer-user-001',
  'Al Rashid Motors LLC',
  'al-rashid-motors',
  'Premium car dealer in Dubai Free Zone. Specializing in luxury SUVs and sports cars for export worldwide.',
  '+971501234567', '+971501234567', 'dealer@demo.ae',
  true, 'pro',
  ARRAY['en','ar','fr'],
  ARRAY['Africa','Europe','Asia'],
  4.8, 47
) ON CONFLICT (slug) DO NOTHING;

-- ─── Seed: Demo buyer user ──────────────────────────────────────────────────────

INSERT INTO users (id, email, password_hash, full_name, role, email_verified)
VALUES (
  'buyer-user-001',
  'buyer@demo.ae',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu',
  'Sara Al Mazrouei',
  'buyer',
  true
) ON CONFLICT (email) DO NOTHING;

-- ─── Seed: Demo vehicles ──────────────────────────────────────────────────────


-- ============================================================
-- COLLABORATIVE PLATFORM — New tables
-- ============================================================

-- ─── Vehicle visibility / sharing ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vehicle_shares (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id      TEXT REFERENCES vehicles(id) ON DELETE CASCADE,
  owner_dealer_id TEXT REFERENCES dealers(id) ON DELETE CASCADE,
  visibility      VARCHAR(20) NOT NULL DEFAULT 'private',
  -- 'private' | 'selected' | 'network' | 'group'
  group_id        TEXT,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS share_permissions (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  share_id        TEXT REFERENCES vehicle_shares(id) ON DELETE CASCADE,
  dealer_id       TEXT REFERENCES dealers(id) ON DELETE CASCADE,
  -- permissions: view, propose_client, reserve, transfer_request, negotiate
  can_view        BOOLEAN DEFAULT TRUE,
  can_propose     BOOLEAN DEFAULT FALSE,
  can_reserve     BOOLEAN DEFAULT FALSE,
  can_transfer    BOOLEAN DEFAULT FALSE,
  can_negotiate   BOOLEAN DEFAULT FALSE,
  starts_at       TIMESTAMPTZ DEFAULT NOW(),
  ends_at         TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  revoked_by      TEXT REFERENCES dealers(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Dealer groups ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dealer_groups (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  created_by  TEXT REFERENCES dealers(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dealer_group_members (
  group_id    TEXT REFERENCES dealer_groups(id) ON DELETE CASCADE,
  dealer_id   TEXT REFERENCES dealers(id) ON DELETE CASCADE,
  role        VARCHAR(20) DEFAULT 'member', -- 'admin' | 'member'
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, dealer_id)
);

-- ─── Vehicle timeline ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vehicle_timeline (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id   TEXT REFERENCES vehicles(id) ON DELETE CASCADE,
  event_type   VARCHAR(50) NOT NULL,
  -- created|photographed|published|shared|reserved|test_drive|
  -- sold|delivered|returned|archived|status_changed|price_changed|
  -- scan|quick_action|transfer_requested|transfer_approved
  event_data   JSONB DEFAULT '{}',
  actor_id     TEXT,   -- dealer_id or user_id
  actor_type   VARCHAR(20) DEFAULT 'dealer',
  note         TEXT,
  occurred_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_vehicle ON vehicle_timeline(vehicle_id, occurred_at DESC);

-- ─── Collaboration messages ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS collaboration_messages (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id      TEXT REFERENCES vehicles(id) ON DELETE CASCADE,
  from_dealer_id  TEXT REFERENCES dealers(id),
  to_dealer_id    TEXT REFERENCES dealers(id),
  msg_type        VARCHAR(30) NOT NULL,
  -- 'message'|'offer'|'counter_offer'|'reserve_request'|
  -- 'transfer_request'|'exchange_proposal'|'accepted'|'declined'
  content         TEXT,
  offer_price_aed DECIMAL(12,2),
  status          VARCHAR(20) DEFAULT 'pending',
  -- 'pending'|'accepted'|'declined'|'countered'|'expired'
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Quick actions / scan events ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scan_events (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id   TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  dealer_id    TEXT REFERENCES dealers(id),
  scan_type    VARCHAR(20) NOT NULL,
  -- 'qr'|'vin'|'barcode'|'nfc'|'plate_ocr'|'widget'|'voice'
  scan_data    TEXT,         -- raw scanned value
  action_taken VARCHAR(30),  -- 'sold'|'reserved'|'delivered'|'available'|'returned'
  source       VARCHAR(30) DEFAULT 'mobile',
  -- 'mobile_scan'|'widget'|'watch'|'whatsapp'|'voice'|'nfc'
  lat          DECIMAL(10,7),
  lng          DECIMAL(10,7),
  scanned_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── QR codes per vehicle ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vehicle_qr_codes (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT REFERENCES vehicles(id) ON DELETE CASCADE UNIQUE,
  qr_token   TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  qr_url     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Notifications ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  dealer_id   TEXT REFERENCES dealers(id) ON DELETE CASCADE,
  broker_id   TEXT,
  -- FK to brokers(id) added in 05_brokers.sql, since brokers table is created after this file
  type        VARCHAR(50) NOT NULL,
  category    VARCHAR(30) NOT NULL DEFAULT 'general',
  -- 'reservation' | 'shared_stock' | 'sale' | 'lead' | 'broker_deal' | 'general'
  title       VARCHAR(255) NOT NULL,
  body        TEXT,
  data        JSONB DEFAULT '{}',
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_dealer ON notifications(dealer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_broker ON notifications(broker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shares_vehicle ON vehicle_shares(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_shares_owner ON vehicle_shares(owner_dealer_id);
CREATE INDEX IF NOT EXISTS idx_collab_vehicle ON collaboration_messages(vehicle_id, created_at DESC);


-- ============================================================
-- SAAS SUBSCRIPTION & MONETIZATION SYSTEM
-- ============================================================

-- ─── Plans ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscription_plans (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(50) UNIQUE NOT NULL,
  description   TEXT,
  tagline       VARCHAR(200),
  color         VARCHAR(20) DEFAULT '#6B7280',
  badge         VARCHAR(50),        -- 'Most Popular', 'Best Value', etc.
  is_active     BOOLEAN DEFAULT TRUE,
  is_visible    BOOLEAN DEFAULT TRUE,
  sort_order    INT DEFAULT 0,
  -- Pricing
  price_monthly  DECIMAL(10,2) DEFAULT 0,
  price_quarterly DECIMAL(10,2) DEFAULT 0,
  price_yearly   DECIMAL(10,2) DEFAULT 0,
  currency       VARCHAR(3) DEFAULT 'AED',
  -- Trial
  trial_days     INT DEFAULT 0,
  -- Stripe
  stripe_price_monthly_id  VARCHAR(200),
  stripe_price_yearly_id   VARCHAR(200),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Features ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscription_features (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key           VARCHAR(100) UNIQUE NOT NULL,
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  icon          VARCHAR(50),
  category      VARCHAR(50) DEFAULT 'general',
  is_active     BOOLEAN DEFAULT TRUE,
  is_premium    BOOLEAN DEFAULT FALSE,
  is_visible    BOOLEAN DEFAULT TRUE,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Plan ↔ Feature mapping ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plan_features (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  plan_id    TEXT REFERENCES subscription_plans(id) ON DELETE CASCADE,
  feature_id TEXT REFERENCES subscription_features(id) ON DELETE CASCADE,
  enabled    BOOLEAN DEFAULT TRUE,
  limit_value INT,    -- null = unlimited, 0 = disabled, N = N uses/month
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, feature_id)
);

-- ─── Plan limits (named limits per plan) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS plan_limits (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  plan_id    TEXT REFERENCES subscription_plans(id) ON DELETE CASCADE,
  limit_key  VARCHAR(100) NOT NULL,   -- 'max_vehicles', 'max_users', 'ai_scans_monthly', 'max_photos'
  limit_name VARCHAR(200) NOT NULL,
  limit_value INT NOT NULL DEFAULT 0, -- -1 = unlimited
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, limit_key)
);

-- ─── Subscriptions ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dealer_subscriptions (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  dealer_id       TEXT REFERENCES dealers(id) ON DELETE CASCADE,
  plan_id         TEXT REFERENCES subscription_plans(id),
  status          VARCHAR(30) DEFAULT 'active',
  -- 'trial'|'active'|'past_due'|'cancelled'|'expired'|'paused'
  billing_cycle   VARCHAR(20) DEFAULT 'monthly', -- 'monthly'|'quarterly'|'yearly'
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end   TIMESTAMPTZ,
  trial_start     TIMESTAMPTZ,
  trial_end       TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  cancel_reason   TEXT,
  auto_renew      BOOLEAN DEFAULT TRUE,
  -- Stripe
  stripe_subscription_id VARCHAR(200),
  stripe_customer_id     VARCHAR(200),
  -- Coupon
  coupon_id       TEXT,
  discount_pct    INT DEFAULT 0,
  -- Grace period
  grace_period_ends TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_dealer ON dealer_subscriptions(dealer_id, status);

-- ─── Invoices ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscription_invoices (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  subscription_id TEXT REFERENCES dealer_subscriptions(id),
  dealer_id       TEXT REFERENCES dealers(id),
  invoice_number  VARCHAR(50) UNIQUE NOT NULL,
  status          VARCHAR(20) DEFAULT 'draft',
  -- 'draft'|'open'|'paid'|'void'|'uncollectible'
  amount_subtotal DECIMAL(10,2) NOT NULL,
  amount_discount DECIMAL(10,2) DEFAULT 0,
  amount_tax      DECIMAL(10,2) DEFAULT 0,
  amount_total    DECIMAL(10,2) NOT NULL,
  currency        VARCHAR(3) DEFAULT 'AED',
  billing_cycle   VARCHAR(20),
  period_start    TIMESTAMPTZ,
  period_end      TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  due_date        TIMESTAMPTZ,
  stripe_invoice_id VARCHAR(200),
  pdf_url         VARCHAR(500),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Payments ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscription_payments (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  invoice_id      TEXT REFERENCES subscription_invoices(id),
  dealer_id       TEXT REFERENCES dealers(id),
  amount          DECIMAL(10,2) NOT NULL,
  currency        VARCHAR(3) DEFAULT 'AED',
  status          VARCHAR(20) DEFAULT 'pending',
  -- 'pending'|'succeeded'|'failed'|'refunded'
  gateway         VARCHAR(30) DEFAULT 'stripe',
  -- 'stripe'|'paypal'|'tabby'|'tamara'|'apple_pay'|'google_pay'
  gateway_payment_id VARCHAR(200),
  gateway_response   JSONB DEFAULT '{}',
  failure_reason  TEXT,
  refunded_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Coupons ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscription_coupons (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code            VARCHAR(50) UNIQUE NOT NULL,
  name            VARCHAR(200),
  discount_type   VARCHAR(20) DEFAULT 'percentage', -- 'percentage'|'fixed'
  discount_value  DECIMAL(10,2) NOT NULL,
  max_uses        INT,
  current_uses    INT DEFAULT 0,
  valid_from      TIMESTAMPTZ DEFAULT NOW(),
  valid_until     TIMESTAMPTZ,
  min_amount      DECIMAL(10,2) DEFAULT 0,
  applicable_plans TEXT[],
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Usage tracking ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscription_usage (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  dealer_id   TEXT REFERENCES dealers(id) ON DELETE CASCADE,
  usage_key   VARCHAR(100) NOT NULL,
  -- 'vehicles_count'|'ai_scans_monthly'|'users_count'|'photos_count'
  period_year  INT NOT NULL,
  period_month INT NOT NULL,
  value       INT DEFAULT 0,
  reset_at    TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dealer_id, usage_key, period_year, period_month)
);

-- ─── Subscription history ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscription_history (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  dealer_id       TEXT REFERENCES dealers(id),
  subscription_id TEXT REFERENCES dealer_subscriptions(id),
  event_type      VARCHAR(50) NOT NULL,
  -- 'created'|'upgraded'|'downgraded'|'renewed'|'cancelled'|'expired'|'trial_started'|'payment_failed'
  from_plan_id    TEXT,
  to_plan_id      TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AI Credits ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_credits (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  dealer_id   TEXT REFERENCES dealers(id) ON DELETE CASCADE,
  credits_total  INT DEFAULT 0,
  credits_used   INT DEFAULT 0,
  credits_reset_at TIMESTAMPTZ,
  reset_period VARCHAR(20) DEFAULT 'monthly',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dealer_id)
);

-- ============================================================
-- SEED: Plans, Features and Limits
-- ============================================================

-- Plans
INSERT INTO subscription_plans (id, name, slug, description, tagline, color, badge, sort_order, price_monthly, price_quarterly, price_yearly) VALUES
('plan-free',       'Free',       'free',       'Start your journey on DubaiAuto at zero cost.',         'Perfect for new dealers',            '#6B7280', NULL,          1, 0,    0,    0),
('plan-pro',        'Pro',        'pro',         'Everything a professional dealer needs to grow.',       'Most popular for active traders',    '#C1272D', 'Most Popular', 2, 499,  1299, 4799),
('plan-enterprise', 'Enterprise', 'enterprise', 'Unlimited power for large dealership groups.',          'For dealer networks & groups',       '#007A3D', 'Best Value',  3, 1999, 5499, 19999)
ON CONFLICT (slug) DO NOTHING;

-- Features
INSERT INTO subscription_features (key, name, icon, category, is_premium, sort_order) VALUES
('dealer_profile',       'Dealer Profile',            '🏢', 'core',      false, 1),
('public_page',          'Public Company Page',        '🌐', 'core',      false, 2),
('vehicle_listing',      'Vehicle Listings',           '🚗', 'core',      false, 3),
('ai_recognition',       'AI Vehicle Recognition',     '🤖', 'ai',        false, 4),
('ai_description',       'AI Description Generation',  '✍️', 'ai',        false, 5),
('vehicle_gallery',      'Vehicle Photo Gallery',      '📸', 'core',      false, 6),
('marketplace_search',   'Marketplace Search',         '🔍', 'core',      false, 7),
('buyer_inquiries',      'Receive Buyer Inquiries',    '💬', 'core',      false, 8),
('basic_dashboard',      'Basic Dashboard',            '📊', 'core',      false, 9),
('email_notifications',  'Email Notifications',        '📧', 'core',      false, 10),
('excel_import',         'Excel Import',               '📥', 'import',    true,  11),
('csv_import',           'CSV Import',                 '📄', 'import',    true,  12),
('bulk_upload',          'Bulk Vehicle Upload',        '⬆️', 'import',    true,  13),
('ocr_vin',              'OCR VIN Detection',          '🔲', 'scan',      true,  14),
('qr_scan',              'QR Code Scan',               '📱', 'scan',      true,  15),
('crm',                  'CRM Module',                 '👥', 'business',  true,  16),
('buyer_management',     'Buyer Management',           '🤝', 'business',  true,  17),
('whatsapp_integration', 'WhatsApp Business',          '💚', 'business',  true,  18),
('price_alerts',         'Price Alerts',               '🔔', 'alerts',    true,  19),
('promotions',           'Promotion Campaigns',        '🎯', 'marketing', true,  20),
('inventory_analytics',  'Inventory Analytics',        '📈', 'analytics', true,  21),
('sales_dashboard',      'Sales Dashboard',            '💰', 'analytics', true,  22),
('price_history',        'Price History',              '📉', 'analytics', true,  23),
('export_reports',       'Export Reports PDF/Excel',   '📤', 'export',    true,  24),
('verification_badge',   'Verified Dealer Badge',      '✅', 'trust',     true,  25),
('seo_optimization',     'SEO Optimization',           '🔎', 'marketing', true,  26),
('api_basic',            'API Basic Access',           '🔌', 'api',       true,  27),
('shared_inventory',     'Shared Inventory Network',   '🔗', 'collaboration', true, 28),
('smart_scan',           'Smart Scan & One-Tap Sale',  '⚡', 'collaboration', true, 29),
('multi_branch',         'Multi-Branch Management',    '🏗', 'enterprise', true, 30),
('multi_currency',       'Multi-Currency',             '💱', 'enterprise', true, 31),
('api_full',             'Full API Access',            '⚙️', 'api',       true,  32),
('erp_integration',      'ERP Integration',            '🏭', 'enterprise', true, 33),
('white_label',          'White Label',                '🎨', 'enterprise', true, 34),
('ai_market_intelligence','AI Market Intelligence',    '🧠', 'ai',        true,  35),
('ai_price_prediction',  'AI Price Prediction',        '💡', 'ai',        true,  36),
('workflow_automation',  'Workflow Automation',        '🔄', 'enterprise', true, 37),
('team_permissions',     'Team Permissions',           '🔐', 'enterprise', true, 38),
('dedicated_support',    'Dedicated Support',          '🎯', 'support',   true,  39),
('sla_priority',         'SLA Priority',               '⚡', 'support',   true,  40)
ON CONFLICT (key) DO NOTHING;

-- ─── Plan Features: FREE ──────────────────────────────────────────────────

INSERT INTO plan_features (plan_id, feature_id, enabled, limit_value)
SELECT 'plan-free', id, true,
  CASE key
    WHEN 'ai_recognition' THEN 10   -- 10/month
    WHEN 'ai_description' THEN 10
    ELSE NULL
  END
FROM subscription_features
WHERE key IN ('dealer_profile','public_page','vehicle_listing','ai_recognition','ai_description','vehicle_gallery','marketplace_search','buyer_inquiries','basic_dashboard','email_notifications')
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- ─── Plan Features: PRO ───────────────────────────────────────────────────

INSERT INTO plan_features (plan_id, feature_id, enabled, limit_value)
SELECT 'plan-pro', id, true, NULL
FROM subscription_features
WHERE key IN ('dealer_profile','public_page','vehicle_listing','ai_recognition','ai_description','vehicle_gallery','marketplace_search','buyer_inquiries','basic_dashboard','email_notifications','excel_import','csv_import','bulk_upload','ocr_vin','qr_scan','crm','buyer_management','whatsapp_integration','price_alerts','promotions','inventory_analytics','sales_dashboard','price_history','export_reports','verification_badge','seo_optimization','api_basic','shared_inventory','smart_scan')
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- ─── Plan Features: ENTERPRISE ────────────────────────────────────────────

INSERT INTO plan_features (plan_id, feature_id, enabled, limit_value)
SELECT 'plan-enterprise', id, true, NULL
FROM subscription_features
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- ─── Plan Limits ─────────────────────────────────────────────────────────

INSERT INTO plan_limits (plan_id, limit_key, limit_name, limit_value) VALUES
('plan-free',       'max_vehicles',      'Max Active Vehicles',    20),
('plan-free',       'max_users',         'Max Staff Users',        1),
('plan-free',       'ai_scans_monthly',  'AI Scans per Month',     10),
('plan-free',       'max_photos',        'Photos per Vehicle',     10),
('plan-free',       'max_shares',        'Shared Vehicles',        0),
('plan-pro',        'max_vehicles',      'Max Active Vehicles',    500),
('plan-pro',        'max_users',         'Max Staff Users',        5),
('plan-pro',        'ai_scans_monthly',  'AI Scans per Month',     -1),
('plan-pro',        'max_photos',        'Photos per Vehicle',     30),
('plan-pro',        'max_shares',        'Shared Vehicles',        -1),
('plan-enterprise', 'max_vehicles',      'Max Active Vehicles',    -1),
('plan-enterprise', 'max_users',         'Max Staff Users',        -1),
('plan-enterprise', 'ai_scans_monthly',  'AI Scans per Month',     -1),
('plan-enterprise', 'max_photos',        'Photos per Vehicle',     -1),
('plan-enterprise', 'max_shares',        'Shared Vehicles',        -1)
ON CONFLICT (plan_id, limit_key) DO NOTHING;

-- ─── Seed: Give demo dealer a Pro subscription ────────────────────────────

INSERT INTO dealer_subscriptions (dealer_id, plan_id, status, billing_cycle, current_period_start, current_period_end, auto_renew)
VALUES ('dealer-001', 'plan-pro', 'active', 'monthly', NOW(), NOW() + INTERVAL '30 days', true)
ON CONFLICT DO NOTHING;



-- ============================================================
-- PLATFORM FEATURE FLAGS SYSTEM
-- Admin-controlled gradual feature rollout
-- ============================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key             VARCHAR(100) UNIQUE NOT NULL,  -- e.g. 'smart_scan', 'ios_widget'
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  category        VARCHAR(50) NOT NULL DEFAULT 'general',
  -- 'marketplace'|'dealer'|'broker'|'ai'|'mobile'|'social'|'payment'|'admin'
  icon            VARCHAR(10),                   -- emoji
  is_enabled      BOOLEAN NOT NULL DEFAULT false, -- master ON/OFF
  rollout_pct     INT NOT NULL DEFAULT 0,         -- 0-100 % of users who see it
  -- Targeting
  target_plans    TEXT[] DEFAULT '{}',            -- [] = all plans
  target_roles    TEXT[] DEFAULT '{}',            -- [] = all roles: 'dealer','broker','buyer','admin'
  target_zones    TEXT[] DEFAULT '{}',            -- [] = all zones: 'dubai','jafza','sharjah'
  -- Schedule
  enabled_at      TIMESTAMPTZ,                    -- when it was turned on
  scheduled_on    TIMESTAMPTZ,                    -- future auto-enable
  scheduled_off   TIMESTAMPTZ,                    -- future auto-disable
  -- Metadata
  tags            TEXT[] DEFAULT '{}',
  notes           TEXT,                           -- internal admin notes
  created_by      TEXT,
  updated_by      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Track flag change history
CREATE TABLE IF NOT EXISTS feature_flag_logs (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  flag_id     TEXT REFERENCES feature_flags(id) ON DELETE CASCADE,
  flag_key    VARCHAR(100) NOT NULL,
  action      VARCHAR(30) NOT NULL, -- 'enabled'|'disabled'|'rollout_changed'|'scheduled'
  old_value   JSONB,
  new_value   JSONB,
  actor       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_key     ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(is_enabled);
CREATE INDEX IF NOT EXISTS idx_flag_logs_flag        ON feature_flag_logs(flag_id, created_at DESC);

-- ─── ALL PLATFORM FEATURES — Seeded OFF by default ───────────────────────────
-- Admin enables them progressively as marketing strategy dictates

INSERT INTO feature_flags (key, name, description, category, icon, is_enabled, rollout_pct, target_plans, target_roles, tags) VALUES

-- ── MARKETPLACE ──────────────────────────────────────────────────────────────
('marketplace_search',    'Marketplace Search',          'Main vehicle search with filters',                       'marketplace', '🔍', true,  100, '{}', '{}',            ARRAY['core','launch']),
('vehicle_listings',      'Vehicle Listings',            'Browse vehicle cards in marketplace',                    'marketplace', '🚗', true,  100, '{}', '{}',            ARRAY['core','launch']),
('price_alerts',          'Price Drop Alerts',           'Notify buyers when a vehicle price drops',               'marketplace', '🔔', false, 0,   '{}', ARRAY['buyer'],  ARRAY['engagement','phase2']),
('saved_searches',        'Saved Searches',              'Buyers can save and rerun their search',                 'marketplace', '💾', false, 0,   '{}', ARRAY['buyer'],  ARRAY['engagement','phase2']),
('compare_vehicles',      'Compare Vehicles',            'Side-by-side comparison of up to 4 vehicles',           'marketplace', '⚖️', false, 0,   '{}', '{}',            ARRAY['ux','phase2']),
('featured_listings',     'Featured / Promoted Listings','Dealers can boost visibility with paid promotion',       'marketplace', '⭐', false, 0,   ARRAY['pro','enterprise'], ARRAY['dealer'], ARRAY['monetization','phase3']),
('market_trends',         'Market Trend Charts',         'Price history charts on vehicle pages',                  'marketplace', '📈', false, 0,   '{}', '{}',            ARRAY['analytics','phase3']),
('export_calculator',     'Export Cost Calculator',      'Estimate shipping + duties for export buyers',           'marketplace', '✈️', false, 0,   '{}', ARRAY['buyer'],  ARRAY['export','phase3']),

-- ── DEALER ───────────────────────────────────────────────────────────────────
('dealer_dashboard',      'Dealer Dashboard',            'Full dealer inventory management panel',                 'dealer',      '📊', true,  100, '{}', ARRAY['dealer'], ARRAY['core','launch']),
('ai_autofill',           'AI Photo Auto-Fill',          'AI reads vehicle photos and fills listing form',         'dealer',      '🤖', true,  100, '{}', ARRAY['dealer'], ARRAY['ai','launch']),
('ai_description',        'AI Description Generator',    'Generate listing description from vehicle specs',        'dealer',      '✍️', true,  100, '{}', ARRAY['dealer'], ARRAY['ai','launch']),
('smart_scan',            'Smart Scan',                  'QR / VIN / Plate scan to update stock status',          'dealer',      '📷', true,  100, ARRAY['pro','enterprise'], ARRAY['dealer'], ARRAY['mobile','phase1']),
('one_tap_sale',          'One-Tap Sale',                'Mark vehicle sold in 1 tap from scan/widget',            'dealer',      '⚡', true,  100, ARRAY['pro','enterprise'], ARRAY['dealer'], ARRAY['mobile','phase1']),
('shared_inventory',      'Shared Inventory Network',    'Share stock with other dealers in the network',          'dealer',      '🔗', true,  100, ARRAY['pro','enterprise'], ARRAY['dealer'], ARRAY['collaboration','phase1']),
('vehicle_timeline',      'Vehicle Timeline',            'Full event history per vehicle',                         'dealer',      '⏱', true,  100, '{}', ARRAY['dealer'], ARRAY['core','launch']),
('stock_quantity',        'Multi-Unit Stock Quantity',   'Manage bulk stock quantities per listing',               'dealer',      '📦', true,  100, '{}', ARRAY['dealer'], ARRAY['core','launch']),
('bulk_upload',           'Bulk Vehicle Import',         'Import vehicles from Excel / CSV file',                  'dealer',      '📥', false, 0,   ARRAY['pro','enterprise'], ARRAY['dealer'], ARRAY['efficiency','phase2']),
('crm_module',            'CRM & Lead Management',       'Manage buyer leads and follow-ups',                     'dealer',      '👥', false, 0,   ARRAY['pro','enterprise'], ARRAY['dealer'], ARRAY['crm','phase2']),
('whatsapp_integration',  'WhatsApp Business Integration','Auto-send vehicle info via WhatsApp Business API',      'dealer',      '💚', false, 0,   ARRAY['pro','enterprise'], ARRAY['dealer'], ARRAY['social','phase3']),
('price_intelligence',    'AI Pricing Intelligence',     'Compare prices vs live Dubizzle UAE market data',        'dealer',      '💡', true,  100, ARRAY['pro','enterprise'], ARRAY['dealer'], ARRAY['ai','phase1']),
('export_reports',        'Export Reports (PDF/Excel)',  'Download inventory and sales reports',                   'dealer',      '📤', false, 0,   ARRAY['pro','enterprise'], ARRAY['dealer'], ARRAY['export','phase2']),
('dealer_verification',   'Verified Dealer Badge',       'Display verified badge after KYC completion',            'dealer',      '✅', false, 0,   ARRAY['pro','enterprise'], ARRAY['dealer'], ARRAY['trust','phase2']),

-- ── MOBILE ───────────────────────────────────────────────────────────────────
('ios_widget',            'iOS Home Screen Widget',      'One-tap sale widget for iPhone home/lock screen',        'mobile',      '📱', true,  100, ARRAY['pro','enterprise'], ARRAY['dealer'], ARRAY['mobile','phase1']),
('android_widget',        'Android Home Screen Widget',  'Widget for Android dealers',                             'mobile',      '🤖', false, 0,   ARRAY['pro','enterprise'], ARRAY['dealer'], ARRAY['mobile','phase2']),
('pwa_install',           'Install App Prompt',          'Prompt users to install DubaiAuto as PWA',               'mobile',      '⬇️', false, 0,   '{}', '{}',            ARRAY['mobile','phase2']),
('push_notifications',    'Push Notifications',          'Browser/mobile push for price alerts and messages',      'mobile',      '🔔', false, 0,   '{}', '{}',            ARRAY['mobile','engagement','phase2']),
('nfc_scan',              'NFC Tag Scanning',            'Tap NFC tag on vehicle key to get quick actions',        'mobile',      '📡', false, 0,   ARRAY['enterprise'], ARRAY['dealer'], ARRAY['mobile','phase3']),
('siri_shortcut',         'Siri / Google Assistant',     'Voice command: "Mark Land Cruiser as sold"',             'mobile',      '🎙', false, 0,   ARRAY['enterprise'], ARRAY['dealer'], ARRAY['mobile','phase4']),
('live_activities',       'iOS Live Activities',         'Dynamic Island shows active reservations',               'mobile',      '✨', false, 0,   ARRAY['enterprise'], ARRAY['dealer'], ARRAY['mobile','phase4']),

-- ── BROKER & AFFILIATE ───────────────────────────────────────────────────────
('broker_programme',      'Broker Programme',            'Affiliate broker registration and dashboard',            'broker',      '🤝', true,  100, '{}', '{}',            ARRAY['monetization','phase1']),
('broker_b2b',            'Broker-to-Broker Network',    'Sub-broker referral programme and passive income',       'broker',      '🔄', false, 0,   '{}', ARRAY['broker'], ARRAY['monetization','phase3']),
('dealer_affiliate',      'Dealer Affiliate Programme',  'Dealers earn by referring other dealers',                'broker',      '🏢', true,  100, '{}', ARRAY['dealer'], ARRAY['monetization','phase1']),
('affiliate_marketplace', 'Affiliate Banner in Marketplace','Show referred broker info in marketplace',            'broker',      '🏷', true,  100, '{}', '{}',            ARRAY['monetization','phase1']),

-- ── AI ───────────────────────────────────────────────────────────────────────
('ai_market_intelligence','AI Market Intelligence',      'AI analyses portfolio vs Dubizzle market weekly',        'ai',          '🧠', false, 0,   ARRAY['enterprise'], ARRAY['dealer'], ARRAY['ai','phase3']),
('ai_price_prediction',   'AI Price Prediction',         'Predict best selling price based on historical data',    'ai',          '🔮', false, 0,   ARRAY['enterprise'], ARRAY['dealer'], ARRAY['ai','phase3']),
('ai_auto_detect_sold',   'AI Auto-Detect Sale',         'AI monitors payment signals and auto-marks sold',        'ai',          '🤖', false, 0,   ARRAY['enterprise'], ARRAY['dealer'], ARRAY['ai','phase4']),
('ai_chat_assistant',     'AI Chat Assistant',           'Buyer-facing AI chat to help find the right vehicle',    'ai',          '💬', false, 0,   '{}', '{}',            ARRAY['ai','phase3']),

-- ── SOCIAL & COMMUNITY ───────────────────────────────────────────────────────
('dealer_reviews',        'Dealer Reviews',              'Buyers can rate and review dealers publicly',            'social',      '⭐', false, 0,   '{}', '{}',            ARRAY['trust','phase2']),
('user_profiles',         'Buyer Public Profiles',       'Buyers have a public profile with history',              'social',      '👤', false, 0,   '{}', ARRAY['buyer'],  ARRAY['community','phase3']),
('vehicle_wishlist',      'Vehicle Wishlist',            'Buyers save vehicles to a public or private wishlist',   'social',      '❤️', false, 0,   '{}', ARRAY['buyer'],  ARRAY['engagement','phase2']),
('referral_rewards',      'Buyer Referral Rewards',      'Buyers earn credits for referring friends',              'social',      '🎁', false, 0,   '{}', ARRAY['buyer'],  ARRAY['growth','phase3']),

-- ── PAYMENT & SUBSCRIPTION ───────────────────────────────────────────────────
('subscription_plans',    'SaaS Subscription Plans',     'Free / Pro / Enterprise dealer plans',                  'payment',     '💳', true,  100, '{}', ARRAY['dealer'], ARRAY['monetization','launch']),
('stripe_payments',       'Stripe Payment Gateway',      'Accept card payments for subscriptions',                 'payment',     '💳', false, 0,   '{}', ARRAY['dealer'], ARRAY['payment','phase2']),
('tabby_bnpl',            'Tabby Buy Now Pay Later',     'Split subscription cost over 4 payments',               'payment',     '📅', false, 0,   '{}', ARRAY['dealer'], ARRAY['payment','phase3']),
('coupon_system',         'Coupon & Promo Codes',        'Admin creates discount codes for subscriptions',         'payment',     '🎟', true,  100, '{}', ARRAY['admin'],  ARRAY['monetization','phase1']),

-- ── ADMIN ────────────────────────────────────────────────────────────────────
('admin_analytics',       'Admin Analytics Dashboard',   'Platform-wide stats for super admin',                   'admin',       '📊', true,  100, '{}', ARRAY['admin'],  ARRAY['admin','launch']),
('feature_flags_admin',   'Feature Flag Manager',        'This feature flags control panel',                       'admin',       '🚩', true,  100, '{}', ARRAY['admin'],  ARRAY['admin','launch']),
('audit_logs',            'Audit Logs',                  'Full audit trail of all admin actions',                  'admin',       '📋', false, 0,   '{}', ARRAY['admin'],  ARRAY['admin','phase2'])

ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- DEALER WEEKLY AI REPORTS
-- ============================================================

CREATE TABLE IF NOT EXISTS dealer_reports (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  dealer_id     TEXT REFERENCES dealers(id) ON DELETE CASCADE,
  report_type   VARCHAR(30) DEFAULT 'weekly',
  week_start    DATE NOT NULL,
  week_end      DATE NOT NULL,
  status        VARCHAR(20) DEFAULT 'generating',
  -- 'generating'|'ready'|'error'
  -- Core metrics snapshot
  total_units         INT DEFAULT 0,
  available_units     INT DEFAULT 0,
  sold_this_week      INT DEFAULT 0,
  total_views         INT DEFAULT 0,
  avg_price_aed       DECIMAL(12,2),
  -- Competitive analysis
  market_avg_price    DECIMAL(12,2),
  price_position      VARCHAR(20), -- 'above_market'|'at_market'|'below_market'
  price_diff_pct      DECIMAL(5,2),
  -- AI generated content
  ai_summary          TEXT,
  ai_recommendations  JSONB DEFAULT '[]',
  ai_alerts           JSONB DEFAULT '[]',
  market_data         JSONB DEFAULT '{}',
  competitor_data     JSONB DEFAULT '[]',
  -- Meta
  generated_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dealer_reports_dealer ON dealer_reports(dealer_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_dealer_reports_status ON dealer_reports(status);


-- ============================================================
-- FEATURE 1 — AI MARKET VALUATION ENGINE
-- ============================================================

CREATE TABLE IF NOT EXISTS vehicle_valuations (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id      TEXT REFERENCES vehicles(id) ON DELETE CASCADE,
  make            VARCHAR(100) NOT NULL,
  model           VARCHAR(100) NOT NULL,
  year            SMALLINT NOT NULL,
  trim            VARCHAR(100),
  mileage_km      INT DEFAULT 0,
  -- Core valuation
  estimated_value_aed   DECIMAL(12,2) NOT NULL,
  value_min_aed         DECIMAL(12,2),
  value_max_aed         DECIMAL(12,2),
  confidence_score      SMALLINT DEFAULT 85,  -- 0-100
  deal_rating           VARCHAR(20),
  -- 'excellent_deal'|'good_deal'|'fair_price'|'above_market'|'overpriced'
  deal_score            SMALLINT,             -- 0-100 (100=best deal)
  -- Market metrics
  market_demand         VARCHAR(20),
  -- 'very_high'|'high'|'medium'|'low'|'very_low'
  demand_score          SMALLINT,
  avg_days_to_sell      SMALLINT,
  price_trend_pct       DECIMAL(5,2),         -- monthly % change
  price_trend_direction VARCHAR(10),          -- 'rising'|'stable'|'falling'
  -- Composite scores
  market_score          SMALLINT,             -- 0-100 overall market health
  investment_score      SMALLINT,             -- 0-100 investment potential
  dealer_confidence     SMALLINT,             -- 0-100 dealer trust for this listing
  export_score          SMALLINT,             -- 0-100 export attractiveness
  -- Comparables used
  comparable_count      SMALLINT DEFAULT 0,
  comparable_sources    TEXT[],               -- ['dubizzle','dubicars','carswitch']
  -- AI reasoning
  ai_reasoning          TEXT,
  ai_strengths          JSONB DEFAULT '[]',
  ai_risks              JSONB DEFAULT '[]',
  -- Meta
  computed_at           TIMESTAMPTZ DEFAULT NOW(),
  expires_at            TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  is_stale              BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_valuations_vehicle ON vehicle_valuations(vehicle_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_valuations_make_model ON vehicle_valuations(make, model, year);
CREATE INDEX IF NOT EXISTS idx_valuations_expires ON vehicle_valuations(expires_at);

-- Valuation config (admin controls)
CREATE TABLE IF NOT EXISTS valuation_config (
  id              TEXT PRIMARY KEY DEFAULT 'default',
  -- Weight factors (must sum to 1.0)
  weight_mileage          DECIMAL(4,3) DEFAULT 0.20,
  weight_year             DECIMAL(4,3) DEFAULT 0.15,
  weight_market_demand    DECIMAL(4,3) DEFAULT 0.25,
  weight_comparable_sales DECIMAL(4,3) DEFAULT 0.30,
  weight_condition        DECIMAL(4,3) DEFAULT 0.10,
  -- Depreciation curves
  depreciation_year1      DECIMAL(4,3) DEFAULT 0.15,
  depreciation_year2      DECIMAL(4,3) DEFAULT 0.12,
  depreciation_year3      DECIMAL(4,3) DEFAULT 0.10,
  depreciation_year4plus  DECIMAL(4,3) DEFAULT 0.08,
  -- Mileage penalty (per 10,000 km above baseline)
  mileage_baseline_km     INT DEFAULT 15000,
  mileage_penalty_pct     DECIMAL(4,3) DEFAULT 0.02,
  -- Deal threshold
  excellent_deal_below    DECIMAL(4,3) DEFAULT 0.88,  -- <88% of market = excellent
  good_deal_below         DECIMAL(4,3) DEFAULT 0.95,  -- <95% = good deal
  fair_price_below        DECIMAL(4,3) DEFAULT 1.05,  -- <105% = fair
  above_market_below      DECIMAL(4,3) DEFAULT 1.15,  -- <115% = above market
  -- Active currencies and countries
  active_currencies       TEXT[] DEFAULT ARRAY['AED','USD','EUR','GBP','NGN'],
  active_countries        TEXT[] DEFAULT ARRAY['UAE','Nigeria','Ghana','Kenya','UK','France'],
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO valuation_config (id) VALUES ('default') ON CONFLICT DO NOTHING;

-- Market price history for trend analysis
CREATE TABLE IF NOT EXISTS market_price_history (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  make        VARCHAR(100) NOT NULL,
  model       VARCHAR(100) NOT NULL,
  year        SMALLINT NOT NULL,
  avg_price   DECIMAL(12,2) NOT NULL,
  min_price   DECIMAL(12,2),
  max_price   DECIMAL(12,2),
  listing_count INT DEFAULT 0,
  source      VARCHAR(30) DEFAULT 'dubizzle',
  recorded_at DATE DEFAULT CURRENT_DATE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_market_price_uniq ON market_price_history(make, model, year, source, recorded_at);


-- ============================================================
-- FEATURE 3 — SMART ALERTS
-- ============================================================

CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id         TEXT,
  email           VARCHAR(200) NOT NULL,
  phone           VARCHAR(50),
  alert_type      VARCHAR(30) NOT NULL,
  -- 'price_drop'|'new_vehicle'|'dealer_update'|'brand'|'model'|'availability'|'export_deal'
  filters         JSONB DEFAULT '{}',
  -- {make, model, year_min, year_max, price_max, body_type, export_eligible, dealer_id}
  channel         TEXT[] DEFAULT ARRAY['email'],
  -- 'email'|'push'|'whatsapp'
  is_active       BOOLEAN DEFAULT TRUE,
  last_triggered  TIMESTAMPTZ,
  trigger_count   INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_email ON alert_subscriptions(email, is_active);
CREATE INDEX IF NOT EXISTS idx_alerts_type  ON alert_subscriptions(alert_type, is_active);

CREATE TABLE IF NOT EXISTS alert_notifications (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  alert_id        TEXT REFERENCES alert_subscriptions(id) ON DELETE CASCADE,
  vehicle_id      TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  title           VARCHAR(200) NOT NULL,
  message         TEXT,
  channel         VARCHAR(20) DEFAULT 'email',
  status          VARCHAR(20) DEFAULT 'pending',
  -- 'pending'|'sent'|'failed'
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AI MARKET ANALYSIS — Dubizzle / DubiCars competitor intelligence
-- Admin-configurable, AI-refreshed, real-data backed
-- ============================================================

-- Admin-controlled configuration: which sources, which models to track, refresh cadence
CREATE TABLE IF NOT EXISTS market_analysis_config (
  id                    TEXT PRIMARY KEY DEFAULT 'default',
  enabled               BOOLEAN DEFAULT TRUE,
  sources               JSONB DEFAULT '["dubizzle","dubicars"]'::jsonb,
  -- which platforms the AI is instructed to search/compare
  auto_refresh_enabled  BOOLEAN DEFAULT TRUE,
  refresh_interval_hours INT DEFAULT 24,
  -- minimum data confidence before AI will overwrite an existing benchmark
  min_confidence_pct    INT DEFAULT 60,
  tracked_models        JSONB DEFAULT '[]'::jsonb,
  -- [{make, model, year_range:[min,max]}] — admin curates which vehicles to track
  last_refreshed_at     TIMESTAMPTZ,
  last_refresh_status   VARCHAR(20) DEFAULT 'never_run',
  -- 'never_run' | 'running' | 'success' | 'partial' | 'failed'
  last_refresh_summary  TEXT,
  ai_model              VARCHAR(50) DEFAULT 'claude-sonnet-4-6',
  updated_by            VARCHAR(100),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO market_analysis_config (id, tracked_models) VALUES (
  'default',
  '[
    {"make":"Toyota","model":"Land Cruiser","year_range":[2020,2026]},
    {"make":"Toyota","model":"Prado","year_range":[2022,2024]},
    {"make":"Toyota","model":"Hilux","year_range":[2023,2025]},
    {"make":"Toyota","model":"Fortuner","year_range":[2024,2025]},
    {"make":"Toyota","model":"Camry","year_range":[2025,2025]},
    {"make":"Nissan","model":"Patrol","year_range":[2021,2025]},
    {"make":"Mercedes-Benz","model":"G-Class","year_range":[2024,2025]},
    {"make":"Mercedes-Benz","model":"GLE","year_range":[2024,2024]},
    {"make":"BMW","model":"X5","year_range":[2025,2025]},
    {"make":"Ford","model":"F-150","year_range":[2025,2025]},
    {"make":"BYD","model":"Atto 3","year_range":[2025,2025]},
    {"make":"Tesla","model":"Model Y","year_range":[2025,2025]},
    {"make":"Lexus","model":"LX 600","year_range":[2024,2024]}
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- The actual competitor benchmark data — this REPLACES the hardcoded MARKET_DATA object.
-- Populated by the AI refresh job, readable by valuation/reports/pricing modules.
CREATE TABLE IF NOT EXISTS market_competitor_data (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  make            VARCHAR(100) NOT NULL,
  model           VARCHAR(100) NOT NULL,
  year            SMALLINT NOT NULL,
  source          VARCHAR(30) NOT NULL,         -- 'dubizzle' | 'dubicars'
  avg_price_aed   DECIMAL(12,2) NOT NULL,
  min_price_aed   DECIMAL(12,2),
  max_price_aed   DECIMAL(12,2),
  listing_count   INT DEFAULT 0,
  avg_days_listed INT,
  demand_level    VARCHAR(20),                  -- 'very_high'|'high'|'medium'|'low'
  trend_pct       DECIMAL(5,2),                 -- monthly % price movement
  confidence_pct  INT DEFAULT 70,                -- AI's self-rated confidence in this data point
  source_url      TEXT,
  raw_ai_notes    TEXT,
  fetched_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  is_active       BOOLEAN DEFAULT TRUE,
  CONSTRAINT make_model_year_source UNIQUE (make, model, year, source)
);

CREATE INDEX IF NOT EXISTS idx_market_competitor_lookup
  ON market_competitor_data(make, model, year);
CREATE INDEX IF NOT EXISTS idx_market_competitor_expiry
  ON market_competitor_data(expires_at) WHERE is_active = true;

-- Audit log of every AI refresh run — visible to admin
CREATE TABLE IF NOT EXISTS market_analysis_runs (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  triggered_by     VARCHAR(100),                -- 'admin' | 'scheduler' | 'system'
  status           VARCHAR(20) DEFAULT 'running',
  models_requested INT DEFAULT 0,
  models_updated   INT DEFAULT 0,
  models_failed    INT DEFAULT 0,
  sources_used     JSONB DEFAULT '[]'::jsonb,
  summary          TEXT,
  error_detail     TEXT,
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_market_runs_started ON market_analysis_runs(started_at DESC);

-- ============================================================
-- VEHICLE RESERVATIONS — Broker booking system (24h expiry)
-- ============================================================

CREATE TABLE IF NOT EXISTS vehicle_reservations (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id           TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  dealer_id            TEXT NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  broker_id            TEXT,
  -- FK to brokers(id) added in 05_brokers.sql, since brokers table is created after this file
  reserved_by_name     VARCHAR(150),
  reserved_by_contact  VARCHAR(150),
  status               VARCHAR(20) DEFAULT 'active',
  -- 'active' | 'expired' | 'cancelled' | 'converted'
  note                 TEXT,
  expires_at           TIMESTAMPTZ NOT NULL,
  cancelled_at         TIMESTAMPTZ,
  converted_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_vehicle ON vehicle_reservations(vehicle_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_dealer   ON vehicle_reservations(dealer_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_broker    ON vehicle_reservations(broker_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_expiry    ON vehicle_reservations(expires_at) WHERE status = 'active';

-- ============================================================
-- ACTIVE SESSIONS — Live presence tracking for marketplace
-- ============================================================

CREATE TABLE IF NOT EXISTS active_sessions (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_token   TEXT UNIQUE NOT NULL,
  profile_type    VARCHAR(20) NOT NULL,
  -- 'broker' | 'dealer' | 'buyer' | 'admin'
  profile_id      TEXT,
  display_name    VARCHAR(150) NOT NULL,
  avatar_label    VARCHAR(10),
  email           VARCHAR(200),
  current_page    TEXT,
  last_seen_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_type_seen ON active_sessions(profile_type, last_seen_at);
