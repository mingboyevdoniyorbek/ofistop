# OfisTop: xarita, biznes markazlar va qidiruv

## Mahalliy tekshirish

`npm.cmd run dev:test` — mahalliy test bazasini migratsiya qiladi va saytni ochadi. Eski server ochiq bo‘lsa, avval uning terminalida Ctrl+C bosing. Test ma’lumotlari `.test-data` ichida saqlanadi.

- `/joylar?view=map`: sonli guruhlar, yaqinlashtirish, bir nuqtadagi xonalar, “Shu hududdan qidirish”, “Menga yaqin”. Narx marker ustida emas, e’lon kartasida chiqadi.
- `/joylar`: butun joy uchun jami ijara budjeti, filtrlarni alohida olib tashlash, 1/3/5 km yaqin atrof, qidiruvni saqlash.
- `/markazlar`: markaz nomi/manzilidan qidirish, bo‘sh xonali markazlar.
- `/markazlar/{id}-{slug}`: markazning o‘z sahifasi, galereya, qulayliklar, ish vaqti, aloqa va saralanadigan xonalar.
- `/kabinet/markazlar`: vakilning markazlari, xonalari, bo‘sh/band holati va sahifa tahriri.
- `/kabinet/qidiruvlar`: saqlangan qidiruvlar.
- E’lon kartasidagi “Taqqoslash”: 3 tagacha joy. Jadvaldan olib tashlash ham ishlaydi.
- E’lon kiritish: 4 bosqich. Avtomatik saqlash yozilayotgan maydon fokusini o‘zgartirmaydi. E’lon administrator tasdiqlagach ommaga chiqadi.

## Markaz vakilini biriktirish

1. Vakilning saytda hisobi bo‘lishi kerak.
2. Administrator `/admin/markazlar` orqali markaz yaratadi yoki mavjudini tanlaydi.
3. Markazning vakillar qismidan hisobni tanlaydi (oxirgi 500 ta hisob ko‘rsatiladi). Shu tariqa telefon bilan kirmagan foydalanuvchini ham biriktirish mumkin. Muqobil usul — hisobning telefon raqamini yozish. Bloklangan hisob vakil qilib qo‘shilmaydi.
4. Vakil `/kabinet/markazlar` da o‘z markazini ko‘radi. “Sahifa va rasmlarni tahrirlash” orqali ma’lumotlarni yangilaydi.
5. “Xona qo‘shish” manzil, aloqa va markazni oldindan to‘ldiradi. Har bir xona alohida moderatsiyadan o‘tadi.

Vakil boshqa markazni o‘zgartira olmaydi. Markaz rasmlari mavjud rasm xizmati orqali WebP ga siqiladi. Birinchi rasm muqova hisoblanadi; “Muqova” tugmasi bilan almashtiriladi. Markaz haqidagi tahrirlar vakil huquqi tekshirilgach darhol chiqadi; xonalarning muhim tahrirlari qayta moderatsiyaga yuboriladi.

## Hostingga chiqarish

Yangi baza migratsiyasi: `drizzle/0004_massive_dazzler.sql`. Production PostgreSQL uchun `DATABASE_URL` mavjud muhitda:

```sh
npm run db:migrate
npm run build
```

Migrationni yangi kod foydalanuvchilarga xizmat ko‘rsatishidan oldin bajaring. U mavjud markazlarga `tagline`, `working_hours`, `website` maydonlarini va `saved_searches` jadvalini qo‘shadi. Oldingi e’lonlar o‘chirilmaydi. Vercel loyihasiga `DATABASE_URL` qo‘shilmaguncha baza talab qiladigan imkoniyatlar ishlamaydi; ushbu o‘zgarish tashqi bazani avtomatik yaratmaydi.

Foydalanuvchilar rasmlari uchun mavjud persistent disk yoki object storage sozlamasi kerak. Vercel funksiyasining vaqtinchalik diskida rasmlarni doimiy saqlamang.

## Bildirishnomalar va mavjudlik

Server scheduler/cron muhitida, shu loyiha va bazaga ulangan holda:

```sh
# Har 5 daqiqada:
npm run check-saved-searches

# Har soatda:
npm run expire-listings
```

Bu buyruqlar o‘z-o‘zidan rejalashtirilmaydi: hosting schedulerida alohida job yaratiladi. Vercelning API cron manzillari bu o‘zgarishga kiritilmagan. Scheduler bo‘lmasa, tizimga kirgan foydalanuvchi sahifani ochganda va har 3 daqiqada ko‘rinib turgan tabda saqlangan qidiruvlar tekshiriladi. Yangi mos e’lonlar sayt ichidagi bildirishnomalarda chiqadi. Har bir tekshiruv bir qidiruv uchun bitta jamlangan xabar beradi; ketma-ket takrorlash xabarni ko‘paytirmaydi.

7 kundan beri bo‘shligi tasdiqlanmagan faol e’lon uchun bir marta eslatma beriladi. Egasi yana tasdiqlasa, keyingi eslatma yangi tasdiqdan hisoblanadi. Muddati tugagan e’lon scheduler ishlamasa ham qidiruvdan chiqadi. “E’lon tekshirilgan” — administrator e’lonni ko‘rib chiqqani; bino texnik tekshiruvdan o‘tgani degani emas.

## Qidiruv va xarita chegaralari

- m² narxi maydonga ko‘paytiriladi. Qo‘shimcha to‘lovlar ijara summasiga qo‘shilmaydi; depozit, kommunal va komissiya alohida ko‘rsatiladi. Valyutalar avtomatik konvertatsiya qilinmaydi. Ish o‘rni narxi butun xona budjeti bilan aralashtirilmaydi.
- Metro/mo‘ljal qidiruvi e’lon matni va manzili bo‘yicha ishlaydi. Oybek/Ойбек, Novza/Новза, Tashkent City/Toshkent City nom variantlari qo‘llanadi. Bu geokoder yoki barcha metro stansiyalarining masofa bazasi emas.
- “Menga yaqin” brauzer ruxsati bilan joriy joylashuvni oladi. Ommaviy koordinatasi yashirilgan e’lonlarda taxminiy nuqta ishlatiladi; haqiqiy koordinata filtr orqali ham ochilmaydi.
- Xarita eski 500 ta cheklovsiz barcha mos koordinatali e’lonlarni hisoblaydi. Javob guruhlar va yakka markerlardan iborat. Bir guruhdagi xonalar eng yaqin masshtabda 20 tadan ochiladi. Koordinatasiz e’lonlar ro‘yxatda bor, xaritada yo‘q.
- Guruhlash serverda mos e’lonlarning yengil koordinata ro‘yxatini yuklaydi. Juda katta katalog uchun alohida spatial indeks/oldindan hisoblangan guruhlar keyingi optimizatsiya bo‘ladi.
- To‘lov va pullik ko‘tarish hozir yoqilmagan. Buni yoqadigan avtomatik sana yoki yashirin tarif qo‘shilmagan.

## Tekshirish

```sh
npm run typecheck
npm test
npm run build
```

`tests/discovery.test.ts` haqiqiy SQL bilan ishlaydigan PGlite bazasida 620 ta e’lon, guruhlash, maxfiy koordinatalar, jami narx, vakil huquqlari, saqlangan qidiruvlar va takroriy eslatmalarni tekshiradi. Google/Telegram ishlab turgan xizmatlari bilan jonli tekshiruv bu ishning doirasiga kirmaydi.
