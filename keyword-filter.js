const KEYWORDS = {
  arabic: [
    'صاروخ', 'صواريخ', 'إطلاق', 'باليستي', 'هجوم', 'قصف', 'ضربة',
    'مسيّرة', 'درون', 'طائرة مسيّرة', 'دفاع جوي', 'اعتراض',
    'تحذير', 'إنذار', 'انفجار', 'سقوط', 'حرس الثوري', 'الحرس الثوري',
    'سباه', 'خامنئي', 'IRGC', 'نووي', 'تخصيب', 'يورانيوم',
    'ناقلة نفط', 'مضيق هرمز', 'خليج عمان', 'غارة', 'قنبلة',
    'رأس حربي', 'منظومة', 'صافر', 'حوثي', 'حزب الله',
  ],
  english: [
    'missile', 'launch', 'ballistic', 'strike', 'attack', 'drone',
    'intercept', 'IRGC', 'warhead', 'projectile', 'air defense',
    'explosion', 'nuclear', 'enrichment', 'uranium', 'Hormuz',
    'Kharg', 'rocket', 'bombing', 'airstrike', 'Hezbollah',
    'Houthi', 'Iron Dome', 'siren', 'alert',
  ],
  hebrew: [
    'טיל', 'טילים', 'שיגור', 'בליסטי', 'מל"ט', 'מלט', 'יירוט',
    'התראה', 'פיצוץ', 'תקיפה', 'מתקפה', 'גרעיני', 'העשרה',
    'אורניום', 'הורמוז', 'רקטה', 'רקטות', 'צבע אדום',
    'כיפת ברזל', 'אזעקה', 'חיזבאללה', 'חות\'י',
  ],
  persian: [
    'موشک', 'پرتاب', 'بالستیک', 'حمله', 'پهپاد', 'سپاه',
    'رهگیری', 'انفجار', 'جنگ', 'هسته‌ای', 'غنی‌سازی',
    'اورانیوم', 'تنگه هرمز',
  ],
};

// Flatten all keywords into a single array
const ALL_KEYWORDS = Object.values(KEYWORDS).flat();

/**
 * Check if text contains any missile-related keywords
 * @param {string} text - The text to check
 * @returns {{ matches: boolean, matched: string[] }}
 */
function filterText(text) {
  if (!text) return { matches: false, matched: [] };

  const lowerText = text.toLowerCase();
  const matched = [];

  for (const keyword of ALL_KEYWORDS) {
    const lowerKeyword = keyword.toLowerCase();
    if (lowerText.includes(lowerKeyword)) {
      matched.push(keyword);
    }
  }

  return {
    matches: matched.length > 0,
    matched: [...new Set(matched)], // deduplicate
  };
}

/**
 * Get all keywords organized by language
 */
function getKeywords() {
  return KEYWORDS;
}

/**
 * Get total keyword count
 */
function getKeywordCount() {
  return ALL_KEYWORDS.length;
}

module.exports = { filterText, getKeywords, getKeywordCount, ALL_KEYWORDS };
