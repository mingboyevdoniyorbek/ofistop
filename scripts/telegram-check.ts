// Telegram kirish integratsiya tekshiruvi. HAQIQIY Telegram ishlatilmaydi: bot so'rovlarini soxta API server (4010) qabul qiladi.
// Dev serverni shu env bilan ishga tushiring:
//   TELEGRAM_BOT_TOKEN=123:TEST TELEGRAM_BOT_USERNAME=OfisIjaraTestBot TELEGRAM_WEBHOOK_SECRET=test_secret_0123456789abcdef0123456789 TELEGRAM_API_BASE=http://127.0.0.1:4010 npx next dev
import http from "http";
import { eq } from "drizzle-orm";
import { db, getPool, schema as s } from "../src/db/client";
import { tokenHash } from "../src/lib/telegram";

const BASE = process.env.BASE ?? "http://localhost:3000";
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
let fails = 0;
const ok = (n: string, c: boolean, x?: unknown) => { console.log(`${c ? "OK  " : "XATO"} ${n}${c || x === undefined ? "" : " -> " + JSON.stringify(x).slice(0, 300)}`); if (!c) fails++; };

type Sent = { chat_id: number; text: string; reply_markup?: any };
const sent: Sent[] = [];
const fake = http.createServer((req, res) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { try { sent.push(JSON.parse(b)); } catch {} res.setHeader("content-type", "application/json"); res.end('{"ok":true}'); }); });

const run = Date.now() % 100000;
const UID = 700000000 + run, UID2 = 800000000 + run;
const PHONE = `+99890555${String(run).padStart(4, "0").slice(-4)}`;
const post = async (url: string, body: unknown, headers: Record<string, string> = {}) => { const r = await fetch(BASE + url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) }); return { status: r.status, json: await r.json().catch(() => null), cookie: r.headers.get("set-cookie") }; };
const hook = (update: unknown, secret: string | null = SECRET) => post("/api/telegram/webhook", update, secret === null ? {} : { "x-telegram-bot-api-secret-token": secret });
const msg = (uid: number, extra: object, chatType = "private") => ({ update_id: Math.floor(Math.random() * 1e9), message: { message_id: 1, from: { id: uid, is_bot: false, first_name: "T" }, chat: { id: uid, type: chatType }, date: 0, ...extra } });
const start = async () => { const r = await post("/api/auth/telegram/start", {}); return { ...r, token: r.json?.token as string }; };
const lastTo = (uid: number) => [...sent].reverse().find((m) => m.chat_id === uid);
const codeFrom = (m?: Sent) => /: (\d{6})/.exec(m?.text ?? "")?.[1];

async function main() {
  await new Promise<void>((r) => fake.listen(4010, "127.0.0.1", r));
  await getPool().query("DELETE FROM rate_limits");

  // --- boshlash
  const a = await start();
  ok("start: token va bot havolasi qaytdi", a.status === 200 && a.token?.length >= 16 && a.json.botUrl === `https://t.me/OfisIjaraTestBot?start=${a.token}`, a.json);
  const [row] = await db().select().from(s.telegramLogins).where(eq(s.telegramLogins.tokenHash, tokenHash(a.token)));
  ok("bazada faqat token HASH'i saqlanadi", !!row && !JSON.stringify(row).includes(a.token));

  // --- webhook himoyasi
  ok("sirsiz webhook -> 403", (await hook(msg(UID, { text: "/start " + a.token }), null)).status === 403);
  ok("noto'g'ri sirli webhook -> 403", (await hook(msg(UID, { text: "/start " + a.token }), "xato-sir")).status === 403);
  ok("hech qanday xabar yuborilmadi (rad etilgan so'rovlar)", sent.length === 0, sent.length);
  ok("guruh chatidagi /start e'tiborsiz", (await hook(msg(UID, { text: "/start " + a.token }, "group"))).status === 200 && sent.length === 0);

  // --- birinchi marta: kontakt so'raladi
  ok("/start -> bot kontakt tugmasini so'radi", (await hook(msg(UID, { text: "/start " + a.token }))).status === 200 && lastTo(UID)?.reply_markup?.keyboard?.[0]?.[0]?.request_contact === true, lastTo(UID));
  ok("kontaktdan oldin kod yuborilmagan", !codeFrom(lastTo(UID)));
  ok("verify: bot kod bermaguncha 409", (await post("/api/auth/telegram/verify", { token: a.token, code: "123456" })).status === 409);

  // --- kontakt tekshiruvlari
  const n0 = sent.length;
  await hook(msg(UID, { contact: { phone_number: PHONE.slice(1), first_name: "T", user_id: UID2 } }));
  ok("BOSHQA odam kontakti rad etildi, kod yo'q", sent.length === n0 + 1 && !codeFrom(lastTo(UID)) && (await db().select().from(s.telegramLinks).where(eq(s.telegramLinks.telegramUserId, UID))).length === 0);
  await hook(msg(UID, { contact: { phone_number: "+79991234567", first_name: "T", user_id: UID } }));
  ok("+998 bo'lmagan raqam rad etildi", !codeFrom(lastTo(UID)) && (await db().select().from(s.telegramLinks).where(eq(s.telegramLinks.telegramUserId, UID))).length === 0);

  // --- to'g'ri kontakt -> kod
  await hook(msg(UID, { contact: { phone_number: PHONE.slice(1), first_name: "T", user_id: UID } }));
  const code = codeFrom(lastTo(UID));
  ok("to'g'ri kontakt: kod chatga yuborildi (6 raqam)", !!code, lastTo(UID));
  ok("kod xabari ogohlantirish va rus matnini o'z ichiga oladi", /Hech kimga bermang/.test(lastTo(UID)!.text) && /Никому/.test(lastTo(UID)!.text));
  ok("Telegram raqam bazada bog'landi", (await db().select().from(s.telegramLinks).where(eq(s.telegramLinks.phone, PHONE))).length === 1);

  // --- tekshirish
  ok("noto'g'ri kod -> 400", (await post("/api/auth/telegram/verify", { token: a.token, code: code === "000000" ? "111111" : "000000" })).status === 400);
  ok("kod formati noto'g'ri -> 400", (await post("/api/auth/telegram/verify", { token: a.token, code: "12" })).status === 400);
  const v = await post("/api/auth/telegram/verify", { token: a.token, code: code! });
  ok("to'g'ri kod: kirildi va sessiya cookie berildi", v.status === 200 && /oi_session=/.test(v.cookie ?? ""), v);
  const cookie = (v.cookie ?? "").split(";")[0];
  const me = await fetch(BASE + "/kabinet", { headers: { cookie }, redirect: "manual" });
  ok("sessiya ishlaydi (/kabinet 200)", me.status === 200, me.status);
  const [u] = await db().select().from(s.users).where(eq(s.users.phone, PHONE));
  ok("foydalanuvchi telefon tasdiqlangan holda yaratildi", !!u?.phoneVerifiedAt);
  ok("kod qayta ishlatilmaydi", (await post("/api/auth/telegram/verify", { token: a.token, code: code! })).status === 400);

  // --- ikkinchi kirish: kontakt qayta so'ralmaydi
  const b = await start(); const nb = sent.length;
  await hook(msg(UID, { text: `/start ${b.token}` }));
  const code2 = codeFrom(lastTo(UID));
  ok("bog'langan akkaunt: kontaktsiz darrov kod", sent.length === nb + 1 && !!code2 && !lastTo(UID)?.reply_markup?.keyboard, lastTo(UID));
  // birinchi /start egalik qiladi
  const nc = sent.length;
  await hook(msg(UID2, { text: `/start ${b.token}` }));
  ok("boshqa Telegram akkaunt o'sha havola bilan kod ololmaydi", !sent.slice(nc).some((m) => m.chat_id === UID2 && codeFrom(m)), sent.slice(nc));
  const n3 = sent.length; await hook(msg(UID, { text: `/start ${b.token}` }));
  ok("kod berilgach o'sha token qayta /start -> \"allaqachon ishlatilgan\", yangi kod yo'q", sent.length === n3 + 1 && !codeFrom(lastTo(UID)) && /allaqachon/.test(lastTo(UID)!.text), lastTo(UID));

  // --- eskirgan va noma'lum token
  const e = await start();
  await db().update(s.telegramLogins).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(s.telegramLogins.tokenHash, tokenHash(e.token)));
  const ne = sent.length;
  await hook(msg(UID, { text: `/start ${e.token}` }));
  ok("eskirgan havola: kod berilmadi", sent.length === ne + 1 && !codeFrom(lastTo(UID)), lastTo(UID));
  ok("eskirgan token verify -> 400", (await post("/api/auth/telegram/verify", { token: e.token, code: "123456" })).status === 400);
  await hook(msg(UID, { text: "/start " + "A".repeat(20) }));
  ok("noma'lum token: kod berilmadi, \"eskirgan\" xabari", !codeFrom(lastTo(UID)) && /eskirgan/.test(lastTo(UID)!.text), lastTo(UID));

  // --- bot kodi limiti (10 daqiqada 3 ta)
  let issued = 0; await getPool().query("DELETE FROM rate_limits WHERE key LIKE 'tg:code:%'");
  for (let i = 0; i < 5; i++) { const t = await start(); const before = sent.length; await hook(msg(UID, { text: `/start ${t.token}` })); if (codeFrom(sent[sent.length - 1]) && sent.length > before) issued++; }
  ok("bir akkauntga 10 daqiqada 3 tadan ortiq kod berilmaydi", issued === 3, issued);

  // --- 5 ta noto'g'ri urinishdan keyin kod yaroqsiz
  await getPool().query("DELETE FROM rate_limits"); const f = await start(); await hook(msg(UID, { text: `/start ${f.token}` }));
  const fc = codeFrom(lastTo(UID))!; const wrong = fc === "999999" ? "888888" : "999999"; let last = 0;
  for (let i = 0; i < 6; i++) last = (await post("/api/auth/telegram/verify", { token: f.token, code: wrong })).status;
  ok("5 ta xato urinishdan keyin to'g'ri kod ham o'tmaydi", last === 400 && (await post("/api/auth/telegram/verify", { token: f.token, code: fc })).status === 400);

  // --- UI
  const page = await (await fetch(BASE + "/kirish")).text();
  ok("/kirish sahifasida Telegram tugmasi bor", page.includes("Telegram orqali kirish"));
  const pageRu = await (await fetch(BASE + "/kirish", { headers: { cookie: "lang=ru" } })).text();
  ok("/kirish rus tilida", pageRu.includes("Войти через Telegram"));

  // --- eski telefon OTP oqimi buzilmagan (dev rejimida)
  const o = await post("/api/auth/request-otp", { phone: "+998905559999" });
  ok("dev OTP oqimi saqlanib qolgan", o.status === 200 && /^\d{6}$/.test(o.json?.devCode ?? ""), o);

  fake.close(); await getPool().end();
  console.log(fails ? `\n${fails} ta tekshiruv MUVAFFAQIYATSIZ` : "\nHammasi o'tdi"); process.exit(fails ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
