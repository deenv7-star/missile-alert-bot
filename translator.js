const https = require('https');

/**
 * Translate text to Hebrew using Google Translate (free, no API key needed)
 */
async function translateToHebrew(text) {
  if (!text) return '';

  // Skip if already mostly Hebrew
  const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
  if (hebrewChars > text.length * 0.3) return text;

  try {
    const encodedText = encodeURIComponent(text);
    const url = `/translate_a/single?client=gtx&sl=auto&tl=he&dt=t&q=${encodedText}`;

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'translate.googleapis.com',
        path: url,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result && result[0]) {
              const translated = result[0]
                .filter(item => item && item[0])
                .map(item => item[0])
                .join('');
              resolve(translated || text);
            } else {
              resolve(text);
            }
          } catch {
            resolve(text);
          }
        });
      });

      req.on('error', () => resolve(text));
      req.setTimeout(10000, () => {
        req.destroy();
        resolve(text);
      });
      req.end();
    });
  } catch {
    return text;
  }
}

module.exports = { translateToHebrew };
