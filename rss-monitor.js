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

/**
 * Fetch a URL with browser-like headers
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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = `https://${urlObj.hostname}${redirectUrl}`;
        }
        fetchUrl(redirectUrl).then(resolve).catch(reject);
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
 * Scrape tweets from xcancel.com HTML page
 */
function parseTweetsFromHTML(html, account) {
  const tweets = [];
  
  // Match tweet containers - xcancel uses timeline-item class
  const tweetBlocks = html.split('class="timeline-item"');
  
  for (let i = 1; i < tweetBlocks.length; i++) {
    const block = tweetBlocks[i];
    
    // Extract tweet text from tweet-content class
    const contentMatch = block.match(/class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const text = contentMatch 
      ? contentMatch[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n\s+/g, '\n').trim()
      : '';

    // Extract tweet link
    const linkMatch = block.match(/class="tweet-link"[^>]*href="([^"]+)"/);
    const tweetPath = linkMatch ? linkMatch[1].trim() : '';
    
    // Also try to find status link
    const statusMatch = block.match(/href="\/[^/]+\/status\/(\d+)/);
    const tweetId = statusMatch ? statusMatch[1] : '';

    if (text && tweetId) {
      tweets.push({
        text,
        link: `https://x.com/${account}/status/${tweetId}`,
        guid: tweetId,
      });
    } else if (text && tweetPath) {
      tweets.push({
        text,
        link: `https://x.com${tweetPath}`,
        guid: tweetPath,
      });
    }
  }

  return tweets;
}

/**
 * Alternative: parse from Atom/RSS feed format
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

    const cleanText = description
      ? description.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()
      : title;

    if (cleanText) {
      items.push({ text: cleanText, link, guid });
    }
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
 * Try multiple methods to get tweets
 */
async function fetchTweets(account) {
  const methods = [
    // Method 1: xcancel HTML scraping
    async () => {
      console.log(`[SCRAPE] Trying xcancel.com HTML for @${account}`);
      const html = await fetchUrl(`https://xcancel.com/${account}`);
      const tweets = parseTweetsFromHTML(html, account);
      if (tweets.length > 0) {
        console.log(`[SCRAPE] Got ${tweets.length} tweets from xcancel.com for @${account}`);
        return tweets;
      }
      throw new Error('No tweets found in HTML');
    },
    // Method 2: xcancel RSS
    async () => {
      console.log(`[RSS] Trying xcancel.com RSS for @${account}`);
      const xml = await fetchUrl(`https://xcancel.com/${account}/rss`);
      if (xml.includes('<item>')) {
        const items = parseRSS(xml);
        if (items.length > 0) {
          console.log(`[RSS] Got ${items.length} items from xcancel.com RSS for @${account}`);
          return items;
        }
      }
      throw new Error('No RSS items');
    },
    // Method 3: nitter.poast.org HTML
    async () => {
      console.log(`[SCRAPE] Trying nitter.poast.org for @${account}`);
      const html = await fetchUrl(`https://nitter.poast.org/${account}`);
      const tweets = parseTweetsFromHTML(html, account);
      if (tweets.length > 0) {
        console.log(`[SCRAPE] Got ${tweets.length} tweets from nitter.poast.org for @${account}`);
        return tweets;
      }
      throw new Error('No tweets found');
    },
    // Method 4: nitter.privacyredirect.com HTML
    async () => {
      console.log(`[SCRAPE] Trying nitter.privacyredirect.com for @${account}`);
      const html = await fetchUrl(`https://nitter.privacyredirect.com/${account}`);
      const tweets = parseTweetsFromHTML(html, account);
      if (tweets.length > 0) return tweets;
      throw new Error('No tweets found');
    },
  ];

  for (const method of methods) {
    try {
      return await method();
    } catch (err) {
      console.log(`[MONITOR] ${err.message}`);
    }
  }

  stats.errors++;
  return null;
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
