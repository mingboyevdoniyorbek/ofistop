import { NextResponse } from "next/server";
import { handle, requireUser } from "@/lib/guard";
import { deleteOwnFirm, updateFirm } from "@/lib/furniture";

/** Firma egasi: ma'lumotlarni tahrirlash va firmani o'chirish. */
export const PATCH = handle(async (req, ctx) => {
  const user = await requireUser(req);
  await updateFirm((await ctx.params).id, user.id, await req.json().catch(() => null));
  return NextResponse.json({ ok: true });
});
export const DELETE = handle(async (req, ctx) => {
  const user = await requireUser(req);
  await deleteOwnFirm((await ctx.params).id, user.id);
  return NextResponse.json({ ok: true });
});
