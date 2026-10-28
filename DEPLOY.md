> Reklama davri uchun avval **REKLAMA-REJIMI.md**ni o‘qing: SMSsiz kirish va admin login-paroli shu yerda sozlanadi. Quyidagi hujjat VPS, PostgreSQL va HTTPS o‘rnatilishi uchun.

# OfisIjara — ishga tushirish (VPS, bitta server)

> Holat: bu yo'riqnoma yozilgan, lekin production serverda SINALMAGAN. Sandbox'da faqat `next build` + `next start` tekshirilgan.

## 0. Domen kodga yozilmaydi
Domen faqat `.env` dagi `APP_URL` orqali ishlatiladi (sitemap, robots, Open Graph). Kodda qattiq yozilgan domen yo'q. Domenni DNS'da serverga yo'naltirish va HTTPS sozlash kerak (3–4-qadamlar).

## 1. Nima kerak
- Server (Ubuntu 22.04/24.04), kamida 1 CPU / 2 GB RAM, **doimiy disk** (rasmlar diskda saqlanadi).
- Node.js 22, PostgreSQL 16, nginx, certbot.
- `PROMO_MODE=true` davrida SMS/Telegram kerak emas. Reklama rejimi o‘chirilganda SMS yoki Telegram kirishini sozlang.

## 2. Server tayyorlash
```bash
sudo apt update && sudo apt install -y postgresql nginx certbot python3-certbot-nginx git
# Node 22: nodejs.org yoki nvm orqali o'rnating
sudo -u postgres psql -c "CREATE USER ofisijara WITH PASSWORD 'KUCHLI_PAROL';"
sudo -u postgres psql -c "CREATE DATABASE ofisijara OWNER ofisijara;"
sudo useradd -m -s /bin/bash app
```

## 3. Kod va sozlama
```bash
sudo -u app -i
git clone <repo> ofisijara && cd ofisijara     # yoki zip'ni ochib joylang
npm ci                                          # --omit=dev QILMANG: migratsiya tsx'dan foydalanadi
cp .env.example .env.production && nano .env.production
```
`.env.production` (sirlarni repozitoriyga yozmang):
```
DATABASE_URL=postgres://ofisijara:KUCHLI_PAROL@localhost:5432/ofisijara
SESSION_SECRET=<openssl rand -hex 32 natijasi>
APP_URL=https://SIZNING-DOMEN.uz
PROMO_MODE=true
ADMIN_LOGIN=ofis
ADMIN_PASSWORD_HASH=<.env.example dagi hash yoki yangi parol hashi>
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=...
TELEGRAM_WEBHOOK_SECRET=...
STORAGE_DRIVER=local
UPLOAD_DIR=/var/lib/ofisijara/uploads
DEV_OTP_ENABLED=false   # production'da baribir ishlamaydi
# NEXT_PUBLIC_TILE_URL / NEXT_PUBLIC_TILE_ATTRIBUTION — build'dan OLDIN o'rnatiladi
```
```bash
sudo mkdir -p /var/lib/ofisijara/uploads && sudo chown app /var/lib/ofisijara/uploads
set -a; . ./.env.production; set +a
npm run db:setup
npm run build
```
**Demo seed'ni production'da yuritmang** (`db:seed` faqat development uchun).

## 4. Doimiy ishlatish (systemd)
`/etc/systemd/system/ofisijara.service`:
```
[Unit]
Description=OfisIjara
After=network.target postgresql.service
[Service]
User=app
WorkingDirectory=/home/app/ofisijara
EnvironmentFile=/home/app/ofisijara/.env.production
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start -- -p 3000
Restart=always
[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload && sudo systemctl enable --now ofisijara
```

## 5. nginx + HTTPS
DNS'da `A` yozuvi: `SIZNING-DOMEN.uz → server IP`. Keyin `/etc/nginx/sites-available/ofisijara`:
```
server {
  server_name SIZNING-DOMEN.uz www.SIZNING-DOMEN.uz;
  client_max_body_size 90m;                       # bir nechta rasm yuklash uchun
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $remote_addr; # QO'SHMANG, ustidan yozing: rate limit IP'ga tayanadi
  }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/ofisijara /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d SIZNING-DOMEN.uz -d www.SIZNING-DOMEN.uz
```

## 6. Muddati tugagan e'lonlar (cron)
`crontab -u app -e`:
```
0 * * * * cd /home/app/ofisijara && set -a && . ./.env.production && set +a && npm run expire-listings >> /home/app/ofisijara/expire.log 2>&1
```
(Cron ishlamasa ham qidiruv muddati o'tgan e'lonni ko'rsatmaydi.)

## 7. Reklama davridan keyin Telegram kirishini sozlash
Kirish **Telegram bot** orqali: foydalanuvchi saytda tugmani bosadi → botga o'tadi → telefon raqamini bot tugmasi orqali tasdiqlaydi (Telegram raqamni o'zi beradi, faqat +998) → botdan kod oladi → saytga kiritadi. SMS provayder va shartnoma kerak emas. Telefon + SMS orqali kirish ham bor (7a-bo'lim).

1. Telegram'da **@BotFather** → `/newbot` → nom va username tanlang → **token** oling.
2. `.env.production` ga yozing:
   ```
   TELEGRAM_BOT_TOKEN=<BotFather bergan token>
   TELEGRAM_BOT_USERNAME=<@ belgisiz username>
   TELEGRAM_WEBHOOK_SECRET=<openssl rand -hex 24 natijasi>
   ```
   (Uchalasi bo'lmasa Telegram kirish o'chiq turadi va kirish sahifasi "sozlanmagan" deb xabar beradi.)
3. Saytni ishga tushiring (3–5-bo'limlar), HTTPS ishlab turganda webhook'ni bir marta o'rnating:
   ```bash
   set -a; . ./.env.production; set +a; npx tsx scripts/telegram-set-webhook.ts
   ```
   Webhook faqat `https://` va sir (`secret_token`) bilan ishlaydi; sirsiz so'rovlar 403 oladi.
4. `PROMO_MODE=false` bo‘lganda saytdagi Telegram kirishini sinang. Admin kirishi alohida `/admin`dagi login-parol bilan ishlaydi; ADMIN_LOGIN va ADMIN_PASSWORD_HASHni REKLAMA-REJIMI.md bo‘yicha sozlang. Eski `create-admin` skripti saqlangan, lekin telefon sessiyasi admin panelga huquq bermaydi.

Eslatma: bot token'i sir — repozitoriyga yozmang; oshkor bo'lsa @BotFather'da `/revoke` qiling. `TELEGRAM_API_BASE` ni production'da o'rnatmang (faqat testlar uchun).

## 8. Yangilash va zaxira
```bash
git pull && npm ci && npm run db:setup && npm run build && sudo systemctl restart ofisijara
pg_dump -U ofisijara ofisijara > backup-$(date +%F).sql      # bazani muntazam zaxiralang
# rasmlar: /var/lib/ofisijara/uploads papkasini ham zaxiralang
```

## 9. Tekshirib ko'ring
`https://DOMEN/` ochiladi · `https://DOMEN/robots.txt` va `/sitemap.xml` to‘g‘ri domenni ko‘rsatadi · `/admin` login-parol so‘raydi · admin ichki sahifalari va API’lari ruxsatsiz ochilmaydi · katalog bo‘sh (demo yo‘q) — birinchi e’lonlarni foydalanuvchilar qo‘shadi.

## Qolgan cheklovlar (production uchun)
SMS faqat Eskiz.uz uchun yozilgan (boshqa provayder kerak bo'lsa `src/lib/sms.ts` ga qo'shiladi); haqiqiy Eskiz bilan hali sinalmagan · S3 adapteri yo'q (rasmlar bitta serverning diskida; serverni almashtirsangiz ko'chirish kerak) · xarita tile'i default OSM (jiddiy trafik uchun o'z tile xizmatingiz kerak) · maxfiylik/shartlar matnlari yurist tekshiruvidan o'tmagan, maxfiylik so'rovlari uchun aloqa manzili belgilanmagan.

## Test buyruqlari (deploy'dan oldin, test bazasida)
- `npm test` — unit testlar (pul, holatlar, huquqlar, i18n, server xabarlari tarjimasi).
- `npx next build && npm run e2e` — Playwright end-to-end (production rejimi, soxta Telegram Bot API). Brauzer: `npx playwright install chromium` (bir marta). Production bazasida YURITMANG: test foydalanuvchi va e'lonlar yaratadi.

## 7a. SMS orqali kirish (Eskiz.uz)
1. https://notify.eskiz.uz da ro'yxatdan o'ting (yuridik shaxs yoki YaTT hujjatlari bilan shartnoma), balansni to'ldiring.
2. **Muhim:** yangi hisob "test" holatida bo'ladi va faqat Eskiz'ning tayyor test matnlarini yuboradi ("Bu Eskiz dan test" va h.k.). Bu holatda OTP kod yuborib BO'LMAYDI — sayt "SMS yuborib bo'lmadi" deydi. Hisobni faollashtirish uchun Eskiz qo'llab-quvvatlashiga murojaat qiling.
3. Kabinetda SMS shablonini moderatsiyaga yuboring. Saytdagi matn bilan aynan bir xil bo'lsin, masalan: `OfisIjara: tasdiqlash kodi {code}. Kodni hech kimga bermang.` (Eskiz shablonida o'zgaruvchi qanday belgilanishini ularning talabiga qarab yozing). Tasdiqlangan matnni `SMS_OTP_TEMPLATE` ga qo'ying, `{code}` o'rniga 6 xonali kod qo'yiladi.
4. `.env` ga: `SMS_PROVIDER=eskiz`, `ESKIZ_EMAIL=...`, `ESKIZ_PASSWORD=...` (kabinetdagi secret key), `ESKIZ_FROM=4546` (o'z nickname'ingiz tasdiqlangach — shu). Kerak bo'lsa `SMS_DAILY_LIMIT`.
5. Serverni qayta ishga tushiring. `/kirish` da telefon formasi paydo bo'ladi. O'z raqamingizga kod so'rab, SMS kelishini qo'lda tekshiring. Xato bo'lsa, server logida `SMS xatosi: Eskiz ... rad etildi: HTTP ... <sabab>` ko'rinadi (telefon raqami logga yozilmaydi).
Himoya: bir raqamga 10 daqiqada 3 ta kod, bir IP'dan soatiga 15 ta, butun sayt bo'yicha sutkasiga `SMS_DAILY_LIMIT` (standart 500). Kod 5 daqiqa amal qiladi, 5 ta noto'g'ri urinishdan keyin bekor bo'ladi. SMS yuborilmasa kod bazadan o'chiriladi.

## Texnik xizmat
Har kuni `npm run cleanup`: muddati tugagan sessiya/OTP/rate-limit yozuvlarini va 24 soatdan eski bazaga bog‘lanmagan rasmlarni tozalaydi. Avval backup rejangizni tekshiring.

Cron (app foydalanuvchisi):
```
15 3 * * * cd /home/app/ofisijara && set -a && . ./.env.production && set +a && npm run cleanup >> /home/app/ofisijara/cleanup.log 2>&1
```

`ExecStart` ichidagi npm yo‘lini `command -v npm` bilan tekshiring; nvm o‘rnatilgan bo‘lsa `/usr/bin/npm` boshqa bo‘lishi mumkin. `.env.production`da bo‘shliq qatnashgan SMS shablon qiymatini qo‘shtirnoqqa oling.

Production sozlamasida `APP_MODE=test` qoldirmang; `DEV_OTP_ENABLED=false` qiling. Testni internetga ochmang.
