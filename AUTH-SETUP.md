# OfisTop: Google va Telegram orqali kirish

> Yangi joylashtirish tartibi: [Vercel + Neon + R2 + Render](DEPLOY-VERCEL-R2-RENDER.md).
> Bot Render'da ishlatilganda `bot:webhook` buyrug'ini bajarmang: Render ishga tushganda webhookni o'zi ulaydi. Quyidagi Vercel webhook ko'rsatmalari eski joylashtirish varianti uchun.

Email orqali kirish olib tashlangan: UI, xat yuborish va eski tasdiqlash endpointlari o'chirilgan.
RESEND_API_KEY va EMAIL_FROM endi kerak emas. SMS ham o'chirilgan.
Google tasdiqlagan email hisob identifikatori sifatida saqlanadi; xat yuborilmaydi.
E'lonlar bepul davrda ham admin tasdig'idan keyin chiqadi.

## Hozirgi production xatosi

Vercel logida: DATABASE_URL sozlanmagan.
Google va Telegram kirish so'rovlarini bazada saqlaydi. Google kaliti yoki bot tokenining o'zi yetarli emas.
Railway sotib olish majburiy emas: mavjud PostgreSQL yoki Neon kabi xizmat bazasi ishlaydi.
Vercel'dagi sayt va bot webhooki shu bitta bazadan foydalanadi.

## Baza ulash

1. Mavjud PostgreSQL bazangiz bo'lsa undan foydalaning. Yangi baza bo'sh boshlanadi;
   kompyuterdagi test e'lonlari avtomatik ko'chmaydi.
2. Baza provayderidan connection string oling. Neon'da loyiha yaratib Connect oynasidan olinadi.
3. Vercel > loyiha > Settings > Environment Variables:
   Key DATABASE_URL, Value to'liq PostgreSQL ulanish manzili, Environment Production.
   localhost yoki Railway private hostini Vercel'da ishlatmang; tashqi ulanish manzili kerak.
4. Xuddi shu manzilni lokal .env.local fayliga DATABASE_URL qiymati sifatida kiriting.
   Maxfiy qiymatni chatga yoki Git'ga yubormang. .env.example faqat namuna.
5. Loyiha terminalida npm.cmd run db:setup bajaring.
   Bu mavjud migratsiyalarni qo'llaydi va hududlarni yaratadi, foydalanuvchi/e'lonlarni o'chirmaydi.
6. Yangi kodni Vercel'ga deploy qiling; env o'zgarishlari uchun Redeploy kerak.

## Vercel sozlamalari

APP_URL=https://ofistop.uz
DATABASE_URL=PROVAYDER_BERGAN_POSTGRESQL_MANZILI
SESSION_SECRET=KAMIDA_32_BELGILI_TASODIFIY_SIR
GOOGLE_CLIENT_ID=GOOGLE_BERGAN_ID
GOOGLE_CLIENT_SECRET=GOOGLE_BERGAN_SECRET
TELEGRAM_BOT_TOKEN=BOTFATHER_BERGAN_TOKEN
TELEGRAM_BOT_USERNAME=BOT_USERNAME_AT_BELGISIZ
TELEGRAM_WEBHOOK_SECRET=ALOHIDA_TASODIFIY_SIR
PROMO_MODE=true
ALLOW_GUEST_LOGIN=false
DEV_OTP_ENABLED=false
ADMIN_LOGIN=AMALDAGI_LOGIN
ADMIN_PASSWORD_HASH=AMALDAGI_HASH

APP_URL brauzerda ishlatiladigan asosiy HTTPS domen bo'lsin. www holati bir xil bo'lishi kerak.
Production'da APP_MODE=test va TEST_DATABASE=embedded ishlatmang.
Secretlarga NEXT_PUBLIC_ prefiksini qo'shmang. Mavjud SESSION_SECRETni sababsiz almashtirmang.
Yangi sir kerak bo'lsa: node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET va TELEGRAM_WEBHOOK_SECRET uchun alohida qiymatlar ishlating.

## Google

Google Auth Platform > Clients > Web application uchun redirect URI:
https://ofistop.uz/api/auth/google/callback
Local sinov: http://localhost:3000/api/auth/google/callback

Branding'da OfisTop, bosh sahifa, /maxfiylik va /shartlar havolalarini kiriting.
Yangi asosiy domen: `ofistop.uz` (www siz). Aniq maydonlar va domen ko‘chirish qadamlari: [OFISTOP-DOMAIN.md](OFISTOP-DOMAIN.md).
Audience External bo'lsin. Ommaviy ishga tushirishda Publish app va branding tekshiruvini yakunlang.
Kod faqat openid email profile so'raydi. Google Gmail xatlarini o'qimaydi.
Client ID va Secret bir clientdan bo'lsin. Domen almashsa APP_URL va redirectni moslang.

## Telegram: Vercel webhook

Alohida Railway bot serveri kerak emas. Saytdagi /api/telegram/webhook bot kodini ishlatadi.
BotFather'dan token olish va envga yozishdan keyin webhookni bir marta ro'yxatdan o'tkazish zarur.

1. Baza jadvallari va sayt deployi tayyor bo'lsin.
2. Lokal .env.local faylga APP_URL va uchta TELEGRAM_* qiymatini Vercel bilan bir xil kiriting.
3. npm.cmd run bot:webhook bajaring.
4. Saytdagi Telegram orqali kirish > Telegram orqali kirish tugmasi botni ochadi.
5. Botda Start > o'z kontaktini ulashish; qayta kirishda Ha, kirish tugmasi.
6. Saytga qaytganda kirish avtomatik yakunlanadi. Bot ochilmasa sahifada zaxira havola bor.

Muqobil usul: saytga telefon raqamini yozish > botga kod > saytda kodni kiritish.
Avval o'z kontaktingiz botga ulangan bo'lishi kerak. Boshqa odam kontakti qabul qilinmaydi.
Webhook message va callback_query hodisalarini qabul qilishi kerak.
scripts/telegram-set-webhook.ts ham endi yangi setup-telegram-webhook.ts ga yo'naltiriladi.

Alohida polling worker faqat kerak bo'lsa npm.cmd run bot:poll bilan ishlaydi;
Vercel'da ishga tushirmang. Webhook va pollingni bir vaqtda ishlatmang.

## Diagnostika

npm.cmd run auth:check

.env.local dagi sozlamalarni o'qiydi: env mavjudligi, bazaga ulanish, login jadvallari,
Telegram tokenning username'ga mosligi va webhook manzilini tekshiradi.
Bazaga yozmaydi, webhookni o'zgartirmaydi, foydalanuvchilarga xabar yubormaydi.
Kalitlarni chiqarmaydi. Natija faqat shu lokal envga tegishli; Vercel env bilan bir xil bo'lsin.

Yangi kodda Vercel loglari:
- AUTH_DATABASE_URL_MISSING: DATABASE_URL yo'q.
- AUTH_DB_MIGRATION_REQUIRED: jadval yoki ustun yo'q; db:setup kerak.
- AUTH_DB_CREDENTIALS: baza login/paroli noto'g'ri.
- AUTH_DB_CONNECTION: baza manzili/tarmoq ishlamayapti.
- AUTH_SESSION_SECRET_INVALID: SESSION_SECRET yo'q yoki 32 belgidan qisqa.

## Tekshiruv

npm.cmd test
npm.cmd run typecheck
npm.cmd run build

Avtomatik testlarda Google va Telegram API taqlid qilinadi.
Haqiqiy kirish production baza, kalitlar va webhook ulangach alohida tekshiriladi.
Eski email hisoblarining ma'lumotlari o'chirilmaydi; tasdiqlangan Gmail bilan Google kirishi
mavjud email identifikatorini topadi. Telegram va Google avtomatik birlashtirilmaydi.

Rasmlar: hozirgi local disk adapteri Vercel'da doimiy ombor emas.
Ommaviy rasm yuklash uchun alohida object storage ulash zarur; PostgreSQL rasmlar omborini almashtirmaydi.

Manbalar:
- https://developers.google.com/identity/openid-connect/openid-connect
- https://core.telegram.org/bots/api#setwebhook
- https://neon.com/docs/guides/vercel-managed-integration
- https://neon.com/pricing
