import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, requireUser, HttpError } from "@/lib/guard";
import { hit } from "@/lib/ratelimit";
import { removeMember, requestMember } from "@/lib/center-team";

/** Markaz vakili: jamoaga yordamchi qo'shishni so'rash (admin tasdiqlaydi) yoki so'rovni bekor qilish / yordamchini chiqarish. */
export const POST = handle(async (req, ctx) => {
  const user = await requireUser(req);
  const id = (await ctx.params).id;
  const b = z.object({ action: z.enum(["add", "remove"]), contact: z.string().max(200).optional(), requestId: z.string().optional(), userId: z.string().optional() }).safeParse(await req.json().catch(() => null));
  if (!b.success) throw new HttpError(400, "So'rov noto'g'ri");
  if (b.data.action === "add") {
    if (!(await hit(`centerteam:${user.id}`, 20, 86400))) throw new HttpError(429, "Juda ko'p so'rov");
    if (!b.data.contact?.trim()) throw new HttpError(400, "So'rov noto'g'ri");
    const rid = await requestMember(id, user.id, b.data.contact);
    return NextResponse.json({ ok: true, id: rid }, { status: 201 });
  }
  await removeMember(id, user.id, { requestId: b.data.requestId, userId: b.data.userId });
  return NextResponse.json({ ok: true });
});
