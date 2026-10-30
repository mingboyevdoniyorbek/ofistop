# Saytni haqiqiy ishga tushirish — qilingan ishlar va sizdan kerakli sozlamalar

Kod tomonidagi barcha tuzatishlar qilingan. Quyidagilar **sizning hisoblaringizda** sozlanadi
(Vercel → Project → Settings → Environment Variables). Har bir o'zgaruvchidan keyin **Redeploy** qiling.

## 0. Baza migratsiyasi — endi Vercel'da avtomatik
`package.json`dagi `vercel-build` skripti har deploy'da avval `npm run db:migrate`, keyin `next build` bajaradi.
Migratsiya muvaffaqiyatsiz bo'lsa deploy to'xtaydi (buzilgan sayt chiqmaydi). Shart: Vercel'da `DATABASE_URL`
(yoki `DATABASE_URL_UNPOOLED`) **Build** bosqichi uchun ham mavjud bo'lsin (Environment Variables → barcha muhitlar).
Boshqa hostingda: `npm run db:migrate` ni qo'lda bajaring.

## 1. ⚠ Deploy'dan OLDIN: admin paroli
Production'da hujjatdagi namunaviy parol (`ijara`) endi **ishlamaydi** — admin panelga kirish yopiladi.
Agar `ADMIN_PASSWORD_HASH` hali namunaviy qiymatda bo'lsa, avval yangi parol o'rnating:
```
npm run admin:hash
```
Chiqqan `scrypt:...` qiymatini Vercel'dagi `ADMIN_PASSWORD_HASH`ga yozing.

## 2. Aloqa ma'lumotlari (footer, "Biz haqimizda", huquqiy sahifalar)
`SITE_COMPANY`, `SITE_INN`, `SITE_PHONE`, `SITE_EMAIL`, `SITE_TELEGRAM`, `SITE_TELEGRAM_CHANNEL`, `SITE_INSTAGRAM`, `SITE_ADDRESS`.
Bo'sh qolganlari saytda ko'rinmaydi. Huquqiy matnlarni (Qoidalar, Maxfiylik, Shartlar) baribir yuristga ko'rsatish tavsiya etiladi.

## 3. Rasmlar uchun domen (CDN)
Cloudflare → R2 → bucket → **Settings → Custom Domains → Connect Domain** → `img.ofistop.uz`.
Keyin Vercel'da `MEDIA_PUBLIC_URL=https://img.ofistop.uz`.
- `ofistop.uz` domeni Cloudflare'da bo'lishi kerak (DNS Cloudflare orqali).
- `ofisijara.uz`ni ham ishlatsa bo'ladi: `img.ofisijara.uz`. Lekin `ofisijara.uz`ning o'zi (subdomen emas)
  `ofistop.uz`ga yo'naltirib qo'yilgan — eski havolalar va Google uchun shunday qolsin.
- Eski rasmlar ham yangi domendan ochiladi (kalitlar o'zgarmaydi).

## 4. Google va Yandex
1. https://search.google.com/search-console → `ofistop.uz` qo'shing → HTML tag usuli → `content` qiymatini `GOOGLE_SITE_VERIFICATION`ga yozing → Redeploy → Verify.
2. Sitemaps bo'limiga `https://ofistop.uz/sitemap.xml` kiriting.
3. Yandex Webmaster: xuddi shunday, `YANDEX_VERIFICATION`.
4. Statistika: `NEXT_PUBLIC_GA_ID` (Google Analytics 4) va/yoki `NEXT_PUBLIC_YM_ID` (Yandex Metrika).

## 5. Telegram kanal
Kanal oching → botingizni kanalga **administrator** qilib qo'shing → `TELEGRAM_CHANNEL_ID=@kanal_nomi`.
Admin e'lonni birinchi marta tasdiqlaganda rasm, narx va havola bilan kanalga avtomatik chiqadi.
`SITE_TELEGRAM_CHANNEL` footer'da "Yangi e'lonlar Telegram'da" tugmasini chiqaradi.

## 7. Qoralamalarni avtomatik o'chirish
Vercel'da `CRON_SECRET` qo'shing (istalgan uzun tasodifiy satr, masalan `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`).
`vercel.json` har kuni 22:17 UTC'da (Toshkent 03:17) `/api/cron/daily`ni chaqiradi va 7 kundan beri tahrirlanmagan qoralamalarni
rasmlari bilan o'chiradi. Foydalanuvchi kabinetni ochganda uning eski qoralamalari ham darhol tozalanadi.
Cron faqat **Production** deploy'da ishlaydi.

## Yangi sahifalar
- `/ijara/ofis`, `/ijara/ombor`, `/ijara/dokon`, … va `/ijara/ofis/yunusobod` kabi tuman sahifalari (Google uchun).
- `/ru/...` — har bir sahifaning ruscha manzili (Google ruscha qidiruvda ham topadi).
- `/biz-haqimizda`, `/sevimlilar` (kirmagan foydalanuvchi sevimlilari).
