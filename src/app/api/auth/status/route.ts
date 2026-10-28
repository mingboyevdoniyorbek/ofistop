import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, sameOrigin, HttpError } from "@/lib/guard";
import { consumeChallenge } from "@/lib/login-challenge";
export const POST = handle(async req => {
  sameOrigin(req);
  const b = z.object({ id: z.string().uuid(), code: z.string().regex(/^\d{6}$/).optional() }).safeParse(await req.json().catch(() => null));
  if (!b.success) throw new HttpError(400, "Kod 6 ta raqamdan iborat bo'lishi kerak");
  return NextResponse.json(await consumeChallenge(b.data.id, b.data.code), { headers: { "Cache-Control": "no-store" } });
});
