// 4-bosqich integratsiya tekshiruvi (admin/moderatsiya/shikoyat/muddat). Dev server ishlab turganda:
//   BASE=http://localhost:3000 DATABASE_URL=... SESSION_SECRET=... npx tsx scripts/api-check-admin.ts
import sharp from "sharp";
import { execSync } from "child_process";
import { eq, desc } from "drizzle-orm";
import { db, getPool, schema as s } from "../src/db/client";

const BASE = process.env.BASE ?? "http://localhost:3000";
let fails = 0;
const ok = (n: string, c: boolean, x?: unknown) => { console.log(`${c ? "OK  " : "XATO"} ${n}${c || x === undefined ? "" : " -> " + JSON.stringify(x)}`); if (!c) fails++; };

class Client {
  cookie = "";
  async req(method: string, url: string, body?: unknown, form?: FormData) {
    const r = await fetch(BASE + url, { method, redirect: "manual", headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(this.cookie ? { cookie: this.cookie } : {}) }, body: form ?? (body ? JSON.stringify(body) : undefined) });
    const sc = r.headers.get("set-cookie"); if (sc) this.cookie = sc.split(";")[0];
    const text = await r.text(); let json: any = null; try { json = JSON.parse(text); } catch {}
    return { status: r.status, json, text };
  }
  async login(phone: string) {
    const a = await this.req("POST", "/api/auth/request-otp", { phone });
    return (await this.req("POST", "/api/auth/verify-otp", { phone, code: a.json.devCode })).status === 200;
  }
}
const setRole = (phone: string, role: string) => getPool().query("UPDATE users SET role=$1 WHERE phone=$2", [role, phone]);
const png = () => sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 30, g: 90, b: 160 } } }).png().toBuffer();

async function newListing(c: Client, title: string) {
  const id = (await c.req("POST", "/api/listings")).json.id;
  const [region] = await db().select().from(s.regions).limit(1);
  const [dist] = await db().select().from(s.districts).where(eq(s.districts.regionId, region.id)).limit(1);
  const p = await c.req("PATCH", `/api/listings/${id}`, { fields: { category: "office", title, description: "Yorug' va keng ofis, metro yaqinida, remont qilingan.", regionId: region.id, districtId: dist?.id, address: "Test ko'chasi 5", areaM2: "50", priceAmount: "10", currency: "USD", pricePeriod: "month", priceBasis: "per_m2", contactPhone: "90 123 45 67" } });
  const f = new FormData(); f.append("files", new Blob([new Uint8Array(await png())], { type: "image/png" }), "a.png");
  const u = await c.req("POST", `/api/listings/${id}/images`, undefined, f);
  const sub = await c.req("POST", `/api/listings/${id}/submit`);
  return { id, ready: p.status === 200 && u.status < 300 && sub.status === 200, sub };
}
// Natija kartochkasi havolasi bo'yicha tekshiriladi (qidiruv so'zi formada aks etgani uchun matn bo'yicha emas)
const inCatalog = async (marker: string, id: string) => (await new Client().req("GET", `/joylar?q=${encodeURIComponent(marker)}`)).text.includes(`/joylar/${id}-`);

async function main() {
  const run = String(Date.now() % 100000).padStart(5, "0");
  const ph = (n: number) => `+998905${n}${run}`.slice(0, 13);
  const [pA, pB, pM, pAdm] = [ph(1), ph(2), ph(3), ph(4)];
  const A = new Client(), B = new Client(), M = new Client(), AD = new Client(), anon = new Client();
  for (const [c, p] of [[A, pA], [B, pB], [M, pM], [AD, pAdm]] as const) ok(`kirish ${p.slice(-6)}`, await c.login(p));
  await setRole(pM, "moderator"); await setRole(pAdm, "admin");
  const marker = `Marker${run}`;

  // --- ruxsatlar
  ok("anonim /admin -> 404", (await anon.req("GET", "/admin/elonlar")).status === 404);
  ok("oddiy foydalanuvchi /admin -> 404", (await A.req("GET", "/admin/elonlar")).status === 404);
  ok("moderator /admin/elonlar -> 200", (await M.req("GET", "/admin/elonlar")).status === 200);
  for (const pg of ["foydalanuvchilar", "markazlar", "hududlar", "audit", "sozlamalar"]) ok(`moderator /admin/${pg} -> 404 (faqat admin)`, (await M.req("GET", `/admin/${pg}`)).status === 404);
  ok("admin /admin/audit -> 200", (await AD.req("GET", "/admin/audit")).status === 200);

  // --- moderatsiya oqimi
  const L = await newListing(A, `Ofis <i>${marker}</i>`);
  ok("A e'lonni moderatsiyaga yubordi", L.ready, L.sub.json);
  ok("pending e'lon katalogda YO'Q", !(await inCatalog(marker, L.id)));
  ok("anonim moderatsiya API -> 401", (await anon.req("POST", `/api/admin/listings/${L.id}`, { action: "approve" })).status === 401);
  ok("oddiy foydalanuvchi approve -> 403", (await A.req("POST", `/api/admin/listings/${L.id}`, { action: "approve" })).status === 403);
  const q = await M.req("GET", "/admin/elonlar?holat=pending");
  ok("navbatda e'lon ko'rinadi", q.text.includes(marker));
  ok("XSS: sarlavhadagi HTML escape qilingan", !q.text.includes(`<i>${marker}</i>`));
  const rj0 = await M.req("POST", `/api/admin/listings/${L.id}`, { action: "reject" });
  ok("sababsiz rad etib bo'lmaydi", rj0.status >= 400 && rj0.status < 500, rj0);
  const rj = await M.req("POST", `/api/admin/listings/${L.id}`, { action: "reject", reason: "Rasm sifati past" });
  ok("sabab bilan rad etildi", rj.status === 200, rj.json);
  ok("egasi kabinetda rad sababini ko'radi", (await A.req("GET", `/kabinet/elon/${L.id}`)).text.includes("Rasm sifati past") || (await A.req("GET", "/kabinet?holat=rejected")).text.includes("Rasm sifati past"));
  ok("egasiga rad bildirishnomasi", (await A.req("GET", "/kabinet/bildirishnomalar")).text.includes("rad etildi"));
  ok("qayta yuborildi", (await A.req("POST", `/api/listings/${L.id}/submit`)).status === 200);
  const ap = await M.req("POST", `/api/admin/listings/${L.id}`, { action: "approve" });
  ok("moderator tasdiqladi", ap.status === 200, ap.json);
  ok("tasdiqlangach katalogda paydo bo'ldi", await inCatalog(marker, L.id));
  ok("qayta approve -> 409", (await M.req("POST", `/api/admin/listings/${L.id}`, { action: "approve" })).status === 409);
  ok("egasiga tasdiq bildirishnomasi", (await A.req("GET", "/kabinet/bildirishnomalar")).text.includes("tasdiqlandi"));

  // --- shikoyat
  const rep = (c: Client, reason = "wrong_price", comment?: string) => c.req("POST", "/api/reports", { listingId: L.id, reason, comment });
  ok("anonim shikoyat -> 401", (await rep(anon)).status === 401);
  ok("egasi o'z e'loniga shikoyat -> 409", (await rep(A)).status === 409);
  ok("\"boshqa\" izohsiz -> 422", (await rep(B, "other")).status === 422);
  ok("B shikoyat yubordi", (await rep(B)).status === 201);
  ok("takroriy ochiq shikoyat -> 409", (await rep(B)).status === 409);
  const [rp] = await db().select().from(s.reports).where(eq(s.reports.listingId, L.id)).orderBy(desc(s.reports.createdAt)).limit(1);
  ok("shikoyat moderatorga ko'rinadi", (await M.req("GET", "/admin/shikoyatlar")).text.includes(marker));
  ok("oddiy foydalanuvchi shikoyatni yopa olmaydi", (await B.req("POST", `/api/admin/reports/${rp.id}`, { action: "resolve" })).status === 403);
  ok("moderator shikoyatni yopdi", (await M.req("POST", `/api/admin/reports/${rp.id}`, { action: "resolve" })).status === 200);
  ok("yopilgan shikoyat qayta yopilmaydi", (await M.req("POST", `/api/admin/reports/${rp.id}`, { action: "dismiss" })).status === 409);

  // --- yashirish
  ok("sababsiz yashirib bo'lmaydi", (await M.req("POST", `/api/admin/listings/${L.id}`, { action: "hide" })).status === 422);
  ok("moderator yashirdi", (await M.req("POST", `/api/admin/listings/${L.id}`, { action: "hide", reason: "Tekshiruv uchun" })).status === 200);
  ok("yashirilgan e'lon katalogdan chiqdi", !(await inCatalog(marker, L.id)));
  ok("yashirilgan e'longa shikoyat -> 404", (await rep(B, "duplicate")).status === 404);
  ok("egasi moderator blokini ocholmaydi", (await A.req("POST", `/api/listings/${L.id}/availability`, { action: "set", to: "available" })).status === 403);
  ok("moderator blokni olib tashladi", (await M.req("POST", `/api/admin/listings/${L.id}`, { action: "unhide" })).status === 200);

  // --- admin: foydalanuvchilar
  const [uB] = await db().select().from(s.users).where(eq(s.users.phone, pB));
  ok("moderator rol bera olmaydi -> 403", (await M.req("POST", `/api/admin/users/${uB.id}`, { action: "role", role: "admin" })).status === 403);
  ok("oddiy foydalanuvchi o'ziga admin bera olmaydi -> 403", (await B.req("POST", `/api/admin/users/${uB.id}`, { action: "role", role: "admin" })).status === 403);
  const [uAd] = await db().select().from(s.users).where(eq(s.users.phone, pAdm));
  ok("admin o'z rolini o'zgartira olmaydi -> 409", (await AD.req("POST", `/api/admin/users/${uAd.id}`, { action: "role", role: "user" })).status === 409);
  ok("admin B ni moderator qildi", (await AD.req("POST", `/api/admin/users/${uB.id}`, { action: "role", role: "moderator" })).status === 200);
  ok("B endi /admin/elonlar'ga kira oladi", (await B.req("GET", "/admin/elonlar")).status === 200);
  ok("admin B ga 'tekshirilgan' belgisi qo'ydi", (await AD.req("POST", `/api/admin/users/${uB.id}`, { action: "verify" })).status === 200);
  ok("admin B ni blokladi", (await AD.req("POST", `/api/admin/users/${uB.id}`, { action: "block" })).status === 200);
  ok("bloklangan foydalanuvchi sessiyasi tugadi (401)", (await B.req("POST", "/api/favorites", { listingId: L.id })).status === 401);
  ok("bloklangan foydalanuvchi qayta kira olmaydi", !(await new Client().login(pB)));
  await AD.req("POST", `/api/admin/users/${uB.id}`, { action: "unblock" });

  // --- biznes markaz va vakil
  const [region] = await db().select().from(s.regions).limit(1);
  ok("moderator markaz yarata olmaydi -> 403", (await M.req("POST", "/api/admin/centers", { name: "Test BM", regionId: region.id, address: "Test manzil 1" })).status === 403);
  const cc = await AD.req("POST", "/api/admin/centers", { name: `Test BM ${run}`, regionId: region.id, address: "Test manzil 1", contactPhone: "90 111 22 33" });
  ok("admin markaz yaratdi", cc.status === 201, cc.json);
  ok("noto'g'ri tuman -> 422", (await AD.req("POST", "/api/admin/centers", { name: "BM xato", regionId: region.id, districtId: 999999, address: "Test manzil 1" })).status === 422);
  ok("begona o'zini vakil qila olmaydi -> 403", (await A.req("POST", `/api/admin/centers/${cc.json.id}/members`, { action: "add", phone: pA })).status === 403);
  ok("ro'yxatdan o'tmagan raqam -> 404", (await AD.req("POST", `/api/admin/centers/${cc.json.id}/members`, { action: "add", phone: "+998909999999" })).status === 404);
  ok("admin vakil biriktirdi", (await AD.req("POST", `/api/admin/centers/${cc.json.id}/members`, { action: "add", phone: pA })).status === 200);
  ok("/admin/markazlar vakilni ko'rsatadi", (await AD.req("GET", "/admin/markazlar")).text.includes(pA));

  // --- hudud va sozlama
  const nm = `Testhudud${run}`;
  ok("admin hudud qo'shdi", (await AD.req("POST", "/api/admin/geo", { kind: "region", nameUz: nm, nameRu: nm })).status === 201);
  ok("takroriy hudud -> 409", (await AD.req("POST", "/api/admin/geo", { kind: "region", nameUz: nm, nameRu: nm })).status === 409);
  ok("moderator hudud qo'sha olmaydi -> 403", (await M.req("POST", "/api/admin/geo", { kind: "region", nameUz: "Xxx", nameRu: "Xxx" })).status === 403);
  ok("muddat 0 -> 422", (await AD.req("POST", "/api/admin/settings", { listing_ttl_days: 0 })).status === 422);
  ok("muddat 45 saqlandi", (await AD.req("POST", "/api/admin/settings", { listing_ttl_days: 45 })).status === 200);
  const L2 = await newListing(A, `Ikkinchi ${marker}`); await M.req("POST", `/api/admin/listings/${L2.id}`, { action: "approve" });
  const [l2] = await db().select().from(s.listings).where(eq(s.listings.id, L2.id));
  const days = Math.round((l2.expiresAt!.getTime() - Date.now()) / 864e5);
  ok("yangi e'lon muddati sozlamaga mos (45 kun)", days === 45, days);
  await AD.req("POST", "/api/admin/settings", { listing_ttl_days: 30 });

  // --- muddat tugashi
  ok("tasdiqlangan e'lon katalogda", await inCatalog(`Ikkinchi ${marker}`, L2.id));
  await getPool().query("UPDATE listings SET expires_at = now() - interval '1 hour' WHERE id=$1", [L2.id]);
  ok("expires_at o'tdi -> scheduler'siz ham katalogdan chiqdi", !(await inCatalog(`Ikkinchi ${marker}`, L2.id)));
  const out = execSync("npx tsx scripts/expire-listings.ts", { env: process.env, encoding: "utf8" });
  const [l2b] = await db().select().from(s.listings).where(eq(s.listings.id, L2.id));
  ok("expire skripti holatni 'expired' qildi", l2b.availabilityStatus === "expired", out);
  ok("egasiga muddat tugagani haqida bildirishnoma", (await A.req("GET", "/kabinet/bildirishnomalar")).text.includes("muddati tugadi"));
  ok("admin e'lonlar 'Muddati tugagan' bo'limida ko'rinadi", (await AD.req("GET", "/admin/elonlar?holat=expired")).text.includes(`Ikkinchi ${marker}`));

  // --- create-admin skripti
  const pc = `+998906${run}0`.slice(0, 13);
  execSync(`npx tsx scripts/create-admin.ts ${pc} admin`, { env: process.env, encoding: "utf8" });
  const [cu] = await db().select().from(s.users).where(eq(s.users.phone, pc));
  ok("create-admin rol berdi", cu?.role === "admin");
  ok("create-admin parol yaratmadi (users'da parol ustuni yo'q)", !("password" in (cu as object)));
  ok("noto'g'ri raqam rad etiladi", (() => { try { execSync("npx tsx scripts/create-admin.ts 123", { env: process.env, stdio: "pipe" }); return false; } catch { return true; } })());

  // --- audit
  const audit = (await AD.req("GET", "/admin/audit")).text;
  for (const a of ["listing.approve", "listing.reject", "listing.hide", "user.role", "user.block", "center.create", "center.member_add", "report.resolved", "listing.expire", "settings.listing_ttl_days"]) ok(`audit logda: ${a}`, audit.includes(a));

  await getPool().end();
  console.log(fails ? `\n${fails} ta tekshiruv MUVAFFAQIYATSIZ` : "\nHammasi o'tdi"); process.exit(fails ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
