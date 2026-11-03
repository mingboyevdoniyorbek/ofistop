import { NextResponse } from "next/server";
import { handle, requireUser, HttpError } from "@/lib/guard";
import { hit } from "@/lib/ratelimit";
import { createFirmApplication } from "@/lib/furniture";

/** Mebel firmasi arizasi ("Ofis mebellari" bo'limiga qo'shilish). Kirgan foydalanuvchi uchun. */
export const POST = handle(async (req) => {
  const user = await requireUser(req);
  if (!(await hit(`furnitureapp:${user.id}`, 5, 86400))) throw new HttpError(429, "Juda ko'p so'rov");
  const id = await createFirmApplication(user.id, await req.json().catch(() => null));
  return NextResponse.json({ ok: true, id }, { status: 201 });
});
