import { NextResponse } from "next/server";
import { handle, sameOrigin } from "@/lib/guard";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { newOtp, hashOtp } from "@/lib/auth";
import { normalizePhoneUz } from "@/lib/text";
import { hit } from "@/lib/ratelimit";
import { getSmsProvider, isDevOtp, otpText, SmsNotConfigured, SmsSendError } from "@/lib/sms";

export const POST = handle(async (req) => {
  sameOrigin(req);
  const body = z.object({ phone: z.string().max(30) }).safeParse(await req.json().catch(() => null));
  const phone = body.success ? normalizePhoneUz(body.data.phone) : null;
  if (!phone) return NextResponse.json({ error: "Telefon raqami noto'g'ri. Format: +998 90 123 45 67" }, { status: 400 });

  let sms;
  try { sms = getSmsProvider(); }
  catch (e) {
    if (e instanceof SmsNotConfigured) return NextResponse.json({ error: "SMS xizmati hozircha sozlanmagan. Keyinroq urinib ko'ring." }, { status: 503 });
    throw e;
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (!(await hit(`otp:phone:${phone}`, 3, 600)) || !(await hit(`otp:ip:${ip}`, 15, 3600)))
    return NextResponse.json({ error: "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring." }, { status: 429 });

  // SMS byudjetini himoya qilish (SMS "pumping"): butun sayt bo'yicha sutkalik chegara.
  const daily = Math.max(1, Number(process.env.SMS_DAILY_LIMIT) || 500);
  if (sms.name !== "dev-console" && !(await hit("sms:global:day", daily, 86400)))
    return NextResponse.json({ error: "SMS yuborish vaqtincha cheklangan. Keyinroq urinib ko'ring." }, { status: 503 });

  const code = newOtp();
  const [ch] = await db().insert(s.otpChallenges).values({ phone, codeHash: hashOtp(phone, code), expiresAt: new Date(Date.now() + 5 * 60_000) }).returning({ id: s.otpChallenges.id });
  try { await sms.send(phone, otpText(code)); }
  catch (e) {
    await db().delete(s.otpChallenges).where(eq(s.otpChallenges.id, ch.id)); // yuborilmagan kod ishlatilmasin
    if (e instanceof SmsSendError) {
      console.error("SMS xatosi:", e.message); // telefon raqami logga yozilmaydi
      return NextResponse.json({ error: "SMS yuborib bo'lmadi. Birozdan keyin qayta urinib ko'ring." }, { status: 502 });
    }
    throw e;
  }
  // Test rejimi ochiq belgilanadi: haqiqiy SMS yuborilmagan.
  return NextResponse.json(isDevOtp() ? { ok: true, devMode: true, devCode: code } : { ok: true });
});
