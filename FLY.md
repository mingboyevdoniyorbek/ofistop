# OfisTop — Fly.io'ga joylashtirish

> Kirish usullari yangilandi: Google, email va Telegram sozlamalari [AUTH-SETUP.md](AUTH-SETUP.md)da.
> PROMO_MODE bepul davrni bildiradi; yangi hisobga kirish uchun tasdiqlash talab qilinadi.

Bu sozlama **1 ta Machine, 2 GB RAM, 1 shared CPU** uchun. Hisobingizdagi
"2 GB" aynan RAM ekanini Fly dashboard → Machines sahifasida tekshiring.
Volumes sahifasidagi GB esa disk hajmi. Bu fayllar xizmatni bepul qilmaydi:
Machine, volume, PostgreSQL, trafik va build xarajatlari hisobingiz tarifiga bog'liq.

Hozirgi yechim: Next.js Fly Machine'da, rasmlar `/data/uploads` doimiy
volume'da, e'lonlar va foydalanuvchilar **alohida PostgreSQL** bazasida.
Mahalliy `.test-data` bazasi production uchun ishlatilmaydi. R2 hali ulanmagan.

## 1. CLI va app

Windows uchun [rasmiy flyctl o'rnatish yo'riqnomasi](https://fly.io/docs/hands-on/install-flyctl/).
Keyin loyiha papkasidagi PowerShell'da:

```powershell
fly auth login
fly apps create SIZNING_APP_NOMINGIZ
```

Agar app allaqachon yaratilgan bo'lsa, qayta yaratmang. `fly.toml`dagi
`app = "ofistop-change-me"` qiymatini haqiqiy app nomiga almashtiring.
`primary_region = "fra"` — Frankfurt namunasi; mavjud Machine/baza regioniga
moslang. Tayyor Dockerfile va fly.toml bor, `fly launch` bilan qayta generatsiya qilish shart emas.

## 2. PostgreSQL

Fly Managed Postgres yoki boshqa xizmatdagi doimiy PostgreSQL bazasini ulang.
Fly'dagi baza uchun dashboard orqali app'ga attach qilib, `DATABASE_URL`
secret yaratilganini tekshiring. Tashqi baza bo'lsa, provayder bergan to'liq
connection string'ni, jumladan SSL parametrlarini, keyingi bosqichda kiriting.
Bazani iloji boricha sayt bilan bir regionda joylashtiring.

PostgreSQL alohida resurs: web Machine uchun berilgan 2 GB RAM bazani o'z ichiga olmaydi.
Production bazasida avtomatik zaxira nusxalarini yoqing. Sinov e'lonlarini
ko'chirish shart emas; release command hududlar va qulayliklarni yaratadi.

## 3. Rasmlar uchun volume

Bu buyruq **pullik disk yaratadi**. Hajm va tarifni panelda tekshirgach bajaring:

```powershell
fly volumes create ofistop_uploads --region fra --size 10
```

`fra` qiymati fly.toml regioni bilan bir xil bo'lsin. Shu app'da mos volume
allaqachon bo'lsa, yana yaratmang. Mount: `/data`, rasmlar: `/data/uploads`.
2 GB disk bo'lsa ham ishlatish mumkin, lekin u 2 GB RAM o'rnini bosmaydi;
rasmlar hajmini kuzatib, diskni zaruratga qarab kengaytiring.

Volume bitta Machine'ga ulanadi; ikkinchi Machine'dagi disk bilan avtomatik
sinxronlashmaydi. Shuning uchun bu konfiguratsiyada **bitta web Machine**
ishlatiladi. Deploy vaqtida qisqa uzilish bo'lishi mumkin. Bir nechta Machine
kerak bo'lsa, avval rasmlarni R2/S3'ga ko'chirish kerak.
Volume snapshotlari bilan birga rasmlarning alohida zaxira nusxasini ham saqlang.

## 4. Secrets

Loyiha papkasida `.env.fly.local` yarating (Git va Docker'dan chiqarilgan):

```dotenv
DATABASE_URL=PROVAYDER_BERGAN_POSTGRESQL_MANZILI
APP_URL=https://SIZNING_APP_NOMINGIZ.fly.dev
SESSION_SECRET=YANGI_TASODIFIY_SIR
ADMIN_PASSWORD_HASH=scrypt:HASHNI_BU_YERGA_KIRITING
```

Agar baza attach orqali `DATABASE_URL`ni allaqachon yaratgan bo'lsa, uni bu
faylga qayta yozmang. Placeholder qiymatlarni haqiqiy qiymatlarga almashtiring.

Sessiya siri va admin paroli hashini kompyuteringizda yarating:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npm.cmd run admin:hash
```

Hash buyrug'i chiqargan `scrypt:...` qiymatini to'liq ko'chiring. Login `ofis`.
Ommaviy sayt uchun testdagi `ijara` o'rniga kuchli parol tanlang.
Secrets faylini chatga yoki GitHub'ga yubormang. Fly'ga yuklash:

```powershell
Get-Content -LiteralPath .env.fly.local | fly secrets import --stage
```

`PROMO_MODE=true`, SMS o'chiq, e'lonlar admin tasdig'idan keyin chiqishi saqlanadi.
`APP_MODE=test`, `TEST_DATABASE=embedded` va `DEV_OTP_ENABLED=true`ni production'ga qo'ymang.

## 5. Deploy va tekshirish

```powershell
fly deploy --ha=false
fly status
fly checks list
fly logs
```

`--ha=false` birinchi deploy'da ortiqcha zaxira Machine yaratilishining oldini
oladi; mavjud qo'shimcha Machine'larni avtomatik o'chirmaydi. `fly status`
orqali aynan bitta web Machine ishlayotganini tekshiring.

Docker build serverda bajariladi. Keyin `npm run db:setup` release command'i
migratsiyalar va boshlang'ich hudud/qulayliklarni tayyorlaydi. U muvaffaqiyatsiz
tugasa, deploy to'xtaydi. Runtime secrets build image'ga yozilmaydi.
`tsx` va TypeScript container'da saqlangan: baza va texnik xizmat skriptlari ularga muhtoj.

Brauzerda quyidagilarni tekshiring:

1. Sayt, qidiruv va `/admin` ochilsin.
2. Yangi e'lon va 2–5 MB rasm yuklansin.
3. Admin tasdiqlaguncha e'lon ommaga ko'rinmasin; tasdiqlagach ko'rinsin.
4. Qayta deploy'dan so'ng e'lon va rasmlar saqlanib qolsin.
5. Telefon ekranida va UZ/RU tillarida tekshiring.

`/kirish` health check'i web server javobini tekshiradi; baza/rasm ishlashini
yuqoridagi amaliy sinov alohida tekshiradi. 2 GB RAM uchun Node heap 1 GB
bilan cheklangan, qolgan xotira rasm siqish va boshqa xarajatlarga qoladi.
Bu yuqori yuklama kafolati emas; Fly Metrics'da xotira va CPU'ni kuzating.

## 6. Domen va muntazam ishlar

Fly dashboard → Certificates orqali domenni qo'shing va aynan Fly ko'rsatgan
DNS yozuvlarini domen provayderida kiriting. HTTPS tayyor bo'lgach
`.env.fly.local`dagi `APP_URL`ni asosiy domenning `https://...` manziliga
yangilang, secrets import va deploy'ni takrorlang. Reklamani domen ulanganidan
keyin boshlang: mehmon sessiyasi har bir domen uchun alohida bo'ladi.

E'lon muddati va eski ma'lumotlar uchun mavjud buyruqlar:

```powershell
fly ssh console -C "npm run expire-listings"
fly ssh console -C "npm run cleanup"
```

Birinchisini har soat, ikkinchisini har kuni ishga tushiradigan scheduler
sozlash kerak. Hozir fly.toml ularni avtomatik rejalashtirmaydi. `cleanup`
rasm diskiga muhtoj: uni shu volume ulangan web Machine'da bajaring.

## Manbalar va tekshiruv chegarasi

- [Fly va Next.js](https://fly.io/docs/js/frameworks/nextjs/)
- [fly.toml va release command](https://fly.io/docs/reference/configuration/)
- [Volume cheklovlari va zaxiralash](https://fly.io/docs/volumes/overview/)
- [Secrets import](https://fly.io/docs/flyctl/secrets-import/)

Fly hisobida resurslar hali yaratilmagan va deploy bajarilmagan.
Mahalliy muhitda Docker/flyctl bo'lmasa, container build va Fly'dagi amaliy
sinovlar birinchi deploy vaqtida bajarilishi kerak.
