/**
 * TWO-LAYER DETECTION:
 * Layer 1: "weapon words" — missile, rocket, drone, etc.
 * Layer 2: "action words" — launch, strike, intercept, siren, etc.
 * 
 * Alert triggers ONLY when BOTH layers match.
 * Exception: certain standalone phrases always trigger (e.g. "צבע אדום")
 */

const WEAPON_WORDS = [
  // Arabic
  'صاروخ', 'صواريخ', 'باليستي', 'رأس حربي',
  'صاروخ كروز', 'صاروخ باليستي', 'صاروخ مجنح',
  'صاروخ فرط صوتي', 'صاروخ أرض أرض',
  'مسيّرة', 'مسيرة', 'طائرة مسيّرة', 'طائرة بدون طيار',
  // English
  'missile', 'missiles', 'ballistic', 'warhead',
  'rocket', 'rockets', 'ICBM', 'cruise missile', 'hypersonic',
  'drone', 'drones', 'UAV',
  // Hebrew
  'טיל', 'טילים', 'בליסטי', 'ראש נפץ',
  'טיל שיוט', 'טיל בליסטי',
  'מל"ט', 'כטב"מ', 'רחפן',
  'רקטה', 'רקטות',
  // Persian
  'موشک', 'بالستیک', 'کلاهک',
  'موشک بالستیک', 'پهپاد',
];

const ACTION_WORDS = [
  // Arabic
  'إطلاق', 'أطلق', 'أطلقت', 'ضربة صاروخية', 'قصف',
  'اعتراض', 'سقوط', 'سقطت', 'انفجار',
  'صافرات الإنذار', 'إنذار', 'إخلاء', 'احتماء',
  // English
  'launch', 'launched', 'launching', 'fired', 'firing',
  'intercept', 'intercepted', 'inbound', 'incoming',
  'struck', 'hitting', 'siren', 'sirens',
  'shelter', 'evacuate', 'explosion',
  // Hebrew
  'שיגור', 'שוגר', 'שוגרו', 'יירוט', 'יורט',
  'אזעקה', 'אזעקות', 'פיצוץ', 'נפילה', 'נפילות',
  'מרחב מוגן', 'פינוי',
  // Persian
  'پرتاب', 'شلیک', 'رهگیری', 'آژیر',
  'حمله موشکی',
];

// These phrases ALWAYS trigger alert on their own (no combo needed)
const STANDALONE_TRIGGERS = [
  'צבע אדום',
  'صاروخ باليستي',
  'ضربة صاروخية',
  'حمله موشکی',
  'טיל בליסטי',
  'ballistic missile',
  'missile launch',
  'missile launched',
  'missiles launched',
  'rockets fired',
  'פיצוץ נשמע',
  '🚀',
];

// CRITICAL = confirmed launch/impact
const CRITICAL_TRIGGERS = [
  'צבע אדום',
  'صاروخ باليستي',
  'ضربة صاروخية',
  'حمله موشکی',
  'טיל בליסטי',
  'ballistic missile',
  'missile launch',
  'missiles launched',
  'inbound',
  'incoming missile',
  'פיצוץ נשמע',
];

/**
 * Check if text is about an active missile/drone event
 */
function filterText(text) {
  if (!text) return { matches: false, matched: [], priority: 'none' };

  const lowerText = text.toLowerCase();
  const matched = [];
  let isCritical = false;

  // Check standalone triggers first
  for (const trigger of STANDALONE_TRIGGERS) {
    if (lowerText.includes(trigger.toLowerCase())) {
      matched.push(trigger);
    }
  }

  // Check for CRITICAL
  for (const trigger of CRITICAL_TRIGGERS) {
    if (lowerText.includes(trigger.toLowerCase())) {
      isCritical = true;
      break;
    }
  }

  // If no standalone match, check for weapon + action combo
  if (matched.length === 0) {
    const weaponMatches = [];
    const actionMatches = [];

    for (const word of WEAPON_WORDS) {
      if (lowerText.includes(word.toLowerCase())) {
        weaponMatches.push(word);
      }
    }

    for (const word of ACTION_WORDS) {
      if (lowerText.includes(word.toLowerCase())) {
        actionMatches.push(word);
      }
    }

    // BOTH must match
    if (weaponMatches.length > 0 && actionMatches.length > 0) {
      matched.push(...weaponMatches, ...actionMatches);
    }
  }

  const uniqueMatched = [...new Set(matched)];

  return {
    matches: uniqueMatched.length > 0,
    matched: uniqueMatched,
    priority: isCritical ? 'CRITICAL' : (uniqueMatched.length >= 4 ? 'HIGH' : 'NORMAL'),
  };
}

function getKeywords() {
  return { WEAPON_WORDS, ACTION_WORDS, STANDALONE_TRIGGERS };
}

function getKeywordCount() {
  return WEAPON_WORDS.length + ACTION_WORDS.length + STANDALONE_TRIGGERS.length;
}

module.exports = { filterText, getKeywords, getKeywordCount };
