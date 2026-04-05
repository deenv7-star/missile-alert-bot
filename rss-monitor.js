const https = require('https');
const http = require('http');
const config = require('./config');
const { filterText } = require('./keyword-filter');
const { hasSeen, markSeen } = require('./dedup');
const { sendAlert } = require('./telegram');

// Stats tracking
const stats = {
  scanned: 0,
  alerts: 0,
  lastCheck: 'Never',
  errors: 0,
  perAccount: {},
};

// List of Nitter instances to try (with RSS support)
const NITTER_INSTANCES = [
  'https://xcancel.com',
  'https://nitter.poast.org',
  'https://nitter.privacyredirect.com',
  'https://lightbrd.com',
  'https://nitter.tiekoetter.com',
  'https://nitter.catsarch.com',
];

/**
 * Fetch URL with browser-like headers
 */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    };

    const req = client.request(options, (res) => {
      // Handle redirects
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
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${urlObj.hostname}`));
    });
    req.end();
  });
}

/**
 * Parse RSS XML manually (no external dependency needed)
 */
function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const description = extractTag(itemXml, 'description');
    const guid = extractTag(itemXml, 'guid') || link;
    const pubDate = extractTag(itemXml, 'pubDate');

    // Clean HTML from description
    const cleanText = description
      ? description.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()
      : title;

    items.push({ title, link, text: cleanText, guid, pubDate });
  }

  return items;
}

function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const match = regex.exec(xml);
  if (match) return (match[1] || match[2] || '').trim();
  return '';
}

/**
 * Try to fetch RSS feed from multiple Nitter instances
 */
async function fetchFeed(account) {
  for (const instance of NITTER_INSTANCES) {
    try {
      const url = `${instance}/${account}/rss`;
      console.log(`[RSS] Trying ${url}`);
      const xml = await fetchUrl(url);
      
      if (xml && xml.includes('<item>')) {
        console.log(`[RSS] Success from ${instance} for @${account}`);
        return parseRSS(xml);
      } else {
        console.log(`[RSS] No items from ${instance} for @${account}`);
      }
    } catch (err) {
      console.log(`[RSS] Failed ${instance} for @${account}: ${err.message}`);
    }
  }

  // Fallback: try X API v2 if bearer token is available
  if (config.twitter && config.twitter.bearerToken) {
    try {
      console.log(`[X API] Trying X API v2 for @${account}`);
      return await fetchFromXApi(account);
    } catch (err) {
      console.log(`[X API] Failed for @${account}: ${err.message}`);
    }
  }

  stats.errors++;
  return null;
}

/**
 * Fallback: Fetch from X API v2
 */
function fetchFromXApi(account) {
  return new Promise(async (resolve, reject) => {
    try {
      // First get user ID
      const userData = await xApiRequest(`/2/users/by/username/${account}`);
      if (!userData.data || !userData.data.id) {
        reject(new Error(`User @${account} not found`));
        return;
      }
      const userId = userData.data.id;

      // Then get tweets
      const params = new URLSearchParams({
        'max_results': '10',
        'tweet.fields': 'created_at,text',
      });
      const tweetData = await xApiRequest(`/2/users/${userId}/tweets?${params}`);
      const tweets = (tweetData.data || []).map(t => ({
        title: '',
        link: `https://x.com/${account}/status/${t.id}`,
        text: t.text,
        guid: t.id,
        pubDate: t.created_at,
      }));
      resolve(tweets);
    } catch (err) {
      reject(err);
    }
  });
}

function xApiRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.x.com',
      path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.twitter.bearerToken}`,
        'User-Agent': 'MissileAlertBot/1.0',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(parsed);
          } else {
            reject(new Error(`X API ${res.statusCode}: ${parsed.detail || parsed.title || JSON.stringify(parsed)}`));
          }
        } catch (e) {
          reject(new Error(`X API parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('X API request timeout'));
    });
    req.end();
  });
}

/**
 * Check a single account for new missile-related posts
 */
async function checkAccount(account) {
  if (!stats.perAccount[account]) {
    stats.perAccount[account] = { scanned: 0, alerts: 0 };
  }

  const items = await fetchFeed(account);
  if (!items || items.length === 0) {
    console.log(`[MONITOR] No data for @${account}`);
    return;
  }

  for (const item of items) {
    const postId = item.guid || item.link;
    if (!postId) continue;

    stats.scanned++;
    stats.perAccount[account].scanned++;

    if (hasSeen(postId)) continue;

    const fullText = [item.title, item.text].filter(Boolean).join(' ');
    const result = filterText(fullText);

    if (result.matches) {
      console.log(`[ALERT] Match found for @${account}: ${result.matched.join(', ')}`);

      await sendAlert({
        account,
        text: item.text || item.title || fullText,
        link: item.link || `https://x.com/${account}`,
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
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  console.log(`[MONITOR] Check cycle complete. Total scanned: ${stats.scanned}, Alerts: ${stats.alerts}`);
}

/**
 * Test connectivity
 */
async function testConnectivity() {
  const results = {};
  for (const account of config.accounts) {
    let found = false;
    for (const instance of NITTER_INSTANCES) {
      try {
        const url = `${instance}/${account}/rss`;
        const xml = await fetchUrl(url);
        if (xml && xml.includes('<item>')) {
          results[account] = `OK (${instance})`;
          found = true;
          break;
        }
      } catch {}
    }
    if (!found) {
      results[account] = 'FAILED (all instances)';
    }
  }
  return results;
}

function getStats() {
  return { ...stats };
}

module.exports = { checkAll, testConnectivity, getStats };
