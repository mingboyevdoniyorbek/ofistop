# Asosiy domen: https://ofistop.uz

Kod yangi domen uchun tayyor. DNS, Vercel/Railway kabineti, Google Console va Telegram webhooki tashqi sozlamalar; lokal faylni almashtirish ularni avtomatik yangilamaydi.

## 1. Vercel domeni

1. Vercel → mavjud loyiha → Settings → Domains → Add Domain.
2. `ofistop.uz` qo‘shing. Asosiy manzil **www siz** bo‘ladi.
3. `www.ofistop.uz` ni ham qo‘shing, uni `https://ofistop.uz` ga yo‘naltiring. Vercel asosiy domenni www ga yo‘naltirishni taklif qilsa, buni tanlamang: kod www dan asosiy domenga yo‘naltiradi.
4. Domen olingan xizmatda Vercel aynan shu loyiha uchun ko‘rsatgan DNS yozuvlarini kiriting. IP yoki CNAME qiymatini taxmin qilib yozmang. Pochta MX/TXT yozuvlarini saqlang.
5. `Valid Configuration` va HTTPS tayyorligini tekshiring. Eski domenlarni shu loyihada qoldiring: redirect ishlashi uchun ularga kelgan so‘rov ham shu hostingga yetib borishi kerak.

Manba: https://vercel.com/docs/domains/working-with-domains/add-a-domain

Agar web sayt Railway’da bo‘lsa: Networking → Custom Domain orqali shu domenlarni aynan mavjud web xizmatiga qo‘shing va Railway bergan DNS yozuvlarini qo‘ying. Bitta domenni bir paytda ikki hostingga yo‘naltirmang. Asosiy `APP_URL` ikkala hosting variantida ham bir xil.

## 2. Production environment va baza

```dotenv
APP_URL=https://ofistop.uz
```

Mavjud `DATABASE_URL`, `SESSION_SECRET`, Google va Telegram kalitlarini saqlang. `DATABASE_URL` hali yo‘q bo‘lsa, PostgreSQL ulanishini qo‘shish shart; domenning o‘zi baza xatosini tuzatmaydi.

Yangi migratsiya va hududlar uchun shu production bazaga ulangan terminalda:

```sh
npm run db:setup
```

Keyin yangi kodni deploy/redeploy qiling. `APP_URL=https://ofistop.uz` bilan build qilinganda:

- `ofisijara.uz/joylar?...` → `https://ofistop.uz/joylar?...`;
- `www.ofisijara.uz` → `https://ofistop.uz`;
- `www.ofistop.uz` → `https://ofistop.uz`.

Yo‘naltirish 308, sahifa yo‘li va query saqlanadi. Localhost uchun bu qoidalar yoqilmaydi. Yangi domenda kirish cookie’lari qaytadan yaratiladi; eski domendagi anonim kabinet cookie’si avtomatik ko‘chmaydi. Mavjud foydalanuvchilarning bazasini almashtirmang.

Rasmlar uchun mavjud persistent storage talab qilinadi. Vercelning vaqtinchalik lokal diski doimiy rasm ombori emas; loyihadagi hozirgi local saqlash usuliga Railway Volume kabi doimiy disk kerak. Hostingni shu sabab aniq tanlang; object storage adapteri alohida ulanadi.

## 3. Google Console

Google Auth Platform → Clients → mavjud Web client:

| Maydon | Qiymat |
|---|---|
| Authorized JavaScript origins | `https://ofistop.uz` |
| Authorized redirect URIs | `https://ofistop.uz/api/auth/google/callback` |

Branding:

| Maydon | Qiymat |
|---|---|
| Application home page | `https://ofistop.uz` |
| Privacy policy | `https://ofistop.uz/maxfiylik` |
| Terms of service | `https://ofistop.uz/shartlar` |
| Authorized domain | `ofistop.uz` |

Client ID va Client Secretni qaytadan yaratish kerak emas. Callback manzili aynan mos bo‘lsin. Google talab qilsa domen egaligini tasdiqlang. Audience holati Testing bo‘lsa faqat ruxsat berilgan test hisoblari bilan tekshiring; hammaga ochishda Publishing statusni tekshiring.

Manba: https://developers.google.com/identity/protocols/oauth2/web-server

## 4. Telegram

Sayt, baza va HTTPS tayyor bo‘lgach, lokal `.env.local` da `APP_URL=https://ofistop.uz` va shu botning mavjud kalitlari bilan:

```sh
npm run bot:webhook
npm run auth:check
```

Yangi webhook: `https://ofistop.uz/api/telegram/webhook`. Bot tokenini almashtirish kerak emas. Faqat `APP_URL` ni o‘zgartirish Telegramdagi webhook manzilini yangilamaydi — yuqoridagi buyruq ham bajariladi.

## 5. Jonli tekshirish

1. `https://ofistop.uz`, `/markazlar`, `/joylar?view=map` ochilsin.
2. `/robots.txt` va `/sitemap.xml` yangi domenni ko‘rsatsin.
3. Google/Telegram orqali kirish va `/admin` ishlasin.
4. Rasmli e’lon yuborish → admin tasdiqlashi → katalogda chiqishi tekshirilsin.
5. Hostingni qayta deploy qilgandan keyin ham rasm ochilsin.

Yangi qidiruvlar, biznes markazlar va scheduler tafsilotlari: [DISCOVERY-SETUP.md](DISCOVERY-SETUP.md).
