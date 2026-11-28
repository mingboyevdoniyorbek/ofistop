import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, HttpError } from "@/lib/guard";
import { requireStaff } from "@/lib/staff";
import { reviewMemberRequest } from "@/lib/center-team";

/** Admin: vakil yuborgan «yordamchi qo'shish» so'rovini tasdiqlash yoki rad etish. */
export const POST = handle(async (req, ctx) => {
  const actor = await requireStaff(req, true);
  const b = z.object({ action: z.enum(["approve", "reject"]) }).safeParse(await req.json().catch(() => null));
  if (!b.success) throw new HttpError(400, "So'rov noto'g'ri");
  await reviewMemberRequest((await ctx.params).id, actor, b.data.action === "approve");
  return NextResponse.json({ ok: true });
});
