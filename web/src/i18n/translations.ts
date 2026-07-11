// Central translation dictionary. Keep keys flat and namespaced by section
// (nav.*, footer.*, home.*) so it's obvious where each string is used.
// Add more keys here as more pages get translated — the LocaleContext falls
// back to the English string (or the raw key) if a translation is missing,
// so partial coverage never breaks the page.

export type Locale = 'en' | 'ar';

export const LOCALES: { code: Locale; label: string; flag: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'ar', label: 'العربية', flag: '🇦🇪', dir: 'rtl' },
];

export const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Nav
    'nav.marketplace': 'Marketplace',
    'nav.brands': 'Brands',
    'nav.brokers': 'Brokers',
    'nav.login': 'Sign in',
    'nav.language': 'Language',

    // Footer
    'footer.rights': 'All rights reserved.',
    'footer.tagline': 'The AI Automotive Trade Hub for the GCC.',

    // Homepage hero
    'home.badge': 'Dubai Free Zone · JAFZA · Sharjah',
    'home.title.line1': 'The AI Automotive',
    'home.title.line2': 'Trade Hub for the GCC',
    'home.subtitle': 'SnapHubTrade.com turns stock management into a 30-second job, and gives every dealer and broker an AI sales copilot backed by real market intelligence.',
    'home.search.placeholder': 'Search make, model, year…',
    'home.search.button': 'Search',

    // Pillars
    'home.pillars.eyebrow': 'One platform, four superpowers',
    'home.pillars.title': 'Built for dealers and brokers who move fast',
    'home.pillar1.title': 'Dealer & Broker Platform',
    'home.pillar1.desc': 'One workspace for dealers and brokers — list, price, and manage your entire stock in seconds, not hours.',
    'home.pillar2.title': 'TwinOS',
    'home.pillar2.desc': 'Your always-on assistant across the platform — understands your inventory and answers instantly.',
    'home.pillar3.title': 'Market Intelligence Engine',
    'home.pillar3.desc': 'A proprietary market data lake that tracks pricing, demand, and trends — and gets smarter every day.',
    'home.pillar4.title': 'AI Twin',
    'home.pillar4.desc': 'A virtual sales director working 24/7: daily briefs, live recommendations, and ready-to-send marketing.',

    // Features
    'home.features.title': 'Built for UAE dealers, brokers and global buyers',
    'home.feature1.title': 'Verified dealers',
    'home.feature1.desc': 'All dealers are KYC verified with valid UAE Free Zone licenses.',
    'home.feature2.title': 'Stock in seconds',
    'home.feature2.desc': "Powered by TwinOS: AI auto-fills specs and suggests competitive prices as you type.",
    'home.feature3.title': 'Export ready',
    'home.feature3.desc': 'Vehicles marked export-eligible with Jebel Ali Port RoRo logistics.',

    // CTA
    'home.cta.title': 'Meet TwinOS — not sure what to buy?',
    'home.cta.desc': "Ask TwinOS, SnapHubTrade.com's intelligent assistant, for personalized recommendations, price estimates, and export advice — available 24/7 in the bottom corner.",
    'home.cta.button': 'Click the chat bubble to start',

    // Marketplace
    'marketplace.search.placeholder': 'Search by make, model, year, keyword…',
    'marketplace.ai_search.placeholder': "Try: 'SUV under 150k for family', 'best pickup for Africa export', 'luxury EV'…",
    'marketplace.empty': 'No vehicles found',
    'marketplace.save_search.title': 'Search saved!',
    'marketplace.filter.make': 'Make',
    'marketplace.filter.make.all': 'All makes',
    'marketplace.filter.fuel': 'Fuel type',
    'marketplace.filter.fuel.any': 'Any fuel',
    'marketplace.filter.price_min': 'Min price',
    'marketplace.filter.price_min.placeholder': 'AED 0',
    'marketplace.filter.price_max': 'Max price',
    'marketplace.filter.price_max.placeholder': 'No limit',
    'marketplace.filter.sort': 'Sort by',
    'marketplace.filter.reset': '✕ Reset filters',

    // Dealers directory
    'dealers.title': 'GCC Dealer Directory',

    // Vehicle detail — page chrome only (specs/prices are real data, not translated)
    'vehicle.contact_dealer': 'Contact dealer',
    'vehicle.share': 'Share',

    // Login
    'login.title': 'Welcome back',
    'login.signin_as': 'Sign in as',
    'login.subtitle': 'Sign in to your account',
    'login.error.password_required': 'Password is required',
    'login.error.invalid_credentials': 'Incorrect email or password',

    // Register dealer
    'register.title': 'List your vehicles',
    'register.success.title': 'Account created!',
    'register.field.company': 'Company / Full name',
    'register.field.email': 'Email',
    'register.field.phone': 'Phone / WhatsApp',
    'register.field.password': 'Password',
    'register.field.country': 'Country',
    'register.field.free_zone': 'Free zone (optional)',
    'register.field.free_zone.none': 'Not in a free zone',
    'register.field.city': 'City',
    'register.field.referral': 'Referral code (optional)',
    'register.field.referral.placeholder': 'e.g. BROKER-ABCD',
    'register.field.referral.hint': "Have a code from a broker or dealer who invited you? Enter it here.",
    'register.button.creating': 'Creating account…',
    'register.button.submit': 'Create dealer account',
    'register.already_have_account': 'Already have an account?',
    'register.sign_in': 'Sign in',

    // Join (buyer)
    'join.title': 'Create your free account',
    'join.success.title': 'Welcome to SnapHubTrade.com!',

    // Export hub
    'export.title': '✈️ Export Intelligence Hub',

    // Compare
    'compare.title': '⚖️ Vehicle Comparison',

    // Pricing plans
    'pricing.features_table': 'Full feature comparison',
    'pricing.faq': 'Common questions',

    // Broker programme
    'broker.welcome': 'Welcome to the programme!',

    // Catalog
    'catalog.brands.title': 'All Brands',
    'catalog.models.title': 'Model database',
    'catalog.technologies.title': 'Powertrain Technologies',

    // Dealer dashboard shell
    'dealer.dashboard.title': 'Dealer Dashboard',
    'dealer.reports.title': '📊 AI Weekly Market Reports',
    'dealer.billing.title': 'Billing',
    'dealer.brokers.title': 'Brokers',
    'dealer.subscription.title': 'My Subscription',
    'dealer.requests.title': 'Customer Requests',
    'dealer.scan.title': 'Quick Actions & Smart Scan',
    'dealer.pricing.title': 'AI Pricing Intelligence',
    'dealer.inventory.published': 'Vehicle published!',
    'vform.section.details': 'Vehicle details',
    'vform.not_logged_in': 'Not logged in as dealer.',
    'vform.sign_in': 'Sign in',
    'vform.make': 'Make *',
    'vform.make.select': 'Select make…',
    'vform.model': 'Model *',
    'vform.year': 'Year *',
    'vform.trim': 'Trim / Variant',
    'vform.body_type': 'Body type',
    'vform.fuel_type': 'Fuel type',
    'vform.transmission': 'Transmission',
    'vform.engine': 'Engine',
    'vform.engine.hint': 'e.g. 3.5L V6 Twin-Turbo',
    'vform.mileage': 'Mileage (km)',
    'vform.mileage.hint': '0 = Brand new',
    'vform.color_ext': 'Exterior color',
    'vform.color_int': 'Interior color',
    'vform.vin': 'VIN (chassis number)',
    'vform.vin.hint': '17-char vehicle identifier',
    'vform.plate': 'Plate number',
    'vform.plate.hint': 'UAE plate for OCR scan',
    'vform.quantity': 'Quantity in stock',
    'vform.quantity.hint': 'For bulk lots (e.g. 10 Hilux = enter 10)',
    'vform.qr_note': '✓ QR code auto-generated after saving',
    'vform.price': 'Listing price (AED) *',
    'vform.ai_suggest_price': '🧠 AI suggest price',
    'vform.status': 'Status',
    'vform.status.available': 'Available',
    'vform.status.draft': 'Draft',
    'vform.status.reserved': 'Reserved',
    'vform.export_eligible': 'Export eligible',
    'vform.export_ready': '✈ Export ready',
    'vform.local_only': 'Local only',
    'vform.listing_title': 'Listing title',
    'vform.description': 'Description',
    'vform.description.placeholder': 'Vehicle condition, options, service history, export details…',
    'vform.error.make_required': 'Make is required',
    'vform.error.model_required': 'Model is required',
    'vform.error.price_required': 'Price is required',
    'vform.error.not_logged_in': 'Not logged in as dealer. Go to /login',
    'dealer.shared.title': 'Shared Inventory',
    'dealer.shared.success': 'Vehicle shared!',
    'dealer.widget.title': 'iOS & Android Widget',

    // Dealer sidebar nav
    'dealer.nav.dashboard': 'Dashboard',
    'dealer.nav.requests': 'Customer Requests',
    'dealer.nav.add_vehicle': 'Add vehicle',
    'dealer.nav.shared_inventory': 'Shared inventory',
    'dealer.nav.smart_scan': 'Smart scan',
    'dealer.nav.pricing_ai': 'Pricing AI',
    'dealer.nav.global_trade': 'Global Trade Intelligence',
    'dealer.nav.brokers': 'Brokers',
    'dealer.nav.invoices': 'Invoices',
    'dealer.nav.ios_widget': 'iOS Widget',
    'dealer.nav.my_plan': 'My Plan',
    'dealer.toast.sold_invoice': 'Sold · Invoice {{n}} created as draft → Invoices',
    'dealer.toast.sale_confirmed': 'Sale confirmed · Invoice {{n}} created as draft → Invoices',
  },
  ar: {
    // Nav
    'nav.marketplace': 'السوق',
    'nav.brands': 'الماركات',
    'nav.brokers': 'الوسطاء',
    'nav.login': 'تسجيل الدخول',
    'nav.language': 'اللغة',

    // Footer
    'footer.rights': 'جميع الحقوق محفوظة.',
    'footer.tagline': 'مركز التجارة السيارات الذكي لدول الخليج.',

    // Homepage hero
    'home.badge': 'دبي المنطقة الحرة · جبل علي · الشارقة',
    'home.title.line1': 'مركز تجارة السيارات الذكي',
    'home.title.line2': 'لدول مجلس التعاون الخليجي',
    'home.subtitle': 'تحوّل SnapHubTrade.com إدارة المخزون إلى مهمة تستغرق 30 ثانية فقط، وتمنح كل تاجر ووسيط مساعد مبيعات ذكيًا مدعومًا ببيانات السوق الحقيقية.',
    'home.search.placeholder': 'ابحث عن الماركة، الموديل، السنة…',
    'home.search.button': 'بحث',

    // Pillars
    'home.pillars.eyebrow': 'منصة واحدة، أربع قوى خارقة',
    'home.pillars.title': 'مصممة للتجار والوسطاء الذين يتحركون بسرعة',
    'home.pillar1.title': 'منصة التجار والوسطاء',
    'home.pillar1.desc': 'مساحة عمل واحدة للتجار والوسطاء — أدرج، سعّر، وأدر مخزونك بالكامل في ثوانٍ لا ساعات.',
    'home.pillar2.title': 'TwinOS',
    'home.pillar2.desc': 'مساعدك الدائم عبر المنصة — يفهم مخزونك ويجيب فورًا.',
    'home.pillar3.title': 'محرك ذكاء السوق',
    'home.pillar3.desc': 'بحيرة بيانات سوقية خاصة تتتبع الأسعار والطلب والاتجاهات — وتزداد ذكاءً كل يوم.',
    'home.pillar4.title': 'AI Twin',
    'home.pillar4.desc': 'مدير مبيعات افتراضي يعمل على مدار الساعة: ملخصات يومية، توصيات فورية، وحملات تسويقية جاهزة للإرسال.',

    // Features
    'home.features.title': 'مصممة لتجار ووسطاء الإمارات والمشترين حول العالم',
    'home.feature1.title': 'تجار موثوقون',
    'home.feature1.desc': 'جميع التجار موثقون (KYC) ويملكون تراخيص مناطق حرة سارية في الإمارات.',
    'home.feature2.title': 'مخزون في ثوانٍ',
    'home.feature2.desc': 'مدعوم بـ TwinOS: الذكاء الاصطناعي يملأ المواصفات تلقائيًا ويقترح أسعارًا تنافسية أثناء الكتابة.',
    'home.feature3.title': 'جاهز للتصدير',
    'home.feature3.desc': 'مركبات مؤهلة للتصدير عبر خدمات RoRo اللوجستية في ميناء جبل علي.',

    // CTA
    'home.cta.title': 'تعرّف على TwinOS — لست متأكدًا ماذا تشتري؟',
    'home.cta.desc': 'اسأل TwinOS، المساعد الذكي من SnapHubTrade.com، للحصول على توصيات مخصصة وتقديرات أسعار ونصائح تصدير — متاح على مدار الساعة في الزاوية السفلية.',
    'home.cta.button': 'انقر على فقاعة الدردشة للبدء',

    // Marketplace
    'marketplace.search.placeholder': 'ابحث بالماركة، الموديل، السنة، كلمة مفتاحية…',
    'marketplace.ai_search.placeholder': 'جرّب: "سيارة دفع رباعي أقل من 150 ألف للعائلة"، "أفضل بيك أب للتصدير لأفريقيا"، "سيارة كهربائية فاخرة"…',
    'marketplace.empty': 'لم يتم العثور على مركبات',
    'marketplace.save_search.title': 'تم حفظ البحث!',
    'marketplace.filter.make': 'الماركة',
    'marketplace.filter.make.all': 'جميع الماركات',
    'marketplace.filter.fuel': 'نوع الوقود',
    'marketplace.filter.fuel.any': 'أي وقود',
    'marketplace.filter.price_min': 'أقل سعر',
    'marketplace.filter.price_min.placeholder': 'درهم 0',
    'marketplace.filter.price_max': 'أعلى سعر',
    'marketplace.filter.price_max.placeholder': 'بلا حد',
    'marketplace.filter.sort': 'الترتيب حسب',
    'marketplace.filter.reset': '✕ إعادة تعيين الفلاتر',

    // Dealers directory
    'dealers.title': 'دليل تجار دول الخليج',

    // Vehicle detail
    'vehicle.contact_dealer': 'تواصل مع التاجر',
    'vehicle.share': 'مشاركة',

    // Login
    'login.title': 'مرحبًا بعودتك',
    'login.signin_as': 'تسجيل الدخول كـ',
    'login.subtitle': 'سجّل الدخول إلى حسابك',
    'login.error.password_required': 'كلمة المرور مطلوبة',
    'login.error.invalid_credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',

    // Register dealer
    'register.title': 'أدرج مركباتك',
    'register.success.title': 'تم إنشاء الحساب!',
    'register.field.company': 'الشركة / الاسم الكامل',
    'register.field.email': 'البريد الإلكتروني',
    'register.field.phone': 'الهاتف / واتساب',
    'register.field.password': 'كلمة المرور',
    'register.field.country': 'الدولة',
    'register.field.free_zone': 'المنطقة الحرة (اختياري)',
    'register.field.free_zone.none': 'ليست ضمن منطقة حرة',
    'register.field.city': 'المدينة',
    'register.field.referral': 'رمز الإحالة (اختياري)',
    'register.field.referral.placeholder': 'مثال: BROKER-ABCD',
    'register.field.referral.hint': 'هل لديك رمز من وسيط أو تاجر دعاك؟ أدخله هنا.',
    'register.button.creating': 'جارٍ إنشاء الحساب…',
    'register.button.submit': 'إنشاء حساب تاجر',
    'register.already_have_account': 'لديك حساب بالفعل؟',
    'register.sign_in': 'تسجيل الدخول',

    // Join (buyer)
    'join.title': 'أنشئ حسابك المجاني',
    'join.success.title': 'مرحبًا بك في SnapHubTrade.com!',

    // Export hub
    'export.title': '✈️ مركز ذكاء التصدير',

    // Compare
    'compare.title': '⚖️ مقارنة المركبات',

    // Pricing plans
    'pricing.features_table': 'مقارنة كاملة للميزات',
    'pricing.faq': 'أسئلة شائعة',

    // Broker programme
    'broker.welcome': 'مرحبًا بك في البرنامج!',

    // Catalog
    'catalog.brands.title': 'جميع الماركات',
    'catalog.models.title': 'قاعدة بيانات الموديلات',
    'catalog.technologies.title': 'تقنيات نظام الدفع',

    // Dealer dashboard shell
    'dealer.dashboard.title': 'لوحة تحكم التاجر',
    'dealer.reports.title': '📊 تقارير السوق الأسبوعية بالذكاء الاصطناعي',
    'dealer.billing.title': 'الفواتير',
    'dealer.brokers.title': 'الوسطاء',
    'dealer.subscription.title': 'اشتراكي',
    'dealer.requests.title': 'طلبات العملاء',
    'dealer.scan.title': 'إجراءات سريعة ومسح ذكي',
    'dealer.pricing.title': 'ذكاء التسعير',
    'dealer.inventory.published': 'تم نشر المركبة!',
    'vform.section.details': 'تفاصيل المركبة',
    'vform.not_logged_in': 'لم يتم تسجيل الدخول كتاجر.',
    'vform.sign_in': 'تسجيل الدخول',
    'vform.make': 'الماركة *',
    'vform.make.select': 'اختر الماركة…',
    'vform.model': 'الموديل *',
    'vform.year': 'السنة *',
    'vform.trim': 'الفئة / الإصدار',
    'vform.body_type': 'نوع الهيكل',
    'vform.fuel_type': 'نوع الوقود',
    'vform.transmission': 'ناقل الحركة',
    'vform.engine': 'المحرك',
    'vform.engine.hint': 'مثال: 3.5L V6 توين توربو',
    'vform.mileage': 'المسافة المقطوعة (كم)',
    'vform.mileage.hint': '0 = جديدة تمامًا',
    'vform.color_ext': 'اللون الخارجي',
    'vform.color_int': 'اللون الداخلي',
    'vform.vin': 'رقم الشاصي (VIN)',
    'vform.vin.hint': 'معرّف المركبة من 17 حرفًا',
    'vform.plate': 'رقم اللوحة',
    'vform.plate.hint': 'لوحة إماراتية لمسح OCR',
    'vform.quantity': 'الكمية في المخزون',
    'vform.quantity.hint': 'للدفعات الكبيرة (مثال: 10 هايلوكس = أدخل 10)',
    'vform.qr_note': '✓ يتم إنشاء رمز QR تلقائيًا بعد الحفظ',
    'vform.price': 'سعر الإدراج (درهم) *',
    'vform.ai_suggest_price': '🧠 اقتراح السعر بالذكاء الاصطناعي',
    'vform.status': 'الحالة',
    'vform.status.available': 'متاحة',
    'vform.status.draft': 'مسودة',
    'vform.status.reserved': 'محجوزة',
    'vform.export_eligible': 'مؤهلة للتصدير',
    'vform.export_ready': '✈ جاهزة للتصدير',
    'vform.local_only': 'محلي فقط',
    'vform.listing_title': 'عنوان الإعلان',
    'vform.description': 'الوصف',
    'vform.description.placeholder': 'حالة المركبة، الخيارات، سجل الصيانة، تفاصيل التصدير…',
    'vform.error.make_required': 'الماركة مطلوبة',
    'vform.error.model_required': 'الموديل مطلوب',
    'vform.error.price_required': 'السعر مطلوب',
    'vform.error.not_logged_in': 'لم يتم تسجيل الدخول كتاجر. اذهب إلى /login',
    'dealer.shared.title': 'المخزون المشترك',
    'dealer.shared.success': 'تمت مشاركة المركبة!',
    'dealer.widget.title': 'تطبيق iOS و Android',

    // Dealer sidebar nav
    'dealer.nav.dashboard': 'لوحة التحكم',
    'dealer.nav.requests': 'طلبات العملاء',
    'dealer.nav.add_vehicle': 'إضافة مركبة',
    'dealer.nav.shared_inventory': 'المخزون المشترك',
    'dealer.nav.smart_scan': 'المسح الذكي',
    'dealer.nav.pricing_ai': 'ذكاء التسعير',
    'dealer.nav.global_trade': 'ذكاء التجارة العالمية',
    'dealer.nav.brokers': 'الوسطاء',
    'dealer.nav.invoices': 'الفواتير',
    'dealer.nav.ios_widget': 'تطبيق iOS',
    'dealer.nav.my_plan': 'خطتي',
    'dealer.toast.sold_invoice': 'تم البيع · تم إنشاء الفاتورة {{n}} كمسودة ← الفواتير',
    'dealer.toast.sale_confirmed': 'تم تأكيد البيع · تم إنشاء الفاتورة {{n}} كمسودة ← الفواتير',
  },
};
