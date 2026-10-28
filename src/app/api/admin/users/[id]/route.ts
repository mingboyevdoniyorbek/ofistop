import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { handle, HttpError, isUuid } from "@/lib/guard";
import { requireStaff, writeAudit } from "@/lib/staff";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("role"), role: z.enum(["user", "moderator", "admin"]) }),
  z.object({ action: z.enum(["block", "unblock", "verify", "unverify"]) }),
]);
export const POST = handle(async (req, ctx) => {
  const actor = await requireStaff(req, true);
  const id = (await ctx.params).id;
  const b = body.safeParse(await req.json().catch(() => null));
  if (!isUuid(id) || !b.success) throw new HttpError(400, "So'rov noto'g'ri");
  if (id === actor.id && b.data.action !== "verify" && b.data.action !== "unverify") throw new HttpError(409, "O'z huquqingizni yoki holatingizni o'zgartira olmaysiz");
  const d = db();
  const [u] = await d.select().from(s.users).where(eq(s.users.id, id)).limit(1);
  if (!u) throw new HttpError(404, "Foydalanuvchi topilmadi");
  await d.transaction(async (tx) => {
    const a = b.data;
    if (a.action === "role") {
      await tx.update(s.users).set({ role: a.role }).where(eq(s.users.id, id));
      await writeAudit({ actorId: actor.id, action: "user.role", entityType: "user", entityId: id, meta: { from: u.role, to: a.role } }, tx);
    } else if (a.action === "block" || a.action === "unblock") {
      await tx.update(s.users).set({ isBlocked: a.action === "block" }).where(eq(s.users.id, id));
      if (a.action === "block") await tx.delete(s.sessions).where(eq(s.sessions.userId, id)); // faol sessiyalar tugatiladi
      await writeAudit({ actorId: actor.id, action: `user.${a.action}`, entityType: "user", entityId: id }, tx);
    } else {
      // "Xodim tekshirgan" belgisi — telefon tasdig'idan alohida, faqat admin qo'yadi
      await tx.update(s.profiles).set({ verifiedByStaffAt: a.action === "verify" ? new Date() : null }).where(eq(s.profiles.userId, id));
      await writeAudit({ actorId: actor.id, action: `user.${a.action}`, entityType: "user", entityId: id }, tx);
    }
  });
  return NextResponse.json({ ok: true });
});
