import { tgCall } from "./telegram";
import { publicSiteUrl } from "./site-url";

/**
 * Adminlarga Telegram orqali darhol xabar (yangi markaz arizasi, kutilayotgan o'zgarishlar).
 * ADMIN_TELEGRAM_CHAT_IDS — vergul bilan ajratilgan chat ID'lar (admin avval botga /start yozgan bo'lishi kerak).
 * Xato asosiy amalni to'xtatmaydi.
 */
export async function alertAdmins(text: string, path: string, button = "Ko‘rish") {
  const ids = (process.env.ADMIN_TELEGRAM_CHAT_IDS ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  if (!ids.length || !process.env.TELEGRAM_BOT_TOKEN) return;
  const url = `${publicSiteUrl()}${path}`;
  await Promise.allSettled(ids.map((chat_id) => tgCall("sendMessage", {
    chat_id, text, disable_web_page_preview: true,
    reply_markup: /^https:\/\//.test(url) ? { inline_keyboard: [[{ text: button, url }]] } : undefined, // Telegram faqat https havolani qabul qiladi
  }).catch((e) => console.error("[admin-alert]", (e as Error).message))));
}
