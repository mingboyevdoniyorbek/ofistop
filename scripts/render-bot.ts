import "./load-env";
import { createTelegramServer } from "../src/lib/telegram-server";
import { handleUpdate } from "../src/lib/telegram-bot";
import { tgCall, telegramEnabled } from "../src/lib/telegram";
import { getPool } from "../src/db/client";
import { flushTelegramNotifications, telegramNotifyEnabled } from "../src/lib/telegram-notify";

async function main() {
  // Har bir tekshiruv logga alohida yoziladi (qiymatlar emas, faqat nomlar) — Railway/Render loglaridan sabab darhol ko'rinadi.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
  const missing = ["DATABASE_URL", "TELEGRAM_BOT_TOKEN", "TELEGRAM_BOT_USERNAME", "TELEGRAM_WEBHOOK_SECRET"].filter((k) => !process.env[k]?.trim());
  if (missing.length) throw new Error(`Variables yetishmaydi: ${missing.join(", ")}`);
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(secret)) throw new Error(`TELEGRAM_WEBHOOK_SECRET formati noto'g'ri: 32–256 belgi, faqat A-Z a-z 0-9 _ - (hozir ${secret.length} belgi)`);
  if (!telegramEnabled()) throw new Error("Telegram sozlamalari to'liq emas");
  // Ommaviy HTTPS manzil: Render o'zi beradi (RENDER_EXTERNAL_URL), Railway — RAILWAY_PUBLIC_DOMAIN ("Generate Domain"dan keyin), yoki qo'lda BOT_PUBLIC_URL.
  const railway = process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : undefined;
  const raw = process.env.BOT_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || railway || "";
  if (!raw) throw new Error("Bot ommaviy manzili yo'q: Railway → Settings → Networking → Generate Domain (yoki BOT_PUBLIC_URL kiriting)");
  const origin = new URL(raw);
  if (origin.protocol !== "https:") throw new Error("Bot manzili https:// bilan boshlanishi kerak");
  console.log(`[bot] 1/3 sozlamalar joyida; manzil: ${origin.origin}; port: ${process.env.PORT ?? 10000}`);
  try { await getPool().query("SELECT 1 FROM telegram_links LIMIT 0"); }
  catch (e) { throw new Error(`bazaga ulanib bo'lmadi (DATABASE_URL Vercel'dagi Neon manzili bilan bir xilmi?): ${(e as Error).message}`); }
  console.log("[bot] 2/3 bazaga ulandi");
  let ready = false;
  const server = createTelegramServer(secret, handleUpdate, () => ready);
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(Number(process.env.PORT ?? 10000), "0.0.0.0", resolve); });
  console.log("[bot] server tinglayapti, Telegram webhook ulanmoqda…");
  try {
    await tgCall("setWebhook", { url: `${origin.origin}/telegram/webhook`, secret_token: secret, allowed_updates: ["message", "callback_query"], drop_pending_updates: false });
    await tgCall("setMyCommands", { commands: [{ command: "start", description: "OfisTop - kirish" }] });
    ready = true;
    console.log(`OfisTop bot ready: webhook ${origin.origin}/telegram/webhook registered; database connected`);
  } catch (e) { server.close(); throw new Error(`Telegram webhook ulanmadi (TELEGRAM_BOT_TOKEN to'g'rimi?): ${(e as Error).message}`); }
  // Zaxira: sayt bildirishnomani darhol yuboradi; bot serveri doim yoniq bo'lgani uchun qolib ketganini har 30 soniyada yuboradi.
  // Ikkalasi bir vaqtda ishlasa ham xabar ikki marta ketmaydi (qatorlar SKIP LOCKED bilan olinadi).
  let flushing = false;
  const notifyTimer = telegramNotifyEnabled() ? setInterval(() => {
    if (flushing) return; flushing = true;
    flushTelegramNotifications(50).catch((e) => console.error("Notification flush failed:", e.message)).finally(() => { flushing = false; });
  }, 30_000) : null;
  const stop = () => { ready = false; if (notifyTimer) clearInterval(notifyTimer); server.close(() => { void getPool().end().then(() => process.exit(0)); }); setTimeout(() => process.exit(0), 15000).unref(); };
  process.once("SIGTERM", stop); process.once("SIGINT", stop);
}
// Sabab logga chiqadi (xabarlarda token yoki parol yo'q: tgCall URL'ni xabarga qo'shmaydi).
main().catch((e) => { console.error(`Bot startup failed: ${(e as Error)?.message ?? e}. Check DATABASE_URL, TELEGRAM_* and the public URL (Railway: Generate Domain; or BOT_PUBLIC_URL).`); process.exit(1); });
