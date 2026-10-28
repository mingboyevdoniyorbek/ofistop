import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db/client";
import { handle, requireUser, HttpError } from "@/lib/guard";
import { normalizeTelegram } from "@/lib/listing-input";
import { normalizePhoneUz } from "@/lib/text";

export const PATCH = handle(async (req) => {
  const user = await requireUser(req);
  const b = z.object({ displayName: z.string().trim().min(2).max(80), posterType: z.enum(["owner", "business_center", "agency"]), companyName: z.string().trim().max(120), contactPhone: z.string().max(30), telegramUsername: z.string().max(60) }).safeParse(await req.json().catch(() => null));
  if (!b.success) throw new HttpError(422, "Ma'lumotlarni tekshiring (ism kamida 2 belgi)");
  const phone = b.data.contactPhone.trim() ? normalizePhoneUz(b.data.contactPhone) : null;
  if (b.data.contactPhone.trim() && !phone) throw new HttpError(422, "Telefon +998 formatida bo'lsin");
  const tg = b.data.telegramUsername.trim() ? normalizeTelegram(b.data.telegramUsername) : null;
  if (b.data.telegramUsername.trim() && !tg) throw new HttpError(422, "Telegram username noto'g'ri");
  await db().update(s.profiles).set({ displayName: b.data.displayName, posterType: b.data.posterType, companyName: b.data.companyName || null, contactPhone: phone, telegramUsername: tg }).where(eq(s.profiles.userId, user.id));
  return NextResponse.json({ ok: true });
});
