// Telegram Bot API adapteri. Token faqat serverda (TELEGRAM_BOT_TOKEN), logga yozilmaydi.
import { createHash } from "crypto";
export const tokenHash = (t: string) => createHash("sha256").update(t).digest("hex");
export const telegramEnabled = () => !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME && process.env.TELEGRAM_WEBHOOK_SECRET);
export const botUsername = () => (process.env.TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "");

export async function tgSend(chatId: number, text: string, replyMarkup?: object) {
  return tgCall("sendMessage", { chat_id: chatId, text, reply_markup: replyMarkup });
}
export async function tgCall(method: string, body: object) {
  // Soxta Bot API (avtomatik testlar): production'da faqat shu kompyuterdagi (loopback) manzilga ruxsat.
  const test = process.env.TELEGRAM_API_BASE;
  const base = test && (process.env.NODE_ENV !== "production" || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(test)) ? test : "https://api.telegram.org";
  const r = await fetch(`${base}/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`Telegram API xatosi: HTTP ${r.status}`); // URL (token) xabarga kiritilmaydi
  const result = await r.json();
  if (!result.ok) throw new Error("Telegram API so'rovni rad etdi");
  return result.result;
}
