// Telegram Bot API adapteri. Token faqat serverda (TELEGRAM_BOT_TOKEN), logga yozilmaydi.
import { createHash } from "crypto";
import { promoEnabled } from "./launch-mode";
export const tokenHash = (t: string) => createHash("sha256").update(t).digest("hex");
export const telegramEnabled = () => !promoEnabled() && !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME && process.env.TELEGRAM_WEBHOOK_SECRET);
export const botUsername = () => (process.env.TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "");

export async function tgSend(chatId: number, text: string, replyMarkup?: object) {
  const base = process.env.TELEGRAM_API_BASE ?? "https://api.telegram.org"; // TELEGRAM_API_BASE faqat test uchun
  const r = await fetch(`${base}/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, reply_markup: replyMarkup }), signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`Telegram API xatosi: HTTP ${r.status}`); // URL (token) xabarga kiritilmaydi
}
