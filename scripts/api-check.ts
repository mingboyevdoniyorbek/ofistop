// Integratsiya tekshiruvi: ishlayotgan dev serverga haqiqiy HTTP so'rovlar. Ishga tushirish: BASE=http://localhost:3000 npx tsx scripts/api-check.ts
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { db, getPool, schema as s } from "../src/db/client";
import { moderate } from "../src/lib/moderation";

const BASE = process.env.BASE ?? "http://localhost:3000";
let fails = 0;
const ok = (name: string, cond: boolean, extra?: unknown) => { console.log(`${cond ? "OK  " : "XATO"} ${name}${cond || extra === undefined ? "" : " -> " + JSON.stringify(extra)}`); if (!cond) fails++; };

class Client {
  cookie = "";
  async req(method: string, url: string, body?: unknown, form?: FormData) {
    const r = await fetch(BASE + url, { method, redirect: "manual", headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(this.cookie ? { cookie: this.cookie } : {}) }, body: form ?? (body ? JSON.stringify(body) : undefined) });
    const sc = r.headers.get("set-cookie"); if (sc) this.cookie = sc.split(";")[0];
    const text = await r.text(); let json: any = null; try { json = JSON.parse(text); } catch {}
    return { status: r.status, json, text, headers: r.headers };
  }
  async login(phone: string) {
    const a = await this.req("POST", "/api/auth/request-otp", { phone });
    const b = await this.req("POST", "/api/auth/verify-otp", { phone, code: a.json.devCode });
    return b.status === 200;
  }
}
const png = (w = 800, h = 600) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 30, g: 90, b: 160 } } }).png().toBuffer();
const jpegWithExif = () => sharp({ create: { width: 800, height: 600, channels: 3, background: "#c33" } }).jpeg().withExif({ IFD0: { Copyright: "SHAXSIY-MA'LUMOT-TEST", Artist: "Maxfiy Ism" } }).toBuffer();
const fd = (files: { name: string; type: string; data: Buffer }[]) => { const f = new FormData(); for (const x of files) f.append("files", new Blob([new Uint8Array(x.data)], { type: x.type }), x.name); return f; };

async function main() {
  const run = Date.now() % 100000;
  const A = new Client(), B = new Client(), anon = new Client();
  const phoneA = `+9989000${String(run).padStart(5, "0")}`, phoneB = `+9989001${String(run).padStart(5, "0")}`;
  ok("1. A ro'yxatdan o'tdi va kirdi", await A.login(phoneA));
  ok("1. B kirdi", await B.login(phoneB));
  ok("anonim draft yarata olmaydi", (await anon.req("POST", "/api/listings")).status === 401);

  const c = await A.req("POST", "/api/listings"); const id = c.json.id;
  ok("2. qoralama yaratildi", c.status === 201 && !!id);
  ok("qoralama detail'da ko'rinmaydi (404)", (await anon.req("GET", `/joylar/${id}-x`)).status === 404);

  const [region] = await db().select().from(s.regions).limit(1);
  const [dist] = await db().select().from(s.districts).limit(1);
  const bad = await A.req("PATCH", `/api/listings/${id}`, { fields: { priceAmount: "abc", areaM2: "-5" } });
  ok("noto'g'ri narx/maydon 422", bad.status === 422 && !!bad.json.errors.priceAmount && !!bad.json.errors.areaM2, bad.json);
  const mism = await A.req("PATCH", `/api/listings/${id}`, { fields: { regionId: region.id + 1, districtId: dist.id } });
  ok("hudud/tuman mos emas -> 422", mism.status === 422, mism.json);

  const good = {
    category: "office", title: "Test ofis Yunusobodda", description: "Yorug' va keng ofis, metro yaqinida, remont qilingan.", regionId: region.id, districtId: dist.id,
    address: "Test ko'chasi 5", areaM2: "100", priceAmount: "10", currency: "USD", pricePeriod: "month", priceBasis: "per_m2", contactPhone: "90 123 45 67", telegramUsername: "@test_user",
    depositAmount: "1000", depositCurrency: "USD", commissionType: "percent", commissionPercent: "50", commissionPercentBase: "monthly_rent", amenities: ["internet", "ac"],
  };
  const p1 = await A.req("PATCH", `/api/listings/${id}`, { fields: good });
  ok("maydonlar saqlandi", p1.status === 200, p1.json);

  const s0 = await A.req("POST", `/api/listings/${id}/submit`);
  ok("rasmsiz yuborib bo'lmaydi (422, images)", s0.status === 422 && !!s0.json.errors?.images, s0.json);

  // Rasmlar
  const up = await A.req("POST", `/api/listings/${id}/images`, undefined, fd([
    { name: "a.jpg", type: "image/jpeg", data: await jpegWithExif() }, { name: "b.png", type: "image/png", data: await png() },
    { name: "fake.png", type: "image/png", data: Buffer.from("bu rasm emas, matn") }, { name: "x.gif", type: "image/gif", data: await sharp({ create: { width: 300, height: 300, channels: 3, background: "#fff" } }).gif().toBuffer() },
  ]));
  ok("3. 2 ta rasm yuklandi, 2 tasi rad (qisman xato aniq)", up.status === 200 && up.json.images.length === 2 && up.json.results.filter((r: any) => !r.ok).length === 2, up.json?.results);
  const first = up.json.images[0];
  ok("birinchi rasm avtomatik asosiy", first.isPrimary === true);
  const media = await anon.req("GET", first.url);
  ok("rasm /api/media orqali beriladi (webp)", media.status === 200 && media.headers.get("content-type") === "image/webp");
  const raw = Buffer.from(await (await fetch(BASE + first.url)).arrayBuffer());
  const m = await sharp(raw).metadata();
  ok("EXIF olib tashlangan", !m.exif && !raw.includes(Buffer.from("SHAXSIY-MA'LUMOT-TEST")));
  ok("media: yo'l bosib o'tish rad etiladi", (await anon.req("GET", "/api/media/..%2f..%2fetc%2fpasswd")).status === 404);
  const second = up.json.images[1];
  const ord = await A.req("PATCH", `/api/listings/${id}/images`, { order: [second.id, first.id], primary: second.id });
  ok("asosiy rasm va tartib o'zgardi", ord.status === 200 && ord.json.images[0].id === second.id && ord.json.images[0].isPrimary && !ord.json.images[1].isPrimary);

  // IDOR
  ok("9. begona foydalanuvchi tahrirlay olmaydi (404)", (await B.req("PATCH", `/api/listings/${id}`, { fields: { title: "Hack hack hack" } })).status === 404);
  ok("begona rasm yuklay olmaydi", (await B.req("POST", `/api/listings/${id}/images`, undefined, fd([{ name: "a.png", type: "image/png", data: await png() }]))).status === 404);
  ok("begona yubora olmaydi", (await B.req("POST", `/api/listings/${id}/submit`)).status === 404);
  ok("begona rasm o'chira olmaydi", (await B.req("DELETE", `/api/listings/${id}/images/${first.id}`)).status === 404);
  ok("begona mavjudlikni o'zgartira olmaydi", (await B.req("POST", `/api/listings/${id}/availability`, { action: "set", to: "rented" })).status === 404);

  // Yuborish
  const sub = await A.req("POST", `/api/listings/${id}/submit`);
  ok("4. moderatsiyaga yuborildi", sub.status === 200, sub.json);
  ok("qayta yuborib bo'lmaydi (409)", (await A.req("POST", `/api/listings/${id}/submit`)).status === 409);
  const q0 = await anon.req("GET", `/joylar?q=${encodeURIComponent("Test ofis Yunusobodda")}`);
  ok("tasdiqlanmagan e'lon katalogda yo'q", !q0.text.includes(id));

  // Moderator
  const [uA] = await db().select().from(s.users).where(eq(s.users.phone, phoneA));
  ok("oddiy foydalanuvchi moderatsiya qila olmaydi", (await moderate(id, { id: uA.id, role: "user" }, "approve", undefined, 30)).ok === false);
  const [mod] = await db().insert(s.users).values({ phone: `+9989002${String(run).padStart(5, "0")}`, role: "moderator", phoneVerifiedAt: new Date() }).returning();
  ok("rad etish sababsiz mumkin emas", (await moderate(id, { id: mod.id, role: "moderator" }, "reject", " ", 30)).ok === false);
  const ap = await moderate(id, { id: mod.id, role: "moderator" }, "approve", undefined, 30);
  ok("5. moderator tasdiqladi", ap.ok === true, ap);
  const q1 = await anon.req("GET", `/joylar?q=${encodeURIComponent("Test ofis Yunusobodda")}`);
  ok("5. katalogda paydo bo'ldi", q1.text.includes(id));
  const det = await anon.req("GET", `/joylar/${id}-x`);
  ok("12. jami narx 1 000 USD (100 m² x 10)", det.status === 200 && /1.000 USD/.test(det.text.replace(/&nbsp;|\u00a0/g, " ")), det.status);
  const q2 = await anon.req("GET", `/joylar?q=Test+ofis&region=${region.id}&district=${dist.id}&category=office&currency=USD&basis=per_m2&priceMin=5&priceMax=15&areaMin=90&areaMax=110`);
  ok("6. hudud+narx+maydon filtri birga", q2.text.includes(id));
  const q3 = await anon.req("GET", `/joylar?q=Test+ofis&currency=UZS&basis=per_m2&priceMin=5&priceMax=15`);
  ok("13. boshqa valyutada solishtirilmaydi", !q3.text.includes(id));

  // Sevimlilar
  ok("anonim sevimlilarga qo'sha olmaydi", (await anon.req("POST", "/api/favorites", { listingId: id })).status === 401);
  ok("8. sevimlilarga qo'shildi", (await B.req("POST", "/api/favorites", { listingId: id })).status === 200);
  ok("takroriy qo'shish xato bermaydi", (await B.req("POST", "/api/favorites", { listingId: id })).status === 200);
  const B2 = new Client(); await B2.login(phoneB);
  const favPage = await B2.req("GET", "/kabinet/sevimlilar");
  ok("8. qayta kirgach sevimlilar saqlangan", favPage.text.includes(id));
  const [{ n }] = (await getPool().query(`select count(*)::int n from favorites f join users u on u.id=f.user_id where u.phone=$1`, [phoneB])).rows;
  ok("favorite takrorlanmagan (1 ta)", n === 1);

  // Qayta moderatsiya
  const e1 = await A.req("PATCH", `/api/listings/${id}`, { fields: { contactPhone: "+998901112233", minTermMonths: "6" } });
  const [st1] = await db().select().from(s.listings).where(eq(s.listings.id, id));
  ok("13. aloqa o‘zgarsa qayta moderatsiya", e1.status === 200 && e1.json.remoderation === true && st1.moderationStatus === "pending");
  await moderate(id, { id: mod.id, role: "moderator" }, "approve", undefined, 30);
  const e2 = await A.req("PATCH", `/api/listings/${id}`, { fields: { priceAmount: "12" } });
  const [st2] = await db().select().from(s.listings).where(eq(s.listings.id, id));
  ok("narx o'zgarsa qayta moderatsiya (pending)", e2.json.remoderation === true && st2.moderationStatus === "pending");
  const q4 = await anon.req("GET", `/joylar?q=${encodeURIComponent("Test ofis Yunusobodda")}`);
  ok("qayta moderatsiyada katalogdan chiqadi", !q4.text.includes(id));
  await moderate(id, { id: mod.id, role: "moderator" }, "approve", undefined, 30);

  // Mavjudlik
  const cf = await A.req("POST", `/api/listings/${id}/availability`, { action: "confirm" });
  ok("'hali bo'sh' tasdiqlandi", cf.status === 200);
  const rent = await A.req("POST", `/api/listings/${id}/availability`, { action: "set", to: "rented" });
  ok("'ijaraga berildi'", rent.status === 200);
  const q5 = await anon.req("GET", `/joylar?q=${encodeURIComponent("Test ofis Yunusobodda")}`);
  ok("10. ijaraga berilgan darhol katalogdan chiqdi", !q5.text.includes(id));
  const det2 = await anon.req("GET", `/joylar/${id}-x`);
  ok("11. eski havola 'mavjud emas' deydi", det2.status === 200 && det2.text.includes("hozir mavjud emas"));
  const react = await A.req("POST", `/api/listings/${id}/availability`, { action: "set", to: "available" });
  ok("qayta faollashtirildi", react.status === 200);
  await getPool().query(`update listings set expires_at = now() - interval '1 day' where id=$1`, [id]);
  const q6 = await anon.req("GET", `/joylar?q=${encodeURIComponent("Test ofis Yunusobodda")}`);
  ok("10. muddati tugagan e'lon qidiruvdan chiqdi", !q6.text.includes(id));
  ok("muddati tugagan e'lonni qayta tasdiqlash mumkin", (await A.req("POST", `/api/listings/${id}/availability`, { action: "confirm" })).status === 200);

  // Rasm o'chirish
  const dl = await A.req("DELETE", `/api/listings/${id}/images/${first.id}`);
  ok("rasm o'chirildi (qayta moderatsiya)", dl.status === 200 && dl.json.remoderation === true);
  await moderate(id, { id: mod.id, role: "moderator" }, "approve", undefined, 30);
  const last = await A.req("DELETE", `/api/listings/${id}/images/${second.id}`);
  ok("oxirgi rasmni o'chirib bo'lmaydi (409)", last.status === 409);

  // Biznes markaz huquqi
  const [center] = await db().select().from(s.businessCenters).limit(1);
  const cm = await A.req("PATCH", `/api/listings/${id}`, { fields: { centerId: center.id } });
  ok("18. begona markazga bog'lab bo'lmaydi (403)", cm.status === 403, cm.json);
  await db().insert(s.businessCenterMemberships).values({ centerId: center.id, userId: uA.id }).onConflictDoNothing();
  await A.req("PATCH", `/api/listings/${id}`, { fields: { centerId: center.id, unitCode: `T-${run}` } });
  const [lk] = await db().select().from(s.listings).where(eq(s.listings.id, id));
  ok("11. biriktirilgan vakil markazga bog'ladi", lk.centerId === center.id);
  const c2 = await A.req("POST", "/api/listings"); await A.req("PATCH", `/api/listings/${c2.json.id}`, { fields: { centerId: center.id, unitCode: `T-${run}` } });
  const dup = await A.req("PATCH", `/api/listings/${c2.json.id}`, { fields: { centerId: center.id, unitCode: `T-${run}` } });
  ok("bir xonani ikki marta e'lon qilish rad etildi (409)", dup.status === 409, dup.json);

  // Profil
  const pr = await A.req("PATCH", "/api/profile", { displayName: "Test Egasi", posterType: "agency", companyName: "Test MChJ", contactPhone: "+998901234567", telegramUsername: "test_user" });
  ok("profil saqlandi", pr.status === 200);

  // Sahifalar
  for (const path of ["/kabinet", "/kabinet/sevimlilar", "/kabinet/profil", `/kabinet/elon/${id}`]) { const r = await A.req("GET", path); ok(`sahifa ochiladi: ${path}`, r.status === 200, r.status); }
  const ow = await anon.req("GET", `/kabinet/elon/${id}`); ok("anonim kabinetga kirsa /kirish'ga yo'naltiriladi", ow.status >= 300 && ow.status < 400 && (ow.headers.get("location") ?? "").startsWith("/kirish"), ow.status);
  ok("begona foydalanuvchi e'lon tahrirlash sahifasini ocholmaydi (404)", (await B.req("GET", `/kabinet/elon/${id}`)).status === 404);

  // Tozalash
  await getPool().query(`delete from business_center_memberships where user_id=$1`, [uA.id]);
  console.log(fails ? `\n${fails} ta tekshiruv MUVAFFAQIYATSIZ` : "\nBarcha tekshiruvlar o'tdi");
  await getPool().end(); process.exit(fails ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
