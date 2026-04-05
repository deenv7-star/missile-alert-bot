require('dotenv').config();

const config = {
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
  twitter: {
    bearerToken: process.env.X_BEARER_TOKEN,
  },
  pollInterval: parseInt(process.env.POLL_INTERVAL_MS) || 60000,
  accounts: (process.env.TWITTER_ACCOUNTS || '').split(',').map(a => a.trim()).filter(Boolean),
  timezone: process.env.TIMEZONE || 'Asia/Jerusalem',
};

// Validate required fields
if (!config.telegram.token) throw new Error('TELEGRAM_BOT_TOKEN is required in .env');
if (!config.telegram.chatId) throw new Error('TELEGRAM_CHAT_ID is required in .env');
if (!config.twitter.bearerToken) throw new Error('X_BEARER_TOKEN is required in .env');
if (config.accounts.length === 0) throw new Error('TWITTER_ACCOUNTS is required in .env');

module.exports = config;
