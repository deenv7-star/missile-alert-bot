const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');

const bot = new TelegramBot(config.telegram.token, { polling: true });
const chatId = config.telegram.chatId;

// Message queue for retry logic
const messageQueue = [];
let isProcessingQueue = false;

/**
 * Escape special Markdown characters in user-generated text
 */
function escapeMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/`/g, '\\`')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

/**
 * Send a message to the configured chat
 * Falls back to plain text if Markdown fails
 */
async function sendMessage(text, options = {}) {
  try {
    await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      ...options,
    });
  } catch (err) {
    console.error(`[TELEGRAM] Markdown send failed: ${err.message}`);
    // Fallback: try without Markdown
    try {
      const plainText = text.replace(/\*/g, '').replace(/\\/g, '');
      await bot.sendMessage(chatId, plainText, {
        disable_web_page_preview: true,
      });
    } catch (err2) {
      console.error(`[TELEGRAM] Plain send also failed: ${err2.message}`);
      messageQueue.push({ text, options, retries: 0 });
      processQueue();
    }
  }
}

/**
 * Send a missile alert
 */
async function sendAlert(alert) {
  const timestamp = new Date().toLocaleString('he-IL', {
    timeZone: config.timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const keywordList = alert.matched.map(k => k).join(', ');
  const safeText = escapeMarkdown(alert.text);
  const safeAccount = escapeMarkdown(alert.account);

  const message = [
    '🚀 *התראת טילים / Missile Alert*',
    '',
    `📡 מקור: @${safeAccount}`,
    `🕐 זמן: ${timestamp}`,
    '',
    '📝 תוכן:',
    safeText,
    '',
    `🔑 מילות מפתח: ${keywordList}`,
    '',
    `🔗 ${alert.link}`,
  ].join('\n');

  await sendMessage(message);
}

/**
 * Send startup message
 */
async function sendStartup(accountCount, keywordCount) {
  const accounts = config.accounts.map(a => `@${a}`).join(', ');
  await sendMessage(
    `🟢 הבוט פעיל!\n\n` +
    `📡 עוקב אחרי: ${accounts}\n` +
    `🔑 ${keywordCount} מילות מפתח פעילות\n` +
    `⏱ סריקה כל ${config.pollInterval / 1000} שניות`
  );
}

/**
 * Send heartbeat message
 */
async function sendHeartbeat(stats) {
  await sendMessage(
    `💓 דופק יומי - הבוט פעיל\n\n` +
    `⏱ Uptime: ${stats.uptime}\n` +
    `📊 פוסטים נסרקו: ${stats.scanned}\n` +
    `🚀 התראות נשלחו: ${stats.alerts}\n` +
    `🕐 בדיקה אחרונה: ${stats.lastCheck}`
  );
}

/**
 * Process queued messages with retry
 */
async function processQueue() {
  if (isProcessingQueue || messageQueue.length === 0) return;
  isProcessingQueue = true;

  while (messageQueue.length > 0) {
    const item = messageQueue[0];

    if (item.retries >= 3) {
      console.error('[TELEGRAM] Gave up on message after 3 retries');
      messageQueue.shift();
      continue;
    }

    try {
      const delay = Math.pow(2, item.retries) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      const plainText = item.text.replace(/\*/g, '').replace(/\\/g, '');
      await bot.sendMessage(chatId, plainText, {
        disable_web_page_preview: true,
      });

      messageQueue.shift();
    } catch (err) {
      console.error(`[TELEGRAM] Retry ${item.retries + 1} failed: ${err.message}`);
      item.retries++;
    }
  }

  isProcessingQueue = false;
}

module.exports = { bot, sendMessage, sendAlert, sendStartup, sendHeartbeat };
