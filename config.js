require('dotenv').config();

const config = {
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
  pollInterval: parseInt(process.env.POLL_INTERVAL_MS) || 60000,
  accounts: (process.env.TWITTER_ACCOUNTS || '').split(',').map(a => a.trim()).filter(Boolean),
  rss: {
    baseUrl: process.env.RSS_BASE_URL || 'https://rsshub.app/twitter/user/',
    fallbackBase: process.env.RSS_FALLBACK_BASE || 'https://nitter.privacydev.net/{account}/rss',
  },
  timezone: process.env.TIMEZONE || 'Asia/Jerusalem',
};

// Validate required fields
if (!config.telegram.token) throw new Error('TELEGRAM_BOT_TOKEN is required in .env');
if (!config.telegram.chatId) throw new Error('TELEGRAM_CHAT_ID is required in .env');
if (config.accounts.length === 0) throw new Error('TWITTER_ACCOUNTS is required in .env');

module.exports = config;
