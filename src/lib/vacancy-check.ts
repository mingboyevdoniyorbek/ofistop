import { and, eq } from "drizzle-orm";
import { db, queryClient, schema as s } from "@/db/client";
import { tgCall } from "./telegram";
import { telegramNotifyEnabled } from "./telegram-notify";
import { publicSiteUrl } from "./site-url";
import { ttlDays } from "./guard";
import { canChangeAvailability, effectiveAvailability } from "./status";

/**
 * «Haqiqatan bo'sh» kafolati: e'lon egasidan har hafta Telegram orqali «Joyingiz hali bo'shmi?» deb so'raladi.
 * Javob bitta tugma bilan: «Ha, bo'sh» — tasdiq sanasi yangilanadi (qidiruvda yuqorida qoladi);
 * «Ijaraga berildi / Sotildi» — e'lon qidiruvdan chiqadi. 14 kun tasdiqlanmagan e'lon qidiruvda pastga tushadi (search.ts).
 */
export const ASK_EVERY_DAYS = 7;
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Kunlik cron: so'ralishi kerak bo'lgan e'lonlar egalariga savol yuboradi (bir e'longa haftasiga bir marta). */
export async function sendVacancyChecks(limit = 200) {
  if (!telegramNotifyEnabled()) return 0;
  // Avval qatorlar «olinadi» (vacancy_asked_at qo'yiladi) — parallel ishga tushsa ham savol ikki marta ketmaydi.
  const { rows } = await queryClient().query(
    `WITH picked AS (
       SELECT l.id FROM listings l
       WHERE l.moderation_status = 'approved' AND NOT l.is_suspended AND l.availability_status = 'available'
         AND (l.expires_at IS NULL OR l.expires_at > now())
         AND coalesce(l.availability_confirmed_at, l.published_at) < now() - make_interval(days => $2)
         AND (l.vacancy_asked_at IS NULL OR l.vacancy_asked_at < now() - make_interval(days => $2))
       ORDER BY coalesce(l.availability_confirmed_at, l.published_at) LIMIT $1 FOR UPDATE SKIP LOCKED)
     UPDATE listings l SET vacancy_asked_at = now() FROM picked WHERE l.id = picked.id
     RETURNING l.id, l.slug, l.title, l.deal_type,
       (SELECT tl.chat_id FROM users u JOIN telegram_links tl ON tl.phone = u.phone
         WHERE u.id = l.owner_id AND u.telegram_notify AND NOT u.is_blocked LIMIT 1) AS chat_id`, [limit, ASK_EVERY_DAYS]);
  const base = publicSiteUrl();
  let sent = 0;
  for (const r of rows as { id: string; slug: string; title: string; deal_type: "rent" | "sale"; chat_id: string | null }[]) {
    if (!r.chat_id) continue;
    const sale = r.deal_type === "sale";
    const url = `${base}/joylar/${r.id}-${r.slug}`;
    try {
      await tgCall("sendMessage", {
        chat_id: Number(r.chat_id), parse_mode: "HTML", disable_web_page_preview: true,
        text: `🏢 <b>${esc(r.title.slice(0, 200))}</b>\n\n${sale ? "Obyektingiz hali sotuvdami?" : "Joyingiz hali bo‘shmi?"}\n${sale ? "Объект ещё продаётся?" : "Помещение ещё свободно?"}\n\n<i>Javob bersangiz, e’lon qidiruvda yuqorida turadi. / Ответьте — объявление останется выше в поиске.</i>`,
        reply_markup: { inline_keyboard: [
          [{ text: sale ? "✅ Ha, sotuvda / Да" : "✅ Ha, bo‘sh / Да, свободно", callback_data: `vac:yes:${r.id}` }],
          [{ text: sale ? "🔑 Sotildi / Продано" : "🔑 Ijaraga berildi / Сдано", callback_data: `vac:no:${r.id}` }],
          ...(/^https:\/\//.test(url) ? [[{ text: "OfisTop’da ochish / Открыть", url }]] : []),
        ] },
      });
      sent++;
    } catch (e) { console.error("[vacancy-check]", (e as Error).message); }
  }
  if (rows.length) console.log(`[vacancy-check] ${rows.length} ta e'lon, ${sent} ta savol yuborildi`);
  return sent;
}

/**
 * Bot tugmasi bosilganda: faqat e'lon egasining (raqami shu Telegram'ga bog'langan) javobi qabul qilinadi.
 * Qaytadi: foydalanuvchiga ko'rsatiladigan qisqa matn.
 */
export async function answerVacancy(telegramUserId: number, listingId: string, free: boolean): Promise<string> {
  return db().transaction(async (tx) => {
    const [link] = await tx.select().from(s.telegramLinks).where(eq(s.telegramLinks.telegramUserId, telegramUserId));
    if (!link) return "E’lon topilmadi / Объявление не найдено";
    const [owner] = await tx.select({ id: s.users.id }).from(s.users).where(and(eq(s.users.phone, link.phone), eq(s.users.isBlocked, false)));
    const [l] = owner ? await tx.select().from(s.listings).where(and(eq(s.listings.id, listingId), eq(s.listings.ownerId, owner.id))).for("update") : [];
    if (!l || l.moderationStatus !== "approved" || l.isSuspended) return "E’lon topilmadi / Объявление не найдено";
    const from = effectiveAvailability(l), now = new Date();
    if (free) {
      if (!(from === "available" || from === "expired")) return "E’lon holati o‘zgargan / Статус объявления изменился";
      await tx.update(s.listings).set({ availabilityStatus: "available", availabilityConfirmedAt: now, expiresAt: new Date(now.getTime() + (await ttlDays(tx)) * 864e5), updatedAt: now }).where(eq(s.listings.id, l.id));
      return "✅ Rahmat! E’lon yangilandi. / Спасибо! Объявление обновлено.";
    }
    if (!canChangeAvailability(from, "rented")) return "E’lon holati o‘zgargan / Статус объявления изменился";
    await tx.update(s.listings).set({ availabilityStatus: "rented", updatedAt: now }).where(eq(s.listings.id, l.id));
    return l.dealType === "sale" ? "🔑 Tabriklaymiz! E’lon «Sotildi» deb belgilandi. / Отмечено «Продано»." : "🔑 Tabriklaymiz! E’lon «Ijaraga berildi» deb belgilandi. / Отмечено «Сдано».";
  });
}
