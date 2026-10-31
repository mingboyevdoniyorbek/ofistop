import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, HttpError, isUuid } from "@/lib/guard";
import { requireStaff } from "@/lib/staff";
import { reviewCenter } from "@/lib/center-review";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve_changes") }),
  z.object({ action: z.literal("reject_changes"), reason: z.string().trim().min(1).max(500) }),
  z.object({ action: z.literal("verify") }), z.object({ action: z.literal("unverify") }),
  z.object({ action: z.literal("feature"), days: z.coerce.number().int().min(1).max(366) }), z.object({ action: z.literal("unfeature") }),
]);
/** Admin: vakil o'zgarishlarini tasdiqlash/rad etish, "Tasdiqlangan" belgisi, "Tavsiya etilgan" muddati. */
export const POST = handle(async (req, ctx) => {
  const actor = await requireStaff(req, true);
  const id = (await ctx.params).id;
  if (!isUuid(id)) throw new HttpError(404, "Markaz topilmadi");
  const b = body.safeParse(await req.json().catch(() => null));
  if (!b.success) throw new HttpError(400, "Noto'g'ri so'rov");
  await reviewCenter(id, actor, b.data);
  return NextResponse.json({ ok: true });
});
