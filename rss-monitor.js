const https = require('https');
const config = require('./config');
const { filterText } = require('./keyword-filter');
const { hasSeen, markSeen } = require('./dedup');
const { sendAlert } = require('./telegram');

const stats = {
  scanned: 0,
  alerts: 0,
  lastCheck: 'Never',
  errors: 0,
  perAccount: {},
};

// RSS.app feed URLs mapped to accounts
const RSS_FEEDS = {
  'iranin_arabic': 'https://rss.app/feeds/21Dc0Q0dMINbGdRV.xml',
  'urgent_iran': 'https://rss.app/feeds/unj1fQnsEnfyWr6K.xml',
};

/**
 * Fetch a URL
 */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchUrl(res.headers.location).then(resolve).catch(reject);
        return;
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode} from ${urlObj.hostname}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(20000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${urlObj.hostname}`));
    });
    req.end();
  });
}

/**
 * Parse RSS XML
 */
function parseRSS(xml, account) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const description = extractTag(itemXml, 'description');
    const guid = extractTag(itemXml, 'guid') || link;

    const cleanText = (description || title || '')
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();

    if (cleanText) {
      items.push({
        text: cleanText,
        link: link || `https://x.com/${account}`,
        guid: guid || cleanText.substring(0, 50),
      });
    }
  }

  // Also try Atom format (entry instead of item)
  if (items.length === 0) {
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entryXml = match[1];
      const title = extractTag(entryXml, 'title');
      const linkMatch = entryXml.match(/<link[^>]*href="([^"]+)"/);
      const link = linkMatch ? linkMatch[1] : '';
      const content = extractTag(entryXml, 'content') || extractTag(entryXml, 'summary');
      const id = extractTag(entryXml, 'id') || link;

      const cleanText = (content || title || '')
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();

      if (cleanText) {
        items.push({ text: cleanText, link, guid: id });
      }
    }
  }

  return items;
}

function extractTag(xml, tag) {
  const regex = new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`
  );
  const match = regex.exec(xml);
  if (match) return (match[1] || match[2] || '').trim();
  return '';
}

/**
 * Fetch tweets for an account via RSS.app
 */
async function fetchTweets(account) {
  const feedUrl = RSS_FEEDS[account];
  if (!feedUrl) {
    console.log(`[RSS] No feed URL configured for @${account}`);
    return null;
  }

  try {
    console.log(`[RSS] Fetching ${feedUrl} for @${account}`);
    const xml = await fetchUrl(feedUrl);
    const items = parseRSS(xml, account);
    console.log(`[RSS] Got ${items.length} items for @${account}`);
    return items;
  } catch (err) {
    console.error(`[RSS] Error fetching @${account}: ${err.message}`);
    stats.errors++;
    return null;
  }
}

/**
 * Check a single account
 */
async function checkAccount(account) {
  if (!stats.perAccount[account]) {
    stats.perAccount[account] = { scanned: 0, alerts: 0 };
  }

  const tweets = await fetchTweets(account);
  if (!tweets || tweets.length === 0) {
    console.log(`[MONITOR] No data for @${account}`);
    return;
  }

  for (const tweet of tweets) {
    const postId = tweet.guid || tweet.link;
    if (!postId) continue;

    stats.scanned++;
    stats.perAccount[account].scanned++;

    if (hasSeen(postId)) continue;

    const result = filterText(tweet.text);

    if (result.matches) {
      console.log(`[ALERT] Match for @${account}: ${result.matched.join(', ')}`);

      await sendAlert({
        account,
        text: tweet.text,
        link: tweet.link,
        matched: result.matched,
      });

      stats.alerts++;
      stats.perAccount[account].alerts++;
    }

    markSeen(postId);
  }
}

async function checkAll() {
  console.log(`[MONITOR] Starting check cycle for ${config.accounts.length} accounts...`);

  for (const account of config.accounts) {
    try {
      await checkAccount(account);
    } catch (err) {
      console.error(`[MONITOR] Error checking @${account}: ${err.message}`);
      stats.errors++;
    }
  }

  stats.lastCheck = new Date().toLocaleString('he-IL', {
    timeZone: config.timezone,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  console.log(`[MONITOR] Check cycle complete. Scanned: ${stats.scanned}, Alerts: ${stats.alerts}`);
}

async function testConnectivity() {
  const results = {};
  for (const account of config.accounts) {
    try {
      const tweets = await fetchTweets(account);
      results[account] = tweets && tweets.length > 0
        ? `OK (${tweets.length} tweets)`
        : 'FAILED (no tweets)';
    } catch (err) {
      results[account] = `FAILED: ${err.message}`;
    }
  }
  return results;
}

function getStats() {
  return { ...stats };
}

module.exports = { checkAll, testConnectivity, getStats };
