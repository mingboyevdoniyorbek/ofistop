import { NextResponse } from "next/server";
import { handle, sameOrigin } from "@/lib/guard";
import { z } from "zod";
import { normalizePhoneUz } from "@/lib/text";
import { verifyOtpAndSignIn } from "@/lib/otp-login";

export const POST = handle(async (req) => {
  sameOrigin(req);
  const body = z.object({ phone: z.string().max(30), code: z.string().regex(/^\d{6}$/) }).safeParse(await req.json().catch(() => null));
  const phone = body.success ? normalizePhoneUz(body.data.phone) : null;
  if (!body.success || !phone) return NextResponse.json({ error: "Telefon yoki kod noto'g'ri formatda" }, { status: 400 });
  const r = await verifyOtpAndSignIn(phone, body.data.code);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
});
