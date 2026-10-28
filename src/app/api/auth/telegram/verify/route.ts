import { NextResponse } from "next/server";
import { handle, sameOrigin } from "@/lib/guard";
import { z } from "zod";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { hit } from "@/lib/ratelimit";
import { tokenHash } from "@/lib/telegram";
import { verifyOtpAndSignIn } from "@/lib/otp-login";

export const POST = handle(async (req) => {
  sameOrigin(req);
  const b = z.object({ token: z.string().min(8).max(64), code: z.string().regex(/^\d{6}$/) }).safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Kod 6 ta raqamdan iborat bo'lishi kerak" }, { status: 400 });
  const h = tokenHash(b.data.token);
  if (!(await hit(`tgverify:${h}`, 10, 600))) return NextResponse.json({ error: "Juda ko'p urinish. Yangi kod so'rang." }, { status: 429 });
  const [login] = await db().select().from(s.telegramLogins).where(and(eq(s.telegramLogins.tokenHash, h), isNull(s.telegramLogins.consumedAt), gt(s.telegramLogins.expiresAt, new Date()))).limit(1);
  if (!login) return NextResponse.json({ error: "Seans eskirgan. Qaytadan boshlang." }, { status: 400 });
  if (!login.phone) return NextResponse.json({ error: "Bot hali kod bermadi. Telegramda botni oching va ko'rsatmaga amal qiling.", waiting: true }, { status: 409 });
  const r = await verifyOtpAndSignIn(login.phone, b.data.code);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  await db().update(s.telegramLogins).set({ consumedAt: new Date() }).where(eq(s.telegramLogins.id, login.id));
  return NextResponse.json({ ok: true });
});
