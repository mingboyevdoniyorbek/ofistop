# OfisTop — Railway va vaqtinchalik ofisijara.uz domeni

> Kirish tartibi yangilandi: Google, email va Telegram uchun [AUTH-SETUP.md](AUTH-SETUP.md)ga qarang.
> Bepul davr endi anonim kirishni avtomatik yoqmaydi. Quyidagi eski SMSsiz mehmon sinovlari o'rniga yangi login oqimini tekshiring.

## Nega localhost bilan farq bor?

2026-10-28 tekshiruvida `https://ofisijara.uz` manzili
`https://www.ofisijara.uz`ga o'tdi va javob `server: Vercel` bilan keldi.
Saytda e'lonlarni yuklash xatosi, faol bo'lmagan SMSsiz rejim va
robots.txt ichida `http://localhost:3000/sitemap.xml` manzili kuzatildi.
Baza xatosining aniq sababi faqat hosting loglaridan aniqlanadi.

1440 px brauzerda mahalliy va ommaviy saytning konteyneri 1152 px,
sarlavhasi 30 px va yuqori qismi 215 px chiqdi: tekshirilgan dizayn bir xil.
Har ikkala tabda Ctrl+0 brauzer masshtabini tiklaydi. Localhost'dagi hisob
sessiyasi va test e'lonlari boshqa domen yoki production bazasiga avtomatik o'tmaydi.

## 1. Loyiha va baza

1. Eng so'nggi kodni GitHub repozitoriyga yuboring. `Dockerfile`,
   `.dockerignore`, `railway.json`, `scripts/docker-entrypoint.sh` ham kirsin.
   `.env` va `.test-data`ni yuklamang.
2. Railway'da yangi project oching, PostgreSQL xizmati qo'shing.
3. Shu project ichida GitHub repozitoriydan web xizmat yarating.
   Root Directory — `package.json` va Dockerfile turgan papka.
4. Baza tayyor bo'lgach quyidagi sozlamalarni web xizmatga kiriting.

Railway `railway.json`dan Docker build va `npm run db:setup` pre-deploy
buyrug'ini oladi. Build/Start Command'ni qo'lda almashtirmang; Dockerfile
`PORT` qiymatini o'qib serverni `0.0.0.0`da ishga tushiradi.
Pre-deploy bazaning jadvallari, hududlari va qulayliklarini yaratadi.
Sinov foydalanuvchilari va demo e'lonlarini yaratmaydi.

## 2. Variables

Web xizmat → Variables bo'limida:

```dotenv
DATABASE_URL=${{Postgres.DATABASE_URL}}
APP_URL=https://ofisijara.uz
NODE_ENV=production
PORT=3000
PROMO_MODE=true
DEV_OTP_ENABLED=false
ADMIN_LOGIN=ofis
ADMIN_PASSWORD_HASH=YARATILGAN_SCRYPT_HASH
SESSION_SECRET=YANGI_TASODIFIY_SIR
STORAGE_DRIVER=local
UPLOAD_DIR=/data/uploads
NODE_OPTIONS=--max-old-space-size=1024
```

`Postgres` — baza xizmatining nomi. Sizda nomi boshqacha bo'lsa, Railway'dagi
**Add Reference** yordamida o'sha xizmatning `DATABASE_URL` qiymatini tanlang.
`localhost` bazasi yoki kompyuteringizdagi test baza manzilini qo'ymang.

Mahalliy terminalda haqiqiy qiymatlarni yarating:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npm.cmd run admin:hash
```

Birinchi natija `SESSION_SECRET`, ikkinchi buyruqdagi `scrypt:...` qiymati
`ADMIN_PASSWORD_HASH` uchun. Parol va ulanish manzilini chatga yubormang.
`APP_MODE=test`, `TEST_DATABASE=embedded`ni qo'shmang. SMS tayyor bo'lmaguncha
`PROMO_ENDS_AT`ni bo'sh qoldiring. `PROMO_MODE=true` e'lonni bepul va SMSsiz
yaratishni yoqadi, admin tasdiqlashi saqlanadi.

## 3. Rasmlar va resurslar

Web xizmatga **Volume** biriktiring, mount path: `/data`.
PostgreSQL o'zining alohida volume'iga ega; web xizmatning rasm diski undan boshqa.
`UPLOAD_DIR=/data/uploads` tufayli siqilgan rasmlar qayta deploy'da saqlanadi.
Volume ulanmasdan rasm qabul qiladigan ommaviy saytni ishga tushirmang.

Web xizmat uchun 2 GB RAM limiti boshlang'ich tavsiya. Railway tarifingizda
qancha resurs borligini Limits/Metrics bo'limida tekshiring. 2 GB disk va
2 GB RAM boshqa-boshqa resurslar. Haqiqiy to'lovni Railway Usage'dan kuzating.
Disk hajmini va zaxira nusxalarini alohida sozlang. Konfiguratsiya bitta
replica uchun: bir nechta server kerak bo'lsa, avval rasmlarni umumiy R2/S3
omboriga ko'chirish kerak. R2 bu loyihaga hali ulanmagan.

## 4. Avval Railway manzilida tekshirish

Deploy qiling. Deploy loglarida migratsiya va bootstrap muvaffaqiyatini tekshiring.
Networking → Generate Domain orqali vaqtinchalik Railway manzilini oling,
target port `3000` bo'lsin.

- Bosh sahifada qizil baza xatosi chiqmasin. Yangi bazada e'lonlar yo'qligi normal.
- E'lon berish tugmasi SMSsiz kabinet yaratsin.
- Rasmli e'lon yarating; admin tasdiqlaguncha ommaga ko'rinmasin.
- `/admin`da `ofis` va o'zingiz tanlagan parol bilan tasdiqlang.
- Qayta deploy'dan keyin e'lon va rasm ochilsin.

Health check `/kirish` web server javobini tekshiradi; yuqoridagi sinovlar
baza va rasm saqlashni tekshiradi. Xato bo'lsa Deploy/Runtime Logs'dagi
xatoni o'qing; parol, token va DATABASE_URL'ni boshqalarga ko'rsatmang.

## 5. ofisijara.uz'ni Railway'ga o'tkazish

1. Railway web xizmatining Networking/Custom Domain bo'limiga `ofisijara.uz`
   qo'shing. `www.ofisijara.uz` ham kerak bo'lsa, uni ham qo'shing.
2. Domen provayderida aynan Railway ko'rsatgan DNS qiymatlarini kiriting.
   Faqat shu web domen uchun eski Vercel yozuvlarini almashtiring;
   pochta MX va boshqa xizmatlarning TXT yozuvlariga tegmang.
3. SSL sertifikati tayyor bo'lib, domen Railway saytingizni ochishini tekshiring.
4. Asosiy ishlatadigan manzilingizga `APP_URL` mos bo'lsin. `www`ni asosiy
   qilsangiz, `APP_URL=https://www.ofisijara.uz` ishlating.
5. `/robots.txt` ichidagi Sitemap manzili haqiqiy domen bilan boshlansin.

Domenni o'zgartirish baza va rasmlarni ko'chirmaydi. Vercel'da haqiqiy
foydalanuvchi ma'lumotlari bo'lsa, DNS almashtirishdan oldin ularni alohida
ko'chirish kerak. Mahalliy sinov e'lonlari production'ga avtomatik ko'chirilmaydi.

## 6. Keyin ofistop.uz

Tasdiqlangach uni **shu Railway web xizmatiga** qo'shing, yangi sayt yoki baza
yaratmang. DNS/HTTPS tayyor bo'lgach `APP_URL=https://ofistop.uz`ga almashtiring
va redeploy qiling. Eski domenni yangi domenga doimiy yo'naltirishni alohida sozlang.

SMSsiz mehmon sessiyasi domenga bog'langan: `ofisijara.uz` cookie'si
`ofistop.uz`ga o'tmaydi. Faol foydalanuvchilarni ko'chirishdan oldin hisobga
kirishni tiklash/migratsiya qilishni rejalashtiring; oddiy redirect ularning
kabinetini yangi domenda avtomatik ochmaydi.

## Muntazam xizmat va tekshiruv chegarasi

Mavjud `npm run expire-listings` buyrug'ini har soat, `npm run cleanup`ni
har kuni bajarish uchun scheduler alohida sozlanadi. Cleanup rasm volume'i
ulangan xizmatda ishlashi kerak. Railway konfiguratsiyasi ularni hali rejalashtirmaydi.

Hozir faqat mahalliy deployment fayllari tayyorlangan. Railway hisobida
hech qanday xizmat yaratilmagan, DNS o'zgartirilmagan, container deploy qilinmagan.

Manbalar: [Railway konfiguratsiyasi](https://docs.railway.com/reference/config-as-code),
[PostgreSQL](https://docs.railway.com/guides/postgresql),
[Volume](https://docs.railway.com/guides/volumes),
[Pre-deploy](https://docs.railway.com/guides/pre-deploy-command).
