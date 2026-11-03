import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, HttpError } from "@/lib/guard";
import { requireStaff } from "@/lib/staff";
import { updateServiceRequest } from "@/lib/service-requests";

const body = z.object({ status: z.enum(["new", "in_progress", "done", "rejected"]), reason: z.string().trim().max(1000).optional() });
export const POST = handle(async (req, ctx) => {
  const actor = await requireStaff(req, true);
  const b = body.safeParse(await req.json().catch(() => null));
  if (!b.success) throw new HttpError(400, "Noto'g'ri so'rov");
  await updateServiceRequest((await ctx.params).id, actor, b.data.status, b.data.reason);
  return NextResponse.json({ ok: true });
});
