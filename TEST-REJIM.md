# Windows’da mahalliy reklama rejimini tekshirish

Node.js va loyiha paketlari kerak. Docker, PostgreSQL serveri, SMS, Telegram yoki `.env.local` talab qilinmaydi.

```powershell
npm.cmd ci
npm.cmd run dev:test
```

Paketlar o‘rnatilgan bo‘lsa birinchi buyruq kerak emas. `npm.cmd run dev` ham shu mahalliy testni ochadi. Windows’da `1-TEST-SOZLASH.cmd` birinchi tayyorlash uchun, `2-ISHGA-TUSHIRISH.cmd` esa ishga tushirish uchun.

**Sayt:** http://localhost:3000  
**Admin:** http://localhost:3000/admin — login **ofis**, parol **ijara**.

Terminalni ochiq qoldiring. To‘xtatish: Ctrl+C. Eski server ochiq bo‘lsa avval uni to‘xtating va yangi rejimda qayta ishga tushiring.

## Nima ishlaydi

- Kirishsiz qidirish va kontaktni ko‘rish.
- **E’lon berish** orqali SMSsiz shaxsiy kabinet ochish.
- Rasm va majburiy maydonlardan keyin bepul moderatsiyaga yuborish; admin tasdiqlagach chop etish.
- Rasmlarni serverda WebP formatiga siqish; asosiy rasm 1600 px, kichik ko‘rinish 480 px chegarasida.
- `/admin` orqali alohida login-parol bilan boshqarish; menyuda admin havolasi yo‘q.
- **Saytdan o‘chirish** orqali sababli olib tashlash, egasiga kabinetdagi bildirishnoma.

16 demo e’lon va 3 biznes markaz boshlang‘ich namunalar sifatida mavjud. Haqiqiy ma’lumot emas. O‘zgarishlar `.test-data/` ichida saqlanadi; qayta ochganda ma’lumotlar qoladi. Mahalliy test tashqi PostgreSQL bazangizga tegmaydi.

SMSsiz hisob shu brauzer sessiyasiga bog‘langan. O‘z e’lonlaringiz uchun inkognito oynadan foydalanmang va sayt ma’lumotlarini tozalamang. Sessiya 30 kun amal qiladi.

## Sinab ko‘rish

1. **E’lon berish**ni bosing, maydonlarni to‘ldiring va rasm yuklang.
2. Oxirgi bosqichda **Moderatsiyaga yuborish**ni bosing. Tasdiqlanguncha qidiruvda chiqmasligini tekshiring.
3. `/admin`ga kiring, e’lonni tekshirib **Tasdiqlash**ni bosing. Boshqa brauzerda qidiruvdan e’lonni toping.
4. Narx yoki rasmni o‘zgartiring: e’lon qayta moderatsiyaga o‘tadi.
5. Admin orqali qayta tasdiqlang yoki sabab bilan rad eting. Egasi **Bildirishnomalar** bo‘limida natijani ko‘radi.

## Port va tekshiruvlar

3000 band bo‘lsa: `npm.cmd run dev:test -- -p 3001`, so‘ng http://localhost:3001. Bir vaqtda faqat bitta mahalliy test serveri ishlaydi.

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Server ishlab turganda: `npm.cmd run test:local`. Bu Chrome/Edge yoki Playwright Chromium bilan yangi reklama jarayonini tekshiradi. Skript yaratgan sinov e’loni oxirida arxivlanadi. Rasmlar `test-results/` ichida.

## Eski SMS rejimini mahalliy tekshirish

Serverni to‘xtating, PowerShell’da:

```powershell
$env:PROMO_MODE="false"
npm.cmd run dev:test
```

SMS o‘rniga tasodifiy kod ekranda ko‘rinadi, e’lonlar yana oldindan moderatsiyaga tushadi. Admin kirishi `/admin`dagi login-parolda qoladi. Qayta reklama rejimi uchun serverni to‘xtatib `$env:PROMO_MODE="true"` qiling va qayta oching.

**Domen, production va keyinchalik SMS/pullik rejimga o‘tish:** [REKLAMA-REJIMI.md](REKLAMA-REJIMI.md). `npm start` production uchun, mahalliy test uchun `dev:test`dan foydalaning.
