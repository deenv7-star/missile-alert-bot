const KEYWORDS = {
  arabic: [
    // Missiles & rockets
    'صاروخ', 'صواريخ', 'إطلاق', 'باليستي', 'رأس حربي', 'منظومة',
    'صاروخ كروز', 'صاروخ باليستي', 'صاروخ مجنح', 'قذيفة',
    'صاروخ فرط صوتي', 'صاروخ عابر', 'صاروخ أرض أرض',
    // Attacks & strikes
    'هجوم', 'قصف', 'ضربة', 'غارة', 'قنبلة', 'تفجير', 'استهداف',
    'ضربة جوية', 'ضربة صاروخية', 'قصف جوي', 'عملية عسكرية',
    'ضربة استباقية', 'ضربات متتالية', 'هجوم شامل', 'هجوم واسع',
    // Drones & UAVs
    'مسيّرة', 'مسيرة', 'درون', 'طائرة مسيّرة', 'طائرة بدون طيار',
    // Defense & interception
    'دفاع جوي', 'اعتراض', 'منظومة دفاعية', 'صافرات الإنذار',
    // Warnings & alerts
    'تحذير', 'إنذار', 'تأهب', 'استنفار', 'حالة طوارئ',
    'إخلاء', 'ملاجئ', 'احتماء',
    // Explosions & damage
    'انفجار', 'سقوط', 'دمار', 'حطام', 'شظايا', 'إصابات',
    // Iran military
    'حرس الثوري', 'الحرس الثوري', 'سباه', 'خامنئي', 'IRGC',
    'فيلق القدس', 'قاسم سليماني', 'الباسيج', 'الجيش الإيراني',
    'طهران', 'إيران', 'أصفهان', 'بوشهر', 'نطنز', 'فوردو',
    // Nuclear
    'نووي', 'تخصيب', 'يورانيوم', 'مفاعل', 'سلاح نووي',
    'تخصيب اليورانيوم', 'منشأة نووية',
    // Strategic locations
    'ناقلة نفط', 'مضيق هرمز', 'خليج عمان', 'خليج فارس',
    'جزيرة خرج', 'بحر العرب', 'المتوسط',
    // Proxies
    'حوثي', 'حزب الله', 'محور المقاومة', 'الميليشيات',
    'الحشد الشعبي', 'كتائب حزب الله',
    // Israel specific
    'إسرائيل', 'تل أبيب', 'حيفا', 'ديمونا', 'نتنياهو',
    'الكيان', 'الاحتلال', 'الصهيوني',
    // Urgency phrases
    'عاجل', 'خبر عاجل', 'الآن', 'بث مباشر', 'لحظة',
  ],
  english: [
    // Missiles & weapons
    'missile', 'missiles', 'launch', 'launched', 'ballistic', 'warhead',
    'projectile', 'rocket', 'rockets', 'ICBM', 'cruise missile',
    'hypersonic', 'payload', 'munition',
    // Attacks
    'strike', 'attack', 'bombing', 'airstrike', 'air strike',
    'retaliation', 'retaliatory', 'preemptive',
    // Drones
    'drone', 'drones', 'UAV', 'unmanned',
    // Defense
    'intercept', 'intercepted', 'air defense', 'Iron Dome',
    'Arrow', 'David Sling', 'THAAD', 'Patriot',
    // Alerts
    'siren', 'sirens', 'alert', 'warning', 'shelter', 'evacuate',
    'incoming', 'inbound',
    // Iran
    'IRGC', 'Iran', 'Iranian', 'Tehran', 'Khamenei', 'Natanz',
    'Fordow', 'Isfahan', 'Bushehr', 'Quds Force',
    // Nuclear
    'nuclear', 'enrichment', 'uranium', 'centrifuge',
    // Strategic
    'Hormuz', 'Kharg', 'strait', 'escalation',
    // Proxies
    'Hezbollah', 'Houthi', 'Houthis', 'proxy', 'militia',
    // Israel targets
    'Haifa', 'Tel Aviv', 'Dimona', 'Nevatim', 'Ramon',
    // Breaking
    'breaking', 'BREAKING', 'urgent', 'URGENT', 'just in',
    'developing', 'confirmed',
  ],
  hebrew: [
    // Missiles
    'טיל', 'טילים', 'שיגור', 'בליסטי', 'ראש נפץ', 'טיל שיוט',
    'טיל בליסטי', 'טיל היפרסוני',
    // Drones
    'מל"ט', 'מלט', 'כטב"מ', 'רחפן', 'רחפנים',
    // Defense
    'יירוט', 'כיפת ברזל', 'חץ', 'קלע דוד', 'הגנה אווירית',
    // Alerts
    'התראה', 'אזעקה', 'אזעקות', 'צבע אדום', 'פיקוד העורף',
    'מרחב מוגן', 'מקלט', 'פינוי',
    // Attacks
    'פיצוץ', 'תקיפה', 'מתקפה', 'הפצצה', 'תגובה', 'תקיפה אווירית',
    'מבצע', 'מבצע צבאי',
    // Nuclear
    'גרעיני', 'העשרה', 'אורניום', 'צנטריפוגה', 'נשק גרעיני',
    // Iran
    'איראן', 'טהרן', 'חמינאי', 'משמרות המהפכה', 'אספהאן',
    'נתנז', 'פורדו', 'בושהר',
    // Strategic
    'הורמוז', 'מיצר הורמוז', 'אי חארג', 'הסלמה',
    // Proxies
    'חיזבאללה', 'חות\'י', 'חות\'ים', 'ציר ההתנגדות', 'מיליציות',
    // Targets
    'חיפה', 'תל אביב', 'דימונה', 'נבטים', 'רמון',
    // Breaking
    'מבזק', 'דחוף', 'עכשיו', 'פיצוץ נשמע',
    // Rockets from Gaza/Lebanon
    'רקטה', 'רקטות', 'נ"ט', 'ירי',
  ],
  persian: [
    // Missiles
    'موشک', 'پرتاب', 'بالستیک', 'کلاهک', 'موشک کروز',
    'موشک بالستیک', 'موشک مافوق صوت',
    // Attacks
    'حمله', 'حمله هوایی', 'بمباران', 'عملیات',
    'حمله موشکی', 'پاسخ', 'انتقام',
    // Drones
    'پهپاد', 'هواپیمای بدون سرنشین',
    // Defense
    'رهگیری', 'پدافند هوایی', 'سامانه دفاعی',
    // Alerts
    'هشدار', 'آژیر', 'اضطراری',
    // Iran military
    'سپاه', 'سپاه پاسداران', 'نیروی قدس', 'ارتش', 'بسیج',
    'خامنه‌ای', 'رهبر',
    // Nuclear
    'هسته‌ای', 'غنی‌سازی', 'اورانیوم', 'سانتریفیوژ',
    'تاسیسات هسته‌ای', 'نطنز', 'فردو', 'اصفهان', 'بوشهر',
    // Explosions
    'انفجار', 'جنگ', 'ویرانی',
    // Strategic
    'تنگه هرمز', 'خلیج فارس', 'جزیره خارک',
    // Breaking
    'فوری', 'اکنون', 'زنده',
  ],
  emoji: [
    '🚀', '🎯', '💥', '☢️', '⚠️', '🔥', '💣', '🛡️', '✈️', '🛩️',
    '🇮🇷', '🇮🇱', '🏴', '⚡', '🔴', '❗', '‼️', '🆘',
  ],
};

// Flatten all keywords into a single array
const ALL_KEYWORDS = Object.values(KEYWORDS).flat();

// Priority keywords that trigger IMMEDIATE high-priority alert
const CRITICAL_KEYWORDS = [
  'عاجل', 'خبر عاجل', 'إطلاق', 'صاروخ باليستي', 'ضربة صاروخية',
  'BREAKING', 'breaking', 'launched', 'inbound', 'incoming',
  'מבזק', 'צבע אדום', 'שיגור', 'טיל בליסטי',
  'فوری', 'پرتاب', 'حمله موشکی',
  '🚀', '🆘',
];

/**
 * Check if text contains any missile-related keywords
 * @param {string} text - The text to check
 * @returns {{ matches: boolean, matched: string[], priority: string }}
 */
function filterText(text) {
  if (!text) return { matches: false, matched: [], priority: 'none' };

  const lowerText = text.toLowerCase();
  const matched = [];
  let isCritical = false;

  for (const keyword of ALL_KEYWORDS) {
    const lowerKeyword = keyword.toLowerCase();
    if (lowerText.includes(lowerKeyword)) {
      matched.push(keyword);
    }
  }

  // Check if any critical keywords matched
  for (const keyword of CRITICAL_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      isCritical = true;
      break;
    }
  }

  const uniqueMatched = [...new Set(matched)];

  return {
    matches: uniqueMatched.length > 0,
    matched: uniqueMatched,
    priority: isCritical ? 'CRITICAL' : (uniqueMatched.length >= 3 ? 'HIGH' : 'NORMAL'),
  };
}

function getKeywords() {
  return KEYWORDS;
}

function getKeywordCount() {
  return ALL_KEYWORDS.length;
}

module.exports = { filterText, getKeywords, getKeywordCount, ALL_KEYWORDS };
