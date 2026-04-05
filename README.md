# 🚀 Missile Alert Bot

בוט טלגרם שעוקב אחרי חשבונות X/Twitter ומתריע על פוסטים הקשורים לטילים ואיומים ביטחוניים.

## חשבונות מנוטרים
- [@iranin_arabic](https://x.com/iranin_arabic)
- [@urgent_iran](https://x.com/urgent_iran)

## התקנה

### 1. Clone + Install
```bash
git clone <your-repo>
cd missile-alert-bot
npm install
```

### 2. הגדרת .env
```bash
cp .env.example .env
```
ערוך את `.env` והכנס את ה-token וה-chat ID שלך.

### 3. הרצה
```bash
npm start
```

## פקודות בוט
| פקודה | תיאור |
|--------|--------|
| `/start` | הודעת פתיחה |
| `/status` | סטטוס הבוט, uptime, סטטיסטיקות |
| `/keywords` | רשימת מילות מפתח פעילות |
| `/accounts` | חשבונות מנוטרים + סטטיסטיקות |
| `/test` | שליחת התראת בדיקה |

## Deployment (Railway / Render)
1. העלה ל-GitHub
2. חבר ל-Railway או Render
3. הגדר Environment Variables (מה שב-.env)
4. Deploy!

### Docker
```bash
docker build -t missile-alert-bot .
docker run --env-file .env missile-alert-bot
```

## מילות מפתח
הבוט מסנן לפי מילות מפתח ב-4 שפות:
- 🇸🇦 ערבית (صاروخ, إطلاق, باليستي...)
- 🇬🇧 אנגלית (missile, launch, ballistic...)
- 🇮🇱 עברית (טיל, שיגור, בליסטי...)
- 🇮🇷 פרסית (موشک, پرتاب, بالستیک...)

## הוספת חשבונות
ערוך את `TWITTER_ACCOUNTS` ב-.env:
```
TWITTER_ACCOUNTS=iranin_arabic,urgent_iran,new_account
```
