# OfisTop: Vercel + Neon + R2 + Render

GitHub bir xil repozitoriydan ikki xizmatni yangilaydi:

- Vercel: Next.js sayt, Google va Telegram kirish API'lari, e'lonlar va rasm yuklash.
- Neon: foydalanuvchilar, sessiyalar, e'lonlar, Telegram kontaktlari va rasm kalitlari.
- Cloudflare R2: siqilgan WebP rasmlar va kichik muqovalar. Bucket private qoladi; sayt /api/media orqali o'qiydi.
- Render: faqat Telegram'dan kelgan /start, kontakt va tasdiqlash xabarlarini qabul qiladigan bot. Next.js sayti Render'da ishga tushirilmaydi.

Sayt kirish kodini Telegram API orqali yuboradi; bot bu kodlarni va kontaktlarni sayt bilan bitta Neon bazasi orqali bog'laydi. Render Vercel webhookiga xabar uzatmaydi, bot handlerini o'zi bajaradi.

## 1. Admin kirishini tuzatish

`ADMIN_PASSWORD_HASH` oddiy parol emas. Terminalda:

```powershell
npm.cmd run admin:hash
```

Kamida 12 belgili parolni ikki marta kiriting (ekranda ko'rinmaydi). Chiqadigan `ADMIN_PASSWORD_HASH=scrypt:...` qatoridan **faqat scrypt:... qiymatini** Vercel Environment Variables → Production → ADMIN_PASSWORD_HASH ga ko'chiring. ADMIN_LOGIN=ofis. Login oynasiga esa tanlagan oddiy parolingizni yozasiz. Hashni login oynasiga yozmang. Redeploy qiling. DATABASE_URL va SESSION_SECRET ham sozlangan bo'lishi shart.

## 2. Cloudflare R2

1. Cloudflare → Storage & databases → R2 → Overview → Create bucket.
2. Bucket nomi: `ofistop-images`, storage class: Standard. Public access yoqish shart emas.
3. R2 → API Tokens → Manage → Create API token.
4. Permission: **Object Read & Write**; faqat `ofistop-images` bucketini tanlang.
5. Access Key ID, Secret Access Key va S3 API endpointni saqlang. Oddiy Cloudflare global API key ishlatilmaydi.
6. Vercel → Settings → Environment Variables → Production:

```env
STORAGE_DRIVER=r2
R2_BUCKET=ofistop-images
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=R2_bergan_access_key
R2_SECRET_ACCESS_KEY=R2_bergan_secret_key
```

Endpointni paneldan aynan ko'chiring. Server orqali yuklash sababli bucket CORS sozlamasi kerak emas. Kalitlarni NEXT_PUBLIC_ bilan boshlamang, GitHub/chatga yubormang. Oldin diskka yozilgan rasmlar avtomatik R2'ga ko'chmaydi; eski uploads nusxasini saqlang va alohida ko'chiring yoki rasmlarni qayta yuklang.

## 3. Vercel sozlamalari

Mavjud Google sozlamalarini saqlang. Quyidagilar bo'lsin:

```env
APP_URL=https://www.ofistop.uz
DATABASE_URL=Neon_pooler_connection_string
SESSION_SECRET=mavjud_maxfiy_qiymat
TELEGRAM_BOT_HOST=render
TELEGRAM_BOT_TOKEN=BotFather_tokeni
TELEGRAM_BOT_USERNAME=bot_username_AT_belgisiz
TELEGRAM_WEBHOOK_SECRET=32_yoki_undan_uzun_tasodifiy_qiymat
```

Vercel'da bot tokeni qoladi: sayt kod yuborishi uchun kerak. TELEGRAM_BOT_HOST=render esa Vercel'dagi kiruvchi webhookni o'chiradi. Lokal .env.local ga ham TELEGRAM_BOT_HOST=render yozing, eski `bot:webhook` buyrug'ini qayta ishlatmang. Webhook secret ikkala xizmatda aynan bir xil bo'lsin. Uni yaratish:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4. Render'da faqat botni ishga tushirish

1. O'zgarishlarni GitHub'ga commit/push qiling (.env.local GitHub'ga kirmasin).
2. Render → New → Web Service → GitHub → shu repozitoriyni tanlang.
3. Language/Runtime: Node. Root Directory: package.json turgan papka (repo ildizida bo'lsa bo'sh).
4. Build Command: `npm ci --include=dev`
5. Start Command: `npm run bot:render`
6. Health Check Path: `/health`
7. Auto Deploy: ishlatilayotgan branch'ga commit tushganda deploy.
8. Environment:

| Name | Value |
| --- | --- |
| NODE_ENV | production |
| NODE_VERSION | 22 |
| DATABASE_URL | Vercel bilan bir xil Neon pooler URL |
| TELEGRAM_BOT_TOKEN | Vercel bilan bir xil token |
| TELEGRAM_BOT_USERNAME | @ belgisiz username |
| TELEGRAM_WEBHOOK_SECRET | Vercel bilan bir xil secret |

Render RENDER_EXTERNAL_URL va PORT ni avtomatik beradi. Ularni qo'lda o'zgartirmang. R2, Google va admin kalitlari Render botiga kerak emas. APP_MODE=test/TEST_DATABASE=embedded qo'ymang.

Muqobil: New → Blueprint → shu repo → render.yaml. Blueprint `starter` pullik rejasini ko'rsatadi; Render'dagi narxni ko'rib tanlang. Free Web Service ham webhook bilan sinashga yaroqli, ammo 15 daqiqa so'rov bo'lmasa uxlaydi va uyg'onishi taxminan bir daqiqa olishi mumkin. Bu vaqtda kirish kechikadi; doim tayyor login uchun uxlamaydigan pullik xizmat kerak. Webhook Free rejani 24/7 faol qilib qo'ymaydi.

9. Deploy Web Service bosing. Muvaffaqiyatli log:

```text
OfisTop bot ready: Render webhook registered; database connected
```

Bot avtomatik `https://SIZNING-SERVIS.onrender.com/telegram/webhook` manzilini Telegram'ga ulaydi, eski webhookni almashtiradi. Domenni Render'ga ko'chirmaysiz: www.ofistop.uz Vercel'da qoladi. Bir tokenni boshqa bot worker/polling xizmatida ishlatmang. Botni Render'dan o'chirsangiz webhookni qayta sozlash kerak bo'ladi.

## 5. Tekshirish

1. Vercel yangi deploy Ready, Render Live bo'lsin.
2. Render manzili `/health` → `ok`.
3. Telegram bot → /start → Kontaktni ulashish. O'z kontaktingizni yuboring.
4. www.ofistop.uz → Telegram orqali kirish → botda tasdiqlash → saytga qaytish. Telefon orqali kod usulini ham sinang.
5. /admin → ofis va oddiy parol bilan kiring.
6. E'longa 2–5 MB rasm yuklang; sahifani yangilang. R2 bucketida img/ ichida asosiy va .thumb.webp fayllari paydo bo'ladi.
   Lokal `.env.local`ga R2 qiymatlarini kiritgan bo'lsangiz, `npm.cmd run storage:check` ham bajaring. U test rasmini yuklaydi, o'qiydi va o'chiradi; muvaffaqiyatli yakunida `PASS` chiqaradi.
7. E'lonni admin tasdiqlasin. E'londa xarita koordinatasi bo'lsin. Shundan keyin faol e'lon xaritada chiqadi. Qoralama/rad etilgan/muddati tugagan e'lonlar xaritada ko'rinmaydi.

Kod testlari haqiqiy R2 hisobining kalitlari yoki haqiqiy Telegram bot sinovi o'rnini bosmaydi. Deploy'dan keyin yuqoridagi tekshiruvlar majburiy.

Manbalar: https://developers.cloudflare.com/r2/get-started/s3/ va https://render.com/docs/free
