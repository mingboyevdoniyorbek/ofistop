import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { sameOrigin, HttpError } from "@/lib/guard";
import { handleLogin } from "@/lib/login-errors";
import { botUsername, telegramEnabled, tgSend } from "@/lib/telegram";
import { invalidateChallenge, loginLimit, startChallenge } from "@/lib/login-challenge";
import { normalizePhoneUz } from "@/lib/text";
import { clientIp } from "@/lib/client-ip";

export const POST = handleLogin("telegram-start", async req => {
  sameOrigin(req);
  if (!telegramEnabled()) throw new HttpError(503, "Telegram orqali kirish hozircha sozlanmagan.");
  const b = z.object({ phone: z.string().max(30).optional(), next: z.string().max(2048).optional() }).safeParse(await req.json().catch(() => ({})));
  if (!b.success) throw new HttpError(400, "Telefon raqamini to'g'ri kiriting.");
  const phone = b.data.phone === undefined ? null : normalizePhoneUz(b.data.phone);
  if (b.data.phone !== undefined && !phone) throw new HttpError(400, "Telefon raqami noto'g'ri. Format: +998 90 123 45 67");
  await loginLimit(req, phone ? `telegram:${phone}` : `telegram:${clientIp(req)}`);
  const { row, approvalToken, code } = await startChallenge(phone ? "telegram_code" : "telegram", phone ?? "", b.data.next);
  if (phone) {
    const [link] = await db().select().from(s.telegramLinks).where(eq(s.telegramLinks.phone, phone));
    if (link) {
      await db().update(s.authChallenges).set({ payload: { ...row.payload, telegramId: String(link.telegramUserId) } }).where(eq(s.authChallenges.id, row.id));
      try { await tgSend(link.chatId, `🔐 OfisTop kirish kodi / Код входа\n\n${code}\n\n10 daqiqa amal qiladi. Hech kimga bermang.\nДействует 10 минут. Никому не сообщайте.`); }
      catch { await invalidateChallenge(row.id); throw new HttpError(502, "Botga kod yuborilmadi. Botni oching va qayta urinib ko'ring."); }
    } else await db().update(s.authChallenges).set({ codeHash: null }).where(eq(s.authChallenges.id, row.id));
  }
  return NextResponse.json({ ok: true, id: row.id, expiresAt: row.expiresAt, botUrl: `https://t.me/${botUsername()}${phone ? "" : `?start=${approvalToken}`}` }, { headers: { "Cache-Control": "no-store" } });
});
