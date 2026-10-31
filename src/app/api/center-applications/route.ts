import { NextResponse } from "next/server";
import { handle, requireUser, HttpError } from "@/lib/guard";
import { hit } from "@/lib/ratelimit";
import { createApplication } from "@/lib/center-applications";

/** Biznes markaz arizasi (yangi markaz yoki mavjud markaz boshqaruvini so'rash). Kirgan foydalanuvchi uchun. */
export const POST = handle(async (req) => {
  const user = await requireUser(req);
  if (!(await hit(`centerapp:${user.id}`, 5, 86400))) throw new HttpError(429, "Juda ko'p so'rov");
  const id = await createApplication(user.id, await req.json().catch(() => null));
  return NextResponse.json({ ok: true, id }, { status: 201 });
});
