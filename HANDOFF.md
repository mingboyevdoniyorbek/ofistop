> TARIXIY QAYDLAR: quyidagi eski bo‘limlar bugungi holatga to‘liq mos emas. 0.2 versiya uchun README.md, TUZATISHLAR.md va TEST-REJIM.md ustuvor.

# OfisIjara — topshirish hujjati (yangi chatda davom etish uchun)

Yangi chatda: shu zip'ni + asl 25 bo'limli texnik topshiriqni biriktiring va "HANDOFF.md ni o'qib, «Keyingi qadamlar» ro'yxatidan davom et" deng. Rus tili TO'LIQ (1–3-qadamlar), Playwright e2e yozilgan va o'tadi.

## Eng so'nggi o'zgarish: telefon + SMS orqali kirish (Eskiz.uz)
- `src/lib/sms.ts`: Eskiz adapteri (`POST /api/auth/login` → token xotirada ~25 kun, `POST /api/message/sms/send`, 401 bo'lsa bir marta qayta login). `smsConfigured()` → `authMethods().phone` → `/kirish` da telefon formasi. Provayder sozlangan bo'lsa development'da ham haqiqiy SMS ketadi; test OTP faqat provayder yo'q va `NODE_ENV!=production` bo'lganda.
- `request-otp`: SMS yuborilmasa kod o'chiriladi va 502 "SMS yuborib bo'lmadi" (yolg'on muvaffaqiyat yo'q); sutkalik umumiy chegara `SMS_DAILY_LIMIT` (500).
- Tekshirilgan: `tests/sms.test.ts` (7, soxta Eskiz server), e2e'ning birinchi testi production rejimida UI orqali telefon kiritadi → soxta Eskiz'ga `998…`, `from=4546` va kodli matn keladi → noto'g'ri kod rad etiladi → to'g'ri kod bilan kiradi; `devCode` va "TEST REJIMI" yo'q. `npm test` 67, e2e 14/14, `api-check` 57/57.
- **HAQIQIY Eskiz bilan SINALMAGAN** (sandbox tashqi tarmoqqa chiqa olmaydi; endpoint'lar Eskiz Postman hujjati va ochiq SDK manbasidan olingan). Eskiz test hisobi faqat o'zining test matnlarini yuboradi — OTP uchun hisob faollashtirilishi va shablon tasdiqlanishi shart (DEPLOY.md 7a).

## Oldingi sessiya (rus tili 3-qadam + e2e + mobil tuzatishlar)
Hammasi shu sessiyada ishga tushirib tekshirilgan: `tsc` toza, `npm test` 60 test, `next build`, `npm run e2e` 14/14 (production `next start`, haqiqiy Chromium), `api-check` 57/57, `api-check-admin` 81/81, `telegram-check` 31/31 (regressiyasiz).
- **Rus tili, 3-qadam**: kabinet (ro'yxat, holat tablari, amallar, tasdiqlash oynalari), sevimlilar, profil (`ProfileForm`), bildirishnomalar, `ListingWizard` (barcha 6 bosqich), `ListingActions`, `NotificationsRead`. Hudud/tuman/qulayliklar formada `nameRu`dan. Profil matnidagi eskirgan "SMS bilan tasdiqlangan" iborasi to'g'rilandi (kirish Telegram orqali).
- **Server xabarlari**: `src/messages/server.ts` ([o'zbekcha, ruscha] juftliklari, `{param}` shablonlari) + `lib/server-i18n.ts`. `guard.ts` dagi `handle()` javobdagi `error`, `errors{}`, `warnings[]`, `results[].error` ni `lang` cookie bo'yicha tarjima qiladi — 70 ta chaqiruv joyi o'zgarmadi, kod o'zbekcha matn qaytaraveradi. Auth route'lari ham `handle()` ga o'raldi. Bildirishnomalar bazada o'zbekcha saqlanadi va ko'rsatishda tarjima qilinadi (foydalanuvchi yozgan sabab o'zgarmaydi). `tests/server-i18n.test.ts` koddagi har bir `HttpError("...")`, `error: "..."`, `ImageError`, `warnings.push`, `notify` matni va forma validatsiyasining barcha xabarlari lug'atda borligini tekshiradi — yangi xabar qo'shib, tarjimasini unutsangiz test yiqiladi.
- **Formada xaritadan joy tanlash** (`components/PickMap.tsx`): bosish yoki markerni surish, qo'lda kiritilganda marker ergashadi, "Koordinatani tozalash", xarita yuklanmasa qo'lda kiritish ishlaydi. Brauzerda (e2e) tekshirilgan.
- **Mobil header**: avval umuman moslashmagan edi (kirgan foydalanuvchida 390 px'da sahifa yon tomonga surilardi — e2e topdi). Endi mobilda logo + "E'lon berish" + ☰ menyu (`MobileMenu.tsx`, `<details>`; sahifa almashganda, tashqariga bosilganda va Esc bilan yopiladi).
- **Mobil tafsilot**: pastda doimiy "Bog'lanish" tugmasi (aloqa blokiga olib boradi) — avval aloqa tugmalari xaritadan keyin, ancha pastda edi.
- **Formadagi valyuta tuzog'i tuzatildi**: narx valyutasi o'zgarganda unga teng depozit/komissiya/xizmat to'lovi valyutalari ham ergashadi (avval narx USD, depozit esa jimgina UZS bo'lib qolardi).
- **E2E** (`playwright.config.ts`, `e2e/`): `npx next build` → `npm run e2e`. Production rejimida ishlaydi; haqiqiy Telegram o'rniga soxta Bot API (4010-port), test webhook'ga `/start` va kontakt yuboradi. Qamrov (24-bo'lim): 1 kirish (+klaviatura), 2–4 qoralama/validatsiyada ma'lumot saqlanishi/xarita/rasm (yaroqsiz fayl bilan qisman xato)/asosiy rasm/yuborish, tekshiruvdagi e'lon katalogda yo'q, 5 moderator tasdig'i + bildirishnoma, 6–7 hudud+narx+maydon filtrlari, havola boshqa kontekstda bir xil natija, back, 8 sevimlilar qayta kirishda, 9 begona foydalanuvchi (sahifa 404, API 404), RU kabinet/forma/API xatolari, 10 "ijaraga berildi" → qidiruvdan chiqadi + eski havola banneri, 11 markaz xonalari, 12 jami narx va depozit alohida, 14 telefon `tel:` va Telegram havolasi, 15 mobil (skrollsiz, filtr paneli, menyu, forma), 16 xarita API xatosi, 18 production'da test OTP 503. Skrinshotlar: `e2e/screenshots/`. 13 (valyuta/davr solishtirilmasligi) va 17 (qayta ishga tushganda ma'lumot saqlanishi) unit/integratsiya darajasida, e2e'da alohida emas.
- E2E har yugurishda yangi test foydalanuvchilar (+99899…) yaratadi; boshida oldingi `E2E ofis %` e'lonlarini o'chiradi. Faqat test bazasida yuriting. Bot bitta raqamga 10 daqiqada 3 ta kod beradi — testlar sessiyani saqlab qayta ishlatadi.
- Sandbox'da OSM tile'lari yuklanmaydi (tarmoq), shuning uchun skrinshotlarda xarita kulrang; Leaflet, marker, doira, bosish ishlashi tekshirilgan. Haqiqiy tile ko'rinishi deploy'da ko'riladi.

## Keyingi qadamlar
1. Deploy (`DEPLOY.md`) va birinchi HAQIQIY Telegram kirishini qo'lda tekshirish — bu hali hech qachon sinalmagan yagona asosiy zanjir.
2. Deploy'dan keyin `npm run e2e` ni serverda emas, alohida test bazasida yuriting; haqiqiy tile provayderini (`NEXT_PUBLIC_TILE_URL`) ulang.
3. Kichik ishlar: biznes markaz rasmlarini yuklash, e'lon OG rasmi, ko'rishlar hisobi, SMS va S3 adapterlari, admin `window.prompt/confirm` o'rniga ichki modal.
4. 23-bo'lim faqat MVP haqiqiy foydalanuvchilar bilan sinalgandan keyin.

---
## Oldingi sessiyalar tarixi


## Holat (oxirgi yangilanish)
Ish tartibi: 5 bosqich (1 poydevor, 2 ommaviy qism, 3 e'lon egasi, 4 moderatsiya/admin, 5 xarita/SEO/i18n/e2e/deploy).

### BAJARILGAN va TEKSHIRILGAN (haqiqiy HTTP so'rovlari bilan, dev server + Postgres)
- **1-bosqich**: schema (21 jadval), migratsiya, pul/holat/matn mantig'i, 20 unit test, seed (16 demo e'lon, 3 markaz; barchasi DEMO).
- **Auth**: `/api/auth/request-otp`, `verify-otp`, `logout`; sessiya (HttpOnly cookie, bazada faqat token hash'i), OTP hash, 5 urinish limiti, bir martalik kod, rate limit (telefon 3/10 daq, IP 15/soat). SMS adapteri: dev'da konsolga (UI'da "TEST REJIMI, SMS yuborilmadi" ko'rsatiladi), production'da provayder yo'q bo'lsa 503 — `next build` + `next start` bilan tekshirilgan.
- **Katalog `/joylar`**: server tomonida qidiruv, filtrlar URL'da (JS'siz GET forma), saralash, pagination (oxirgi sahifaga yo'naltirish), bo'sh holat. Tekshirilgan: tur, hudud, apostrof variantlari (', ʻ → bir xil natija), markaz nomi bo'yicha qidiruv, narx (valyuta/davr/birlik doirasida), maydon, jihozlangan, komissiyasiz, qulayliklar kombinatsiyasi, narx saralash (doiradagilar birinchi).
- **Tafsilot `/joylar/[id]-[slug]`**: jami narx (90 m² x 14 USD = 1 260 USD), shartlar, ijaraga berilgan/muddati tugagan e'londa "mavjud emas" banneri + o'xshash faol e'lonlar, mavjud bo'lmagan ID → 404. Kontakt API: faqat faol e'londa telefon qaytaradi, takroriy bosish 1 ta hodisa.
- Bosh sahifa, header, kirish sahifasi.
- Ommaviy qidiruvda ijaraga berilgan/band/to'xtatilgan/muddati tugagan e'lon yo'q (16 dan 12 chiqadi).

- **3-bosqich (e'lon egasi)** — API darajasida haqiqiy HTTP bilan tekshirilgan (`scripts/api-check.ts`, 57 tekshiruv o'tdi; `npm test` 33 unit test o'tdi; `next build` muvaffaqiyatli):
  - Qoralama yaratish (`POST /api/listings`), saqlash (`PATCH /api/listings/[id]`, qisman, server tomonida validatsiya), moderatsiyaga yuborish (`/submit`), mavjudlik (`/availability`: confirm, band, ijaraga berildi, yashirish, qayta faollashtirish, arxiv).
  - Qayta moderatsiya: tasdiqlangan e'londa sarlavha/tavsif/manzil/koordinata/maydon/narx/rasm o'zgarsa -> pending (katalogdan chiqadi); aloqa/depozit/qulaylik o'zgarsa darhol.
  - Rasm: sharp bilan haqiqiy tur tekshiruvi (JPEG/PNG/WebP), 8 MB, 15 tagacha, webp 1600px + 480px thumb, EXIF olib tashlanishi tekshirilgan, asosiy rasm/tartib/o'chirish, qisman yuklash xatosi, `/api/media/*` (yo'l bosib o'tish rad etiladi). Faqat LOCAL disk adapteri; S3 adapteri yo'q (STORAGE_DRIVER=s3 aniq xato beradi).
  - Huquqlar: begona e'longa 404 (IDOR), biznes markazga faqat biriktirilgan vakil/admin bog'laydi, bir markazda bir xona kodi ikki marta faol e'lon bo'lmaydi (DB unique + 409).
  - Sevimlilar (POST/DELETE, takrorlanmaydi), kabinet (`/kabinet` holat filtri + statistika, `/kabinet/sevimlilar`, `/kabinet/profil`), 6 bosqichli forma (`/kabinet/elon/[id]`), profil API, detail'da galereya va sevimlilar tugmasi, `?next=` bilan kirishdan keyin qaytish.
  - `lib/moderation.ts` dagi `moderate()` (approve/reject + audit + moderation_events) tayyor va tekshirilgan; admin panel (4-bosqich) shuni chaqiradi.

- **4-bosqich (moderatsiya/admin)** — haqiqiy HTTP bilan tekshirilgan (`scripts/api-check-admin.ts`, 83 tekshiruv o'tdi; `scripts/api-check.ts` 57 tekshiruv regressiyasiz o'tdi; `next build` + `next start` da `/admin` anonimga 404, admin API 401):
  - `lib/staff.ts`: `requireStaff(req, adminOnly)` (API: 401/403), `requireStaffPage` (sahifa: ruxsatsizga 404), `writeAudit`, `notify`.
  - `/admin/elonlar` (kutilayotgan/faol/muddati tugagan/rad etilgan/hammasi, pagination, batafsil ko'rish, tasdiqlash, sabab bilan rad etish, sabab bilan yashirish), `/admin/shikoyatlar`, `/admin/foydalanuvchilar` (rol, bloklash — sessiyalar tugaydi, "tekshirilgan" belgisi; o'zini o'zgartira olmaydi), `/admin/markazlar` (yaratish, vakil biriktirish/olib tashlash — faqat admin), `/admin/hududlar` (viloyat/tuman qo'shish; kategoriyalar enum bo'lgani uchun faqat ko'rsatiladi), `/admin/audit`, `/admin/sozlamalar` (`listing_ttl_days`). Moderator: faqat e'lonlar va shikoyatlar; qolganlari faqat admin.
  - Shikoyat: `POST /api/reports` (detail'da `ReportButton`): faqat ommaviy ko'rinadigan e'longa, o'z e'loniga emas, bitta ochiq shikoyat/foydalanuvchi, rate limit.
  - Bildirishnomalar: `/kabinet/bildirishnomalar` (tasdiq, rad, yashirish, vakil biriktirish, muddat tugashi haqida yoziladi).
  - `npm run create-admin -- +998XXXXXXXXX [admin|moderator]` (parolsiz, audit'ga yoziladi), `npm run expire-listings` (cron: har soatda; scheduler bo'lmasa ham qidiruv expires_at bo'yicha filtrlaydi — tekshirilgan).

- **5-bosqich, 1-qadam (bajarildi)** — `tsc` toza, `next build` o'tdi, HTTP bilan tekshirilgan (dev server + Postgres):
  - `/markazlar` (ro'yxat) va `/markazlar/[id]-[slug]` (tafsilot): faqat HOZIR ommaviy ko'rinadigan e'lonlar asosida bo'sh xonalar soni, maydon va narx oralig'i. Narx oralig'i valyuta/davr/birlik bo'yicha ALOHIDA guruhlanadi (aralashtirilmaydi); band xona hisobga olinmaydi (Minor markaz: `400 – 650 USD / oy`, 2 xona). Mavjud bo'lmagan ID → 404. `lib/centers.ts`, `components/CenterStats.tsx`.
  - `robots.txt` (kabinet, admin, api, kirish, media taqiqlangan), `sitemap.xml` (faqat ommaviy e'lon va markaz URL'lari; filtr/kabinet/admin yo'q; production'da demo ma'lumot kiritilmaydi), Open Graph (`metadataBase` = `APP_URL`), markaz sahifasida canonical + OG.
  - `/qoidalar`, `/maxfiylik`, `/shartlar` — dastlabki matn, sahifada "huquqiy tekshiruvdan o'tmagan" ogohlantirishi bor. Aloqa manzili (maxfiylik so'rovlari uchun) hali belgilanmagan.
  - Header'dagi "Biznes markazlar" endi havola; footer'da huquqiy sahifalar havolalari.
  - Uploaded zip'dagi versiya qayta tekshirildi: 33 unit test, `api-check` (57) va `api-check-admin` (83) o'tdi, `next build`; production `next start` da `/kabinet` anonimga 307, `/admin` va admin API 404, media path traversal 404.
- **Diqqat**: `scripts/api-check*.ts` dev bazada test ma'lumot qoldiradi (test admin/moderator, test markaz). Tozalash: demo bo'lmagan e'lon, markaz, foydalanuvchilarni o'chirish (`WHERE NOT is_demo`; FK tartibi: listings → memberships → centers → reports → audit_logs → moderation_events → users).

- **5-bosqich, 2-qadam: xarita (bajarildi)** — `tsc` toza, `npm test` 43 test, `next build` + `next start` o'tdi:
  - `lib/geo.ts` `publicPoint()`: aniq rejimda haqiqiy koordinata; aks holda e'lon ID + SESSION_SECRET dan HMAC bilan DETERMINISTIK siljish 200–500 m (qayta so'rab o'rtachalab bo'lmaydi). Kalit yo'q bo'lsa xato beradi (haqiqiy nuqtani qaytarmaydi). 7 unit test (300 e'londa masofa oralig'i, determinizm, burchak taqsimoti).
  - `GET /api/map` (katalog filtrlari bilan bir xil parametrlar; `searchMarkers` umumiy `buildWhere` dan foydalanadi): faqat ommaviy + koordinatali e'lonlar, ko'pi bilan 500 ta (`truncated` bayrog'i), rate limit 120/daq. Javobda xom `lat/lng/exact` YO'Q, faqat `publicPoint` natijasi.
  - Katalog: `?view=map` (Ro'yxat/Xarita almashtirgichi, filtrlar xaritaga ham qo'llanadi, `view` filtr formasida saqlanadi). `ListingMap` (Leaflet + markercluster, marker bosilganda popup, taxminiy joylashuvda 500 m doira), xarita/API xatosida katalog ishlashda davom etadi ("Qayta urinish" / "Ro'yxatga qaytish"). E'lon sahifasida `PlaceMap` (faqat faol e'londa; klientga faqat `publicPoint` natijasi beriladi).
  - Popup `textContent` bilan quriladi (XSS): jsdom testida `<img onerror>`/`<script>` sarlavha skript bo'lmasligi tekshirilgan. jsdom'da Leaflet + 50 markerli klaster xatosiz yaratilishi tekshirilgan.
  - Seed endi demo e'lonlarga koordinata beradi (har 3-chisi aniq, qolganlari taxminiy).
  - HTTP tekshiruvlari: `scripts/map-check.py` (13: markerlar = ommaviy e'lonlar, band/ijaraga berilgan yo'q, taxminiy siljish 244–476 m, filtrlar, bo'sh natija) va `scripts/map-pages-check.py` (13: xarita konteyneri SSR'da, 12/12 faol e'londa xarita, faol bo'lmaganda yo'q, 7 ta taxminiy e'lon HTML+RSC'sida haqiqiy koordinata yo'q). Tekshiruv to'liq raqam TOKEN bo'yicha (prefiks bo'yicha qidirish soxta signal beradi: `41.368` siljitilgan `41.36862` ning boshi).
  - **Xarita brauzerda KO'RILMAGAN**: tile yuklanishi, klasterning vizual ko'rinishi, marker bosish, mobil/sensorli boshqaruv tekshirilmagan (sandbox'da brauzer yo'q). Tile provayderi default OSM rasmiy serveri (og'ir yuklama uchun mo'ljallanmagan; `NEXT_PUBLIC_TILE_URL`).
  - E'lon beruvchi koordinatani hali faqat qo'lda kiritadi (formada xaritadan tanlash yo'q). Biznes markaz sahifasida xarita yo'q.

- **5-bosqich, rus tili: 1-qadam (bajarildi)** — `tsc` toza, `npm test` 51 test, `api-check` 57/57 va `api-check-admin` 81 OK (o'zbekcha chiqish regressiyasiz). `next build` bu qadamdan keyin TO'LIQ yuritilmadi (sandbox vaqt chegarasi) — birinchi ish sifatida `npx next build` yuriting.
  - Infratuzilma: `src/messages/uz.ts` (manba) va `ru.ts` (`Record<MsgKey,string>` — kalit yetishmasa tsc xato beradi), `lib/i18n-core.ts` (`makeT`, klient+server), `lib/i18n.ts` (`getLocale`/`getT`, `lang` cookie, standart uz), `components/I18nProvider.tsx` (`useT`, `useLocale`), `LangSwitch` (UZ/RU, cookie + `router.refresh()`). URL'lar va sitemap o'zgarmagan (rus versiyasi alohida indekslanmaydi).
  - `lib/format.ts`: `labels(locale)`, `priceLabel/totalLabel/rangeLabel/fmtDate(..., locale="uz")` (eski eksportlar o'zbekcha holicha). `searchListings(f, locale)` hudud/tuman nomini `nameRu` dan oladi.
  - Tarjima qilingan: layout (header, footer, `<html lang>`, metadata/OG locale), bosh sahifa, katalog `/joylar` (filtrlar, saralash, bo'sh holat, pagination, sarlavha), `FilterForm`, `ListingCard`, `FavoriteButton`, `NewListingButton`, `LogoutButton`. Hudud/tuman/qulaylik nomlari bazadagi `nameRu` dan. Foydalanuvchi yozgan e'lon matni tarjima qilinmaydi (topshiriq bo'yicha).
  - `tests/i18n.test.ts`: kalitlar paritet, `{param}` mosligi, tarjima qilinmay qolgan matn yo'q, rus narx/sana formatlari.
  - **Keyingi qadamlar**: 2-qadam — `/joylar/[slug]`, `/markazlar` (+`CenterStats`), `/kirish` (`LoginForm`), `ContactButtons`, `Gallery`, `ReportButton`, `ListingMap`/`PlaceMap`, `/api/contact` xabarlari, huquqiy sahifalar (rus matni "huquqiy tekshiruvdan o'tmagan" deb belgilansin). 3-qadam — kabinet, `ListingWizard`, `ProfileForm`, API xato xabarlari. Admin paneli o'zbekcha qoladimi — qaror egasidan so'rash.
  - Ma'lum kamchiliklar: seed'dagi viloyat nomi `Город Ташкент`; `ListingMap` hozircha o'zbekcha; rus tilidagi sahifalar brauzerda ko'rilmagan (faqat HTTP orqali HTML matni tekshirilgan).
  - Dev muhit: `.env.local` zip'ga kirmaydi; `DEV_OTP_ENABLED=true` kerak. `api-check*` skriptlari ketma-ket yuritilsa OTP IP-limiti (15/soat) tufayli yiqiladi: `delete from rate_limits` (faqat dev).

- **5-bosqich, rus tili: admin paneli (bajarildi, foydalanuvchi talabi bilan)** — `tsc` toza, `npm test` 51, `api-check-admin` o'tdi, `next build` TO'LIQ o'tdi. Admin sifatida kirib 9 ta admin sahifa (`elonlar` barcha tablari, `shikoyatlar`, `foydalanuvchilar`, `markazlar`, `hududlar`, `audit`, `sozlamalar`) `lang=uz` va `lang=ru` cookie bilan HTTP orqali ochildi: ikkalasi 200, rus HTML'da o'zbekcha belgilangan so'zlar qolmagan, o'zbek HTML'da kirill yo'q. `adm.*` kalitlari (105 ta) `uz.ts`/`ru.ts`da; `AdminAction`/`AdminForm` `useT` ishlatadi. Hudud nomi rus tilida `nameRu`dan.
  - **Qolgan (admin bilan bog'liq)**: admin API xato xabarlari (`HttpError` matnlari serverda o'zbekcha, `/api/admin/*`, `/api/reports`) hali tarjima qilinmagan; audit logdagi `action` kodlari (`listing.approve` ...) texnik kod sifatida qoladi; `window.prompt/confirm` oynalari brauzerda ko'rilmagan.
  - **Keyingi qadamlar**: 2-qadam (ommaviy qism: `/joylar/[slug]`, `/markazlar`, `/kirish`, `ContactButtons`, `Gallery`, `ReportButton`, `ListingMap`/`PlaceMap`, huquqiy sahifalar) va 3-qadam (kabinet, `ListingWizard`, `ProfileForm`, `NotificationsRead`, API xato xabarlari) — ro'yxat yuqoridagi "rus tili: 1-qadam" bandida.

- **DEPLOY.md yozildi** (VPS + nginx + certbot + systemd + cron). Production serverda SINALMAGAN. Asosiy to'siq: SMS provayder adapteri yo'q → production'da hech kim kira olmaydi; domen faqat `APP_URL` orqali ishlatiladi.

- **Telegram bot orqali kirish (bajarildi, foydalanuvchi qarori: SMS o'rniga)** — soxta Telegram API serveri bilan HTTP orqali tekshirilgan (`scripts/telegram-check.ts`, 31 tekshiruv o'tdi; `api-check` 57, `api-check-admin` o'tdi; `npm test` 51; `next build`; production'da Telegram sozlanmaganda start/webhook 503).
  - Oqim: `POST /api/auth/telegram/start` (token, deep-link) → bot `/start <token>` → kontakt tugmasi (`user_id` yuboruvchiniki bo'lishi va +998 shart) → kod chatga → `POST /api/auth/telegram/verify {token, code}`. Umumiy tekshiruv `lib/otp-login.ts` (SMS va Telegram uchun bir xil: bir martalik, 5 urinish). Jadvallar: `telegram_links`, `telegram_logins` (token faqat HASH). Webhook `/api/telegram/webhook` `X-Telegram-Bot-Api-Secret-Token` bilan himoyalangan; faqat shaxsiy chat; birinchi `/start` havolaga egalik qiladi; bot kodi 10 daqiqada 3 ta.
  - `LoginForm` qayta yozildi va ikki tilda (`login.*`); faqat ishlaydigan usullar ko'rinadi (`lib/auth-methods.ts`). Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`; `scripts/telegram-set-webhook.ts`. DEPLOY.md 7-bo'lim yangilandi.
  - **HAQIQIY Telegram bilan SINALMAGAN** (sandbox api.telegram.org'ga chiqa olmaydi): `sendMessage` so'rov formati, `request_contact` klaviaturasi va webhook update formati Bot API hujjati bo'yicha yozilgan; birinchi deploy'da qo'lda tekshirish shart. Telegram'siz foydalanuvchilar kira olmaydi; SMS adapteri hali yo'q. API xato xabarlari hali faqat o'zbekcha.

### HALI YOZILMAGAN / TEKSHIRILMAGAN
- **Forma UI (`ListingWizard.tsx`) brauzerda qo'lda/Playwright bilan tekshirilmagan**: faqat sahifalar 200 qaytishi, tip tekshiruvi va build tekshirilgan. Mobil ko'rinish va klaviatura bilan ishlash ko'zdan kechirilmagan.
- Koordinata formada hozircha qo'lda kiritiladi (xaritadan tanlash yo'q).
- **5-bosqichning qolgani**: rus tili (matnlar kodda, fayllarga ko'chirish kerak), Playwright e2e (brauzer yuklab olish tarmoqda cheklangan bo'lishi mumkin), DEPLOY.md (deploy yo'riqnomasi), listing sahifasida OG rasm, markaz rasmlari yuklash.
- Demo e'lonlar placeholder rasmli. Ko'rishlar hisoblanmaydi (faqat telefon/telegram bosish va sevimlilar statistikada).
- Production'da `next start` bilan yangi route'lar (rasm yuklash, media) sinalmagan; faqat `next dev` + `next build`.

- **Admin/moderator UI brauzerda (Playwright/qo'lda) ko'rilmagan**: tugmalar (`AdminAction`, `AdminForm`) `window.prompt/confirm` ishlatadi; faqat server javoblari HTTP bilan tekshirilgan. Kategoriyalarni admin paneldan boshqarib bo'lmaydi (enum). Moderator e'lon egasining telefonini ko'radi (batafsil blokda). Admin/moderator uchun unit testlar yo'q (faqat integratsiya skripti).

## Ishga tushirish
Integratsiya tekshiruvi (`npm run api-check`, `npx tsx scripts/api-check-admin.ts`): dev server ishlayotganda `DATABASE_URL=... SESSION_SECRET=... BASE=http://localhost:3000 npx tsx scripts/api-check.ts`.
`bash scripts/dev-setup.sh` → `cp .env.example .env.local` (yoki .env.local'ni qo'lda yarating, `DEV_OTP_ENABLED=true`) → `npx next dev`. Sandbox'da serverni har bir buyruq ichida ishga tushiring (buyruq tugagach o'chadi) va `pkill -f "next dev"` ishlatmang (o'z shell'ingizni o'ldiradi); PID bo'yicha `kill`. Pagination sinovi uchun `PAGE_SIZE=5`.

## Muhim qarorlar
- **Prisma EMAS, Drizzle** (Prisma binarlari sandbox tarmog'ida yuklanmaydi). Versiyalar: next 16.4.2, react 19.3.1, tailwindcss 4.3.3, drizzle-orm 0.45.4, zod 4.6.7, sharp 0.35.5, jose 6.2.13, vitest 5.0.5.
- Pul: `bigint` minor-unit (UZS va USD uchun ham /100). Float yo'q.
- Moderatsiya va mavjudlik — ikki alohida enum. Ommaviy qidiruv: `approved AND available AND expires_at > now()`.
- Demo telefonlar `+99800000000X` — haqiqiy emas. Barcha demo qatorlarda `is_demo=true`, sarlavhada `[DEMO]`.
- Admin uchun hardcoded parol YO'Q; `create-admin` skripti telefon bilan rol beradi (yoziladi).
- Test OTP faqat `NODE_ENV!=production` va `DEV_OTP_ENABLED=true`.

## Muhitni tiklash
`bash scripts/dev-setup.sh` (apt orqali Postgres, baza, migratsiya, seed, testlar). `DATABASE_URL=postgres://ofisijara:devpass@localhost:5432/ofisijara`.
Eslatma: sandbox'da turlar orasida Postgres to'xtashi mumkin: `pg_ctlcluster 16 main start`.

## Ishlash qoidalari (foydalanuvchi talabi)
Tez yetkazish, iterativ; faqat ishga tushirib ko'rilganini "tekshirilgan" deb yozish; tashqi integratsiya yo'q bo'lsa aniq aytish; dekorativ tugma yo'q.

- **5-bosqich, rus tili: 2-qadam, ommaviy qism (bajarildi)** — `tsc` toza, `npm test` 51 o'tdi, `next build` TO'LIQ o'tdi, `api-check` 57/57 va `api-check-admin` 81 OK (dev server, o'zbekcha regressiyasiz).
  - Tarjima qilingan: `/joylar/[slug]` (jadval, banner, metadata/OG tavsifi, qulayliklar `nameRu`dan, hudud `nameRu`dan), `/markazlar` va `/markazlar/[slug]` (+`CenterStats`, `listCenters(locale)`), `/kirish` (metadata), `ContactButtons`, `Gallery` (aria), `ReportButton`, `PlaceMap`, `ListingMap`, `map-popup` (ikkinchi `tx` argumenti, standarti o'zbekcha), `LegalPage` + `/qoidalar`, `/maxfiylik`, `/shartlar` (rus matni ham "yuridik tekshiruvdan o'tmagan" deb belgilangan).
  - API xabarlari (cookie `lang` bo'yicha, server tomonida `getT`): `/api/contact`, `/api/reports`, `/api/map`. `/api/map` javobiga `Vary: Cookie` qo'shildi (aks holda 30 soniyalik kesh tillarni aralashtirib yuborardi).
  - Test: `i18n.test.ts` endi `{param}` nomlarini "tarjima qilinmagan matn" tekshiruvidan chiqarib tashlaydi (faqat shablondan iborat kalitlar ikkala tilda bir xil bo'la oladi).
  - HTTP bilan tekshirilgan: 8 ommaviy sahifa `lang=ru` da 200, o'zbekcha interfeys so'zlari yo'q (qolgani foydalanuvchi/demo matni), `lang=uz` da kirill yo'q; ruscha shikoyat xatolari (422/201/409); `/api/map` ruscha kategoriya/narx. 
  - **Qolgan**: `requireUser` ("Avval tizimga kiring"), `HttpError("Ruxsat yo'q")` kabi `lib/guard.ts`/`staff.ts` xabarlari va `/api/admin/*`, `/api/listings*`, `/api/favorites`, `/api/profile` xabarlari hali o'zbekcha. Brauzerda hech narsa ko'rilmagan (Gallery, ListingMap, ReportButton interaktivligi faqat SSR HTML va API darajasida tekshirilgan).
  - ~~Keyingi qadam: 3-qadam~~ (BAJARILDI, yuqoridagi «Eng so'nggi sessiya»ga qarang) — `kabinet` sahifalari, `ListingWizard`, `ProfileForm`, `NotificationsRead`, `ListingActions`, bildirishnoma matnlari (`notify`), API xato xabarlari (`guard.ts`, `staff.ts`, `listings`, `profile`, `favorites`, `admin`).
