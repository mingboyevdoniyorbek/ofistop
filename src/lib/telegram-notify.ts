import { after } from "next/server";
import { queryClient } from "@/db/client";
import { tgCall } from "./telegram";
import { publicSiteUrl } from "./site-url";

/** Bildirishnomalarni Telegram'ga yuborish yoqilganmi (bot tokeni bor va o'chirilmagan). */
export const telegramNotifyEnabled = () => !!process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_NOTIFY !== "false";
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Hali Telegram'ga yuborilmagan yangi bildirishnomalarni (oxirgi 24 soat) foydalanuvchining Telegram chatiga yuboradi.
 * Avval qatorlar "olinadi" (telegram_sent_at qo'yiladi) — parallel chaqiruvlarda ham xabar ikki marta ketmaydi.
 * Telegram bilan bog'lanmagan yoki xabarni o'chirgan foydalanuvchilarniki ham belgilanadi (qayta tekshirilmaydi).
 */
export async function flushTelegramNotifications(limit = 30) {
  if (!telegramNotifyEnabled()) return 0;
  const { rows } = await queryClient().query(
    `WITH picked AS (
       SELECT n.id FROM notifications n
       WHERE n.telegram_sent_at IS NULL AND n.created_at > now() - interval '1 day'
       ORDER BY n.created_at LIMIT $1 FOR UPDATE SKIP LOCKED)
     UPDATE notifications n SET telegram_sent_at = now() FROM picked WHERE n.id = picked.id
     RETURNING n.id, n.title, n.body, n.href,
       (SELECT l.chat_id FROM users u JOIN telegram_links l ON l.phone = u.phone
         WHERE u.id = n.user_id AND u.telegram_notify AND NOT u.is_blocked LIMIT 1) AS chat_id`, [limit]);
  const base = publicSiteUrl();
  let sent = 0;
  for (const r of rows as { title: string; body: string | null; href: string | null; chat_id: string | null }[]) {
    if (!r.chat_id) continue;
    const url = r.href ? `${base}${r.href}` : null;
    const text = [`🔔 <b>${esc(r.title)}</b>`, r.body ? esc(r.body) : ""].filter(Boolean).join("\n\n").slice(0, 3500);
    try {
      await tgCall("sendMessage", { chat_id: Number(r.chat_id), text, parse_mode: "HTML", disable_web_page_preview: true,
        ...(url && /^https:\/\//.test(url) ? { reply_markup: { inline_keyboard: [[{ text: "OfisTop’da ochish", url }]] } } : {}) });
      sent++;
    } catch (e) { console.error("[telegram-notify]", (e as Error).message); } // masalan, foydalanuvchi botni bloklagan
  }
  if (rows.length) console.log(`[telegram-notify] ${rows.length} ta ko'rildi, ${sent} ta yuborildi`);
  return rows.length; // ko'rib chiqilganlar soni (cron shu 0 bo'lguncha takrorlaydi)
}

/** Javob yuborilgandan keyin (foydalanuvchini kutdirmasdan) bildirishnomalarni Telegram'ga yetkazish. */
export function scheduleTelegramFlush() {
  if (!telegramNotifyEnabled()) return;
  try { after(() => flushTelegramNotifications().catch((e) => console.error("[telegram-notify]", e.message))); }
  catch { void flushTelegramNotifications().catch(() => {}); } // so'rov kontekstidan tashqarida (skriptlar)
}
