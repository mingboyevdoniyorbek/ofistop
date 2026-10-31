import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, HttpError } from "@/lib/guard";
import { requireStaff } from "@/lib/staff";
import { approveApplication, rejectApplication } from "@/lib/center-applications";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), verify: z.boolean().optional().default(true) }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().min(1).max(500) }),
]);
export const POST = handle(async (req, ctx) => {
  const actor = await requireStaff(req, true);
  const b = body.safeParse(await req.json().catch(() => null));
  if (!b.success) throw new HttpError(400, "Noto'g'ri so'rov");
  const id = (await ctx.params).id;
  if (b.data.action === "approve") return NextResponse.json({ ok: true, ...(await approveApplication(id, actor, b.data.verify)) });
  await rejectApplication(id, actor, b.data.reason);
  return NextResponse.json({ ok: true });
});
