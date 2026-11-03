import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, HttpError } from "@/lib/guard";
import { requireStaff } from "@/lib/staff";
import { reviewFirm } from "@/lib/furniture";

const body = z.object({ action: z.enum(["approve", "reject", "remove", "feature", "unfeature"]), reason: z.string().trim().max(500).optional(), days: z.number().int().min(1).max(365).optional() });
export const POST = handle(async (req, ctx) => {
  const actor = await requireStaff(req, true);
  const b = body.safeParse(await req.json().catch(() => null));
  if (!b.success) throw new HttpError(400, "Noto'g'ri so'rov");
  await reviewFirm((await ctx.params).id, actor, b.data.action, b.data.reason, b.data.days);
  return NextResponse.json({ ok: true });
});
