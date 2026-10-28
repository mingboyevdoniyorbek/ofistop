import "./load-env";
import { tgCall, telegramEnabled } from "../src/lib/telegram";
async function main() {
  if (!telegramEnabled() || !process.env.APP_URL) throw new Error("APP_URL va TELEGRAM_* sozlamalarini kiriting.");
  const origin = new URL(process.env.APP_URL);
  if (origin.protocol !== "https:") throw new Error("Webhook uchun HTTPS domen kerak.");
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(process.env.TELEGRAM_WEBHOOK_SECRET!)) throw new Error("TELEGRAM_WEBHOOK_SECRET 32–256 ta A-Z, a-z, 0-9, _ yoki - belgidan iborat bo'lsin.");
  await tgCall("setWebhook", { url: `${origin.origin}/api/telegram/webhook`, secret_token: process.env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ["message", "callback_query"], drop_pending_updates: false });
  await tgCall("setMyCommands", { commands: [{ command: "start", description: "OfisTop — kirish / вход" }] });
  console.log("Telegram webhook va /start buyrug'i ulandi. Botda /start orqali tekshiring.");
}
main().catch(() => { console.error("Webhook ulanmagan. HTTPS domen, bot tokeni va webhook secret sozlamalarini tekshiring."); process.exitCode = 1; });
