import { NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db/client";
import { handle, sameOrigin, HttpError } from "@/lib/guard";
import { tokenHash } from "@/lib/telegram";

// GET and email preview scanners cannot approve a login. No session is issued here.
export const POST = handle(async req => {
  sameOrigin(req);
  const body = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).safeParse(await req.json().catch(() => null));
  if (!body.success) throw new HttpError(400, "Tasdiqlash havolasi noto'g'ri.");
  const rows = await db().update(s.authChallenges).set({ approvedAt: new Date() }).where(and(eq(s.authChallenges.approvalHash, tokenHash(body.data.token)), eq(s.authChallenges.method, "email"), isNull(s.authChallenges.consumedAt), gt(s.authChallenges.expiresAt, new Date()))).returning({ id: s.authChallenges.id });
  if (!rows.length) throw new HttpError(410, "Tasdiqlash muddati tugagan. Qaytadan boshlang.");
  return NextResponse.json({ ok: true, id: rows[0].id }, { headers: { "Cache-Control": "no-store" } });
});
