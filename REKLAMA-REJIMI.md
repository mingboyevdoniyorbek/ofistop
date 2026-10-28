# SMSsiz bepul reklama davri

> Ushbu hujjat avvalgi mehmon rejimini tasvirlaydi. Hozir Google/email/Telegram orqali kirish ishlatiladi:
> [AUTH-SETUP.md](AUTH-SETUP.md). SMS endpointlari o'chirilgan; PROMO_MODE ularni qayta yoqmaydi.

Hozirgi rejim: foydalanuvchi saytga kirib joylarni qidiradi, kontaktlarni ochadi yoki **E’lon berish** tugmasini bosib, SMSsiz e’lon yaratadi. Majburiy maydonlar va rasm to‘ldirilgach **Moderatsiyaga yuborish** bosiladi. E’lon faqat admin tasdiqlagach ommaga chiqadi. To‘lov olinmaydi.

## Mahalliy tekshirish

```powershell
npm.cmd run dev:test
```

- Sayt: http://localhost:3000
- Admin: http://localhost:3000/admin
- Login: `ofis`
- Parol: `ijara`

Admin havolasi sayt menyulariga va oddiy kirish sahifasiga qo‘shilmagan. Faqat `/admin` manzilini yozib kirasiz. Admin va foydalanuvchi sessiyalari alohida: bir brauzerda ikkalasini ham ishlatish mumkin. Admin sessiyasi 8 soat amal qiladi; parol o‘zgarsa eski admin sessiyalari ishlamaydi.

Test bazasidagi avvalgi e’lonlar saqlanadi. Ommaviy saytga test bazasini ko‘chirmang; alohida PostgreSQL bazasiga faqat `db:setup` bilan hududlar va qulayliklarni yarating.

## Foydalanuvchi kabineti

Har bir tashrifchiga alohida hisob va sessiya yaratiladi. E’londa yozilgan telefon orqali boshqa foydalanuvchining kabinetiga kirib bo‘lmaydi. Telefon reklama davrida tasdiqlangan deb belgilanmaydi.

E’lonlarni boshqarish va bildirishnomalar shu brauzerda, sessiya yaratilganidan 30 kun davomida mavjud. Brauzer ma’lumotlari tozalansa yoki inkognito oynasi yopilsa, SMSsiz hisobga kirish yo‘qoladi. Bu cheklov kabinetda ko‘rsatilgan. Hozir boshqa qurilmadan SMSsiz hisobni tiklash funksiyasi yo‘q.

## Kunlik admin tekshiruvi

1. `/admin`ga login-parol bilan kiring. Birinchi ochiladigan bo‘lim — tasdiqlashni kutayotgan e’lonlar.
2. E’lon tafsilotlari, telefon, narx va rasmlarini tekshiring. To‘g‘ri bo‘lsa **Tasdiqlash**, aks holda **Rad etish**ni bosing va sabab yozing. Tasdiqlanguncha e’lon katalog, xarita va ommaviy sahifada ochilmaydi. Muhim ma’lumot yoki rasm o‘zgarsa qayta tekshiriladi.
3. Noto‘g‘ri e’londa **Saytdan o‘chirish**ni bosing va sabab yozing.
4. E’lon qidiruv, xarita va ommaviy sahifadan olib tashlanadi. Egasi uni o‘zi qayta chop eta olmaydi.
5. Egaga **Bildirishnomalar** bo‘limida sabab chiqadi. Amal auditga yoziladi.

O‘chirilgan e’lon tarix va bildirishnoma uchun bazada arxiv sifatida qoladi; ommaga ko‘rinmaydi. Admin **Barchasi** filtridan tarixini ko‘radi.

## Domen bilan ommaga chiqarish

Domenning o‘zi yetmaydi: Node.js ishlaydigan server, PostgreSQL, doimiy rasm diski va HTTPS ham kerak. VPS o‘rnatilishi: **[DEPLOY.md](DEPLOY.md)**.

Serverda `.env.example`ni `.env.production`ga nusxalang. Asosiy sozlamalar:

```dotenv
NODE_ENV=production
APP_URL=https://SIZNING-DOMEN.uz
DATABASE_URL=postgres://FOYDALANUVCHI:PAROL@127.0.0.1:5432/ofisijara
SESSION_SECRET=YANGI-TASODIFIY-64-BELGILI-SIR
PROMO_MODE=true
ADMIN_LOGIN=ofis
ADMIN_PASSWORD_HASH=.env.example-dagi-hashni-bu-yerga-kochiring
DEV_OTP_ENABLED=false
STORAGE_DRIVER=local
UPLOAD_DIR=/var/lib/ofisijara/uploads
```

`ADMIN_PASSWORD_HASH`ga `.env.example`dagi **to‘liq** `scrypt:...` qiymatini yozsangiz, parol `ijara` bo‘ladi. Bu sodda parol; ommaga ochishdan oldin kuchli parolga almashtiring. Parolni kodga yoki brauzerga yuborish shart emas, faqat serverdagi hash o‘zgaradi.

Yangi sessiya siri yaratish:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Yangi admin paroli hashini yaratish (parol terminal tarixiga yozilmaydi):

```powershell
npm.cmd run admin:hash
```

Production’da `APP_MODE=test` va `TEST_DATABASE=embedded`ni qo‘ymang. `dev:test`ni internetga chiqarmang. Serverda:

```bash
NODE_ENV=production npm run db:setup
npm run build
npm start
```

Nginx/proksi tashqi `X-Forwarded-For`ni ishonchli manzil bilan almashtirsin; kirish va e’lon yaratish limitlari shu manzildan foydalanadi. DEPLOY.md dagi proksi HTTPS bilan ishlaydi. `.env.production` va rasm/baza ma’lumotlari repozitoriyga kiritilmaydi.

Bu o‘zgarishlar mahalliy serverda sinovdan o‘tkazilgan. Domen DNS’i va hosting bu ish davomida o‘zgartirilmadi.

## 10–15 kundan keyin qaytarish

SMS va Telegram kodlari o‘chirilmagan. Hozir reklama sozlamasi ularni UI va API darajasida o‘chirib turibdi.

1. Avval haqiqiy SMS xizmatini sozlang va tekshiring.
2. `.env.production`da `PROMO_MODE=false` qiling va serverni qayta ishga tushiring.
3. Yangi SMSsiz hisob ochish to‘xtaydi; telefon bilan kirish qaytadi. Admin tasdiqlashi ikkala rejimda ham majburiy.
4. Reklama davridagi foydalanuvchi **o‘sha brauzerda** SMS bilan telefonini tasdiqlasa, e’lonlari, bildirishnomalari va sevimlilari tasdiqlangan hisobiga o‘tadi. Aloqa telefonining o‘zi egalikni isbotlamaydi.

Ixtiyoriy `PROMO_ENDS_AT` bilan tugash vaqtini belgilash mumkin, masalan `2026-11-12T23:59:59+05:00`. Bu faqat namuna; haqiqiy reklama boshlangan kundan hisoblang. Bo‘sh qoldirilsa rejimni qo‘lda o‘chirasiz. SMS tayyor bo‘lmasa avtomatik tugash vaqtini belgilamang.

**Pullik e’lonlar alohida bosqich:** hozir tarif, to‘lov provayderi va to‘lov tasdiqlash tizimi ulanmagan. `PROMO_MODE=false` pul yechmaydi yoki pullik e’lonni avtomatik yoqmaydi. Tarif va to‘lov usuli kelishilgach to‘lov oqimi qo‘shiladi.

## Tekshiruvlar

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Mahalliy reklama serveri ishlab turganda `npm.cmd run test:local`: admin login, 7 admin bo‘limi, SMSsiz kabinet, rasm siqilishi, tasdiqlanmagan e’lonning yashirilishi, admin tasdiqlashi, tahrirdan keyingi qayta tasdiqlash, begona hisobdan tahrirlashni rad etish, admin o‘chirishi, bildirishnoma va mobil kirishni tekshiradi. Test o‘zining sinov e’lonini yaratib, keyin arxivlaydi.

## Rasmlarni siqish

JPEG, PNG va WebP fayllari har biri 8 MB gacha qabul qilinadi; 2–5 MB rasmlar shu limitga kiradi. Mavjud `sharp` kutubxonasi serverda asosiy rasmni eng katta tomoni 1600 px (WebP sifati 80), kichik ko‘rinishni 480 px (sifat 72) qilib saqlaydi. Nisbat va EXIF yo‘nalishi saqlanadi, kichik rasmlar kattalashtirilmaydi, EXIF/GPS ma’lumotlari olib tashlanadi. Diskda asl faylning qo‘shimcha nusxasi qolmaydi.

Natijadagi bayt hajmi rasm mazmuniga bog‘liq; barcha rasmlar uchun bir xil KB kafolatlanmaydi. Siqish serverda bajariladi: disk va sahifani yuklash trafikini kamaytiradi, lekin foydalanuvchidan serverga dastlabki fayl to‘liq yuboriladi. Yangi yuklashlarga qo‘llanadi; avval saqlangan rasmlar qayta yozilmaydi.
