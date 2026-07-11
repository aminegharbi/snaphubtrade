-- ============================================================
-- DubaiAuto — UAE Dealers Dataset
-- Dubai Free Zone, Jebel Ali Free Zone (JAFZA), Sharjah
-- ============================================================

-- ─── Helper: create dealer user + dealer profile ──────────────────────────────

-- ─── DUBAI FREE ZONE DEALERS ──────────────────────────────────────────────────

INSERT INTO users (id, email, password_hash, full_name, role, phone, whatsapp, email_verified) VALUES
('du-user-001','info@alnabooda.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Al Nabooda Automobiles','dealer','+97143408000','+97143408000',true),
('du-user-002','sales@alhabtoor.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Al Habtoor Motors','dealer','+97143242000','+97143242000',true),
('du-user-003','cars@alain.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Al Ain Class Automobiles','dealer','+97142663555','+97142663555',true),
('du-user-004','info@agmc.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','AGMC BMW','dealer','+97143430000','+97143430000',true),
('du-user-005','export@manheim.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Manheim Middle East','dealer','+97148118000','+97148118000',true),
('du-user-006','info@alfardan.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Al Fardan Automobiles','dealer','+97144558555','+97144558555',true),
('du-user-007','sales@premiummotors.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Premier Motors Dubai','dealer','+971501234789','+971501234789',true),
('du-user-008','export@gargash.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Gargash Enterprises','dealer','+97143377777','+97143377777',true),
('du-user-009','cars@alrostamani.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Al Rostamani Automobiles','dealer','+97142954444','+97142954444',true),
('du-user-010','info@emiratesmotors.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Emirates Motors','dealer','+97142822000','+97142822000',true),
('du-user-011','sales@autozone.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','AutoZone Dubai','dealer','+971554123456','+971554123456',true),
('du-user-012','info@dubaiexportcars.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Dubai Export Cars','dealer','+971505678901','+971505678901',true),
('du-user-013','trading@almasaood.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Al Masaood Automobiles','dealer','+97126214444','+97126214444',true),
('du-user-014','info@luxurywheels.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Luxury Wheels Dubai','dealer','+971558901234','+971558901234',true),
('du-user-015','sales@cars4export.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Cars4Export DMCC','dealer','+971506789012','+971506789012',true)
ON CONFLICT (email) DO NOTHING;

-- ─── JAFZA DEALERS ────────────────────────────────────────────────────────────

INSERT INTO users (id, email, password_hash, full_name, role, phone, whatsapp, email_verified) VALUES
('ja-user-001','export@jafzaauto.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','JAFZA Auto Export','dealer','+97148836000','+97148836000',true),
('ja-user-002','info@gulfjapanauto.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Gulf Japan Auto Trading','dealer','+971554987654','+971554987654',true),
('ja-user-003','sales@arabianstars.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Arabian Stars Auto','dealer','+971507654321','+971507654321',true),
('ja-user-004','cars@mideastexport.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Mid East Auto Export','dealer','+97148812345','+97148812345',true),
('ja-user-005','info@pacificmotors.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Pacific Motors JAFZA','dealer','+971502345678','+971502345678',true),
('ja-user-006','trading@alwafaauto.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Al Wafa Auto Trading','dealer','+97148833444','+97148833444',true),
('ja-user-007','info@continentalauto.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Continental Auto JAFZA','dealer','+971555432198','+971555432198',true),
('ja-user-008','export@triangleauto.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Triangle Auto Export','dealer','+971508765432','+971508765432',true),
('ja-user-009','info@globalcarstrading.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Global Cars Trading LLC','dealer','+97148845678','+97148845678',true),
('ja-user-010','sales@desertauto.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Desert Auto Export JAFZA','dealer','+971503456789','+971503456789',true)
ON CONFLICT (email) DO NOTHING;

-- ─── SHARJAH DEALERS ──────────────────────────────────────────────────────────

INSERT INTO users (id, email, password_hash, full_name, role, phone, whatsapp, email_verified) VALUES
('sh-user-001','info@sharjahautomall.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Sharjah Auto Mall','dealer','+97165000000','+97165000000',true),
('sh-user-002','cars@almajidauto.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Al Majid Motors Sharjah','dealer','+97165444333','+97165444333',true),
('sh-user-003','sales@gulfline.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Gulf Line Auto Trading','dealer','+971556789012','+971556789012',true),
('sh-user-004','export@alhamraiauto.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Al Hamraia Auto Sharjah','dealer','+97165678901','+97165678901',true),
('sh-user-005','info@shjauto.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','SHJ Auto Export','dealer','+971504567890','+971504567890',true),
('sh-user-006','trading@alkhail.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Al Khail Motors','dealer','+97165345678','+97165345678',true),
('sh-user-007','cars@shindaghaexport.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Shindagha Export Cars','dealer','+971557890123','+971557890123',true),
('sh-user-008','info@nasserauto.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Nasser Auto Trading','dealer','+97165234567','+97165234567',true),
('sh-user-009','export@emiratestrade.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Emirates Trade Auto','dealer','+971505678901','+971505678901',true),
('sh-user-010','sales@sharjahexport.ae','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMRJbre3kdnXKwjFrw0V.OU3Pu','Sharjah Export Motors','dealer','+97165901234','+97165901234',true)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- DEALER PROFILES — DUBAI FREE ZONE
-- ============================================================

INSERT INTO dealers (
  id, user_id, company_name, slug, description,
  phone, whatsapp, email, website,
  address, free_zone_license,
  languages, export_destinations,
  verified, subscription_tier, rating, review_count
) VALUES

(
  'dealer-dubai-001', 'du-user-001',
  'Al Nabooda Automobiles LLC',
  'al-nabooda-automobiles',
  'Official dealer for Volkswagen, Audi and Porsche in the UAE since 1971. Dubai Free Zone flagship showroom with over 500 vehicles in stock. Specializing in premium German brands export to GCC, Africa and CIS countries. Full after-sales service center.',
  '+97143408000', '+97143408000', 'info@alnabooda.ae',
  'https://www.alnabooda.ae',
  'Sheikh Zayed Road, Dubai Free Zone, Al Quoz Industrial Area 1, Dubai, UAE',
  'DCCA-2024-AN001',
  ARRAY['en','ar'], ARRAY['GCC','Africa','Europe','Asia'],
  true, 'enterprise', 4.8, 312
),

(
  'dealer-dubai-002', 'du-user-002',
  'Al Habtoor Motors',
  'al-habtoor-motors',
  'Established 1971, Al Habtoor Motors is the exclusive dealer for Mercedes-Benz, Mitsubishi and Foton commercial vehicles in UAE. Dubai Free Zone showroom on Sheikh Zayed Road. Export division handling Africa and CIS markets.',
  '+97143242000', '+97143242000', 'sales@alhabtoor.ae',
  'https://www.alhabtoor-motors.com',
  'Sheikh Zayed Road, Business Bay, Dubai Free Zone, Dubai, UAE',
  'DCCA-2024-AH002',
  ARRAY['en','ar','ru'], ARRAY['GCC','Africa','CIS','Europe'],
  true, 'enterprise', 4.7, 287
),

(
  'dealer-dubai-003', 'du-user-003',
  'Al Ain Class Automobiles',
  'al-ain-class-automobiles',
  'Dubai Free Zone used car specialist with over 1,200 vehicles in stock. Largest selection of Toyota Land Cruisers in UAE. Export specialists to West Africa, East Africa and Middle East. Bulk fleet purchases welcome.',
  '+97142663555', '+971504123456', 'cars@alain.ae',
  'https://www.alainclass.ae',
  'Al Quoz Industrial Area 4, Dubai Free Zone, Dubai, UAE',
  'DCCA-2024-AC003',
  ARRAY['en','ar','fr'], ARRAY['West Africa','East Africa','GCC','Europe'],
  true, 'enterprise', 4.6, 198
),

(
  'dealer-dubai-004', 'du-user-004',
  'AGMC — BMW, MINI & Rolls-Royce',
  'agmc-bmw',
  'Arabian German Motorcars Co. Official BMW, MINI and Rolls-Royce dealer in Dubai. Luxury vehicle export specialists with dedicated export team for Africa, Asia and CIS. Bespoke ordering service for international clients.',
  '+97143430000', '+97143430000', 'info@agmc.ae',
  'https://www.agmc.ae',
  'Sheikh Zayed Road, DIFC Area, Dubai Free Zone, Dubai, UAE',
  'DCCA-2024-AG004',
  ARRAY['en','ar','de','zh'], ARRAY['Africa','Asia','CIS','Europe','Americas'],
  true, 'enterprise', 4.9, 445
),

(
  'dealer-dubai-005', 'du-user-005',
  'Manheim Middle East — Dubai',
  'manheim-middle-east-dubai',
  'The world largest automotive auction company. Dubai Free Zone facility handles 5,000+ vehicles per month. Weekly auctions open to registered dealers. Export clearance and logistics support for all destinations.',
  '+97148118000', '+971506001234', 'export@manheim.ae',
  'https://www.manheim.ae',
  'Jebel Ali Free Zone — JAFZA South, Dubai, UAE',
  'JAFZA-2024-MAN005',
  ARRAY['en','ar'], ARRAY['Global — all destinations'],
  true, 'enterprise', 4.5, 156
),

(
  'dealer-dubai-006', 'du-user-006',
  'Al Fardan Automobiles',
  'al-fardan-automobiles',
  'Premium automobile dealer in Dubai Free Zone. Specializing in luxury SUVs, sports cars and limited edition vehicles. Rolls-Royce, Bentley and McLaren authorized service. Private import and export service for UHNWI clients.',
  '+97144558555', '+971558112233', 'info@alfardan.ae',
  'https://www.alfardan-automobiles.com',
  'Al Safa Street, Jumeirah, Dubai Free Zone, Dubai, UAE',
  'DCCA-2024-AF006',
  ARRAY['en','ar','ru','zh'], ARRAY['GCC','Europe','Asia','Americas'],
  true, 'pro', 4.9, 89
),

(
  'dealer-dubai-007', 'du-user-007',
  'Premier Motors Dubai',
  'premier-motors-dubai',
  'Independent used car dealer in Dubai Free Zone with 300+ vehicles. Specializing in Japanese and American pickups for African export. Toyota Hilux, Nissan Navara, Ford Ranger expert. WhatsApp catalog updated daily.',
  '+971501234789', '+971501234789', 'sales@premiermotors.ae',
  'https://www.premiermotors.ae',
  'Al Quoz Industrial Area 2, Dubai Free Zone, Dubai, UAE',
  'DCCA-2024-PM007',
  ARRAY['en','ar','fr','sw'], ARRAY['East Africa','West Africa','Horn of Africa'],
  true, 'pro', 4.7, 203
),

(
  'dealer-dubai-008', 'du-user-008',
  'Gargash Enterprises — Mercedes-Benz',
  'gargash-enterprises',
  'Official Mercedes-Benz dealer in UAE since 1960. Dubai flagship showroom on Sheikh Zayed Road. Complete model range from A-Class to Maybach and AMG. Export service for GCC, Africa and Asia.',
  '+97143377777', '+97143377777', 'export@gargash.ae',
  'https://www.gargash.ae',
  'Sheikh Zayed Road, Al Quoz, Dubai Free Zone, Dubai, UAE',
  'DCCA-2024-GE008',
  ARRAY['en','ar','de'], ARRAY['GCC','Africa','Asia','Europe'],
  true, 'enterprise', 4.8, 521
),

(
  'dealer-dubai-009', 'du-user-009',
  'Al Rostamani Automobiles',
  'al-rostamani-automobiles',
  'Exclusive Honda and Suzuki dealer in UAE. Dubai Free Zone facility with comprehensive used car center. Export specialists for Japanese brands across Africa and South Asia. Fleet sales and bulk export available.',
  '+97142954444', '+97142954444', 'cars@alrostamani.ae',
  'https://www.alrostamani.ae',
  'Al Garhoud, Airport Road, Dubai Free Zone, Dubai, UAE',
  'DCCA-2024-AR009',
  ARRAY['en','ar','ur','hi'], ARRAY['South Asia','East Africa','GCC'],
  true, 'pro', 4.6, 167
),

(
  'dealer-dubai-010', 'du-user-010',
  'Emirates Motors — Ford & Lincoln',
  'emirates-motors',
  'Official Ford and Lincoln dealer in UAE. Specializing in F-150, Bronco, Explorer and Expedition export. Raptor specialist with dedicated performance vehicle department. Export logistics to all destinations.',
  '+97142822000', '+97142822000', 'info@emiratesmotors.ae',
  'https://www.emiratesmotors.ae',
  'Sheikh Zayed Road, Al Quoz, Dubai Free Zone, Dubai, UAE',
  'DCCA-2024-EM010',
  ARRAY['en','ar'], ARRAY['GCC','Africa','Americas','Europe'],
  true, 'pro', 4.7, 234
),

(
  'dealer-dubai-011', 'du-user-011',
  'AutoZone Dubai',
  'autozone-dubai',
  'Used car export specialist in Dubai Free Zone. 400+ vehicles always in stock. Focus on Chinese brands: BYD, MG, Chery, Haval for export to Africa and Asia. New EV export department launched 2024.',
  '+971554123456', '+971554123456', 'sales@autozone.ae',
  NULL,
  'Dubai Cars & Automotive Zone, DCAA, Al Awir, Dubai, UAE',
  'DCCA-2024-AZ011',
  ARRAY['en','ar','zh','fr'], ARRAY['Africa','Asia','Middle East'],
  true, 'pro', 4.4, 98
),

(
  'dealer-dubai-012', 'du-user-012',
  'Dubai Export Cars LLC',
  'dubai-export-cars',
  'Wholesale export dealer operating from Dubai Autodrome Area. Minimum order 5 vehicles. Container loading service. Documentation and customs clearance included. Specialized in volume export to Nigeria, Ghana, Senegal, Tanzania.',
  '+971505678901', '+971505678901', 'info@dubaiexportcars.ae',
  'https://www.dubaiexportcars.ae',
  'Al Awir Used Car Complex, Ras Al Khor, Dubai, UAE',
  'DCCA-2024-DEC012',
  ARRAY['en','ar','fr','yo','ha'], ARRAY['Nigeria','Ghana','Senegal','Ivory Coast','Tanzania','Kenya'],
  true, 'pro', 4.5, 312
),

(
  'dealer-dubai-013', 'du-user-013',
  'Al Masaood Automobiles',
  'al-masaood-automobiles',
  'Official Nissan and Infiniti dealer in UAE. Al Masaood Group — over 50 years serving UAE automotive market. Dubai and Abu Dhabi showrooms. Export division for GCC and Africa with dedicated fleet pricing.',
  '+97126214444', '+97126214444', 'trading@almasaood.ae',
  'https://www.almasaoodautomobiles.com',
  'Al Muroor Road, Abu Dhabi — Dubai Branch: Sheikh Zayed Rd, Dubai, UAE',
  'DCCA-2024-AM013',
  ARRAY['en','ar'], ARRAY['GCC','Africa','Asia'],
  true, 'enterprise', 4.7, 389
),

(
  'dealer-dubai-014', 'du-user-014',
  'Luxury Wheels Dubai',
  'luxury-wheels-dubai',
  'Ultra-luxury and supercar specialist in Dubai. Ferrari, Lamborghini, Bugatti, Pagani — new and pre-owned. Discreet private sales service. International delivery worldwide. Investment-grade collector cars.',
  '+971558901234', '+971558901234', 'info@luxurywheels.ae',
  'https://www.luxurywheels.ae',
  'DIFC Gate Village, Dubai International Financial Centre, Dubai, UAE',
  'DCCA-2024-LW014',
  ARRAY['en','ar','fr','it','zh','ru'], ARRAY['Global — all destinations'],
  true, 'pro', 5.0, 45
),

(
  'dealer-dubai-015', 'du-user-015',
  'Cars4Export DMCC',
  'cars4export-dmcc',
  'DMCC-licensed wholesale export company. Specializing in bulk vehicle export: 10–500 units per shipment. Full RoRo and container loading from Jebel Ali Port. All destinations served. FOB Jebel Ali pricing available.',
  '+971506789012', '+971506789012', 'sales@cars4export.ae',
  'https://www.cars4export.ae',
  'DMCC Business Centre, JLT, Jumeirah Lakes Towers, Dubai, UAE',
  'DMCC-2024-C4E015',
  ARRAY['en','ar','fr','pt','es'], ARRAY['Africa','Americas','Asia','Europe','CIS'],
  true, 'pro', 4.6, 127
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- DEALER PROFILES — JAFZA (Jebel Ali Free Zone)
-- ============================================================

INSERT INTO dealers (
  id, user_id, company_name, slug, description,
  phone, whatsapp, email, website,
  address, free_zone_license,
  languages, export_destinations,
  verified, subscription_tier, rating, review_count
) VALUES

(
  'dealer-jafza-001', 'ja-user-001',
  'JAFZA Auto Export LLC',
  'jafza-auto-export',
  'Jebel Ali Free Zone based export company specializing in RoRo shipments to all global ports. Direct access to Jebel Ali Port — world 9th largest. Weekly sailings to West Africa, East Africa and CIS. 800+ vehicles in JAFZA yard.',
  '+97148836000', '+971506001122', 'export@jafzaauto.ae',
  'https://www.jafzaautoexport.ae',
  'Jebel Ali Free Zone, Plot J-01, Gate 5, JAFZA South, Dubai, UAE',
  'JAFZA-2024-JAE001',
  ARRAY['en','ar','fr','sw','ru'], ARRAY['West Africa','East Africa','CIS','South Asia','Americas'],
  true, 'enterprise', 4.7, 445
),

(
  'dealer-jafza-002', 'ja-user-002',
  'Gulf Japan Auto Trading',
  'gulf-japan-auto-trading',
  'Japan-UAE joint venture operating from Jebel Ali Free Zone. Direct import from Japan auctions (USS, TAA, JAA). Toyota, Nissan, Honda, Subaru specialists. Fresh Japan import vehicles with auction sheets. Competitive prices for African and Asian markets.',
  '+97148812200', '+971554987654', 'info@gulfjapanauto.ae',
  'https://www.gulfjapanauto.com',
  'Jebel Ali Free Zone, Plot J-05, JAFZA North, Dubai, UAE',
  'JAFZA-2024-GJA002',
  ARRAY['en','ar','ja'], ARRAY['East Africa','West Africa','Pacific','South Asia'],
  true, 'pro', 4.8, 234
),

(
  'dealer-jafza-003', 'ja-user-003',
  'Arabian Stars Auto LLC',
  'arabian-stars-auto',
  'Established JAFZA dealer with 15 years experience. Specialists in SUV export: Toyota Land Cruiser 70 Series, 200 Series, 300 Series and Nissan Patrol. Stock always available. Financing assistance for approved international buyers.',
  '+97148815555', '+971507654321', 'sales@arabianstars.ae',
  NULL,
  'Jebel Ali Free Zone, Warehouse 5, Street 5A, JAFZA, Dubai, UAE',
  'JAFZA-2024-ASA003',
  ARRAY['en','ar','fr'], ARRAY['Africa','Middle East','Asia'],
  true, 'pro', 4.6, 178
),

(
  'dealer-jafza-004', 'ja-user-004',
  'Mid East Auto Export',
  'mid-east-auto-export',
  'JAFZA-based wholesale exporter. American and European brands specialist: Ford F-150, Chevrolet Silverado, GMC Sierra, RAM. Pickup trucks export to Africa and Americas. Full container loads at wholesale prices. RoRo from Jebel Ali weekly.',
  '+97148812345', '+97148812345', 'cars@mideastexport.ae',
  'https://www.mideastexport.com',
  'Jebel Ali Free Zone, Zone E, Street 12, JAFZA, Dubai, UAE',
  'JAFZA-2024-MAE004',
  ARRAY['en','ar','es','pt'], ARRAY['Africa','Americas','Caribbean'],
  true, 'pro', 4.5, 156
),

(
  'dealer-jafza-005', 'ja-user-005',
  'Pacific Motors JAFZA',
  'pacific-motors-jafza',
  'Specializing in right-hand and left-hand drive vehicles for Pacific and Asian markets. Japanese, Korean and Chinese brands. Toyota HiAce, Coaster, Land Cruiser stock. Container stuffing at JAFZA yard. Direct shipping to Pacific Island nations.',
  '+97148820000', '+971502345678', 'info@pacificmotors.ae',
  NULL,
  'Jebel Ali Free Zone, Block A, Unit 12, JAFZA, Dubai, UAE',
  'JAFZA-2024-PAC005',
  ARRAY['en','ar','zh','ms','tl'], ARRAY['Pacific Islands','South East Asia','Australia'],
  true, 'pro', 4.4, 89
),

(
  'dealer-jafza-006', 'ja-user-006',
  'Al Wafa Auto Trading JAFZA',
  'al-wafa-auto-trading-jafza',
  'Family-run JAFZA trading company with 20 years experience. Trusted by African importers across 35 countries. Toyota, Mitsubishi, Isuzu commercial vehicles. Fleet pricing from 10 units. LC, TT and cash accepted.',
  '+97148833444', '+97148833444', 'trading@alwafaauto.ae',
  'https://www.alwafaauto.ae',
  'Jebel Ali Free Zone, South Zone, Road 4, JAFZA, Dubai, UAE',
  'JAFZA-2024-AWA006',
  ARRAY['en','ar','fr','sw','ha'], ARRAY['Nigeria','Ghana','Kenya','Tanzania','Uganda','Ethiopia','Senegal','Cameroon'],
  true, 'pro', 4.7, 312
),

(
  'dealer-jafza-007', 'ja-user-007',
  'Continental Auto JAFZA',
  'continental-auto-jafza',
  'European car specialist in Jebel Ali Free Zone. BMW, Mercedes, Audi, Volkswagen pre-owned vehicles. Certified pre-owned program with mechanical inspection. Export to CIS countries, Libya, Egypt and Levant. Russian-speaking team available.',
  '+97148830000', '+971555432198', 'info@continentalauto.ae',
  NULL,
  'Jebel Ali Free Zone, Zone F, Warehouse 8, JAFZA, Dubai, UAE',
  'JAFZA-2024-CAJ007',
  ARRAY['en','ar','ru','de'], ARRAY['CIS','Libya','Egypt','Levant','Ukraine'],
  true, 'pro', 4.5, 134
),

(
  'dealer-jafza-008', 'ja-user-008',
  'Triangle Auto Export JAFZA',
  'triangle-auto-export-jafza',
  'Volume exporter from JAFZA. Minimum 3 units per order. Specializing in economy and mid-range vehicles for emerging markets. Toyota Corolla, Camry, Yaris — Honda Civic, Accord. Best prices for Senegal, Mali, Burkina Faso markets.',
  '+97148840000', '+971508765432', 'export@triangleauto.ae',
  NULL,
  'Jebel Ali Free Zone, East Zone, Street 8, JAFZA, Dubai, UAE',
  'JAFZA-2024-TAE008',
  ARRAY['en','ar','fr','wo'], ARRAY['West Africa','Francophone Africa'],
  true, 'starter', 4.3, 67
),

(
  'dealer-jafza-009', 'ja-user-009',
  'Global Cars Trading LLC',
  'global-cars-trading-jafza',
  'JAFZA registered global vehicle trading company. New Chinese brands specialist: BYD, MG, Chery, Geely, Haval, Tank export to Africa. Growing EV and hybrid export program. Direct factory relationships for bulk orders.',
  '+97148845678', '+97148845678', 'info@globalcarstrading.ae',
  'https://www.globalcarstrading.ae',
  'Jebel Ali Free Zone, New Area, Building G12, JAFZA, Dubai, UAE',
  'JAFZA-2024-GCT009',
  ARRAY['en','ar','zh','fr'], ARRAY['Africa','Asia','Middle East'],
  true, 'pro', 4.6, 89
),

(
  'dealer-jafza-010', 'ja-user-010',
  'Desert Auto Export JAFZA',
  'desert-auto-export-jafza',
  'Off-road and 4x4 specialist in Jebel Ali Free Zone. Land Rover Defender, Toyota FJ Cruiser, Mercedes G-Class, Nissan Patrol. Modified and stock vehicles. Safari preparation available. Export to Middle East, Africa and worldwide.',
  '+97148850000', '+971503456789', 'sales@desertauto.ae',
  NULL,
  'Jebel Ali Free Zone, Zone B, Plot 15, JAFZA, Dubai, UAE',
  'JAFZA-2024-DAE010',
  ARRAY['en','ar','fr'], ARRAY['North Africa','Middle East','East Africa'],
  true, 'starter', 4.4, 78
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- DEALER PROFILES — SHARJAH
-- ============================================================

INSERT INTO dealers (
  id, user_id, company_name, slug, description,
  phone, whatsapp, email, website,
  address, free_zone_license,
  languages, export_destinations,
  verified, subscription_tier, rating, review_count
) VALUES

(
  'dealer-sharjah-001', 'sh-user-001',
  'Sharjah Auto Mall',
  'sharjah-auto-mall',
  'Sharjah largest multi-brand auto mall with 50+ dealers under one roof. Industrial Area 18, Sharjah. Over 2,000 vehicles in stock. All makes and models. Export services from Sharjah Port. Free valuation service.',
  '+97165000000', '+971556001234', 'info@sharjahautomall.ae',
  'https://www.sharjahautomall.ae',
  'Industrial Area 18, Near Hamdan Street, Sharjah, UAE',
  'SAIF-2024-SAM001',
  ARRAY['en','ar','ur','hi','ml'], ARRAY['GCC','South Asia','East Africa','Africa'],
  true, 'enterprise', 4.5, 678
),

(
  'dealer-sharjah-002', 'sh-user-002',
  'Al Majid Motors Sharjah',
  'al-majid-motors-sharjah',
  'Sharjah-based authorized dealer with 200+ pre-owned vehicles. Toyota and Lexus specialist. Fleet management company partnerships. Export to GCC countries and East Africa. Free inspection report on every vehicle.',
  '+97165444333', '+971554001122', 'cars@almajidauto.ae',
  NULL,
  'Industrial Area 17, King Faisal Road, Sharjah, UAE',
  'SAIF-2024-AM002',
  ARRAY['en','ar','ur'], ARRAY['GCC','East Africa','South Asia'],
  true, 'pro', 4.6, 213
),

(
  'dealer-sharjah-003', 'sh-user-003',
  'Gulf Line Auto Trading',
  'gulf-line-auto-trading-sharjah',
  'Sharjah Auto Zone dealer specializing in American muscle cars and pickups. Ford Mustang, Dodge Challenger, Chevrolet Camaro and Corvette. Pickup trucks: F-150, Silverado, Tundra export specialists. WhatsApp orders welcome.',
  '+97165333222', '+971556789012', 'sales@gulfline.ae',
  NULL,
  'Sharjah Industrial Area 12, Auto Zone, Sharjah, UAE',
  'SAIF-2024-GLA003',
  ARRAY['en','ar'], ARRAY['GCC','Africa','Americas'],
  true, 'pro', 4.5, 134
),

(
  'dealer-sharjah-004', 'sh-user-004',
  'Al Hamraia Auto Sharjah',
  'al-hamraia-auto-sharjah',
  'Established 2001 in Sharjah Industrial Zone. Commercial vehicles and light trucks specialist. Mitsubishi Fuso, Isuzu, Hino — box trucks and refrigerated vehicles. African market expertise. Export documents in 48 hours.',
  '+97165678901', '+97165678901', 'export@alhamraiauto.ae',
  'https://www.alhamraiauto.ae',
  'Industrial Area 6, Near Sharjah Airport, Sharjah, UAE',
  'SAIF-2024-AHA004',
  ARRAY['en','ar','fr','sw'], ARRAY['East Africa','West Africa','Central Africa'],
  true, 'pro', 4.4, 156
),

(
  'dealer-sharjah-005', 'sh-user-005',
  'SHJ Auto Export',
  'shj-auto-export',
  'Volume used car exporter based in Sharjah. 500+ vehicles in open-air compound. Specializing in large volume orders for dealers in Nigeria, Ghana, Tanzania, Uganda. Best prices in the market. Free container loading.',
  '+97165500000', '+971504567890', 'info@shjauto.ae',
  NULL,
  'Used Car Complex, Industrial Area 18, Sharjah, UAE',
  'SAIF-2024-SHA005',
  ARRAY['en','ar','fr','yo'], ARRAY['Nigeria','Ghana','Tanzania','Uganda','Kenya'],
  true, 'pro', 4.5, 289
),

(
  'dealer-sharjah-006', 'sh-user-006',
  'Al Khail Motors Sharjah',
  'al-khail-motors-sharjah',
  'Family business since 1995. Sharjah Industrial Area 17. Japanese used cars specialist: Toyota, Nissan, Honda, Mazda, Subaru. Fresh Japan and UAE stock available simultaneously. Mechanical inspection included.',
  '+97165345678', '+97165345678', 'trading@alkhail.ae',
  NULL,
  'Industrial Area 17, Block 5, Sharjah, UAE',
  'SAIF-2024-AKM006',
  ARRAY['en','ar','ur','hi'], ARRAY['GCC','South Asia','East Africa'],
  true, 'starter', 4.3, 89
),

(
  'dealer-sharjah-007', 'sh-user-007',
  'Shindagha Export Cars',
  'shindagha-export-cars',
  'Chinese brand export specialist in Sharjah. BYD Atto 3, Seal, Han. MG4, ZS EV. Haval Jolion, H6. New stock arriving weekly from China. Best EV prices in UAE for export to Africa. Battery warranty documentation included.',
  '+97165222111', '+971557890123', 'cars@shindaghaexport.ae',
  'https://www.shindaghaexport.ae',
  'Industrial Area 18, Chinese Auto District, Sharjah, UAE',
  'SAIF-2024-SEC007',
  ARRAY['en','ar','zh','fr'], ARRAY['Africa','South East Asia','Middle East'],
  true, 'pro', 4.6, 123
),

(
  'dealer-sharjah-008', 'sh-user-008',
  'Nasser Auto Trading',
  'nasser-auto-trading-sharjah',
  'Sharjah-based broker and dealer network connector. 20+ years matching buyers and sellers across the UAE and globally. Sourcing service: tell us what you need, we find it. Commission-based for bulk buyers.',
  '+97165234567', '+97165234567', 'info@nasserauto.ae',
  NULL,
  'King Abdul Aziz Street, Al Nahda, Sharjah, UAE',
  'SAIF-2024-NAT008',
  ARRAY['en','ar','ur','fa'], ARRAY['GCC','Iran','Pakistan','India'],
  false, 'starter', 4.2, 45
),

(
  'dealer-sharjah-009', 'sh-user-009',
  'Emirates Trade Auto',
  'emirates-trade-auto-sharjah',
  'Sharjah multi-brand dealer. New and used vehicles. European brands specialist for local Sharjah market and GCC export. BMW, Audi, Mercedes sourcing from Europe with duty-free import. Competitive rates.',
  '+97165456789', '+971505678901', 'export@emiratestrade.ae',
  NULL,
  'Al Wahda Street, Al Qasimia, Sharjah, UAE',
  'SAIF-2024-ETA009',
  ARRAY['en','ar','de','fr'], ARRAY['GCC','North Africa','Europe'],
  true, 'starter', 4.3, 67
),

(
  'dealer-sharjah-010', 'sh-user-010',
  'Sharjah Export Motors',
  'sharjah-export-motors',
  'Sharjah-based export company with direct shipping from Sharjah and Khor Fakkan ports. Competitive RoRo rates. Weekly sailings to East Africa, India, Pakistan. Toyota HiAce minibuses specialist — new and used.',
  '+97165901234', '+97165901234', 'sales@sharjahexport.ae',
  'https://www.sharjahexport.ae',
  'Mina Road, Near Sharjah Port, Sharjah, UAE',
  'SAIF-2024-SEM010',
  ARRAY['en','ar','ur','sw','hi'], ARRAY['East Africa','South Asia','Indian Ocean Islands'],
  true, 'pro', 4.5, 198
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SOCIAL MEDIA LINKS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS dealer_social_media (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  dealer_id   TEXT REFERENCES dealers(id) ON DELETE CASCADE,
  platform    VARCHAR(30) NOT NULL,
  url         VARCHAR(500) NOT NULL,
  handle      VARCHAR(100),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dealer_id, platform)
);

-- ─── Dubai dealers social media ───────────────────────────────────────────────

INSERT INTO dealer_social_media (dealer_id, platform, url, handle) VALUES
-- Al Nabooda
('dealer-dubai-001','instagram','https://www.instagram.com/alnabooda_automobiles','@alnabooda_automobiles'),
('dealer-dubai-001','facebook','https://www.facebook.com/AlNaboodaAutomobiles','Al Nabooda Automobiles'),
-- Al Habtoor
('dealer-dubai-002','instagram','https://www.instagram.com/alhabtoor_motors','@alhabtoor_motors'),
('dealer-dubai-002','facebook','https://www.facebook.com/AlHabtoorMotors','Al Habtoor Motors'),
('dealer-dubai-002','youtube','https://www.youtube.com/@alhabtoor_motors','Al Habtoor Motors UAE'),
-- Al Ain Class
('dealer-dubai-003','instagram','https://www.instagram.com/alainclass_automobiles','@alainclass_automobiles'),
('dealer-dubai-003','facebook','https://www.facebook.com/AlAinClassAutomobiles','Al Ain Class Automobiles'),
-- AGMC
('dealer-dubai-004','instagram','https://www.instagram.com/agmc_bmw_uae','@agmc_bmw_uae'),
('dealer-dubai-004','facebook','https://www.facebook.com/AGMCBMWUae','AGMC BMW UAE'),
('dealer-dubai-004','youtube','https://www.youtube.com/@agmc.uae','AGMC UAE'),
-- Manheim
('dealer-dubai-005','instagram','https://www.instagram.com/manheim_me','@manheim_me'),
('dealer-dubai-005','facebook','https://www.facebook.com/ManheimMiddleEast','Manheim Middle East'),
-- Al Fardan
('dealer-dubai-006','instagram','https://www.instagram.com/alfardan_automobiles','@alfardan_automobiles'),
('dealer-dubai-006','facebook','https://www.facebook.com/AlfardanAutomobiles','Al Fardan Automobiles'),
-- Premier Motors
('dealer-dubai-007','instagram','https://www.instagram.com/premiermotors_dubai','@premiermotors_dubai'),
('dealer-dubai-007','facebook','https://www.facebook.com/PremierMotorsDubai','Premier Motors Dubai'),
-- Gargash
('dealer-dubai-008','instagram','https://www.instagram.com/gargash_mb_uae','@gargash_mb_uae'),
('dealer-dubai-008','facebook','https://www.facebook.com/GargashEnterprises','Gargash Enterprises'),
('dealer-dubai-008','youtube','https://www.youtube.com/@gargash','Gargash Mercedes-Benz'),
-- Al Rostamani
('dealer-dubai-009','instagram','https://www.instagram.com/alrostamani_autos','@alrostamani_autos'),
('dealer-dubai-009','facebook','https://www.facebook.com/AlRostamaniAutomobiles','Al Rostamani Automobiles'),
-- Emirates Motors
('dealer-dubai-010','instagram','https://www.instagram.com/emiratesmotors_ford','@emiratesmotors_ford'),
('dealer-dubai-010','facebook','https://www.facebook.com/EmiratesMotorsUAE','Emirates Motors UAE'),
-- AutoZone
('dealer-dubai-011','instagram','https://www.instagram.com/autozone_dubai','@autozone_dubai'),
('dealer-dubai-011','facebook','https://www.facebook.com/AutoZoneDubai','AutoZone Dubai'),
-- Dubai Export Cars
('dealer-dubai-012','instagram','https://www.instagram.com/dubaiexportcars','@dubaiexportcars'),
('dealer-dubai-012','facebook','https://www.facebook.com/DubaiExportCars','Dubai Export Cars'),
('dealer-dubai-012','youtube','https://www.youtube.com/@dubaiexportcars','Dubai Export Cars'),
-- Al Masaood
('dealer-dubai-013','instagram','https://www.instagram.com/almasaood_nissan','@almasaood_nissan'),
('dealer-dubai-013','facebook','https://www.facebook.com/AlMasaoodAutomobiles','Al Masaood Automobiles'),
-- Luxury Wheels
('dealer-dubai-014','instagram','https://www.instagram.com/luxurywheels_dubai','@luxurywheels_dubai'),
('dealer-dubai-014','facebook','https://www.facebook.com/LuxuryWheelsDubai','Luxury Wheels Dubai'),
-- Cars4Export
('dealer-dubai-015','instagram','https://www.instagram.com/cars4export_dmcc','@cars4export_dmcc'),
('dealer-dubai-015','facebook','https://www.facebook.com/Cars4ExportDMCC','Cars4Export DMCC'),

-- ─── JAFZA dealers social ────────────────────────────────────────────────────
('dealer-jafza-001','instagram','https://www.instagram.com/jafza_autoexport','@jafza_autoexport'),
('dealer-jafza-001','facebook','https://www.facebook.com/JAFZAAutoExport','JAFZA Auto Export'),
('dealer-jafza-002','instagram','https://www.instagram.com/gulf_japan_auto','@gulf_japan_auto'),
('dealer-jafza-002','facebook','https://www.facebook.com/GulfJapanAutoTrading','Gulf Japan Auto Trading'),
('dealer-jafza-003','instagram','https://www.instagram.com/arabianstars_auto','@arabianstars_auto'),
('dealer-jafza-004','instagram','https://www.instagram.com/mideast_autoexport','@mideast_autoexport'),
('dealer-jafza-004','facebook','https://www.facebook.com/MidEastAutoExport','Mid East Auto Export'),
('dealer-jafza-005','instagram','https://www.instagram.com/pacific_motors_jafza','@pacific_motors_jafza'),
('dealer-jafza-006','instagram','https://www.instagram.com/alwafa_auto_jafza','@alwafa_auto_jafza'),
('dealer-jafza-006','facebook','https://www.facebook.com/AlWafaAutoTrading','Al Wafa Auto Trading'),
('dealer-jafza-007','instagram','https://www.instagram.com/continental_auto_jafza','@continental_auto_jafza'),
('dealer-jafza-008','instagram','https://www.instagram.com/triangle_auto_export','@triangle_auto_export'),
('dealer-jafza-009','instagram','https://www.instagram.com/globalcars_jafza','@globalcars_jafza'),
('dealer-jafza-009','facebook','https://www.facebook.com/GlobalCarsTrading','Global Cars Trading'),
('dealer-jafza-010','instagram','https://www.instagram.com/desert_auto_jafza','@desert_auto_jafza'),

-- ─── Sharjah dealers social ───────────────────────────────────────────────────
('dealer-sharjah-001','instagram','https://www.instagram.com/sharjah_auto_mall','@sharjah_auto_mall'),
('dealer-sharjah-001','facebook','https://www.facebook.com/SharjahAutoMall','Sharjah Auto Mall'),
('dealer-sharjah-001','youtube','https://www.youtube.com/@sharjahautomall','Sharjah Auto Mall'),
('dealer-sharjah-002','instagram','https://www.instagram.com/almajid_motors_shj','@almajid_motors_shj'),
('dealer-sharjah-002','facebook','https://www.facebook.com/AlMajidMotorsSharjah','Al Majid Motors Sharjah'),
('dealer-sharjah-003','instagram','https://www.instagram.com/gulfline_auto_shj','@gulfline_auto_shj'),
('dealer-sharjah-004','instagram','https://www.instagram.com/alhamraia_auto','@alhamraia_auto'),
('dealer-sharjah-004','facebook','https://www.facebook.com/AlHamraiaAutoSharjah','Al Hamraia Auto Sharjah'),
('dealer-sharjah-005','instagram','https://www.instagram.com/shj_auto_export','@shj_auto_export'),
('dealer-sharjah-005','facebook','https://www.facebook.com/SHJAutoExport','SHJ Auto Export'),
('dealer-sharjah-005','youtube','https://www.youtube.com/@shjautoexport','SHJ Auto Export'),
('dealer-sharjah-006','instagram','https://www.instagram.com/alkhail_motors_shj','@alkhail_motors_shj'),
('dealer-sharjah-007','instagram','https://www.instagram.com/shindagha_export','@shindagha_export'),
('dealer-sharjah-007','facebook','https://www.facebook.com/ShindaghaExportCars','Shindagha Export Cars'),
('dealer-sharjah-008','instagram','https://www.instagram.com/nasser_auto_shj','@nasser_auto_shj'),
('dealer-sharjah-009','instagram','https://www.instagram.com/emiratestrade_auto','@emiratestrade_auto'),
('dealer-sharjah-010','instagram','https://www.instagram.com/sharjah_export_motors','@sharjah_export_motors'),
('dealer-sharjah-010','facebook','https://www.facebook.com/SharjahExportMotors','Sharjah Export Motors')
ON CONFLICT (dealer_id, platform) DO NOTHING;

-- Summary
DO $$
DECLARE dc INT; dj INT; ds INT;
BEGIN
  SELECT COUNT(*) INTO dc FROM dealers WHERE id LIKE 'dealer-dubai-%';
  SELECT COUNT(*) INTO dj FROM dealers WHERE id LIKE 'dealer-jafza-%';
  SELECT COUNT(*) INTO ds FROM dealers WHERE id LIKE 'dealer-sharjah-%';
  RAISE NOTICE '=== UAE Dealers Dataset ===';
  RAISE NOTICE 'Dubai Free Zone: % dealers', dc;
  RAISE NOTICE 'Jebel Ali JAFZA: % dealers', dj;
  RAISE NOTICE 'Sharjah: % dealers', ds;
  RAISE NOTICE 'Total: % dealers', dc + dj + ds;
END $$;
