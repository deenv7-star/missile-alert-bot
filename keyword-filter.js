const KEYWORDS = {
  arabic: [
    // Missiles & rockets ONLY
    'صاروخ', 'صواريخ', 'إطلاق', 'باليستي', 'رأس حربي',
    'صاروخ كروز', 'صاروخ باليستي', 'صاروخ مجنح',
    'صاروخ فرط صوتي', 'صاروخ أرض أرض',
    // Active strikes
    'ضربة صاروخية', 'قصف جوي', 'ضربة استباقية',
    // Drones
    'مسيّرة', 'مسيرة', 'طائرة مسيّرة', 'طائرة بدون طيار',
    // Defense & interception
    'اعتراض', 'صافرات الإنذار',
    // Warnings & alerts
    'إنذار', 'تأهب', 'استنفار', 'إخلاء', 'ملاجئ', 'احتماء',
    // Explosions
    'انفجار', 'شظايا',
    // Breaking
    'عاجل', 'خبر عاجل',
  ],
  english: [
    // Missiles ONLY
    'missile', 'missiles', 'launch', 'launched', 'ballistic', 'warhead',
    'rocket', 'rockets', 'ICBM', 'cruise missile', 'hypersonic',
    // Active events
    'intercept', 'intercepted', 'inbound', 'incoming',
    // Drones
    'drone strike', 'UAV attack',
    // Alerts
    'siren', 'sirens', 'shelter', 'evacuate',
    // Breaking
    'BREAKING', 'breaking',
  ],
  hebrew: [
    // Missiles ONLY
    'טיל', 'טילים', 'שיגור', 'בליסטי', 'ראש נפץ',
    'טיל שיוט', 'טיל בליסטי',
    // Drones
    'מל"ט', 'כטב"מ',
    // Defense
    'יירוט',
    // Alerts
    'אזעקה', 'אזעקות', 'צבע אדום', 'מרחב מוגן',
    // Breaking
    'מבזק',
    // Active events
    'רקטה', 'רקטות', 'פיצוץ נשמע',
  ],
  persian: [
    // Missiles ONLY
    'موشک', 'پرتاب', 'بالستیک', 'کلاهک',
    'موشک بالستیک', 'حمله موشکی',
    // Drones
    'پهپاد',
    // Defense
    'رهگیری', 'آژیر',
    // Breaking
    'فوری',
  ],
  emoji: [
    '🚀', '💥', '🆘',
  ],
};

// Flatten all keywords
const ALL_KEYWORDS = Object.values(KEYWORDS).flat();

// CRITICAL = immediate launch/strike indicators
const CRITICAL_KEYWORDS = [
  'عاجل', 'خبر عاجل', 'إطلاق', 'صاروخ باليستي', 'ضربة صاروخية',
  'BREAKING', 'launched', 'inbound', 'incoming',
  'מבזק', 'צבע אדום', 'שיגור', 'טיל בליסטי',
  'پرتاب', 'حمله موشکی',
  '🚀', '🆘',
];

/**
 * Check if text contains missile-related keywords
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

function getKeywords() { return KEYWORDS; }
function getKeywordCount() { return ALL_KEYWORDS.length; }

module.exports = { filterText, getKeywords, getKeywordCount, ALL_KEYWORDS };
