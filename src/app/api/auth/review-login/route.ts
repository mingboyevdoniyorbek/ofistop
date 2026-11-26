import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db/client";
import { createSession } from "@/lib/auth";
import { handle, sameOrigin, HttpError } from "@/lib/guard";
import { clientIp } from "@/lib/client-ip";
import { hit } from "@/lib/ratelimit";
import { reviewAccountKey, reviewCredentialsMatch, reviewLoginEnabled } from "@/lib/review-login";

/** Google Play tekshiruvchisi uchun login/parol bilan kirish. O'zgaruvchilar qo'yilmasa — 404. */
export const POST = handle(async (req) => {
  if (!reviewLoginEnabled()) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  sameOrigin(req);
  const b = z.object({ email: z.string().max(200), password: z.string().max(200) }).safeParse(await req.json().catch(() => null));
  if (!b.success) throw new HttpError(400, "So'rov noto'g'ri");
  if (!(await hit(`review-login:${clientIp(req)}`, 10, 3600))) throw new HttpError(429, "Juda ko'p urinish. Keyinroq urinib ko'ring.");
  if (!reviewCredentialsMatch(b.data.email, b.data.password)) throw new HttpError(401, "Email yoki parol noto'g'ri");

  const key = reviewAccountKey();
  const user = await db().transaction(async (tx) => {
    const [found] = await tx.select().from(s.users).where(eq(s.users.phone, key)).limit(1);
    if (found) return found;
    const [created] = await tx.insert(s.users).values({ phone: key }).returning();
    await tx.insert(s.profiles).values({ userId: created.id, displayName: "Google Play tekshiruvchisi" }).onConflictDoNothing();
    return created;
  });
  if (user.isBlocked) throw new HttpError(403, "Akkaunt bloklangan");
  if (user.role !== "user") throw new HttpError(403, "Akkaunt bloklangan"); // xizmat huquqi bu yo'l bilan berilmaydi
  await createSession(user.id);
  return NextResponse.json({ ok: true, next: "/kabinet" });
});
