import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, HttpError, isUuid } from "@/lib/guard";
import { requireStaff } from "@/lib/staff";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { reviewCenter, deleteCenter } from "@/lib/center-review";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve_changes") }),
  z.object({ action: z.literal("reject_changes"), reason: z.string().trim().min(1).max(500) }),
  z.object({ action: z.literal("verify") }), z.object({ action: z.literal("unverify") }),
  z.object({ action: z.literal("feature"), days: z.coerce.number().int().min(1).max(366) }), z.object({ action: z.literal("unfeature") }),
  z.object({ action: z.literal("delete"), confirmName: z.string() }),
]);
/** Admin: vakil o'zgarishlarini tasdiqlash/rad etish, "Tasdiqlangan" belgisi, "Tavsiya etilgan" muddati. */
export const POST = handle(async (req, ctx) => {
  const actor = await requireStaff(req, true);
  const id = (await ctx.params).id;
  if (!isUuid(id)) throw new HttpError(404, "Markaz topilmadi");
  const b = body.safeParse(await req.json().catch(() => null));
  if (!b.success) throw new HttpError(400, "Noto'g'ri so'rov");
  if (b.data.action === "delete") {
    const [c] = await db().select({ name: s.businessCenters.name }).from(s.businessCenters).where(eq(s.businessCenters.id, id)).limit(1);
    if (!c) throw new HttpError(404, "Markaz topilmadi");
    if (b.data.confirmName.trim() !== c.name.trim()) throw new HttpError(422, "Tasdiqlash uchun markaz nomini aynan yozing");
    await deleteCenter(id, actor);
    return NextResponse.json({ ok: true });
  }
  await reviewCenter(id, actor, b.data);
  return NextResponse.json({ ok: true });
});
