import { NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { appOrigin, assertBrowser, consumeChallenge, invalidateChallenge } from "@/lib/login-challenge";
import { googleEnabled, exchangeGoogleCode } from "@/lib/google-login";
import { tokenHash } from "@/lib/telegram";

export async function GET(req: Request) {
  const failure = () => NextResponse.redirect(new URL("/kirish?error=google", appOrigin()));
  try {
    if (!googleEnabled()) return failure();
    const params = new URL(req.url).searchParams;
    const state = params.get("state") ?? "", code = params.get("code");
    if (!/^[A-Za-z0-9_-]{43}$/.test(state)) return failure();
    const [row] = await db().select().from(s.authChallenges).where(and(eq(s.authChallenges.method, "google"), eq(s.authChallenges.approvalHash, tokenHash(state)), isNull(s.authChallenges.consumedAt), gt(s.authChallenges.expiresAt, new Date())));
    if (!row) return failure();
    await assertBrowser(row);
    if (params.has("error") || !code || code.length > 4096) { await invalidateChallenge(row.id); return failure(); }
    const proof = await exchangeGoogleCode(code, row.payload.verifier, row.payload.nonce);
    const result = await consumeChallenge(row.id, undefined, proof);
    return NextResponse.redirect(new URL("next" in result ? result.next : "/kabinet", appOrigin()));
  } catch {
    // Never log OAuth codes, tokens or provider payloads.
    return failure();
  }
}
