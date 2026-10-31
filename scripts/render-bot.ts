import "./load-env";
import { createTelegramServer } from "../src/lib/telegram-server";
import { handleUpdate } from "../src/lib/telegram-bot";
import { tgCall, telegramEnabled } from "../src/lib/telegram";
import { getPool } from "../src/db/client";
import { flushTelegramNotifications, telegramNotifyEnabled } from "../src/lib/telegram-notify";

async function main() {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
  if (!telegramEnabled() || !/^[A-Za-z0-9_-]{32,256}$/.test(secret)) throw new Error("Telegram settings missing");
  const origin = new URL(process.env.RENDER_EXTERNAL_URL ?? process.env.BOT_PUBLIC_URL ?? "");
  if (origin.protocol !== "https:") throw new Error("Bot HTTPS URL required");
  await getPool().query("SELECT 1 FROM telegram_links LIMIT 0");
  let ready = false;
  const server = createTelegramServer(secret, handleUpdate, () => ready);
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(Number(process.env.PORT ?? 10000), "0.0.0.0", resolve); });
  try {
    await tgCall("setWebhook", { url: `${origin.origin}/telegram/webhook`, secret_token: secret, allowed_updates: ["message", "callback_query"], drop_pending_updates: false });
    await tgCall("setMyCommands", { commands: [{ command: "start", description: "OfisTop - kirish" }] });
    ready = true;
    console.log(`OfisTop bot ready: webhook ${origin.origin}/telegram/webhook registered; database connected`);
  } catch (e) { server.close(); throw e; }
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
main().catch(() => { console.error("Bot startup failed: check DATABASE_URL, TELEGRAM_* and RENDER_EXTERNAL_URL. Secrets are not logged."); process.exit(1); });
