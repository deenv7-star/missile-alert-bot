const https = require('https');
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

// Cache user IDs to avoid repeated lookups
const userIdCache = {};

/**
 * Make an authenticated request to X API v2
 */
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
 * Get user ID from username
 */
async function getUserId(username) {
  if (userIdCache[username]) return userIdCache[username];

  const data = await xApiRequest(`/2/users/by/username/${username}`);
  if (data.data && data.data.id) {
    userIdCache[username] = data.data.id;
    return data.data.id;
  }
  throw new Error(`User @${username} not found`);
}

/**
 * Get recent tweets from a user
 */
async function getUserTweets(userId) {
  const params = new URLSearchParams({
    'max_results': '10',
    'tweet.fields': 'created_at,text',
  });

  const data = await xApiRequest(`/2/users/${userId}/tweets?${params}`);
  return data.data || [];
}

/**
 * Check a single account for new missile-related posts
 */
async function checkAccount(account) {
  if (!stats.perAccount[account]) {
    stats.perAccount[account] = { scanned: 0, alerts: 0 };
  }

  try {
    const userId = await getUserId(account);
    const tweets = await getUserTweets(userId);

    for (const tweet of tweets) {
      const postId = tweet.id;
      if (!postId) continue;

      stats.scanned++;
      stats.perAccount[account].scanned++;

      if (hasSeen(postId)) continue;

      const result = filterText(tweet.text);

      if (result.matches) {
        console.log(`[ALERT] Match found for @${account}: ${result.matched.join(', ')}`);

        await sendAlert({
          account,
          text: tweet.text,
          link: `https://x.com/${account}/status/${tweet.id}`,
          matched: result.matched,
        });

        stats.alerts++;
        stats.perAccount[account].alerts++;
      }

      markSeen(postId);
    }
  } catch (err) {
    console.error(`[X API] Error checking @${account}: ${err.message}`);
    stats.errors++;
  }
}

/**
 * Run a full check cycle on all accounts
 */
async function checkAll() {
  console.log(`[X API] Starting check cycle for ${config.accounts.length} accounts...`);

  for (const account of config.accounts) {
    try {
      await checkAccount(account);
    } catch (err) {
      console.error(`[X API] Error checking @${account}: ${err.message}`);
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

  console.log(`[X API] Check cycle complete. Total scanned: ${stats.scanned}, Alerts: ${stats.alerts}`);
}

/**
 * Test API connectivity
 */
async function testConnectivity() {
  const results = {};
  for (const account of config.accounts) {
    try {
      const userId = await getUserId(account);
      results[account] = `OK (ID: ${userId})`;
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
