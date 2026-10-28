# OfisTop: Google, email va Telegram orqali kirish

SMS orqali kirish o'chirilgan. Eski SMS adapteri saqlangan, lekin
`/api/auth/request-otp` va `/api/auth/verify-otp` 410 qaytaradi va SMS jo'natmaydi.
`PROMO_MODE=true` bepul davrni bildiradi; endi o'zi anonim kirishni yoqmaydi.
E'lonlar avvalgidek admin tasdig'idan keyin ko'rinadi. Admin login o'zgarmagan.

## Qanday ishlaydi

- **Google:** Google'ning hisob tanlash oynasi ochiladi. Server state, PKCE,
  nonce, token imzosi, issuer, audience va amal qilish muddatini tekshiradi.
- **Email/Gmail:** Resend orqali OfisTop uslubidagi HTML xat, tasdiqlash
  havolasi va 6 xonali kod keladi. Havoladagi sahifada tasdiqlagach kirishni
  boshlagan oyna avtomatik davom etadi. Xat boshqa qurilmada ochilsa ham asl
  brauzer tasdiqlanadi; begona brauzerga sessiya berilmaydi. Havolani shunchaki
  GET bilan ochish tasdiqlamaydi: email skaneri tasodifan kirib ketmaydi.
- **Telegram:** birinchi safar bot /start → o'z kontaktini ulashish → saytga
  qaytish. Qayta kirishda botda «Ha, kirish» tugmasi. Muqobil usul: saytda
  telefon raqamini yozish → botga kod kelishi → saytda kod kiritish. Botga
  oldin o'z kontaktini yuborish kerak. Boshqa kishining kontakti qabul qilinmaydi.

Kirish so'rovi 10 daqiqa, kod uchun 5 urinish. Kod va tasdiqlash tokenlari
bazada hash ko'rinishida saqlanadi. Browser cookie HttpOnly; production'da Secure.
So'rovlar bir martalik va rate limit bilan himoyalangan. Admin sessiyasi alohida.

## Vercel environment variables

Project → Settings → Environment Variables. Production muhitiga kiriting:

```dotenv
APP_URL=https://www.ofisijara.uz
DATABASE_URL=HAQIQIY_POSTGRESQL_ULANISH_MANZILI
SESSION_SECRET=KAMIDA_32_BELGILI_TASODIFIY_SIR

GOOGLE_CLIENT_ID=GOOGLE_OAUTH_CLIENT_ID
GOOGLE_CLIENT_SECRET=GOOGLE_OAUTH_CLIENT_SECRET

RESEND_API_KEY=RESEND_API_KALITI
EMAIL_FROM=OfisTop <login@auth.ofisijara.uz>

TELEGRAM_BOT_TOKEN=BOTFATHER_BERGAN_TOKEN
TELEGRAM_BOT_USERNAME=BOTNING_USERNAME_QIYMATI
TELEGRAM_WEBHOOK_SECRET=ALOHIDA_TASODIFIY_SIR

PROMO_MODE=true
ALLOW_GUEST_LOGIN=false
DEV_OTP_ENABLED=false
ADMIN_LOGIN=ofis
ADMIN_PASSWORD_HASH=AVVALGI_YOKI_YANGI_ADMIN_HASH
```

`APP_URL` — brauzerda oxirida ochiladigan asosiy HTTPS manzil. Hozir domen
`www.ofisijara.uz`ga yo'naltirilgani uchun shu misol ishlatilgan. `www`ni
o'chirsangiz barcha callback va webhook manzillarini bir xil moslang.
Secretlarga `NEXT_PUBLIC_` prefiksini qo'shmang. Kalitlarni Sensitive qilib
saqlash mumkin. Saqlagach yangi deploy zarur; eski deployment o'zgarmaydi.
Preview uchun o'z APP_URL/callback va test bazasidan foydalaning.

Ikki alohida sir yaratish (buyruqni ikki marta bajaring):

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Google va Telegram login email jo'natish xizmatidan mustaqil. Har bir usul
o'z kalitlari bo'lganda faol bo'ladi; kalit yetishmasa UI'dagi tugma xira.
Environment qiymatlari kiritilgani provayderning haqiqiy sozlanganini kafolatlamaydi.

## Google Cloud

1. Google Cloud / Google Auth Platform'da OfisTop loyihasi va OAuth consent
   screen yarating. App nomi, qo'llab-quvvatlash emaili, domen, maxfiylik
   (`/maxfiylik`) va foydalanish shartlari (`/shartlar`) manzillarini kiriting.
2. OAuth Client turi **Web application**.
3. Authorized redirect URI aynan:

```text
https://www.ofisijara.uz/api/auth/google/callback
```

4. Client ID/Secret'ni yuqoridagi variables'ga qo'ying. Scope'lar faqat
   `openid email profile`; foydalanuvchining Gmail xatlari o'qilmaydi.
5. Google loyihasi Testing bo'lsa test foydalanuvchilarini kiriting; ommaviy
   ishga tushirish uchun consent ekranini tegishli holatga o'tkazing.

Local sinov uchun alohida client yoki qo'shimcha redirect:
`http://localhost:3000/api/auth/google/callback`.

## Email: Resend

1. Resend'da o'zingizga tegishli `auth.ofisijara.uz` subdomenini qo'shing.
2. Resend bergan DNS yozuvlarini domen provayderiga kiriting va Verified bo'lishini kuting.
3. Shu domen uchun jo'natish huquqli API key yarating.
4. `EMAIL_FROM=OfisTop <login@auth.ofisijara.uz>` va `RESEND_API_KEY`ni kiriting.
5. Login xatlari uchun open/click tracking'ni o'chirish tavsiya qilinadi.

Jo'natuvchi sifatida `@gmail.com` ishlatmang: u sizning domeningiz emas.
Qabul qiluvchi esa Gmail yoki boshqa email ishlatishi mumkin. Xat dizayni:
`src/lib/email-login.ts`. Preview renderini haqiqiy Gmail yetkazilishi deb hisoblamang;
Verified domen bilan o'z emailingizda yuborish, Spam va link/code ishlashini tekshiring.

## Telegram bot — Vercel uchun webhook

1. Telegram'da @BotFather → `/newbot`, OfisTop nomi va username tanlang.
2. Bot tokeni, username (`@`siz) va webhook secret'ni Vercel variables'ga kiriting.
3. Sayt va baza migratsiyasini deploy qiling.
4. Mahalliy `.env.local` faylga APP_URL hamda shu uch TELEGRAM qiymatini
   vaqtincha kiriting. Fayl Git'ga qo'shilmaydi. Keyin bir marta:

```powershell
npm.cmd run bot:webhook
```

Bu skript `https://www.ofisijara.uz/api/telegram/webhook`ni ulaydi, message
va callback_query update'larini yoqadi. Token logga chiqarilmaydi.
Botning alohida mantiqi: `src/lib/telegram-bot.ts`; Telegram API adapteri:
`src/lib/telegram.ts`. Vercel'da doimiy ishlaydigan bot serveri kerak emas:
Telegram update kelganda webhook funksiyasi ishlaydi.

### Alohida ishlaydigan bot varianti

`scripts/run-telegram-bot.ts` — alohida polling worker. Vercel serverless
funksiyasida ishlatmang; uzoq ishlaydigan kompyuter/server uchun:

```powershell
npm.cmd run bot:poll
```

Unga APP_URL, TELEGRAM_BOT_TOKEN va TELEGRAM_WEBHOOK_SECRET kerak. Bazaga
to'g'ridan-to'g'ri ulanmaydi; update'ni saytning himoyalangan webhook endpointiga uzatadi.
Webhook va polling bir vaqtda ishlamaydi; skript faol webhook bo'lsa to'xtaydi.
Ommaviy Vercel saytida yuqoridagi webhook variantini tanlang.

## Baza migratsiyasi

`drizzle/0003_wise_impossible_man.sql` ikki jadval qo'shadi: `auth_identities`
va `auth_challenges`. Eski foydalanuvchilar/e'lonlar o'chirilmaydi.
Production DATABASE_URL bilan (Git'ga qo'shilmagan `.env.local` orqali):

```powershell
npm.cmd run db:setup
```

Vercel avtomatik ravishda Railway'dagi pre-deploy buyrug'ini ishlatmaydi.
Shuning uchun migration'ni yangi kodni production'ga deploy qilishdan oldin
ishga tushiring. Build vaqtida production bazasini o'zgartirish talab qilinmaydi.
Railway/Fly'da avvalgi pre-deploy/release command shu migratsiyani o'zi qo'llaydi.

## Avvalgi hisoblar va domen almashishi

- Eski mehmon hisobidagi brauzerda yangi usullardan biri bilan kirsangiz,
  e'lon, bildirishnoma va sevimlilar tasdiqlangan hisobga o'tadi.
- Google tasdiqlagan Gmail/Workspace manzili va shu email bilan kirish bitta
  hisobga bog'lanadi. Google boshqa provayder emailiga vakolatli bo'lmasa,
  email nomining o'zi bilan hisoblar birlashtirilmaydi.
- Telegram boshqa mustaqil tasdiqlangan identifikator; email va Telegram
  hisoblarini faqat aloqa raqamiga qarab avtomatik birlashtirmaymiz.
- `ofistop.uz`ga o'tishda APP_URL, Google redirect, Telegram webhook va
  EMAIL_FROM uchun verified domenni yangilang. Shu bazani saqlang.
  Tasdiqlangan hisob yangi domenda qayta kirib e'lonlarini topadi. Hali
  tasdiqlanmagan mehmonlarga esa avval eski domenda hisobini tasdiqlash kerak.

## Tekshirish

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

`tests/auth-providers.test.ts` tashqi tarmoqsiz email/bot API'larini taqlid
qiladi; Google JWT uchun haqiqiy test RSA imzosi tekshiriladi. Real kalitlar
bo'lmagani sabab haqiqiy Google consent, email yetkazilishi, Telegram webhook
va Vercel deploy'ni hostingda yakuniy tekshirish kerak.

Muhim: yangi login Vercel'da ishlaydi, ammo mavjud **local diskka rasm saqlash**
Vercel'da doimiy ombor emas. Ommaviy rasm yuklash uchun R2/S3/Blob ulash
hali alohida vazifa; Railway/Fly'da esa volume sozlamasi saqlanadi.

## Rasmiy manbalar

- https://developers.google.com/identity/openid-connect/openid-connect
- https://core.telegram.org/bots/api
- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/dashboard/domains/introduction
- https://vercel.com/docs/environment-variables/sensitive-environment-variables
