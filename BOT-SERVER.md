# Telegram botni alohida serverda ishlatish

## Qanday tuzilgan
```
 Telegram ──webhook──▶  BOT SERVERI (Render / VPS)          SAYT (Vercel, ofistop.uz)
                        • /start, kontakt, "Ha, kirish"      • sahifalar, kabinet, admin
                        • bildirishnomalarni yuborish         • kirish kodini bot orqali yuboradi
                          (zaxira, har 30 s)                  • bildirishnomani darhol yuboradi
                               │                                         │
                               └──────────── bitta baza (Neon PostgreSQL) ┘
```
- Bot va sayt **bir-biriga to'g'ridan-to'g'ri so'rov yubormaydi** — ular bitta baza orqali bog'langan. Shuning uchun alohida serverda ishlashi uchun qo'shimcha "ulash" kodi kerak emas: ikkalasiga bir xil `DATABASE_URL` va bot sozlamalarini berish kifoya.
- Telegram xabarlarni (webhook) **faqat bot serveriga** yuboradi. Saytdagi webhook `TELEGRAM_BOT_HOST=render` bilan o'chiriladi.
- Bot tokeni ikkala tomonda ham bo'ladi: sayt u orqali faqat **xabar yuboradi**, qabul qilmaydi.

## Sozlamalar
| O'zgaruvchi | Bot serveri | Sayt (Vercel) |
|---|---|---|
| `DATABASE_URL` | ✅ (bir xil) | ✅ (bir xil) |
| `TELEGRAM_BOT_TOKEN` | ✅ | ✅ |
| `TELEGRAM_BOT_USERNAME` | ✅ | ✅ |
| `TELEGRAM_WEBHOOK_SECRET` | ✅ (bir xil) | ✅ (bir xil) |
| `TELEGRAM_BOT_HOST=render` | — | ✅ (saytdagi webhookni o'chiradi) |
| `BOT_PUBLIC_URL=https://bot.ofistop.uz` | ✅ (Render'da shart emas) | — |
| `APP_URL=https://ofistop.uz` | ✅ (xabardagi "OfisTop'da ochish" havolasi uchun) | ✅ |
| R2, Google, admin paroli | — kerak emas | ✅ |

## 1-variant: Render (eng oson)
1. Render → **New → Web Service** → GitHub → `ofistop` repo.
2. Build: `npm ci --include=dev`, Start: `npm run bot:start`, Health check: `/health`.
3. Yuqoridagi jadvaldagi bot o'zgaruvchilarini kiriting (`BOT_PUBLIC_URL` shart emas — Render manzilni o'zi beradi).
4. **Plan:** pullik `Starter` tavsiya etiladi. Bepul reja 15 daqiqa jim tursa uxlaydi va kirish ~1 daqiqa kechikadi.
5. Logda `OfisTop bot ready: webhook ... registered` chiqsa — tayyor.

## 2-variant: o'z VPS serveringiz (Docker)
1. Serverda Docker o'rnating, repo'ni yuklab oling.
2. `bot.env` fayli (jadvaldagi bot o'zgaruvchilari, `BOT_PUBLIC_URL=https://bot.ofistop.uz`, `APP_URL=https://ofistop.uz`).
3. ```
   docker build -f Dockerfile.bot -t ofistop-bot .
   docker run -d --name ofistop-bot --restart=always --env-file bot.env -p 127.0.0.1:10000:10000 ofistop-bot
   ```
4. DNS: `bot.ofistop.uz` → serverning IP manzili (A yozuvi).
5. HTTPS (Telegram faqat HTTPS bilan ishlaydi) — Caddy eng sodda: `/etc/caddy/Caddyfile`:
   ```
   bot.ofistop.uz {
     reverse_proxy 127.0.0.1:10000
   }
   ```
   Caddy sertifikatni o'zi oladi.
6. Tekshirish: `https://bot.ofistop.uz/health` → `ok`; `docker logs ofistop-bot` da "bot ready".

## Tekshirish ro'yxati
1. Bot serveri `/health` → `ok`.
2. Telegram'da botga `/start` → "Kontaktni ulashish" tugmasi chiqadi.
3. ofistop.uz → Kirish → Telegram → botda tasdiqlash → sayt o'zi ochiladi.
4. Admin e'lonni tasdiqlasa, egasiga botdan "🔔 E'loningiz tasdiqlandi" keladi.

## Muhim
- Bitta bot tokenini **faqat bitta** webhook serverida ishlating (eski `bot:poll`/`bot:webhook` ni ishlatmang) — bot serveri ishga tushganda webhookni o'ziga ulaydi.
- Kunlik ishlar (qoralamalarni o'chirish, oylik hisobot) Vercel cron'da qoladi: ular rasm xotirasiga (R2) kirishi kerak, bot serverida R2 kalitlari yo'q.
