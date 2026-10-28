import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { handle, HttpError, isUuid } from "@/lib/guard";
import { requireStaff, writeAudit, notify } from "@/lib/staff";
import { normalizePhoneUz } from "@/lib/text";

// Vakil biriktirishni FAQAT admin qiladi: begona odam o'zini markaz vakili deb e'lon qila olmaydi.
export const POST = handle(async (req, ctx) => {
  const actor = await requireStaff(req, true);
  const centerId = (await ctx.params).id;
  const b = z.object({ action: z.enum(["add", "remove"]), phone: z.string().max(30).optional(), userId: z.string().optional() }).safeParse(await req.json().catch(() => null));
  if (!isUuid(centerId) || !b.success) throw new HttpError(400, "So'rov noto'g'ri");
  const d = db();
  const [c] = await d.select().from(s.businessCenters).where(eq(s.businessCenters.id, centerId)).limit(1);
  if (!c) throw new HttpError(404, "Biznes markaz topilmadi");
  let userId = b.data.userId;
  if (!userId) {
    const phone = b.data.phone ? normalizePhoneUz(b.data.phone) : null;
    if (!phone) throw new HttpError(422, "Telefon +998 XX XXX XX XX formatida bo'lsin");
    const [u] = await d.select().from(s.users).where(eq(s.users.phone, phone)).limit(1);
    if (!u) throw new HttpError(404, "Bu raqam bilan foydalanuvchi ro'yxatdan o'tmagan. Avval u tizimga kirishi kerak.");
    userId = u.id;
  }
  if (!isUuid(userId)) throw new HttpError(400, "So'rov noto'g'ri");
  await d.transaction(async (tx) => {
    if (b.data.action === "add") {
      await tx.insert(s.businessCenterMemberships).values({ centerId, userId: userId!, createdBy: actor.id }).onConflictDoNothing();
      await notify(userId!, `Siz "${c.name}" biznes markaziga vakil qilib biriktirildingiz`, null, "/kabinet", tx);
    } else {
      await tx.delete(s.businessCenterMemberships).where(and(eq(s.businessCenterMemberships.centerId, centerId), eq(s.businessCenterMemberships.userId, userId!)));
    }
    await writeAudit({ actorId: actor.id, action: `center.member_${b.data.action}`, entityType: "business_center", entityId: centerId, meta: { userId } }, tx);
  });
  return NextResponse.json({ ok: true });
});
