import "./load-env";
import { Pool } from "pg";
import { adminPasswordConfigured } from "../src/lib/admin-password";

// Read-only deployment diagnosis. Never prints secrets, SQL parameters or provider errors.
let failed = false;
function report(ok: boolean, message: string) {
  console.log(`${ok ? "OK" : "FAIL"}: ${message}`);
  if (!ok) failed = true;
}
async function main() {
  let origin = "";
  try {
    const url = new URL(process.env.APP_URL ?? "");
    if (url.protocol === "https:" && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash) origin = url.origin;
  } catch {}
  report(!!origin, "APP_URL: asosiy HTTPS domen (path/query bo'lmasin)");
  report((process.env.SESSION_SECRET?.length ?? 0) >= 32, "SESSION_SECRET: kamida 32 belgi");
  report(adminPasswordConfigured(), "ADMIN_PASSWORD_HASH: scrypt hash (oddiy parol emas)");
  report(!!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET, "Google Client ID va Secret mavjudligi (Google tasdiqlashi kirishda tekshiriladi)");
  report(!!process.env.DATABASE_URL, "DATABASE_URL mavjudligi");
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5000, query_timeout: 8000 });
    try {
      const names = ["users", "sessions", "rate_limits", "auth_challenges", "auth_identities", "telegram_links"];
      const result = await pool.query("SELECT name, to_regclass(name) IS NOT NULL AS present FROM unnest($1::text[]) AS name", [names]);
      for (const row of result.rows) report(row.present, `Baza jadvali: ${row.name}`);
      if (result.rows.every(row => row.present)) {
        await pool.query("SELECT method, identifier, browser_hash, approval_hash, code_hash, payload, next, attempts, expires_at, approved_at, consumed_at FROM auth_challenges LIMIT 0");
        await pool.query("SELECT provider, subject, user_id FROM auth_identities LIMIT 0");
        report(true, "Yangi login jadvallari ustunlari tayyor");
      } else console.log("Yechim: shu DATABASE_URL bilan npm.cmd run db:setup bajaring.");
    } catch (error) {
      const code = (error as { code?: string }).code ?? "UNKNOWN";
      report(false, `Baza tekshiruvi: ${/^[A-Z0-9_]{2,30}$/.test(code) ? code : "UNKNOWN"}. Ulanish, ruxsat yoki migratsiyani tekshiring.`);
    } finally { await pool.end(); }
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const username = (process.env.TELEGRAM_BOT_USERNAME ?? "").trim().replace(/^@/, "");
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
  report(!!token && !!username && /^[A-Za-z0-9_-]{32,256}$/.test(secret), "Telegram token, username va webhook secret mavjud/formati to'g'ri");
  if (token) {
    try {
      async function read(method: string) {
        const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { signal: AbortSignal.timeout(8000) });
        const body = await response.json();
        if (!response.ok || !body.ok) throw new Error("Telegram check failed");
        return body.result;
      }
      const me = await read("getMe");
      report(me.username?.toLowerCase() === username.toLowerCase(), "TELEGRAM_BOT_USERNAME shu tokenning botiga tegishli");
      const info = await read("getWebhookInfo");
      if (process.env.TELEGRAM_BOT_HOST === "render") {
        const actual = new URL(info.url || "https://invalid.invalid");
        const expected = process.env.BOT_PUBLIC_URL ? `${new URL(process.env.BOT_PUBLIC_URL).origin}/telegram/webhook` : null;
        report(expected ? info.url === expected : actual.protocol === "https:" && actual.hostname.endsWith(".onrender.com") && actual.pathname === "/telegram/webhook", "Webhook Render bot manziliga ulangan");
      } else report(!!origin && info.url === `${origin}/api/telegram/webhook`, "Webhook APP_URL/api/telegram/webhook manziliga ulangan");
      report(!info.allowed_updates?.length || ["message", "callback_query"].every(type => info.allowed_updates.includes(type)), "Webhook kontakt va tasdiqlash tugmasini qabul qiladi");
      console.log(`Telegram kutayotgan update soni: ${Number(info.pending_update_count) || 0}`);
      if (info.last_error_date) console.log("Telegram oldingi yetkazish xatosini qayd etgan; Vercel webhook loglarini tekshiring.");
    } catch { report(false, "Telegram token yoki tarmoq tekshiruvi o'tmadi"); }
  }
  process.exitCode = failed ? 1 : 0;
}
main().catch(() => { console.error("Diagnostika yakunlanmadi. Sozlamalarni tekshiring."); process.exitCode = 1; });
