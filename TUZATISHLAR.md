# OfisIjara 0.2 — bajarilgan tuzatishlar

## Tuzatildi
- ListingWizard komponentlari tashqariga chiqarildi: harf terishda input va fokus yo‘qolmaydi.
- Qoralama uchun 2 soniya tanaffusdan keyin avtomatik saqlash; saqlanmagan o‘zgarish bilan chiqishda ogohlantirish; eski ochiq oynadan saqlashda versiya tekshiruvi.
- Moderator bloki (`is_suspended`, sabab) oddiy pauzadan ajratildi. Egasi yoki vakili uni olib tashlay olmaydi; moderator/admin uchun alohida blokni olib tashlash amali mavjud.
- Bloklangan e’lonlar va bloklangan foydalanuvchi e’lonlari katalog, xarita, aloqa API, tafsilotlar va sevimlilar ko‘rinishidan chiqariladi.
- Muhim maydonlar, jumladan aloqa va qo‘shimcha xarajatlar o‘zgarsa qayta moderatsiya. O‘zgarmagan formani qayta saqlash e’lonni yashirmaydi.
- Pending/approved e’lonning majburiy maydonlarini bo‘shatish rad etiladi. Tasdiqlashda joriy ma’lumot va rasm soni qayta tekshiriladi. Eski admin ko‘rinishidan tasdiqlash versiya tekshiruvi bilan himoyalangan.
- E’lon o‘zgartirishlari PostgreSQL tranzaksiyasida qator blokirovkasi bilan bajariladi; rasm limiti, asosiy rasm va holat ketma-ket tekshiriladi.
- Real kalendar sanasi, qavatlar mosligi, koordinatalar juftligi tekshiriladi.
- Login `next` parametri xavfsiz ichki URL bilan cheklangan; kirish/logout endpointlariga origin tekshiruvi qo‘shilgan.
- OTP urinishlari va kodni iste’mol qilish bitta tranzaksiyada. Testda kod ekranda; production’da dev kodi berilmaydi.
- `db:bootstrap`: demo ma’lumotlarsiz 14 hudud, Toshkentning 12 tumani, 14 qulaylik. `db:setup` migratsiya va bootstrapni birlashtiradi.
- Valyuta/davr/birlikni narx chegarasisiz filtrlash; narx/maydon oralig‘i validatsiyasi; hudud almashtirilganda tuman yangilanadi; markaz filtri saqlanadi.
- Xizmat to‘lovi, uning davri va xonalar soni tafsilotda ko‘rinadi.
- Markaz nomi, manzili, hududi/tumani, aloqa, koordinatalari, qulayliklari va rasmlarini admin tahrirlaydi. Markaz sahifasida galereya va xarita chiqadi.
- Vakil kabinetida o‘zi boshqaradigan markazning boshqa egalarga tegishli e’lonlari ham mavjud.
- E’lon tafsilotida muddati tugagan holat to‘g‘ri; canonical URL va Open Graph rasm qo‘shilgan.
- Xarita popup rasmining noto‘g‘ri `/media/` URL’i `/api/media/`ga tuzatilgan.
- Rasmlar yozilishi muvaffaqiyatsiz bo‘lsa kompensatsion tozalash, arxivlangan e’lon rasmlarini o‘zgartirishni taqiqlash, 90 MB nginx/API limitini moslashtirish.
- Muddati o‘tgan sessiya/OTP/rate-limit va bog‘lanmagan fayllar uchun cleanup buyrug‘i.
- Windows yo‘riqnomasi, .cmd yordamchilari, Docker Compose, xavfsiz tasodifiy SESSION_SECRET yaratish.
- Yangi xabarlarning ruscha tarjimalari qo‘shilgan.

## Tekshiruvlar
- Avvalgi unit testlar saqlandi; o‘zgargan moderatsiya qoidasi bo‘yicha kutilmalar yangilandi.
- Qo‘shimcha komponent testi to‘rt harfni ketma-ket kiritib, o‘sha input va fokus saqlanganini tekshiradi.
- PGlite (ichki PostgreSQL dvigateli) bilan migratsiya, bootstrap, e’lon yaratish/tahrirlash, rasm yuklash, yuborish, tasdiqlash, bloklash, qidiruv, OTP va markaz tahriri integratsiyasi tekshirildi.
- Aniq oxirgi natijalar `TEKSHIRUV.txt` faylida.

## Tekshirilmagan yoki ataylab keyinga qoldirilgan
- Windows kompyuterida .cmd fayllari va Docker Desktop jarayoni bu muhitda bajarilmadi.
- Haqiqiy alohida PostgreSQL serveriga HTTP orqali Playwright e2e to‘liq ishga tushirilmadi. Eski e2e fayllari saqlandi va tegishli kutilmalar yangilandi; to‘liq natija deb da’vo qilinmaydi.
- PGlite parallel so‘rovlarni seriallaydi: bu test real ko‘p ulanishli PostgreSQL yuklama sinovini almashtirmaydi. Qator blokirovkasi kodda qo‘llangan.
- Haqiqiy Eskiz, Telegram, VPS, HTTPS va mobil brauzerda vizual tekshiruv bajarilmadi. Hozir test uchun ular shart emas.
- Barcha viloyatlarning tumanlari to‘liq import qilinmagan: admin orqali qo‘shiladi.
- Rasmlar bitta server diskida. S3, pullik tariflar, ichki chat va CRM/buxgalteriya bu ish doirasiga qo‘shilmagan.
- Maxfiylik va foydalanish shartlari avvalgi matnlar; haqiqiy ommaviy ishga tushirish oldidan operatorning aloqa ma’lumotlari va amaldagi ish jarayoniga moslashtiriladi.

## Mavjud bazani yangilash
`npm run db:setup`ni bajaring. Yangi migratsiya ma’lumotlarni o‘chirmaydi; yangi ustunlarni qo‘shadi. Auditida `listing.hide` bo‘lgan eski `paused` e’lonlar xavfsiz tomondan moderator bloki deb belgilanadi; kerak bo‘lsa admin yangi tugma bilan blokni olib tashlaydi.
