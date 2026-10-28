import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, sameOrigin, HttpError } from "@/lib/guard";
import { appOrigin, startChallenge, invalidateChallenge, loginLimit, normalizeEmail } from "@/lib/login-challenge";
import { emailEnabled, sendLoginEmail } from "@/lib/email-login";
import { getLocale } from "@/lib/i18n";

export const POST = handle(async req => {
  sameOrigin(req);
  if (!emailEnabled()) throw new HttpError(503, "Email orqali kirish hali sozlanmagan.");
  const body = z.object({ email: z.string().trim().email().max(254), next: z.string().max(2048).optional() }).safeParse(await req.json().catch(() => null));
  if (!body.success) throw new HttpError(400, "Email manzilini to'g'ri kiriting.");
  const email = normalizeEmail(body.data.email);
  await loginLimit(req, `email:${email}`);
  const { row, approvalToken, code } = await startChallenge("email", email, body.data.next);
  const url = `${appOrigin()}/kirish/tasdiqlash#token=${approvalToken}`;
  try { await sendLoginEmail(email, code, url, row.id, await getLocale()); }
  catch (e) { await invalidateChallenge(row.id); throw e; }
  return NextResponse.json({ ok: true, id: row.id, expiresAt: row.expiresAt }, { headers: { "Cache-Control": "no-store" } });
});
