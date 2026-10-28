import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { handle, HttpError } from "@/lib/guard";
import { googleEnabled, googleCallback } from "@/lib/google-login";
import { startChallenge, loginLimit } from "@/lib/login-challenge";

export const GET = handle(async req => {
  if (!googleEnabled()) throw new HttpError(503, "Google orqali kirish hali sozlanmagan.");
  await loginLimit(req, `google:${(req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0]}`);
  const verifier = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const { approvalToken } = await startChallenge("google", "", new URL(req.url).searchParams.get("next") ?? "/kabinet", { verifier, nonce });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: googleCallback(), response_type: "code", scope: "openid email profile", prompt: "select_account", state: approvalToken, nonce, code_challenge_method: "S256", code_challenge: createHash("sha256").update(verifier).digest("base64url") }).toString();
  return NextResponse.redirect(url);
});
