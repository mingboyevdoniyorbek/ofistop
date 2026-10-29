import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { HttpError } from "@/lib/guard";
import { handleLogin } from "@/lib/login-errors";
import { googleEnabled, googleCallback } from "@/lib/google-login";
import { startChallenge, loginLimit } from "@/lib/login-challenge";

const start = handleLogin("google-start", async req => {
  if (!googleEnabled()) throw new HttpError(503, "Google orqali kirish hali sozlanmagan.");
  await loginLimit(req, `google:${(req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0]}`);
  const verifier = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const { approvalToken } = await startChallenge("google", "", new URL(req.url).searchParams.get("next") ?? "/kabinet", { verifier, nonce });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: googleCallback(), response_type: "code", scope: "openid email profile", prompt: "select_account", state: approvalToken, nonce, code_challenge_method: "S256", code_challenge: createHash("sha256").update(verifier).digest("base64url") }).toString();
  if (req.headers.get("accept")?.includes("application/json")) {
    return NextResponse.json({ url: url.href }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.redirect(url);
});

export async function GET(req: Request, ctx: Parameters<typeof start>[1]) {
  const response = await start(req, ctx);
  if (!response.ok && response.status >= 400 && !req.headers.get("accept")?.includes("application/json")) {
    // Direct navigation should also return to the login UI, never a raw JSON page.
    return NextResponse.redirect(new URL("/kirish?error=google", req.url));
  }
  return response;
}
