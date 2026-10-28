import { createRemoteJWKSet, jwtVerify } from "jose";
import { appOrigin, normalizeEmail } from "./login-challenge";
import { HttpError } from "./guard";
import type { IdentityProof } from "./identity-login";

export const googleEnabled = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.APP_URL);
export const googleCallback = () => `${appOrigin()}/api/auth/google/callback`;
const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export async function exchangeGoogleCode(code: string, verifier: string, nonce: string): Promise<IdentityProof> {
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: googleCallback(), code_verifier: verifier }), signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new HttpError(400, "Google orqali kirish tasdiqlanmadi.");
  const data = await res.json();
  if (typeof data.id_token !== "string") throw new HttpError(400, "Google orqali kirish tasdiqlanmadi.");
  const { payload } = await jwtVerify(data.id_token, googleKeys, { issuer: ["https://accounts.google.com", "accounts.google.com"], audience: process.env.GOOGLE_CLIENT_ID!, algorithms: ["RS256"], requiredClaims: ["exp", "iat", "sub", "nonce"] });
  if (payload.nonce !== nonce || payload.email_verified !== true || typeof payload.email !== "string" || !payload.sub) throw new HttpError(400, "Google email manzili tasdiqlanmagan.");
  const email = normalizeEmail(payload.email);
  // Google is authoritative for Gmail/Workspace, not arbitrary third-party email.
  const linkEmail = /@(gmail\.com|googlemail\.com)$/.test(email) || (typeof payload.hd === "string" && payload.hd.length > 0);
  return { provider: "google", subject: payload.sub, email, linkEmail, name: typeof payload.name === "string" ? payload.name : undefined };
}
