const RSSParser = require('rss-parser');
const config = require('./config');
const { filterText } = require('./keyword-filter');
const { hasSeen, markSeen } = require('./dedup');
const { sendAlert } = require('./telegram');

const parser = new RSSParser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
});

// Stats tracking
const stats = {
  scanned: 0,
  alerts: 0,
  lastCheck: 'Never',
  errors: 0,
  perAccount: {},
};

/**
 * Get RSS feed URL for an account
 */
function getFeedUrl(account, useFallback = false) {
  if (useFallback) {
    return config.rss.fallbackBase.replace('{account}', account);
  }
  return `${config.rss.baseUrl}${account}`;
}

/**
 * Fetch RSS feed with retry logic
 */
async function fetchFeed(account) {
  const maxRetries = 3;

  // Try primary URL
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const url = getFeedUrl(account, false);
      console.log(`[RSS] Fetching ${url} (attempt ${attempt})`);
      const feed = await parser.parseURL(url);
      return feed;
    } catch (err) {
      console.error(`[RSS] Primary feed failed for @${account} (attempt ${attempt}): ${err.message}`);
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Try fallback URL
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const url = getFeedUrl(account, true);
      console.log(`[RSS] Trying fallback ${url} (attempt ${attempt})`);
      const feed = await parser.parseURL(url);
      return feed;
    } catch (err) {
      console.error(`[RSS] Fallback feed failed for @${account} (attempt ${attempt}): ${err.message}`);
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  stats.errors++;
  return null;
}

/**
 * Check a single account for new missile-related posts
 */
async function checkAccount(account) {
  if (!stats.perAccount[account]) {
    stats.perAccount[account] = { scanned: 0, alerts: 0 };
  }

  const feed = await fetchFeed(account);
  if (!feed || !feed.items) {
    console.log(`[RSS] No feed data for @${account}`);
    return;
  }

  for (const item of feed.items) {
    const postId = item.guid || item.link || item.title;
    if (!postId) continue;

    stats.scanned++;
    stats.perAccount[account].scanned++;

    if (hasSeen(postId)) continue;

    // Combine title and content for keyword matching
    const fullText = [item.title, item.contentSnippet, item.content]
      .filter(Boolean)
      .join(' ');

    const result = filterText(fullText);

    if (result.matches) {
      console.log(`[ALERT] Match found for @${account}: ${result.matched.join(', ')}`);

      const tweetLink = item.link || `https://x.com/${account}`;

      await sendAlert({
        account,
        text: item.contentSnippet || item.title || fullText,
        link: tweetLink,
        matched: result.matched,
      });

      stats.alerts++;
      stats.perAccount[account].alerts++;
    }

    markSeen(postId);
  }
}

/**
 * Run a full check cycle on all accounts
 */
async function checkAll() {
  console.log(`[RSS] Starting check cycle for ${config.accounts.length} accounts...`);

  for (const account of config.accounts) {
    try {
      await checkAccount(account);
    } catch (err) {
      console.error(`[RSS] Error checking @${account}: ${err.message}`);
      stats.errors++;
    }
  }

  stats.lastCheck = new Date().toLocaleString('he-IL', {
    timeZone: config.timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  console.log(`[RSS] Check cycle complete. Total scanned: ${stats.scanned}, Alerts: ${stats.alerts}`);
}

/**
 * Test RSS connectivity
 */
async function testConnectivity() {
  const results = {};
  for (const account of config.accounts) {
    try {
      const url = getFeedUrl(account, false);
      await parser.parseURL(url);
      results[account] = 'OK (primary)';
    } catch {
      try {
        const url = getFeedUrl(account, true);
        await parser.parseURL(url);
        results[account] = 'OK (fallback)';
      } catch {
        results[account] = 'FAILED';
      }
    }
  }
  return results;
}

function getStats() {
  return { ...stats };
}

module.exports = { checkAll, testConnectivity, getStats };
