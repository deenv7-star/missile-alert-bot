const fs = require('fs');
const path = require('path');

const DEDUP_FILE = path.join(__dirname, 'seen_posts.json');
const MAX_AGE_DAYS = 7;

let seenPosts = {};

/**
 * Load seen posts from disk
 */
function load() {
  try {
    if (fs.existsSync(DEDUP_FILE)) {
      const data = fs.readFileSync(DEDUP_FILE, 'utf-8');
      seenPosts = JSON.parse(data);
      cleanup();
    }
  } catch (err) {
    console.error(`[DEDUP] Error loading seen_posts.json: ${err.message}`);
    seenPosts = {};
  }
}

/**
 * Save seen posts to disk
 */
function save() {
  try {
    fs.writeFileSync(DEDUP_FILE, JSON.stringify(seenPosts, null, 2));
  } catch (err) {
    console.error(`[DEDUP] Error saving seen_posts.json: ${err.message}`);
  }
}

/**
 * Check if a post has been seen before
 * @param {string} id - Unique post identifier
 * @returns {boolean}
 */
function hasSeen(id) {
  return !!seenPosts[id];
}

/**
 * Mark a post as seen
 * @param {string} id - Unique post identifier
 */
function markSeen(id) {
  seenPosts[id] = Date.now();
  save();
}

/**
 * Remove entries older than MAX_AGE_DAYS
 */
function cleanup() {
  const cutoff = Date.now() - (MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  let removed = 0;

  for (const [id, timestamp] of Object.entries(seenPosts)) {
    if (timestamp < cutoff) {
      delete seenPosts[id];
      removed++;
    }
  }

  if (removed > 0) {
    console.log(`[DEDUP] Cleaned up ${removed} old entries`);
    save();
  }
}

/**
 * Get count of tracked posts
 */
function getCount() {
  return Object.keys(seenPosts).length;
}

module.exports = { load, hasSeen, markSeen, cleanup, getCount };
