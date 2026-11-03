import { NextResponse } from "next/server";
import { handle, HttpError } from "@/lib/guard";
import { hit } from "@/lib/ratelimit";
import { clientIp } from "@/lib/client-ip";
import { getCurrentUser } from "@/lib/auth";
import { createServiceRequest } from "@/lib/service-requests";

/** «Joyingizni biz ijaraga beramiz» arizasi. Kirish shart emas; IP bo'yicha cheklov va honeypot spamdan himoya qiladi. */
export const POST = handle(async (req) => {
  if (!(await hit(`servicereq:${clientIp(req)}`, 5, 86400))) throw new HttpError(429, "Juda ko'p so'rov");
  const user = await getCurrentUser().catch(() => null);
  const id = await createServiceRequest(user?.id ?? null, await req.json().catch(() => null));
  return NextResponse.json({ ok: true, id }, { status: 201 });
});
