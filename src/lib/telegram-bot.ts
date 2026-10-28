// Webhook update'larini qayta ishlaydi. Faqat shaxsiy chat; kontakt yuboruvchining o'ziniki bo'lishi shart.
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { newOtp, hashOtp } from "./auth";
import { hit } from "./ratelimit";
import { normalizePhoneUz } from "./text";
import { tgSend, tokenHash } from "./telegram";

interface TgUser { id: number }
interface TgMessage { chat?: { id: number; type: string }; from?: TgUser; text?: string; contact?: { phone_number: string; user_id?: number } }

const M = {
  help: "OfisTop: kirish uchun saytdagi «Telegram orqali kirish» tugmasini bosing.\nДля входа нажмите кнопку «Войти через Telegram» на сайте.",
  stale: "Havola eskirgan yoki noto'g'ri. Saytda qaytadan «Telegram orqali kirish» ni bosing.\nСсылка устарела. Нажмите «Войти через Telegram» на сайте ещё раз.",
  used: "Bu havola allaqachon ishlatilgan. Saytda yangisini oling.\nЭта ссылка уже использована. Получите новую на сайте.",
  askContact: "Telefon raqamingizni tasdiqlash uchun pastdagi tugmani bosing.\nНажмите кнопку ниже, чтобы подтвердить номер телефона.",
  btn: "📱 Raqamni yuborish / Отправить номер",
  notOwn: "Faqat o'zingizning raqamingizni tugma orqali yuboring.\nОтправьте только свой номер через кнопку.",
  notUz: "Faqat O'zbekiston (+998) raqamlari qabul qilinadi.\nПринимаются только номера Узбекистана (+998).",
  saved: "Raqam saqlandi. Saytda «Telegram orqali kirish» ni bosing.\nНомер сохранён. Нажмите «Войти через Telegram» на сайте.",
  wait: "Juda ko'p urinish. Bir necha daqiqadan keyin qayta urinib ko'ring.\nСлишком много попыток. Повторите через несколько минут.",
  code: (c: string) => `OfisTop kirish kodi: ${c}\nKod 5 daqiqa amal qiladi. Hech kimga bermang.\n\nКод для входа: ${c} (действует 5 минут). Никому не сообщайте.`,
};
const RM = { remove_keyboard: true };

async function issueCode(chatId: number, tgUserId: number, loginId: string, phone: string) {
  if (!(await hit(`tg:code:${tgUserId}`, 3, 600))) return tgSend(chatId, M.wait, RM);
  const code = newOtp();
  await db().update(s.telegramLogins).set({ phone }).where(eq(s.telegramLogins.id, loginId));
  await db().insert(s.otpChallenges).values({ phone, codeHash: hashOtp(phone, code), expiresAt: new Date(Date.now() + 5 * 60_000) });
  await tgSend(chatId, M.code(code), RM);
}

async function proceed(chatId: number, tgUserId: number, loginId: string) {
  const [link] = await db().select().from(s.telegramLinks).where(eq(s.telegramLinks.telegramUserId, tgUserId)).limit(1);
  if (!link) return tgSend(chatId, M.askContact, { keyboard: [[{ text: M.btn, request_contact: true }]], resize_keyboard: true, one_time_keyboard: true });
  return issueCode(chatId, tgUserId, loginId, link.phone);
}

export async function handleUpdate(update: { message?: TgMessage } | null) {
  const m = update?.message;
  if (!m?.chat || !m.from || m.chat.type !== "private") return; // guruh/kanal xabarlari e'tiborsiz
  const chatId = m.chat.id, uid = m.from.id; const d = db();

  if (m.contact) {
    if (m.contact.user_id !== uid) return void (await tgSend(chatId, M.notOwn, RM)); // boshqa odam kontakti — rad
    const raw = m.contact.phone_number.trim();
    const phone = normalizePhoneUz(raw.startsWith("+") ? raw : `+${raw}`);
    if (!phone) return void (await tgSend(chatId, M.notUz, RM));
    // Bir raqam — bitta Telegram akkaunt, bir akkaunt — bitta raqam; yangisi eskisini almashtiradi
    await d.delete(s.telegramLinks).where(eq(s.telegramLinks.phone, phone));
    await d.insert(s.telegramLinks).values({ telegramUserId: uid, chatId, phone })
      .onConflictDoUpdate({ target: s.telegramLinks.telegramUserId, set: { chatId, phone } });
    const [pending] = await d.select().from(s.telegramLogins).where(and(eq(s.telegramLogins.telegramUserId, uid), isNull(s.telegramLogins.phone), isNull(s.telegramLogins.consumedAt), gt(s.telegramLogins.expiresAt, new Date()))).orderBy(desc(s.telegramLogins.createdAt)).limit(1);
    return void (await (pending ? issueCode(chatId, uid, pending.id, phone) : tgSend(chatId, M.saved, RM)));
  }

  const text = m.text?.trim() ?? "";
  const mm = /^\/start(?:@\w+)?(?:\s+([A-Za-z0-9_-]{8,64}))?$/.exec(text);
  if (!mm) return void (await tgSend(chatId, M.help));
  if (!mm[1]) return void (await tgSend(chatId, M.help));
  const [login] = await d.select().from(s.telegramLogins).where(and(eq(s.telegramLogins.tokenHash, tokenHash(mm[1])), isNull(s.telegramLogins.consumedAt), gt(s.telegramLogins.expiresAt, new Date()))).limit(1);
  if (!login) return void (await tgSend(chatId, M.stale));
  if (login.telegramUserId && login.telegramUserId !== uid) return void (await tgSend(chatId, M.used)); // birinchi /start egalik qiladi
  if (login.phone) return void (await tgSend(chatId, M.used)); // kod allaqachon berilgan
  await d.update(s.telegramLogins).set({ telegramUserId: uid, chatId }).where(eq(s.telegramLogins.id, login.id));
  await proceed(chatId, uid, login.id);
}
