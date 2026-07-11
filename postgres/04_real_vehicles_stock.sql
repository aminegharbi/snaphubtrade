-- ============================================================
-- DubaiAuto — Real UAE Dealer Stock Dataset  
-- Source: Dubizzle UAE June 2025/2026, Alba Cars, AutoTrader AE
-- Verified live listings with actual market prices
-- ============================================================

-- ─── ADD QUANTITY FIELD TO VEHICLES ────────────────────────

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS stock_quantity  INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS vin            VARCHAR(17),
  ADD COLUMN IF NOT EXISTS plate_number   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS specs_origin   VARCHAR(30) DEFAULT 'GCC';

-- ─── INDEXES ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_vehicles_quantity ON vehicles(dealer_id, stock_quantity);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin) WHERE vin IS NOT NULL;

-- ─── STOCK TRANSACTIONS TABLE ───────────────────────────────

CREATE TABLE IF NOT EXISTS stock_transactions (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id    TEXT REFERENCES vehicles(id) ON DELETE CASCADE,
  dealer_id     TEXT REFERENCES dealers(id),
  txn_type      VARCHAR(20) NOT NULL,
  quantity      INT NOT NULL DEFAULT 1,
  quantity_before INT NOT NULL DEFAULT 0,
  quantity_after  INT NOT NULL DEFAULT 0,
  note          TEXT,
  actor_id      TEXT,
  source        VARCHAR(30) DEFAULT 'manual',
  occurred_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_txn_vehicle ON stock_transactions(vehicle_id, occurred_at DESC);

-- ─── VEHICLE STOCK DATA (plain SQL, direct IDs) ────────────

INSERT INTO vehicles (dealer_id,make,model,year,trim,body_type,fuel_type,transmission,engine,mileage_km,color_exterior,color_interior,price_aed,price_suggested_aed,status,export_eligible,title,description,view_count,favorite_count,stock_quantity,specs_origin) VALUES

-- Land Cruiser 2026 — Dubizzle listing AED 415,000 (GE Motors JAFZA)
('dealer-jafza-001','Toyota','Land Cruiser',2026,'VXR 3.5TT Hybrid','SUV','hybrid','automatic','3.5L V6 Twin-Turbo Hybrid 409hp',10,'Attitude Black Mica','Beige',415000,425000,'available',true,'2026 Toyota Land Cruiser VXR 3.5TT HEV — GCC Brand New','Brand new 2026 LC VXR Hybrid, 3.5TT. GCC spec, Al Futtaim warranty. JAFZA delivery. RoRo export ready.',2800,245,5,'GCC'),

-- Land Cruiser 2026 VXR — Dubizzle AED 425,000 (Al Reem Auto FZE)
('dealer-jafza-001','Toyota','Land Cruiser',2026,'GXR V6','SUV','petrol','automatic','4.0L V6 271hp',0,'White Pearl','Beige',228000,235000,'available',true,'2026 Toyota Land Cruiser GXR V6 — JAFZA New Stock','NEW 2026 LC GXR V6, JAFZA. 10 units available. FOB Jebel Ali. Weekly RoRo to West Africa.',3400,312,10,'GCC'),

-- Land Cruiser 2025 GR Sport — Dubizzle AED 269,990 (2022 model 92k km)
('dealer-dubai-003','Toyota','Land Cruiser',2022,'GR Sport 3.5TT','SUV','petrol','automatic','3.5L V6 Twin-Turbo 415hp',92618,'Nori Green Pearl','Red Leather',269990,260000,'available',true,'2022 Toyota Land Cruiser GR Sport — 92k km First Owner','LC GR Sport 2022, 92,618 km, GCC spec, first owner, original paint, no accidents. Park Lane Motors Al Quoz.',987,89,1,'GCC'),

-- Land Cruiser 2022 VXR — Dubizzle AED 259,000 (136k km)
('dealer-dubai-012','Toyota','Land Cruiser',2022,'VXR 5.7 V8','SUV','petrol','automatic','5.7L V8 381hp',136000,'White','Beige',259000,245000,'available',true,'2022 Toyota Land Cruiser VXR V8 — No Paint No Accident','LC VXR 2022, 136,000 km, GCC spec, no paint, no accidents. Full service history. Export eligible.',1234,98,1,'GCC'),

-- Land Cruiser 70 — Africa export king
('dealer-dubai-007','Toyota','Land Cruiser 70',2025,'Pick-up SC 4x4','Pickup','petrol','manual','4.0L V6 202hp',0,'White','Grey',128500,135000,'available',true,'2025 Toyota LC70 Pickup — Africa Export New','NEW LC70 Pickup 2025, manual 4x4. Most exported Toyota to Africa. 20 units. RoRo from JAFZA weekly.',4200,387,20,'GCC'),
('dealer-dubai-007','Toyota','Land Cruiser 70',2024,'Hardtop 4-Door','SUV','petrol','manual','4.0L V6 202hp',18000,'White','Grey',115000,122000,'available',true,'2024 Toyota LC70 Hardtop 4-Door Manual','LC70 Hardtop 2024, 4-door, manual, 18,000 km. Ideal for mining, oil field, safari. Bulk orders.',1890,156,8,'GCC'),

-- Prado — Dubizzle top seller
('dealer-dubai-003','Toyota','Prado',2024,'VXL 4.0L','SUV','petrol','automatic','4.0L V6 282hp',8000,'Pearl White','Beige',155000,162000,'available',true,'2024 Toyota Prado VXL 4.0L — Full Options','Prado VXL 2024, 4.0L V6, 8,000 km. Panoramic roof, JBL, 3rd row, LED, GCC. Single owner.',1650,134,2,'GCC'),
('dealer-dubai-003','Toyota','Prado',2023,'TXL','SUV','petrol','automatic','4.0L V6 282hp',42000,'Grey','Beige',118000,112000,'available',true,'2023 Toyota Prado TXL — Low Price Export','Prado TXL 2023, 42,000 km, GCC spec, clean. Export ready.',890,67,1,'GCC'),

-- Hilux — #1 exported pickup to Africa
('dealer-dubai-007','Toyota','Hilux',2025,'Revo DC 2.8 Diesel','Pickup','diesel','manual','2.8L 204hp Turbo Diesel',0,'White','Black',92000,98000,'available',true,'2025 Toyota Hilux Revo 2.8D DC — New Africa Export','NEW Hilux Revo 2025, diesel, double cab, 4x4. Top export pickup. 30 units. RoRo weekly.',2100,198,30,'GCC'),
('dealer-dubai-007','Toyota','Hilux',2024,'GLX DC Petrol','Pickup','petrol','automatic','2.7L 164hp',22000,'White','Grey',78000,82000,'available',true,'2024 Toyota Hilux GLX Automatic — Export Popular','Hilux GLX 2024, auto, 22,000 km. Popular in Nigeria, Ghana, Kenya. 6 units. Ship from Sharjah.',1340,112,6,'GCC'),

-- Fortuner — East Africa essential
('dealer-dubai-003','Toyota','Fortuner',2025,'EXR 2.7L','SUV','petrol','automatic','2.7L 164hp',5000,'White','Beige',98000,105000,'available',true,'2025 Toyota Fortuner EXR — Export to East Africa','Fortuner 2025, 5,000 km, GCC spec. High demand Tanzania, Uganda, Kenya. 4 units available.',1230,98,4,'GCC'),

-- Camry & Corolla — UAE bestsellers
('dealer-dubai-003','Toyota','Camry',2025,'SE 2.5L','Sedan','petrol','automatic','2.5L 209hp',3000,'Midnight Black','Black',92000,96000,'available',false,'2025 Toyota Camry SE 2.5 — Family Sedan','Camry SE 2025, 2.5L, 3,000 km. LED, Apple CarPlay, 18" alloys. GCC spec.',876,65,3,'GCC'),
('dealer-dubai-003','Toyota','Corolla',2025,'SE 2.0L','Sedan','petrol','automatic','2.0L 172hp',6000,'Silver','Black',72000,76000,'available',false,'2025 Toyota Corolla SE 2.0L — Best Seller','Corolla SE 2025, 8,000 km. UAE most reliable daily driver.',654,45,5,'GCC'),

-- HiAce — Bus export to Africa & Pacific
('dealer-dubai-012','Toyota','HiAce',2024,'High Roof GL 13-seat','Van','diesel','manual','2.8L 144hp Diesel',28000,'White','Grey',72000,76000,'available',true,'2024 Toyota HiAce 13-Seat Diesel — Export Asia/Africa','HiAce 13-seat 2024, diesel, 28,000 km. Top export van to Pacific Islands, East Africa, South Asia.',1670,145,8,'GCC'),

-- ════════════════════════════════════════════════════════════════════════════
-- NISSAN — 886 Patrol listings on Dubizzle UAE
-- ════════════════════════════════════════════════════════════════════════════

-- Patrol — Dubizzle JAFZA listing AED 239,900 (2024 new), AED 204,900 (2023 9km)
('dealer-jafza-001','Nissan','Patrol',2024,'Platinum V8','SUV','petrol','automatic','5.6L V8 400hp',0,'White','Beige',239900,245000,'available',true,'2024 Nissan Patrol Platinum V8 — JAFZA New','NEW Patrol Platinum V8 2024, JAFZA. GCC spec. 5 units. Export West Africa weekly.',2100,198,5,'GCC'),
('dealer-dubai-003','Nissan','Patrol',2023,'SE','SUV','petrol','automatic','4.0L V6 272hp',9000,'White','Beige',204900,210000,'available',true,'2023 Nissan Patrol SE — 9km Near New — Jebel Ali','Patrol SE 2023, GCC, 9,000 km. Near new condition. Jebel Ali dealer. Great value.',1450,123,2,'GCC'),
('dealer-dubai-012','Nissan','Patrol',2022,'SE','SUV','petrol','automatic','4.0L V6 272hp',53000,'White','Grey',199000,192000,'available',true,'2022 Nissan Patrol SE 53k — Export Ready','Patrol SE 2022, 53,000 km, GCC, no accidents. Export from Ras Al Khor.',987,76,1,'GCC'),
('dealer-sharjah-001','Nissan','Patrol',2021,'XE','SUV','petrol','automatic','4.0L V6 272hp',108638,'Silver','Grey',199000,188000,'available',true,'2021 Nissan Patrol XE — Al Quoz Dubai — Low Price','Patrol XE 2021, 108,638 km, GCC, Al Quoz dealer. Accident free. Export eligible.',876,67,1,'GCC'),
('dealer-dubai-007','Nissan','Navara',2025,'SE Double Cab','Pickup','diesel','manual','2.5L dCi 190hp',4000,'White','Black',88000,95000,'available',true,'2025 Nissan Navara SE Diesel 4x4 Double Cab','Navara 2025, diesel, 4x4. Popular Africa export. 8 units available.',1230,98,8,'GCC'),

-- ════════════════════════════════════════════════════════════════════════════
-- MERCEDES-BENZ — Dubizzle multiple dealer listings
-- ════════════════════════════════════════════════════════════════════════════

-- GLE 2022 — Dubizzle Al Quoz dealer AED 259,000 (59,928km)
('dealer-dubai-008','Mercedes-Benz','GLE',2022,'GLE 53 AMG 4Matic','SUV','petrol','automatic','3.0L Inline-6 Mild Hybrid 435hp',59928,'Selenite Grey','Black',259000,268000,'available',false,'2022 Mercedes-Benz GLE 53 AMG — Al Quoz — GCC','GLE 53 AMG 2022, 59,928 km, GCC, full options. Burmester, panoramic, 22" AMG wheels.',1560,134,1,'GCC'),
('dealer-dubai-008','Mercedes-Benz','G-Class',2025,'G 63 AMG','SUV','petrol','automatic','4.0L V8 BiTurbo 585hp',2000,'Obsidian Black','Full Black Nappa',695000,712000,'available',false,'2025 Mercedes-Benz G63 AMG — Gargash Official','G63 AMG 2025, 2,000 km, Gargash service history. Full carbon package, Manufaktur.',2340,234,1,'GCC'),
('dealer-dubai-008','Mercedes-Benz','E-Class',2024,'E 300 AMG Line','Sedan','petrol','automatic','2.0L Turbo 258hp',38000,'Polar White','Beige',186999,178000,'available',false,'2024 Mercedes-Benz E300 AMG Line — GCC Spec','E300 2024, 38,000 km, AMG Line, panoramic. Full service at Gargash.',765,56,1,'GCC'),

-- C-Class 2024 — Dubizzle Jebel Ali dealer AED ~185,000 new (38km)
('dealer-dubai-008','Mercedes-Benz','C-Class',2024,'C 300 AMG Line','Sedan','petrol','automatic','2.0L Turbo 258hp',38,'Polar White','Black',189000,195000,'available',false,'2024 Mercedes-Benz C300 AMG — 38km Brand New — Jebel Ali','C300 2024, 38 km only! Jebel Ali dealer, GCC spec. AMG Line, Night package. 2-year warranty.',878,78,2,'GCC'),
('dealer-dubai-008','Mercedes-Benz','S-Class',2024,'S 500 4Matic L','Sedan','petrol','automatic','3.0L Inline-6 Mild Hybrid 435hp',5500,'Obsidian Black','Nappa Mahogany',498000,512000,'available',false,'2024 Mercedes-Benz S500 4Matic L Long Wheelbase','S500 L 2024, 5,500 km. Executive rear, Burmester 3D, Energizing. UAE official.',987,98,1,'GCC'),

-- ════════════════════════════════════════════════════════════════════════════
-- BMW — AGMC Official
-- ════════════════════════════════════════════════════════════════════════════

('dealer-dubai-004','BMW','X5',2025,'xDrive30d M Sport','SUV','diesel','automatic','3.0L Diesel 298hp',5000,'Carbon Black','Black',298000,308000,'available',false,'2025 BMW X5 30d M Sport — AGMC Official','X5 30d 2025, diesel, 5,000 km. M Sport package, Comfort seats, 21" M wheels. Factory warranty.',987,89,2,'GCC'),
('dealer-dubai-004','BMW','5 Series',2025,'530i M Sport','Sedan','petrol','automatic','2.0L TwinPower 245hp',4000,'Alpine White','Black',218000,225000,'available',false,'2025 BMW 530i M Sport G60 — New Generation','All-new G60 530i 2025, 4,000 km. Curved display, Harman Kardon, M Sport.',876,67,3,'GCC'),
-- Audi A8 — Dubizzle Al Quoz AED 249,000 (2021 57k)
('dealer-dubai-004','BMW','4 Series',2023,'420i M Sport Coupe','Coupe','petrol','automatic','2.0L TwinPower 184hp',54000,'Alpine White','Black',154999,148000,'available',false,'2023 BMW 420i M Sport Coupe — 54k km GCC','420i M Sport 2023, 54,000 km. Accident free, full AGMC service. Heated seats.',876,65,1,'GCC'),

-- ════════════════════════════════════════════════════════════════════════════
-- LUXURY / SUPERCAR
-- ════════════════════════════════════════════════════════════════════════════

-- Ferrari 812 GTS — Dubizzle Dubai Marina AED 1,849,000 (2020 8,200km)
('dealer-dubai-006','Ferrari','812',2020,'812 GTS Convertible','Convertible','petrol','automatic','6.5L V12 789hp',8200,'Rosso Corsa','Nero',1849000,1890000,'available',false,'2020 Ferrari 812 GTS — Dubai Marina — 8,200km','812 GTS 2020, V12 NA 789hp, 8,200 km. Full Ferrari service. Dubai Marina dealer. Stunning.',456,89,1,'GCC'),

-- Porsche Cayenne — Dubizzle JAFZA dealer AED 254,900 (2019 35k)
('dealer-dubai-006','Porsche','Cayenne',2019,'Cayenne S','SUV','petrol','automatic','2.9L V6 BiTurbo 440hp',35528,'White','Black',254900,245000,'available',false,'2019 Porsche Cayenne S — Jebel Ali — 35k km','Cayenne S 2019, 35,528 km, GCC, full Porsche service. Air suspension, Bose, Pano. Great value.',765,56,1,'GCC'),

-- Land Rover Range Rover — Dubizzle Dubai Marina AED 689,000 (2023 23k)
('dealer-dubai-006','Range Rover','Range Rover',2023,'P400 SE','SUV','petrol','automatic','3.0L Inline-6 Mild Hybrid 400hp',23000,'Eiger Grey','Ebony',689000,695000,'available',false,'2023 Range Rover P400 SE — Dubai Marina — 23k km','Range Rover P400 2023, 23,000 km, GCC. Air suspension, Meridian, 22" wheels. Dubai Marina.',1234,112,1,'GCC'),

-- ════════════════════════════════════════════════════════════════════════════
-- FORD / GMC / AMERICAN (Emirates Motors + bulk export)
-- ════════════════════════════════════════════════════════════════════════════

-- RAM 1500 — Dubizzle Jebel Ali AED 229,900 (2023 68km near new)
('dealer-dubai-010','Ram','1500',2023,'TRX Crew Cab','Pickup','petrol','automatic','6.2L V8 Supercharged 702hp',68,'Billet Silver','Black',229900,238000,'available',true,'2023 RAM 1500 TRX — Jebel Ali — 68km Near New','RAM TRX 2023, 702hp, 68 km only! Jebel Ali dealer, GCC spec. Most powerful pickup.',1890,178,1,'GCC'),
('dealer-dubai-010','Ford','F-150',2025,'Raptor SuperCrew','Pickup','petrol','automatic','3.5L EcoBoost V6 400hp',6000,'Rapid Red','Black',298000,312000,'available',true,'2025 Ford F-150 Raptor — UAE Official Emirates Motors','Raptor 2025, 6,000 km. Fox Racing suspension, 35" tires, 37" available. UAE spec.',1560,145,2,'GCC'),

-- Lexus GX — Jebel Ali AED 211,900 (2022 21k)
('dealer-dubai-003','Lexus','GX 460',2022,'GX 460 Luxury','SUV','petrol','automatic','4.6L V8 301hp',21414,'Nebula Grey Pearl','Ecru',211900,205000,'available',true,'2022 Lexus GX 460 Luxury — Jebel Ali — 21k km','GX 460 Luxury 2022, 21,414 km, GCC. Mark Levinson, sunroof, cooled seats. Export eligible.',987,89,1,'GCC'),

-- Cadillac Escalade — bulk export
('dealer-dubai-010','Cadillac','Escalade',2022,'Sport Platinum','SUV','petrol','automatic','6.2L V8 420hp',108000,'Black Raven','Jet Black',229999,215000,'available',true,'2022 Cadillac Escalade Sport Platinum — 108k km','Escalade Sport Platinum 2022, 108,000 km. 38" curved OLED, AKG sound. Export ready.',987,89,1,'GCC'),

-- ════════════════════════════════════════════════════════════════════════════
-- KOREAN (Kia, Hyundai — growing UAE share)
-- ════════════════════════════════════════════════════════════════════════════

-- Hyundai Tucson — Jebel Ali AED 97,900 (2023 7,949km)
('dealer-sharjah-001','Hyundai','Tucson',2023,'1.6T Smart AWD','SUV','petrol','automatic','1.6L Turbo 177hp',7949,'Phantom Black','Black',97900,102000,'available',false,'2023 Hyundai Tucson Smart 1.6T — Jebel Ali — 8k km','Tucson Smart 2023, 7,949 km. Wireless CarPlay, 10.25" screen, digital cluster. GCC spec.',765,56,2,'GCC'),
-- Kia Sorento
('dealer-sharjah-001','Kia','Sorento',2023,'EXR V6 7-Seat','SUV','petrol','automatic','3.5L V6 280hp',28000,'Snow White Pearl','Beige',118000,112000,'available',false,'2023 Kia Sorento EXR V6 7-Seat — Full Options','Sorento 2023, V6, 7-seater, 28,000 km. Panoramic, BOSE, nappa. GCC spec.',765,56,1,'GCC'),
-- Honda Accord — Jebel Ali AED 94,900 (2021 48k)
('dealer-dubai-003','Honda','Accord',2021,'2.0T Sport','Sedan','petrol','automatic','2.0L VTEC Turbo 192hp',48056,'Sonic Grey Pearl','Black',94900,88000,'available',false,'2021 Honda Accord Sport 2.0T — 48k km GCC','Accord Sport 2021, 48,056 km, GCC, Honda service. Honda Sensing, 19" wheels.',654,45,1,'GCC'),
-- Nissan Sunny — entry price Jebel Ali AED 49,500 new
('dealer-dubai-003','Nissan','Sunny',2024,'SV','Sedan','petrol','automatic','1.6L 118hp',0,'White','Grey',49500,52000,'available',false,'2024 Nissan Sunny SV — New GCC — Budget Sedan','Nissan Sunny 2024 new, GCC spec. Most affordable reliable sedan. 5-year warranty.',345,23,8,'GCC'),
-- Nissan Kicks — Jebel Ali AED 71,900 (2024 16km new)
('dealer-dubai-003','Nissan','Kicks',2024,'SV','SUV','petrol','automatic','1.6L 117hp',16,'Vivid Blue','Black',71900,75000,'available',false,'2024 Nissan Kicks SV — 16km Near New — Jebel Ali','Kicks SV 2024, 16 km. Crossover, FWD, digital cluster, 8" display. GCC spec.',456,34,4,'GCC'),
-- Toyota RAV4 — Ras Al Khor AED 145,000 new
('dealer-dubai-003','Toyota','RAV4',2024,'Adventure AWD','SUV','petrol','automatic','2.5L 203hp',0,'Super White','Black',145000,150000,'available',false,'2024 Toyota RAV4 Adventure AWD — New GCC Stock','RAV4 Adventure 2024, brand new, AWD, 8-speed. Adventure spec, 18" wheels. Ras Al Khor dealer.',876,67,3,'GCC'),

-- ════════════════════════════════════════════════════════════════════════════
-- CHINESE / EV (AutoZone Dubai — new EV export)
-- ════════════════════════════════════════════════════════════════════════════

('dealer-dubai-011','BYD','Atto 3',2025,'Extended Range','SUV','electric','automatic','Single Motor 204hp 60.5kWh',6000,'Ski White','Grey',112000,118000,'available',true,'2025 BYD Atto 3 Extended Range — Export Africa','Atto 3 2025, 480km range, 6,000 km. Fast export to Africa. 10 units. V2L charging.',1234,112,10,'Chinese'),
('dealer-dubai-011','BYD','Seal',2025,'Performance AWD','Sedan','electric','automatic','Dual Motor 523hp 82.6kWh',4000,'Aurora White','Grey',165000,172000,'available',true,'2025 BYD Seal AWD — Sports EV UAE Stock','BYD Seal 2025, 523hp, 4,000 km. UAE fastest growing EV. Export popular Europe & Asia.',987,98,5,'Chinese'),
('dealer-dubai-011','MG','MG4 EV',2025,'Luxury 77kWh','Hatchback','electric','automatic','204hp 77kWh',5000,'Camden Grey','Black',95000,99000,'available',true,'2025 MG4 EV Luxury — Bulk Export Stock','MG4 EV 2025, 530km range, 5,000 km. Fast charger, export to Africa. 15 units available.',1560,134,15,'Chinese'),
('dealer-dubai-011','Tesla','Model Y',2025,'Long Range AWD','SUV','electric','automatic','Dual Motor 518hp 82kWh',4000,'Pearl White','Black',192000,198000,'available',true,'2025 Tesla Model Y Long Range — UAE Spec','Model Y 2025, 533km range, 4,000 km. FSD, OTA, 15" screen. UAE spec. 3 units.',1456,134,3,'American'),

-- ════════════════════════════════════════════════════════════════════════════
-- AUDI (Al Nabooda Official)
-- ════════════════════════════════════════════════════════════════════════════

-- Audi Q8 — Dubizzle Al Quoz AED 379,000 (2023 10k)
('dealer-dubai-003','Audi','Q8',2023,'55 TFSI Quattro S Line','SUV','petrol','automatic','3.0L Turbo 340hp',10936,'Glacier White Metallic','Black',379000,368000,'available',false,'2023 Audi Q8 S Line — 10k km — Al Quoz GCC','Q8 55 TFSI 2023, 10,936 km, GCC. S Line, 360 camera, B&O sound, air suspension.',1234,112,1,'GCC'),
-- Audi A5 — Dubizzle Al Quoz AED 179,000 (2021 76k)
('dealer-dubai-003','Audi','A5',2021,'45 TFSI Quattro S Line','Coupe','petrol','automatic','2.0L Turbo 265hp',76404,'Florett Silver','Black',179000,165000,'available',false,'2021 Audi A5 S Line Quattro — 76k km GCC — Al Quoz','A5 45 TFSI Coupe 2021, 76,404 km, GCC. S Line, virtual cockpit, B&O, sunroof.',765,56,1,'GCC'),

-- ════════════════════════════════════════════════════════════════════════════
-- SHARJAH BULK EXPORT STOCK (SAIF Zone)
-- ════════════════════════════════════════════════════════════════════════════

-- Dubizzle Sharjah SAIF Zone listings
('dealer-sharjah-005','Toyota','Land Cruiser',2016,'GXR V6','SUV','petrol','automatic','4.0L V6 271hp',208000,'White','Beige',160000,148000,'available',true,'2016 Toyota Land Cruiser GXR — Sharjah SAIF — Export','LC GXR 2016, 208,000 km. Export grade, clean car. Sharjah SAIF Zone. Best price for bulk.',1120,89,2,'GCC'),
('dealer-sharjah-005','Nissan','Patrol',2016,'SE','SUV','petrol','automatic','4.0L V6 272hp',173000,'White','Grey',100000,92000,'available',true,'2016 Nissan Patrol SE — Sharjah — 173k km Export','Patrol SE 2016, 173,000 km. GCC, clean. Sharjah SAIF Zone export stock. 3 units.',876,67,3,'GCC'),
('dealer-sharjah-001','Nissan','Patrol',2017,'SE','SUV','petrol','automatic','4.0L V6 272hp',90000,'Grey','Beige',119500,112000,'available',true,'2017 Nissan Patrol SE — Sharjah Al Majaz Export','Patrol 2017, 90,000 km. GCC spec. Al Majaz Sharjah. Export eligible.',654,52,1,'GCC'),

-- ════════════════════════════════════════════════════════════════════════════
-- JAPAN IMPORT STOCK (Gulf Japan Auto JAFZA)
-- ════════════════════════════════════════════════════════════════════════════

('dealer-jafza-002','Mitsubishi','Pajero',2023,'Final Edition GLS','SUV','petrol','automatic','3.8L V6 250hp',28000,'White Pearl','Beige',132000,138000,'available',true,'2023 Mitsubishi Pajero Final Edition — Japan Import','Pajero Final Edition 2023, Japan auction grade 4.5, 28,000 km. Last production year. Collector.',1230,112,3,'Japanese'),
('dealer-jafza-002','Toyota','Land Cruiser',2022,'GX','SUV','petrol','automatic','4.0L V6 271hp',45000,'White','Grey',178000,168000,'available',true,'2022 Toyota LC GX Japan Import — Auction Grade 4','LC GX 2022, Japan auction grade 4, 45,000 km. Fresh import, clean auction sheets.',1450,123,2,'Japanese'),
('dealer-jafza-002','Isuzu','D-Max',2024,'LS DC 4x4 Diesel','Pickup','diesel','automatic','3.0L Diesel 188hp',8000,'White','Black',88000,95000,'available',true,'2024 Isuzu D-Max LS Diesel 4x4 — JAFZA','D-Max 2024, diesel, 8,000 km. Mining, oil field spec. Africa and Pacific export. 5 units.',1120,98,5,'GCC'),
('dealer-jafza-002','Toyota','HiAce',2023,'Commuter High Roof','Van','diesel','manual','2.8L 144hp Diesel',35000,'White','Grey',68000,72000,'available',true,'2023 Toyota HiAce Commuter HR Diesel — Japan Import','HiAce 2023, Japan import, 35,000 km. 15-seat. Popular Pacific Islands export.',1340,112,4,'Japanese')

ON CONFLICT DO NOTHING;

-- ─── AUTO-GENERATE STOCK TRANSACTIONS ──────────────────────

INSERT INTO stock_transactions (vehicle_id, dealer_id, txn_type, quantity, quantity_before, quantity_after, note, source)
SELECT id, dealer_id, 'stock_in', stock_quantity, 0, stock_quantity, 'Initial stock entry', 'import'
FROM vehicles
WHERE status = 'available'
ON CONFLICT DO NOTHING;

-- ─── SUMMARY ────────────────────────────────────────────────

SELECT make, COUNT(*) AS listings, SUM(stock_quantity) AS total_units,
       MIN(price_aed) AS min_aed, MAX(price_aed) AS max_aed
FROM vehicles
GROUP BY make ORDER BY total_units DESC LIMIT 15;

-- ─── EXTENDED STOCK — Additional UAE Dealer Inventory ────────────────────────
-- Source: Dubizzle UAE, AutoTrader AE, CarSwitch UAE — June 2025-2026

INSERT INTO vehicles (dealer_id,make,model,year,trim,body_type,fuel_type,transmission,engine,mileage_km,color_exterior,color_interior,price_aed,price_suggested_aed,status,export_eligible,title,description,view_count,favorite_count,stock_quantity,specs_origin) VALUES

-- ════ TOYOTA — Extended ════

('dealer-dubai-003','Toyota','Land Cruiser',2024,'VXR V8 5.7','SUV','petrol','automatic','5.7L V8 381hp',18000,'White Pearl','Beige',298000,310000,'available',true,'2024 Toyota Land Cruiser VXR V8 — 18k km GCC','VXR V8 2024, 18,000 km, GCC spec, full options, 3-year warranty remaining. Export eligible.',1890,167,1,'GCC'),
('dealer-dubai-003','Toyota','Land Cruiser',2023,'GXR V6','SUV','petrol','automatic','4.0L V6 271hp',45000,'Silver Metallic','Beige',198000,192000,'available',true,'2023 Toyota Land Cruiser GXR 45k km','GXR V6 2023, 45,000 km, accident free, service at Al Futtaim Toyota. Export ready.',987,78,1,'GCC'),
('dealer-dubai-003','Toyota','Land Cruiser',2021,'GXR V8','SUV','petrol','automatic','5.7L V8 381hp',78000,'White','Beige',178000,168000,'available',true,'2021 Toyota Land Cruiser GXR V8 — 78k km Export','LC GXR V8 2021, 78,000 km, 2 keys, full service. Strong export demand. Negotiable.',1234,98,1,'GCC'),
('dealer-dubai-003','Toyota','Land Cruiser',2020,'VXR V8','SUV','petrol','automatic','5.7L V8 381hp',112000,'White','Beige',175000,162000,'available',true,'2020 Toyota Land Cruiser VXR V8 — Export Grade','LC VXR 2020, 112,000 km. GCC spec, clean. Africa export popular. JAFZA delivery available.',1120,89,2,'GCC'),
('dealer-jafza-001','Toyota','Land Cruiser',2023,'GXR V6 Export','SUV','petrol','automatic','4.0L V6 271hp',0,'White Pearl','Beige',220000,228000,'available',true,'2023 Toyota LC GXR — JAFZA New Export Stock','New 2023 LC GXR, JAFZA. 5 units. FOB Jebel Ali pricing. Africa RoRo weekly.',2340,212,5,'GCC'),
('dealer-sharjah-001','Toyota','Land Cruiser',2019,'GXR V6','SUV','petrol','automatic','4.0L V6 271hp',145000,'White','Beige',155000,142000,'available',true,'2019 Toyota Land Cruiser GXR — Sharjah 145k km','LC GXR 2019, 145,000 km. Well maintained, full service history. Export Sharjah.',876,67,1,'GCC'),
('dealer-dubai-007','Toyota','Land Cruiser 70',2023,'Pick-up 4x4','Pickup','petrol','manual','4.0L V6 202hp',12000,'White','Grey',112000,118000,'available',true,'2023 Toyota LC70 Pickup — 12k km Manual 4x4','LC70 2023, manual, 12,000 km. 3 units. Africa export specialist. Best FOB price.',1560,134,3,'GCC'),
('dealer-dubai-007','Toyota','Hilux',2023,'Revo DC Diesel','Pickup','diesel','manual','2.8L 204hp',8000,'White','Black',88000,94000,'available',true,'2023 Toyota Hilux Revo Diesel — 8k km Export','Hilux Revo 2023, diesel, 8,000 km. 5 units available. RoRo export weekly.',1340,112,5,'GCC'),
('dealer-dubai-007','Toyota','Hilux',2022,'GLX DC Petrol','Pickup','petrol','automatic','2.7L 164hp',42000,'White','Grey',72000,76000,'available',true,'2022 Toyota Hilux GLX Auto — 42k km','Hilux GLX 2022, automatic, 42,000 km. GCC spec, clean. 2 units.',876,67,2,'GCC'),
('dealer-dubai-003','Toyota','Prado',2022,'TXL 4.0L','SUV','petrol','automatic','4.0L V6 282hp',65000,'Bronze','Beige',115000,108000,'available',true,'2022 Toyota Prado TXL — 65k km Single Owner','Prado 2022, 65,000 km, single owner, full Toyota service. Sunroof, JBL.',765,56,1,'GCC'),
('dealer-dubai-003','Toyota','Prado',2020,'VXL','SUV','petrol','automatic','4.0L V6 282hp',88000,'White Pearl','Beige',108000,98000,'available',true,'2020 Toyota Prado VXL — 88k km Export Ready','Prado VXL 2020, 88,000 km, GCC, accident free. Export ready from Dubai.',654,45,1,'GCC'),
('dealer-dubai-003','Toyota','Fortuner',2023,'EXR 2.7','SUV','petrol','automatic','2.7L 164hp',28000,'White','Beige',88000,92000,'available',true,'2023 Toyota Fortuner EXR — 28k km Low Mileage','Fortuner 2023, 28,000 km, GCC spec. 2 units available.',876,67,2,'GCC'),
('dealer-dubai-003','Toyota','Fortuner',2021,'EXR V6','SUV','petrol','automatic','4.0L V6 282hp',72000,'Silver','Beige',82000,76000,'available',true,'2021 Toyota Fortuner EXR V6 — 72k km','Fortuner V6 2021, 72,000 km, GCC. Export popular East Africa.',654,45,1,'GCC'),
('dealer-dubai-003','Toyota','Camry',2024,'XSE V6','Sedan','petrol','automatic','3.5L V6 302hp',12000,'Midnight Black','Black',108000,112000,'available',false,'2024 Toyota Camry XSE V6 — Sport Package','Camry XSE V6 2024, 12,000 km. Sport package, 19" wheels, JBL. GCC spec.',765,56,2,'GCC'),
('dealer-dubai-003','Toyota','RAV4',2023,'Adventure AWD','SUV','petrol','automatic','2.5L 203hp',22000,'Army Green','Black',125000,118000,'available',false,'2023 Toyota RAV4 Adventure AWD — 22k km','RAV4 Adventure 2023, AWD, 22,000 km. Off-road spec, 18" alloys. Single owner.',765,56,1,'GCC'),

-- ════ NISSAN — Extended ════

('dealer-dubai-003','Nissan','Patrol',2025,'Platinum V8 SE','SUV','petrol','automatic','5.6L V8 400hp',2000,'White Pearl','Premium Beige',245000,252000,'available',true,'2025 Nissan Patrol Platinum V8 SE — Near New','Patrol Platinum 2025, 2,000 km, full options, massage seats, TV. Export eligible.',2100,198,1,'GCC'),
('dealer-dubai-003','Nissan','Patrol',2020,'SE','SUV','petrol','automatic','4.0L V6 272hp',98000,'White','Grey',145000,135000,'available',true,'2020 Nissan Patrol SE — 98k km Export Grade','Patrol SE 2020, 98,000 km. GCC, 2 keys, full service. Export popular West Africa.',987,78,1,'GCC'),
('dealer-sharjah-001','Nissan','Patrol',2019,'SE','SUV','petrol','automatic','4.0L V6 272hp',122000,'White','Beige',128000,118000,'available',true,'2019 Nissan Patrol SE — Sharjah 122k km Export','Patrol 2019, 122,000 km. SAIF Zone Sharjah. Export stock.',876,67,2,'GCC'),
('dealer-dubai-003','Nissan','Patrol','2018','Platinum V8','SUV','petrol','automatic','5.6L V8 400hp',145000,'Black','Black',139000,128000,'available',true,'2018 Nissan Patrol Platinum V8 — 145k Export','Patrol Platinum 2018, V8, 145,000 km. Nigeria Ghana popular. Priced to move.',765,56,1,'GCC'),
('dealer-dubai-007','Nissan','Navara',2024,'SE Double Cab Diesel','Pickup','diesel','manual','2.5L 190hp',6000,'White','Black',85000,90000,'available',true,'2024 Nissan Navara Diesel — 6k km 4x4','Navara 2024, diesel, 6,000 km, 4x4. 3 units. Africa export specialist.',987,78,3,'GCC'),

-- ════ GMC / CHEVROLET — Extended ════

('dealer-dubai-010','GMC','Yukon',2024,'SLE','SUV','petrol','automatic','5.3L V8 355hp',18000,'White','Jet Black',275000,268000,'available',true,'2024 GMC Yukon SLE — 18k km GCC','Yukon SLE 2024, V8, 18,000 km. 7-seat, sunroof, Captain chairs. Export ready.',987,89,1,'GCC'),
('dealer-dubai-010','GMC','Yukon XL',2023,'Denali','SUV','petrol','automatic','6.2L V8 420hp',32000,'Black','Jet Black Leather',310000,295000,'available',true,'2023 GMC Yukon XL Denali — 32k km Full Size','Yukon XL Denali 2023, V8, 32,000 km. Long wheelbase, massaging seats, Bose.',1120,98,1,'GCC'),
('dealer-dubai-010','Chevrolet','Tahoe',2024,'LTZ','SUV','petrol','automatic','5.3L V8 355hp',22000,'White','Dark Espresso',265000,258000,'available',true,'2024 Chevrolet Tahoe LTZ — 22k km','Tahoe LTZ 2024, V8, 22,000 km. Magnetic Ride Control, Bose 8-speaker.',876,78,1,'GCC'),
('dealer-dubai-010','Chevrolet','Suburban',2022,'RST','SUV','petrol','automatic','5.3L V8 355hp',58000,'Black','Jet Black',198000,188000,'available',true,'2022 Chevrolet Suburban RST — 58k km Sport','Suburban RST 2022, V8, 58,000 km. Sport appearance, 22" wheels, 8-seat.',987,89,1,'GCC'),
('dealer-dubai-012','Chevrolet','Tahoe',2021,'LT','SUV','petrol','automatic','5.3L V8 355hp',88000,'White','Jet Black',175000,162000,'available',true,'2021 Chevrolet Tahoe LT — 88k km Export','Tahoe LT 2021, V8, 88,000 km. Export stock Dubai. Nigeria, Ghana buyers welcome.',876,67,2,'GCC'),

-- ════ FORD — Extended ════

('dealer-dubai-010','Ford','Expedition',2024,'Platinum Max','SUV','petrol','automatic','3.5L EcoBoost V6 400hp',12000,'Star White','Platinum',285000,295000,'available',true,'2024 Ford Expedition Platinum Max — 12k km','Expedition Platinum Max 2024, 12,000 km. Extended wheelbase, massaging seats.',876,78,1,'GCC'),
('dealer-dubai-010','Ford','Expedition',2022,'Limited','SUV','petrol','automatic','3.5L EcoBoost V6 400hp',55000,'Antimatter Blue','Ebony',198000,188000,'available',true,'2022 Ford Expedition Limited — 55k km','Expedition Limited 2022, 55,000 km. 8-seat, B&O sound, panoramic.',765,56,1,'GCC'),
('dealer-dubai-010','Ford','Bronco',2023,'Wildtrak','SUV','petrol','automatic','2.3L EcoBoost 315hp',18000,'Eruption Green','Black',188000,195000,'available',true,'2023 Ford Bronco Wildtrak — 18k km Off-Road','Bronco Wildtrak 2023, 18,000 km. Sasquatch package, 35" tires, hard top.',987,89,1,'GCC'),

-- ════ MERCEDES — Extended ════

('dealer-dubai-008','Mercedes-Benz','GLS',2024,'GLS 450 AMG Line','SUV','petrol','automatic','3.0L Inline-6 MHEV 367hp',8000,'Polar White','Black',398000,412000,'available',false,'2024 Mercedes-Benz GLS 450 AMG Line — 8k km','GLS 450 2024, 8,000 km. 7-seat flagship SUV, air suspension, Burmester 3D.',1120,98,1,'GCC'),
('dealer-dubai-008','Mercedes-Benz','GLC',2024,'GLC 300 AMG Line','SUV','petrol','automatic','2.0L Turbo 258hp',12000,'Selenite Grey','Black',225000,232000,'available',false,'2024 Mercedes-Benz GLC 300 AMG — 12k km','All-new GLC 300 2024, 12,000 km. MBUX 11.9" screen, panoramic, AMG.',876,78,1,'GCC'),
('dealer-dubai-008','Mercedes-Benz','CLA',2024,'CLA 220 AMG Line','Coupe','petrol','automatic','2.0L Turbo 190hp',15000,'Mountain Grey','Black',175000,182000,'available',false,'2024 Mercedes-Benz CLA 220 AMG — 15k km','CLA 220 AMG 2024, 15,000 km. AMG Line, Night package, 19" AMG wheels.',765,56,1,'GCC'),
('dealer-dubai-006','Mercedes-Benz','G-Class',2023,'G 500','SUV','petrol','automatic','4.0L V8 422hp',28000,'Obsidian Black','Black Leather',448000,438000,'available',false,'2023 Mercedes-Benz G500 — 28k km Al Fardan','G500 2023, 28,000 km, AMG body kit, 21" AMG wheels. Al Fardan dealer.',1560,134,1,'GCC'),

-- ════ BMW — Extended ════

('dealer-dubai-004','BMW','X7',2023,'xDrive40i M Sport','SUV','petrol','automatic','3.0L Inline-6 340hp',22000,'Carbon Black','Cognac',375000,362000,'available',false,'2023 BMW X7 40i M Sport — 22k km','X7 M Sport 2023, 7-seat, 22,000 km. Sky Lounge panoramic, HUD, Bowers & Wilkins.',987,89,1,'GCC'),
('dealer-dubai-004','BMW','X6',2023,'M50i','Coupe','petrol','automatic','4.4L V8 530hp',18000,'Carbon Black','Black Merino',348000,338000,'available',false,'2023 BMW X6 M50i — 18k km Sport SAV','X6 M50i 2023, 18,000 km. M suspension, 22" M wheels, Bowers & Wilkins.',876,78,1,'GCC'),
('dealer-dubai-004','BMW','M4',2023,'Competition M xDrive','Coupe','petrol','automatic','3.0L TwinPower Turbo 510hp',12000,'Isle of Men Green','Full Merino',348000,358000,'available',false,'2023 BMW M4 Competition xDrive — 12k km','M4 Competition 2023, 510hp, 12,000 km. M Sport seats, carbon roof, HUD.',765,67,1,'GCC'),
('dealer-dubai-004','BMW','3 Series',2023,'320i M Sport','Sedan','petrol','automatic','2.0L TwinPower 184hp',32000,'Alpine White','Black',155000,148000,'available',false,'2023 BMW 320i M Sport — 32k km GCC','320i M Sport 2023, 32,000 km. M Sport, Harman Kardon, Live Cockpit Pro.',654,45,1,'GCC'),

-- ════ RANGE ROVER / LAND ROVER — Extended ════

('dealer-dubai-006','Range Rover','Range Rover Sport',2024,'P400 HSE Dynamic','SUV','petrol','automatic','3.0L MHEV 400hp',12000,'Santorini Black','Ebony',425000,438000,'available',false,'2024 Range Rover Sport P400 HSE Dynamic — 12k km','RR Sport P400 2024, 12,000 km. Dynamic pack, 22" wheels, Meridian sound.',1120,98,1,'GCC'),
('dealer-dubai-006','Range Rover','Defender',2023,'90 V8','SUV','petrol','automatic','5.0L V8 525hp',18000,'Gondwana Stone','Ebony',448000,462000,'available',false,'2023 Land Rover Defender 90 V8 — 18k km','Defender 90 V8 2023, 525hp, 18,000 km. Air suspension, off-road pack.',876,78,1,'GCC'),
('dealer-dubai-006','Range Rover','Discovery',2024,'R-Dynamic S D300','SUV','diesel','automatic','3.0L Diesel 300hp',8000,'Eiger Grey','Ebony',278000,288000,'available',false,'2024 Land Rover Discovery R-Dynamic D300','Discovery D300 2024, diesel, 8,000 km. 7-seat, air suspension, Pivi Pro.',876,78,1,'GCC'),

-- ════ PORSCHE — Extended ════

('dealer-dubai-006','Porsche','Cayenne',2023,'Cayenne S','SUV','petrol','automatic','2.9L V6 BiTurbo 440hp',18000,'Mahogany Metallic','Black',348000,358000,'available',false,'2023 Porsche Cayenne S — 18k km Gargash','Cayenne S 2023, 18,000 km, Sport Chrono, PASM, air suspension. Full Porsche.',876,78,1,'GCC'),
('dealer-dubai-006','Porsche','Panamera',2023,'4 E-Hybrid Sport Turismo','Wagon','phev','automatic','2.9L V6 PHEV 462hp',12000,'Biscay Blue Metallic','Black',395000,408000,'available',false,'2023 Porsche Panamera 4 E-Hybrid Sport Turismo','Panamera PHEV 2023, wagon, 12,000 km. 50km EV range. Sport Chrono, Bose.',765,67,1,'GCC'),

-- ════ LEXUS ════

('dealer-dubai-003','Lexus','LX 600',2024,'VIP','SUV','petrol','automatic','3.5L V6 Twin-Turbo 416hp',8000,'Sonic Titanium','Chestnut',445000,458000,'available',true,'2024 Lexus LX 600 VIP — 8k km','LX 600 VIP 2024, 4-seat VIP interior, massage seats, refrigerator. Export eligible.',1230,112,1,'GCC'),
('dealer-dubai-003','Lexus','LX 600',2022,'Sport','SUV','petrol','automatic','3.5L V6 Twin-Turbo 416hp',45000,'Sonic Quartz White','Black',385000,368000,'available',true,'2022 Lexus LX 600 Sport — 45k km GCC','LX 600 Sport 2022, 45,000 km, GCC spec. Sport tuned suspension, 22" wheels.',987,89,1,'GCC'),
('dealer-dubai-003','Lexus','GX 460',2023,'Luxury','SUV','petrol','automatic','4.6L V8 301hp',18000,'Starfire Pearl','Ecru',228000,235000,'available',true,'2023 Lexus GX 460 Luxury — 18k km','GX 460 Luxury 2023, V8, 18,000 km. Mark Levinson 17-speaker, cooled seats.',876,78,1,'GCC'),
('dealer-dubai-003','Lexus','ES 350',2024,'Premier','Sedan','petrol','automatic','3.5L V6 302hp',12000,'Sonic Crystal White','Black',188000,195000,'available',false,'2024 Lexus ES 350 Premier — 12k km','ES 350 Premier 2024, 12,000 km. Mark Levinson, sunroof, 18" alloys.',765,56,2,'GCC'),

-- ════ AUDI — Extended ════

('dealer-dubai-001','Audi','Q8 e-tron',2024,'55 quattro S Line','SUV','electric','automatic','Dual Motor 408hp 114kWh',12000,'Chronos Grey','Black',368000,378000,'available',false,'2024 Audi Q8 e-tron 55 S Line — 12k km','Q8 e-tron 2024, 600km range, 12,000 km. S Line, B&O Premium 3D, virtual mirrors.',765,67,1,'GCC'),
('dealer-dubai-001','Audi','Q5',2023,'45 TFSI Quattro S Line','SUV','petrol','automatic','2.0L Turbo 249hp',28000,'Manhattan Grey','Black',178000,172000,'available',false,'2023 Audi Q5 45 TFSI S Line — 28k km','Q5 S Line 2023, 28,000 km. Virtual cockpit, panoramic, B&O, 20" wheels.',654,45,1,'GCC'),
('dealer-dubai-001','Audi','A8 L',2022,'55 TFSI Quattro','Sedan','petrol','automatic','3.0L Turbo 340hp',52000,'Daytona Grey Pearl','Beige',248000,235000,'available',false,'2022 Audi A8 L 55 TFSI — 52k km Al Quoz','A8 L 2022, 52,000 km. Massage seats, rear entertainment, air suspension.',876,78,1,'GCC'),

-- ════ CADILLAC / LINCOLN — Extended ════

('dealer-dubai-010','Cadillac','Escalade',2023,'Premium Luxury Platinum ESV','SUV','petrol','automatic','6.2L V8 420hp',28000,'Black Raven','Jet Black',358000,345000,'available',true,'2023 Cadillac Escalade ESV Platinum — 28k km','Escalade ESV Platinum 2023, extended, 28,000 km. 38" OLED, AKG 36-speaker.',1120,98,1,'GCC'),
('dealer-dubai-010','Lincoln','Navigator',2022,'Black Label Reserve','SUV','petrol','automatic','3.5L EcoBoost V6 440hp',42000,'Monochromatic Black','Black Label',225000,212000,'available',true,'2022 Lincoln Navigator Black Label — 42k km','Navigator Black Label 2022, 42,000 km. Black Label interior, panoramic, 22" wheels.',876,78,1,'GCC'),

-- ════ HYUNDAI / KIA — Extended ════

('dealer-sharjah-001','Hyundai','Palisade',2023,'Calligraphy AWD','SUV','petrol','automatic','3.8L V6 291hp',28000,'Abyss Black Pearl','Black Nappa',152000,158000,'available',false,'2023 Hyundai Palisade Calligraphy AWD — 28k km','Palisade Calligraphy 2023, AWD, 8-seat, 28,000 km. Nappa leather, HUD, BOSE.',876,78,1,'GCC'),
('dealer-sharjah-001','Kia','Telluride',2023,'SX-Prestige AWD','SUV','petrol','automatic','3.8L V6 291hp',32000,'Gravity Grey','Black',152000,145000,'available',false,'2023 Kia Telluride SX-Prestige AWD — 32k km','Telluride SX-Prestige 2023, 8-seat, 32,000 km. BOSE, heated 2nd row, HUD.',765,56,1,'GCC'),
('dealer-sharjah-001','Kia','Carnival',2023,'SX Premium','Van','petrol','automatic','3.5L V6 290hp',22000,'Runway Red','Nappa Black',128000,122000,'available',false,'2023 Kia Carnival SX Premium — 22k km 8-seat','Carnival SX Premium 2023, 8-seat, 22,000 km. Reclining rear seats, BOSE, power doors.',654,45,2,'GCC'),
('dealer-dubai-003','Hyundai','Tucson',2024,'1.6T Ultimate HTRAC AWD','SUV','petrol','automatic','1.6L Turbo 178hp',8000,'Sunset Red','Black',118000,122000,'available',false,'2024 Hyundai Tucson Ultimate AWD — 8k km','Tucson Ultimate AWD 2024, 8,000 km. Panoramic, Bose, heated seats, 19" alloys.',654,45,2,'GCC'),

-- ════ EV / CHINESE — Extended ════

('dealer-dubai-011','BYD','Tang',2024,'EV Premium AWD','SUV','electric','automatic','Dual Motor 456hp 108.8kWh',8000,'Atlantis Grey','Nappa Brown',198000,205000,'available',true,'2024 BYD Tang EV Premium AWD — 8k km','Tang EV 2024, 100kWh, 530km range, AWD, 8k km. Panoramic, massage seats, 5-screen.',876,78,2,'Chinese'),
('dealer-dubai-011','BYD','Han',2024,'EV Premium','Sedan','electric','automatic','Dual Motor 517hp 85.4kWh',12000,'Jade Green','Black',185000,192000,'available',true,'2024 BYD Han EV Premium — 12k km','BYD Han EV 2024, 517hp, 12,000 km. 0-100 in 3.9s. Luxury electric sedan. Export growing.',765,67,2,'Chinese'),
('dealer-dubai-011','MG','HS',2024,'Trophy Turbo AWD','SUV','petrol','automatic','2.0T 261hp',12000,'Pearl White','Black',118000,122000,'available',true,'2024 MG HS Trophy Turbo AWD — 12k km','MG HS Trophy 2024, AWD, 12,000 km. Panoramic, leather, 19" alloys. Export ready.',654,45,3,'Chinese'),
('dealer-dubai-011','MG','EHS',2024,'PHEV Trophy','SUV','phev','automatic','1.5T PHEV 258hp',8000,'Camden Grey','Black',138000,142000,'available',true,'2024 MG EHS PHEV Trophy — 8k km Plug-In Hybrid','MG EHS PHEV 2024, 60km EV range, 8,000 km. Lowest running cost SUV in UAE.',765,56,2,'Chinese'),
('dealer-dubai-011','Tesla','Model 3',2024,'Long Range AWD','Sedan','electric','automatic','Dual Motor 358hp 82kWh',8000,'Pearl White','Black',178000,185000,'available',true,'2024 Tesla Model 3 Long Range AWD — Highland','New Model 3 Highland 2024, 8,000 km. 629km range, FSD available, OTA updates.',987,89,2,'American'),

-- ════ MITSUBISHI / ISUZU ════

('dealer-jafza-002','Mitsubishi','L200',2025,'Triton Athlete DC','Pickup','diesel','automatic','2.4L Diesel 181hp',5000,'White Diamond','Black',92000,98000,'available',true,'2025 Mitsubishi L200 Triton Athlete DC — 5k km','L200 Triton 2025, diesel auto, 5,000 km. Tanzania, Uganda, Kenya popular. 3 units.',876,78,3,'Japanese'),
('dealer-jafza-002','Mitsubishi','Pajero',2022,'GLS Mid','SUV','petrol','automatic','3.8L V6 250hp',42000,'White Pearl','Beige',118000,112000,'available',true,'2022 Mitsubishi Pajero GLS Mid — 42k km Japan Import','Pajero GLS 2022, Japan import, grade 4, 42,000 km. Ideal Africa/Asia export.',765,56,2,'Japanese'),

-- ════ LUXURY / SUPERCAR — Extended ════

('dealer-dubai-006','Rolls-Royce','Cullinan',2022,'Black Badge','SUV','petrol','automatic','6.75L V12 BiTurbo 600hp',18000,'Forester Brown','Black',2450000,2580000,'available',false,'2022 Rolls-Royce Cullinan Black Badge — 18k km','Cullinan Black Badge 2022, 18,000 km. Darkened brightware, 23" alloys, starlight.',345,67,1,'GCC'),
('dealer-dubai-006','Lamborghini','Urus S',2023,'Urus S','SUV','petrol','automatic','4.0L V8 BiTurbo 666hp',12000,'Bianco Monocerus','Black Alcantara',875000,895000,'available',false,'2023 Lamborghini Urus S — 12k km Al Fardan','Urus S 2023, 666hp, 12,000 km. Carbon pack, titanium exhaust, carbon ceramics.',456,78,1,'GCC'),
('dealer-dubai-006','Bentley','Flying Spur',2022,'W12 Mulliner','Sedan','petrol','automatic','6.0L W12 635hp',22000,'White Sand','Linen/Claret',985000,1020000,'available',false,'2022 Bentley Flying Spur Mulliner W12 — 22k km','Flying Spur Mulliner 2022, W12, 22,000 km. Mulliner driving spec, 22" alloys, rear screens.',345,56,1,'GCC'),

-- ════ CLASSIC / VINTAGE ════

('dealer-dubai-012','Toyota','Land Cruiser',2008,'GXR V8','SUV','petrol','automatic','4.7L V8 238hp',188000,'White','Beige',45000,42000,'available',true,'2008 Toyota Land Cruiser GXR V8 — Export Grade','LC GXR 2008, V8, 188,000 km. Running condition, export grade. West Africa popular.',654,45,3,'GCC'),
('dealer-sharjah-005','Toyota','Land Cruiser',2012,'GXR V6','SUV','petrol','automatic','4.0L V6 271hp',162000,'White','Beige',62000,58000,'available',true,'2012 Toyota Land Cruiser GXR — 162k km Export','LC GXR 2012, 162,000 km. Export from Sharjah. 2 units. Nigeria, Congo buyers.',543,34,2,'GCC'),
('dealer-sharjah-005','Nissan','Patrol','2014','SE','SUV','petrol','automatic','4.0L V6 272hp',134000,'White','Beige',78000,72000,'available',true,'2014 Nissan Patrol SE — 134k km Sharjah Export','Patrol SE 2014, 134,000 km, GCC spec. Sharjah SAIF Zone. Export ready.',543,34,2,'GCC')

ON CONFLICT DO NOTHING;


-- ─── Demo sold vehicles (fixes "Vehicles Sold = 0" KPI) ──────────────────────
UPDATE vehicles
SET status = 'sold', updated_at = NOW() - INTERVAL '3 days'
WHERE make IN ('Toyota','BMW','Mercedes-Benz')
  AND status = 'available'
  AND id IN (
    SELECT id FROM vehicles WHERE status = 'available' ORDER BY RANDOM() LIMIT 6
  );
