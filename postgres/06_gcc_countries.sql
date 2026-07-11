-- 06_gcc_countries.sql
-- Seeds the 6 GCC countries and their real free/economic zones, replacing the
-- previous hardcoded UAE-only zones list that lived in application code
-- (dealers.controller.ts getZones()). Existing dealers are NOT auto-assigned
-- a country here — see the backfill note at the bottom.

INSERT INTO countries (id, code, name, name_ar, currency_code, phone_prefix, vat_rate, is_active) VALUES
  ('country_ae', 'AE', 'United Arab Emirates', 'الإمارات العربية المتحدة', 'AED', '+971', 0.05, true),
  ('country_sa', 'SA', 'Saudi Arabia',         'المملكة العربية السعودية', 'SAR', '+966', 0.15, true),
  ('country_qa', 'QA', 'Qatar',                'قطر',                      'QAR', '+974', 0.00, true),
  ('country_bh', 'BH', 'Bahrain',               'البحرين',                  'BHD', '+973', 0.10, true),
  ('country_kw', 'KW', 'Kuwait',                'الكويت',                   'KWD', '+965', 0.00, true),
  ('country_om', 'OM', 'Oman',                  'عُمان',                    'OMR', '+968', 0.05, true)
ON CONFLICT (code) DO UPDATE SET vat_rate = EXCLUDED.vat_rate;

-- ── United Arab Emirates ────────────────────────────────────────────────────
INSERT INTO free_zones (id, country_id, name, code, city, is_active) VALUES
  ('fz_ae_jafza',   'country_ae', 'Jebel Ali Free Zone (JAFZA)',              'jafza',   'Dubai',        true),
  ('fz_ae_dmcc',    'country_ae', 'Dubai Multi Commodities Centre (DMCC)',    'dmcc',    'Dubai',        true),
  ('fz_ae_dafza',   'country_ae', 'Dubai Airport Free Zone (DAFZA)',          'dafza',   'Dubai',        true),
  ('fz_ae_ducamz',  'country_ae', 'Dubai Car and Automotive Zone (DUCAMZ)',   'ducamz',  'Dubai',        true),
  ('fz_ae_saif',    'country_ae', 'Sharjah Airport International Free Zone', 'saif',    'Sharjah',      true),
  ('fz_ae_hamriyah','country_ae', 'Hamriyah Free Zone',                      'hamriyah','Sharjah',      true),
  ('fz_ae_ajman',   'country_ae', 'Ajman Free Zone',                          'ajman',   'Ajman',        true),
  ('fz_ae_rakez',   'country_ae', 'RAK Economic Zone (RAKEZ)',                'rakez',   'Ras Al Khaimah', true),
  ('fz_ae_fujairah','country_ae', 'Fujairah Free Zone',                      'fujairah','Fujairah',     true),
  ('fz_ae_kizad',   'country_ae', 'Khalifa Industrial Zone Abu Dhabi (KIZAD)','kizad',   'Abu Dhabi',    true)
ON CONFLICT (country_id, code) DO NOTHING;

-- ── Saudi Arabia (Special Economic Zones) ───────────────────────────────────
INSERT INTO free_zones (id, country_id, name, code, city, is_active) VALUES
  ('fz_sa_kaec',   'country_sa', 'King Abdullah Economic City (KAEC)',        'kaec',   'Rabigh',  true),
  ('fz_sa_silz',   'country_sa', 'Special Integrated Logistics Zone (SILZ)',  'silz',   'Riyadh',  true),
  ('fz_sa_jazan',  'country_sa', 'Jazan Economic City',                       'jazan',  'Jazan',   true),
  ('fz_sa_raskhair','country_sa','Ras Al-Khair Special Economic Zone',        'raskhair','Ras Al-Khair', true)
ON CONFLICT (country_id, code) DO NOTHING;

-- ── Qatar ────────────────────────────────────────────────────────────────────
INSERT INTO free_zones (id, country_id, name, code, city, is_active) VALUES
  ('fz_qa_rasbufontas', 'country_qa', 'Ras Bufontas Free Zone', 'ras-bufontas', 'Doha', true),
  ('fz_qa_umalhoul',    'country_qa', 'Umm Alhoul Free Zone',   'umm-alhoul',   'Doha', true)
ON CONFLICT (country_id, code) DO NOTHING;

-- ── Bahrain ──────────────────────────────────────────────────────────────────
INSERT INTO free_zones (id, country_id, name, code, city, is_active) VALUES
  ('fz_bh_blz',  'country_bh', 'Bahrain Logistics Zone (BLZ)',            'blz',  'Manama', true),
  ('fz_bh_biip', 'country_bh', 'Bahrain International Investment Park',  'biip', 'Manama', true)
ON CONFLICT (country_id, code) DO NOTHING;

-- ── Kuwait ───────────────────────────────────────────────────────────────────
INSERT INTO free_zones (id, country_id, name, code, city, is_active) VALUES
  ('fz_kw_kftz', 'country_kw', 'Kuwait Free Trade Zone (KFTZ)', 'kftz', 'Shuwaikh', true)
ON CONFLICT (country_id, code) DO NOTHING;

-- ── Oman ─────────────────────────────────────────────────────────────────────
INSERT INTO free_zones (id, country_id, name, code, city, is_active) VALUES
  ('fz_om_salalah', 'country_om', 'Salalah Free Zone',                    'salalah', 'Salalah', true),
  ('fz_om_sohar',   'country_om', 'Sohar Free Zone',                      'sohar',   'Sohar',   true),
  ('fz_om_duqm',    'country_om', 'Duqm Special Economic Zone (SEZAD)',   'duqm',    'Duqm',    true),
  ('fz_om_almazunah','country_om','Al Mazunah Free Zone',                 'al-mazunah','Salalah', true)
ON CONFLICT (country_id, code) DO NOTHING;

-- ── Backfill existing dealers to UAE ────────────────────────────────────────
-- Every dealer created before this migration was implicitly UAE-only (the
-- whole platform was UAE-only until now). Assign them explicitly so existing
-- country-filtered queries/dashboards don't silently drop them.
UPDATE dealers SET country_id = 'country_ae' WHERE country_id IS NULL;
UPDATE brokers SET country_id = 'country_ae' WHERE country_id IS NULL AND country IS NULL;
