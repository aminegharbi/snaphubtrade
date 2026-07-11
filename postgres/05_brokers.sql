-- ============================================================
-- BROKER & AFFILIATE SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS brokers (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
  full_name       VARCHAR(200) NOT NULL,
  email           VARCHAR(200) UNIQUE NOT NULL,
  phone           VARCHAR(50),
  whatsapp        VARCHAR(50),
  company_name    VARCHAR(200),
  broker_type     VARCHAR(30) DEFAULT 'independent',
  -- 'independent'|'intermediary'|'dealer_affiliate'|'export_agent'
  affiliate_code  VARCHAR(20) UNIQUE NOT NULL,
  tier            VARCHAR(20) DEFAULT 'Starter',
  -- 'Starter'|'Active'|'Pro'|'Elite'
  commission_rate DECIMAL(4,3) DEFAULT 0.015, -- 1.5%
  status          VARCHAR(20) DEFAULT 'pending',
  -- 'pending'|'active'|'suspended'
  country         VARCHAR(100),
  city            VARCHAR(100),
  languages       TEXT[],
  specialties     TEXT[],
  referred_by     TEXT REFERENCES brokers(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broker_deals (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  broker_id       TEXT REFERENCES brokers(id) ON DELETE CASCADE,
  dealer_id       TEXT REFERENCES dealers(id) ON DELETE CASCADE,
  vehicle_id      TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  buyer_name      VARCHAR(200),
  buyer_country   VARCHAR(100),
  deal_price_aed  DECIMAL(12,2) NOT NULL,
  commission_rate DECIMAL(4,3) NOT NULL,
  commission_aed  DECIMAL(10,2) NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending',
  -- 'pending'|'processing'|'paid'|'cancelled'
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broker_referrals (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  broker_id       TEXT REFERENCES brokers(id) ON DELETE CASCADE,
  referred_type   VARCHAR(20) NOT NULL, -- 'broker'|'dealer'|'buyer'
  referred_id     TEXT,   -- broker.id | dealer.id
  referral_code   VARCHAR(20),
  reward_aed      DECIMAL(10,2) DEFAULT 0,
  recurring_pct   DECIMAL(4,3) DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broker_deals_dealer ON broker_deals(dealer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broker_deals_broker ON broker_deals(broker_id, created_at DESC);

-- ─── Seed broker data ─────────────────────────────────────────────────────────

-- Demo broker user account (Password: Admin@Dubai2024, same hash as other demo accounts)
-- This links to broker-001 below so the broker demo login on /login actually works.
INSERT INTO users (id, email, password_hash, full_name, role, phone, whatsapp, email_verified)
VALUES (
  'broker-user-001',
  'ahmed@dubaiauto.ae',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu',
  'Ahmed Al Mansouri',
  'broker',
  '+971501234567', '+971501234567',
  true
) ON CONFLICT (email) DO NOTHING;

INSERT INTO brokers (id, full_name, email, phone, whatsapp, company_name, broker_type, affiliate_code, tier, commission_rate, status, country, city, languages, specialties) VALUES
('broker-001', 'Ahmed Al Mansouri',   'ahmed@dubaiauto.ae',   '+971501234567', '+971501234567', NULL,                    'independent',      'AHMED-X7K2', 'Pro',     0.025, 'active', 'UAE',        'Dubai',   ARRAY['Arabic','English'],              ARRAY['SUV & 4x4','Export / Africa','Luxury & Supercar']),
('broker-002', 'Ibrahim Yusuf',       'ibrahim@broker.ng',    '+2348012345678','+2348012345678','IbrahimAuto Ltd',       'export_agent',     'IBRA-9MK3',  'Active',  0.020, 'active', 'Nigeria',    'Lagos',   ARRAY['Hausa','English'],               ARRAY['Export / Africa','Pickup Trucks','SUV & 4x4']),
('broker-003', 'Emmanuel Obi',        'emmanuel@carsng.com',  '+2348098765432','+2348098765432','CarSales Nigeria',      'intermediary',     'EMMA-5KR1',  'Starter', 0.015, 'active', 'Nigeria',    'Abuja',   ARRAY['English','Hausa'],               ARRAY['Export / Africa','SUV & 4x4']),
('broker-004', 'Chen Wei',            'chen@autoasia.com',    '+8613912345678','+8613912345678','Asia Auto Partners',    'export_agent',     'CHEN-7NX4',  'Pro',     0.025, 'active', 'China',      'Shanghai',ARRAY['Chinese','English'],             ARRAY['Electric Vehicles','Export / Asia','Luxury & Supercar']),
('broker-005', 'Fatima Al Zahra',     'fatima@broker.ma',     '+212612345678', '+212612345678', NULL,                   'independent',      'FATI-2PL8',  'Active',  0.020, 'active', 'Morocco',    'Casablanca',ARRAY['Arabic','French'],             ARRAY['Luxury & Supercar','Sedan']),
('broker-006', 'James Okafor',        'james@nigeriaexport.com','+2349012345678','+2349012345678','Nigeria Export Auto','export_agent',     'JAME-3LK9',  'Elite',   0.030, 'active', 'Nigeria',    'Lagos',   ARRAY['English','Yoruba'],              ARRAY['Export / Africa','Pickup Trucks','Commercial Vans']),
('broker-007', 'Rajesh Sharma',       'rajesh@indiacar.in',   '+919812345678', '+919812345678', 'India Car Imports',    'dealer_affiliate', 'RAJE-6MP2',  'Active',  0.020, 'active', 'India',      'Mumbai',  ARRAY['Hindi','English'],               ARRAY['Export / Asia','SUV & 4x4']),
('broker-008', 'Moussa Diallo',       'moussa@westafricaauto.com','+22376123456','+22376123456','West Africa Auto',    'export_agent',     'MOUS-8QR5',  'Pro',     0.025, 'active', 'Senegal',    'Dakar',   ARRAY['French','Wolof','English'],      ARRAY['Export / Africa','Pickup Trucks','SUV & 4x4'])
ON CONFLICT DO NOTHING;

-- Link the demo broker to its User account so /login → broker dashboard works end-to-end
UPDATE brokers SET user_id = 'broker-user-001' WHERE id = 'broker-001' AND user_id IS NULL;

-- Seed broker_deals with real deals linked to our dealers and vehicles
INSERT INTO broker_deals (broker_id, dealer_id, vehicle_id, buyer_name, buyer_country, deal_price_aed, commission_rate, commission_aed, status, paid_at) VALUES
-- Ahmed deals (Pro broker)
('broker-001','dealer-jafza-001', NULL, 'Emeka Okonkwo',    'Nigeria',      228000, 0.025, 5700,  'paid',       NOW() - INTERVAL '5 days'),
('broker-001','dealer-dubai-003', NULL, 'Kwame Asante',     'Ghana',        298000, 0.025, 7450,  'paid',       NOW() - INTERVAL '12 days'),
('broker-001','dealer-dubai-007', NULL, 'Mohamed Hassan',   'Kenya',        88000,  0.025, 2200,  'paid',       NOW() - INTERVAL '18 days'),
('broker-001','dealer-dubai-008', NULL, 'Tariq Al Farsi',   'UAE',          695000, 0.025, 17375, 'pending',    NULL),
('broker-001','dealer-dubai-011', NULL, 'Li Wei',           'China',        112000, 0.025, 2800,  'processing', NULL),

-- Ibrahim deals (Active broker, Nigeria)
('broker-002','dealer-jafza-001', NULL, 'Chidi Okeke',      'Nigeria',      228000, 0.020, 4560,  'paid',       NOW() - INTERVAL '8 days'),
('broker-002','dealer-dubai-007', NULL, 'Biodun Adeyemi',   'Nigeria',      92000,  0.020, 1840,  'paid',       NOW() - INTERVAL '15 days'),
('broker-002','dealer-jafza-001', NULL, 'Femi Adeleke',     'Nigeria',      128000, 0.020, 2560,  'pending',    NULL),

-- James deals (Elite broker - top performer)
('broker-006','dealer-dubai-007', NULL, 'Segun Bakare',     'Nigeria',      128000, 0.030, 3840,  'paid',       NOW() - INTERVAL '3 days'),
('broker-006','dealer-jafza-001', NULL, 'Tunde Fashola',    'Nigeria',      228000, 0.030, 6840,  'paid',       NOW() - INTERVAL '7 days'),
('broker-006','dealer-sharjah-005',NULL,'Nnamdi Obi',       'Nigeria',      92000,  0.030, 2760,  'paid',       NOW() - INTERVAL '10 days'),
('broker-006','dealer-dubai-012', NULL, 'Akin Williams',    'Nigeria',      88000,  0.030, 2640,  'paid',       NOW() - INTERVAL '14 days'),
('broker-006','dealer-jafza-002', NULL, 'Dele Momodu',      'Nigeria',      112000, 0.030, 3360,  'pending',    NULL),

-- Chen deals (Asia/EV specialist)
('broker-004','dealer-dubai-011', NULL, 'Zhang Wei',        'China',        165000, 0.025, 4125,  'paid',       NOW() - INTERVAL '6 days'),
('broker-004','dealer-dubai-011', NULL, 'Wang Fang',        'China',        112000, 0.025, 2800,  'paid',       NOW() - INTERVAL '11 days'),
('broker-004','dealer-dubai-004', NULL, 'Kim Park',         'South Korea',  348000, 0.025, 8700,  'pending',    NULL),

-- Emmanuel deals (Starter)
('broker-003','dealer-dubai-003', NULL, 'Emeka Nwosu',      'Nigeria',      198000, 0.015, 2970,  'paid',       NOW() - INTERVAL '9 days'),
('broker-003','dealer-sharjah-001',NULL,'Amaka Eze',        'Nigeria',      78000,  0.015, 1170,  'paid',       NOW() - INTERVAL '20 days'),

-- Moussa deals (West Africa)
('broker-008','dealer-jafza-001', NULL, 'Amadou Diallo',    'Senegal',      228000, 0.025, 5700,  'paid',       NOW() - INTERVAL '4 days'),
('broker-008','dealer-dubai-007', NULL, 'Oumar Ba',         'Senegal',      88000,  0.025, 2200,  'paid',       NOW() - INTERVAL '13 days'),
('broker-008','dealer-sharjah-005',NULL,'Ibrahima Sow',     'Guinea',       62000,  0.025, 1550,  'processing', NULL),

-- Demo dealer (dealer-001) — ensures the dashboard demo always shows broker activity
('broker-001','dealer-001', NULL, 'Yusuf Bello',       'Nigeria',      215000, 0.025, 5375,  'paid',       NOW() - INTERVAL '2 days'),
('broker-006','dealer-001', NULL, 'Grace Mensah',      'Ghana',        142000, 0.030, 4260,  'paid',       NOW() - INTERVAL '6 days'),
('broker-002','dealer-001', NULL, 'Daniel Owusu',      'Ghana',        98000,  0.020, 1960,  'pending',    NULL),
('broker-004','dealer-001', NULL, 'Li Na',             'China',        176000, 0.025, 4400,  'paid',       NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;


-- ============================================================
-- Deferred FK: vehicle_reservations.broker_id → brokers.id
-- (added here because brokers table doesn't exist until this file runs)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_reservations_broker'
      AND table_name = 'vehicle_reservations'
  ) THEN
    ALTER TABLE vehicle_reservations
      ADD CONSTRAINT fk_reservations_broker
      FOREIGN KEY (broker_id) REFERENCES brokers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Seed a demo reservation on whichever dealer has available stock, so the
-- feature is visible immediately regardless of how the demo dealer is seeded
INSERT INTO vehicle_reservations (vehicle_id, dealer_id, broker_id, reserved_by_name, reserved_by_contact, status, expires_at)
SELECT v.id, v.dealer_id, 'broker-001', 'Yusuf Bello', '+2348012345678', 'active', NOW() + INTERVAL '24 hours'
FROM vehicles v WHERE v.status = 'available'
ORDER BY v.created_at DESC LIMIT 1
ON CONFLICT DO NOTHING;

UPDATE vehicles SET status = 'reserved'
WHERE id = (
  SELECT vehicle_id FROM vehicle_reservations
  WHERE status = 'active'
  ORDER BY created_at DESC LIMIT 1
);

-- ============================================================
-- Deferred FK: notifications.broker_id → brokers.id
-- (added here because brokers table doesn't exist until this file runs)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_notifications_broker'
      AND table_name = 'notifications'
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT fk_notifications_broker
      FOREIGN KEY (broker_id) REFERENCES brokers(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_notifications_recipient'
      AND table_name = 'notifications'
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT chk_notifications_recipient
      CHECK (dealer_id IS NOT NULL OR broker_id IS NOT NULL);
  END IF;
END $$;

-- Seed a demo notification for the broker who holds the demo reservation,
-- so the broker dashboard notification bell has something to show immediately
INSERT INTO notifications (broker_id, type, category, title, body, data)
SELECT r.broker_id, 'reservation_created', 'reservation',
  '🔖 Reservation confirmed', 'Your 24h hold on this vehicle is active.',
  jsonb_build_object('reservation_id', r.id, 'vehicle_id', r.vehicle_id)
FROM vehicle_reservations r WHERE r.status = 'active'
ORDER BY r.created_at DESC LIMIT 1
ON CONFLICT DO NOTHING;
