# Google Play uchun saytda qilingan ishlar (ofistop.uz)

Ilovaning `GOOGLE_PLAY.md` faylida "saytda qilinishi SHART" deb ko'rsatilgan uchta ish shu yerda bajarildi.
Baza sxemasi o'zgarmadi — yangi migratsiya yo'q, oddiy deploy yetarli.

## 1. Hisobni o'chirish sahifasi — `/hisobni-ochirish`

- Play Console'ga yoziladigan havola: `https://ofistop.uz/hisobni-ochirish`
  (ilovadagi yon menyu ham shu manzilni ochadi — `lib/config.dart` → `deleteAccountPath`).
- Kirgan foydalanuvchiga: e'lonlari soni, nimalar o'chishi/qolishi va **"Hisobni butunlay o'chirish"** tugmasi
  (tasdiq belgisi + brauzer so'rovi — ikki qadam). Kirmagan foydalanuvchiga: kirish tugmasi va
  "hisobga kira olmasangiz" bo'limi (aloqa orqali so'rov).
- Havolalar qo'shildi: footer, Kabinet → "Profil va aloqa" bo'limining oxiri, maxfiylik siyosati.
  Sahifa `sitemap.xml` ga ham qo'shildi.

**Tugma nima qiladi** (`src/lib/account.ts`, `DELETE /api/account`) — Play Console savollariga javob shu:

| O'chiriladi | Qoladi |
|---|---|
| Hisob (kirish telefoni, Google/Telegram identifikatorlari), barcha sessiyalar | Moderatsiya va audit yozuvlari — `actor_id` bo'shatiladi, ya'ni shaxsga bog'lanmaydi |
| Profil: ism, firma nomi, aloqa telefoni va Telegram | Telegram kanaliga ilgari chiqqan post va qidiruv tizimlari keshi (bizda emas) |
| Barcha e'lonlar + rasm fayllari (qoralama, faol, arxiv) | — |
| Sevimlilar, saqlangan qidiruvlar, bildirishnomalar | — |
| O'zi yuborgan shikoyatlar, markaz/mebel arizalari, "Joyingizni biz ijaraga beramiz" so'rovlari | — |

O'chirish darhol bajariladi (kechiktirilgan "o'chirish so'rovi" emas). Zaxira nusxalar uchun sahifada
30 kun deb yozilgan. Xodim (admin/moderator) hisobi bu yo'l bilan o'chmaydi — avval huquqi olinadi.

## 2. Maxfiylik siyosati — `/maxfiylik` to'ldirildi

Yangi bo'limlar: kirish usullari (Google nima beradi, Telegram nima beradi), joylashuv
(faqat foydalanuvchi o'zi bosganda, hisobga saqlanmaydi; e'londagi nuqta esa ommaviy),
tashqi xizmatlar (Google, Telegram, OpenStreetMap, bulutli saqlagich), statistika,
hisobni o'chirish havolasi, saqlash muddati, 18+ chegara.

> **Statistika bo'limi** faqat `NEXT_PUBLIC_GA_ID` yoki `NEXT_PUBLIC_YM_ID` sozlangan bo'lsa chiqadi.
> Agar ular sozlangan bo'lsa, Play Console'dagi "Безопасность данных" da **Действия в приложении →
> Взаимодействия** ni "Собираются" deb belgilang; Yandex Metrika uchun "Передаются третьим лицам"
> savolini ham tekshirib ko'ring (Metrika — uchinchi tomon xizmati).

### ⚠️ Aloqa manzillarini muhit o'zgaruvchilariga qo'yish shart

Sahifa oxiridagi aloqa bloki `SITE_*` o'zgaruvchilaridan olinadi. Ular bo'sh bo'lsa, siyosatda
"quyidagi aloqa manzillari orqali murojaat qiling" deb yozilgan bo'ladi, lekin **manzil ko'rinmaydi** —
Google shu uchun rad etishi mumkin. Hosting panelida (Vercel → Settings → Environment Variables) to'ldiring:

```
SITE_EMAIL=info@ofistop.uz
SITE_TELEGRAM=ofistop_admin
SITE_PHONE=+998 90 123 45 67
SITE_COMPANY="OfisTop" MChJ
```

Kamida `SITE_EMAIL` bo'lsin. O'zgaruvchi qo'yilgandan keyin saytni qayta deploy qiling.

## 3. "Shikoyat qilish" — allaqachon bor edi

Har bir e'lon sahifasida ("E'lon bilan muammo bormi? → Shikoyat yuborish"): sabab tanlanadi,
izoh yoziladi, shikoyat admin panelning "Shikoyatlar" bo'limiga tushadi. Kirmagan foydalanuvchi
tugmani bossa kirish sahifasiga, keyin o'sha e'longa qaytadi. E'lon qoidalari — `/qoidalar`.
Shuning uchun bu bandda kod o'zgartirilmadi.

## Play Console'ga yoziladigan havolalar

| Maydon | Qiymat |
|---|---|
| Политика конфиденциальности | `https://ofistop.uz/maxfiylik` |
| Удаление аккаунта (Data safety) | `https://ofistop.uz/hisobni-ochirish` |
| Правила / UGC | `https://ofistop.uz/qoidalar` |

**Доступ к приложению:** alohida test hisob ochish shart emas — e'lonlarni ko'rish kirishsiz ishlaydi,
e'lon berish uchun esa tekshiruvchi o'zining Google yoki Telegram hisobi bilan kira oladi.
Shuning uchun "Все функции доступны без специального доступа" javobini berish mumkin.
