import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { hit } from "./ratelimit";
import { normalizePhoneUz } from "./text";
import { tgCall, tgSend, tokenHash } from "./telegram";

interface TgMessage { chat?: { id: number; type: string }; from?: { id: number }; text?: string; contact?: { phone_number: string; user_id?: number } }
interface Update { message?: TgMessage; callback_query?: { id: string; from: { id: number }; data?: string; message?: TgMessage } }
const remove = { remove_keyboard: true };
const ask = (chat: number) => tgSend(chat, "OfisTop’ga kirish uchun o‘zingizning kontaktingizni yuboring.\nДля входа в OfisTop отправьте свой контакт.", { keyboard: [[{ text: "📱 Kontaktni ulashish / Отправить контакт", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true });
const done = (chat: number) => tgSend(chat, "✅ Kirish tasdiqlandi. Saytdagi avvalgi oynaga qayting — u avtomatik ochiladi.\nВход подтверждён. Вернитесь в прежнее окно сайта.", remove);
const live = () => and(eq(s.authChallenges.method, "telegram"), isNull(s.authChallenges.consumedAt), gt(s.authChallenges.expiresAt, new Date()));

export async function handleUpdate(update: Update | null) {
  const cb = update?.callback_query;
  if (cb) {
    if (cb.message?.chat?.type !== "private" || cb.message.chat.id !== cb.from.id || !/^confirm:[0-9a-f-]{36}$/.test(cb.data ?? "")) return;
    const id = cb.data!.slice(8), uid = cb.from.id;
    const approved = await db().transaction(async tx => {
      const [row] = await tx.select().from(s.authChallenges).where(and(live(), eq(s.authChallenges.id, id))).for("update");
      const [link] = await tx.select().from(s.telegramLinks).where(eq(s.telegramLinks.telegramUserId, uid));
      if (!row || !link || row.payload.telegramId !== String(uid)) return false;
      await tx.update(s.authChallenges).set({ identifier: link.phone, approvedAt: new Date() }).where(eq(s.authChallenges.id, id));
      return true;
    });
    await tgCall("answerCallbackQuery", { callback_query_id: cb.id, text: approved ? "Tasdiqlandi / Подтверждено" : "Havola eskirgan / Ссылка устарела" });
    if (approved) await done(uid);
    return;
  }
  const m = update?.message;
  if (!m?.chat || !m.from || m.chat.type !== "private" || m.chat.id !== m.from.id) return;
  const uid = m.from.id, chat = m.chat.id;
  if (!Number.isSafeInteger(uid) || uid <= 0 || !await hit(`bot:messages:${uid}`, 30, 60)) return;
  if (m.contact) {
    if (m.contact.user_id !== uid) return void await tgSend(chat, "Faqat o‘zingizning kontaktingizni tugma orqali yuboring.\nОтправьте свой контакт кнопкой.", remove);
    const raw = m.contact.phone_number.trim();
    const phone = normalizePhoneUz(raw.startsWith("+") ? raw : `+${raw}`);
    if (!phone) return void await tgSend(chat, "O‘zbekiston (+998) raqami kerak.\nНужен номер Узбекистана (+998).");
    const approved = await db().transaction(async tx => {
      for (const key of [`tg:${uid}`, `tgphone:${phone}`].sort()) await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
      await tx.delete(s.telegramLinks).where(eq(s.telegramLinks.phone, phone));
      await tx.insert(s.telegramLinks).values({ telegramUserId: uid, chatId: chat, phone }).onConflictDoUpdate({ target: s.telegramLinks.telegramUserId, set: { phone, chatId: chat } });
      const [pending] = await tx.select().from(s.authChallenges).where(and(live(), isNull(s.authChallenges.approvedAt), sql`${s.authChallenges.payload}->>'telegramId' = ${String(uid)}`)).orderBy(desc(s.authChallenges.createdAt)).limit(1).for("update");
      if (!pending) return false;
      await tx.update(s.authChallenges).set({ identifier: phone, approvedAt: new Date() }).where(eq(s.authChallenges.id, pending.id));
      return true;
    });
    if (approved) await done(chat);
    else await tgSend(chat, "✅ Raqamingiz saqlandi. Endi saytda Telegram orqali kiring yoki telefon raqamingiz bilan kod so‘rang.\nНомер сохранён. Вернитесь на сайт и войдите через Telegram или запросите код по номеру.", remove);
    return;
  }
  const match = /^\/start(?:@\w+)?(?:\s+([A-Za-z0-9_-]{43}))?$/.exec(m.text?.trim() ?? "");
  if (!match) return void await tgSend(chat, "Kirish uchun saytdagi Telegram tugmasidan foydalaning yoki /start bosing.\nДля входа используйте кнопку Telegram на сайте или /start.");
  if (!match[1]) return void await ask(chat);
  const row = await db().transaction(async tx => {
    const [row] = await tx.select().from(s.authChallenges).where(and(live(), eq(s.authChallenges.approvalHash, tokenHash(match[1])))).for("update");
    if (!row || row.approvedAt || (row.payload.telegramId && row.payload.telegramId !== String(uid))) return null;
    await tx.update(s.authChallenges).set({ payload: { ...row.payload, telegramId: String(uid) } }).where(eq(s.authChallenges.id, row.id));
    return row;
  });
  if (!row) return void await tgSend(chat, "Havola eskirgan yoki ishlatilgan. Saytda qaytadan boshlang.\nСсылка устарела или использована. Начните заново на сайте.");
  const [link] = await db().select().from(s.telegramLinks).where(eq(s.telegramLinks.telegramUserId, uid));
  if (!link) await ask(chat);
  else await tgSend(chat, "OfisTop saytiga kirishni tasdiqlaysizmi? Faqat o‘zingiz boshlagan kirishni tasdiqlang.\nПодтверждаете вход в OfisTop? Подтверждайте только свой запрос.", { inline_keyboard: [[{ text: "✅ Ha, kirish / Да, войти", callback_data: `confirm:${row.id}` }]] });
}
