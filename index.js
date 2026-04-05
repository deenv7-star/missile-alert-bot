const config = require('./config');
const { bot, sendMessage, sendStartup, sendHeartbeat } = require('./telegram');
const { checkAll, testConnectivity, getStats } = require('./rss-monitor');
const { getKeywords, getKeywordCount } = require('./keyword-filter');
const { load: loadDedup, getCount: getDedupCount } = require('./dedup');
const cron = require('node-cron');

const startTime = Date.now();

// ─── Load dedup data ───
loadDedup();

// ─── Format uptime ───
function formatUptime() {
  const ms = Date.now() - startTime;
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000) % 24;
  const days = Math.floor(ms / 86400000);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// ─── Bot Commands ───

bot.onText(/\/start/, (msg) => {
  if (String(msg.chat.id) !== String(config.telegram.chatId)) return;
  sendMessage('🟢 *ברוכים הבאים!*\nהבוט עוקב אחרי חשבונות X ומתריע על פוסטים הקשורים לטילים.\n\nפקודות:\n/status - סטטוס הבוט\n/keywords - מילות מפתח\n/accounts - חשבונות מנוטרים\n/test - התראת בדיקה');
});

bot.onText(/\/status/, (msg) => {
  if (String(msg.chat.id) !== String(config.telegram.chatId)) return;
  const stats = getStats();
  const accounts = config.accounts.map(a => `@${a}`).join(', ');
  sendMessage(
    `📊 *סטטוס הבוט*\n\n` +
    `⏱ Uptime: ${formatUptime()}\n` +
    `📡 חשבונות: ${accounts}\n` +
    `📝 פוסטים נסרקו: ${stats.scanned}\n` +
    `🚀 התראות נשלחו: ${stats.alerts}\n` +
    `❌ שגיאות: ${stats.errors}\n` +
    `🕐 בדיקה אחרונה: ${stats.lastCheck}\n` +
    `💾 פוסטים ב-dedup: ${getDedupCount()}`
  );
});

bot.onText(/\/keywords/, (msg) => {
  if (String(msg.chat.id) !== String(config.telegram.chatId)) return;
  const keywords = getKeywords();
  let text = `🔑 *מילות מפתח (${getKeywordCount()}):*\n\n`;
  for (const [lang, words] of Object.entries(keywords)) {
    const langName = { arabic: '🇸🇦 ערבית', english: '🇬🇧 אנגלית', hebrew: '🇮🇱 עברית', persian: '🇮🇷 פרסית' }[lang] || lang;
    text += `*${langName}:*\n${words.join(', ')}\n\n`;
  }
  sendMessage(text);
});

bot.onText(/\/accounts/, (msg) => {
  if (String(msg.chat.id) !== String(config.telegram.chatId)) return;
  const stats = getStats();
  let text = `📡 *חשבונות מנוטרים:*\n\n`;
  for (const account of config.accounts) {
    const s = stats.perAccount[account] || { scanned: 0, alerts: 0 };
    text += `• @${account} — נסרקו: ${s.scanned}, התראות: ${s.alerts}\n`;
  }
  sendMessage(text);
});

bot.onText(/\/test/, (msg) => {
  if (String(msg.chat.id) !== String(config.telegram.chatId)) return;

  const { sendAlert } = require('./telegram');
  sendAlert({
    account: 'test_account',
    text: 'זוהי התראת בדיקה 🧪\nThis is a test alert\nهذا تنبيه تجريبي',
    link: 'https://x.com/test',
    matched: ['טיל', 'missile', 'صاروخ'],
  });
});

// ─── Polling Loop ───
let pollTimer = null;

async function startPolling() {
  console.log('[MAIN] Running first check...');
  await checkAll();

  pollTimer = setInterval(async () => {
    try {
      await checkAll();
    } catch (err) {
      console.error(`[MAIN] Poll cycle error: ${err.message}`);
    }
  }, config.pollInterval);

  console.log(`[MAIN] Polling every ${config.pollInterval / 1000} seconds`);
}

// ─── Daily Heartbeat at 08:00 Israel time ───
cron.schedule('0 8 * * *', () => {
  const stats = getStats();
  sendHeartbeat({
    uptime: formatUptime(),
    scanned: stats.scanned,
    alerts: stats.alerts,
    lastCheck: stats.lastCheck,
  });
}, { timezone: config.timezone });

// ─── Startup ───
async function main() {
  console.log('='.repeat(50));
  console.log('  🚀 Missile Alert Bot Starting...');
  console.log('='.repeat(50));
  console.log(`  Accounts: ${config.accounts.join(', ')}`);
  console.log(`  Keywords: ${getKeywordCount()}`);
  console.log(`  Poll interval: ${config.pollInterval / 1000}s`);
  console.log(`  Timezone: ${config.timezone}`);
  console.log('='.repeat(50));

  // Test RSS connectivity
  console.log('[MAIN] Testing RSS connectivity...');
  const connectivity = await testConnectivity();
  for (const [account, status] of Object.entries(connectivity)) {
    console.log(`  @${account}: ${status}`);
  }

  // Send startup message
  await sendStartup(config.accounts.length, getKeywordCount());

  // Start polling
  await startPolling();
}

// ─── Graceful Shutdown ───
process.on('SIGINT', async () => {
  console.log('\n[MAIN] Shutting down...');
  if (pollTimer) clearInterval(pollTimer);
  await sendMessage('🔴 *הבוט נכבה*');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error(`[FATAL] Uncaught exception: ${err.message}`);
  console.error(err.stack);
});

process.on('unhandledRejection', (err) => {
  console.error(`[FATAL] Unhandled rejection: ${err.message}`);
});

// ─── Run ───
main().catch(err => {
  console.error(`[FATAL] Startup failed: ${err.message}`);
  process.exit(1);
});
