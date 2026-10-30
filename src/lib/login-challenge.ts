import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { createSession, getSessionUser, hashOtp, newOtp, safeEqual } from "./auth";
import { HttpError, type Tx } from "./guard";
import { tokenHash } from "./telegram";
import { hit } from "./ratelimit";
import { safeNext } from "./validation";
import { isGuestPhone } from "./launch-mode";
import { resolveIdentity, type IdentityProof } from "./identity-login";
import { clientIp } from "@/lib/client-ip";

export type Challenge = typeof s.authChallenges.$inferSelect;
export type LoginMethod = "email" | "telegram" | "telegram_code" | "google";
export const COOKIE_PREFIX = "oi_auth_";
export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export function appOrigin() {
  const value = process.env.APP_URL;
  if (!value) throw new HttpError(503, "APP_URL sozlanmagan");
  const url = new URL(value);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new HttpError(503, "APP_URL HTTPS bo'lishi kerak");
  return url.origin;
}
export async function loginLimit(req: Request, key: string) {
  const ip = clientIp(req);
  if (!await hit(`login:ip:${ip}`, 30, 3600) || !await hit(`login:target:${tokenHash(key)}`, 3, 600))
    throw new HttpError(429, "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring.");
}
export async function startChallenge(method: LoginMethod, identifier: string, next?: string, payload: Record<string, string> = {}) {
  const current = await getSessionUser();
  if (current?.blocked) throw new HttpError(403, "Akkaunt bloklangan");
  const browserToken = randomBytes(32).toString("base64url");
  const approvalToken = randomBytes(32).toString("base64url");
  const code = newOtp();
  const jar = await cookies();
  // Only the browser that started a flow can consume it; bot/email tokens cannot.
  const old = jar.get(COOKIE_PREFIX + method)?.value;
  if (old) await db().update(s.authChallenges).set({ consumedAt: new Date() }).where(and(eq(s.authChallenges.browserHash, tokenHash(old)), eq(s.authChallenges.method, method), isNull(s.authChallenges.consumedAt)));
  const [row] = await db().insert(s.authChallenges).values({ method, identifier, browserHash: tokenHash(browserToken), approvalHash: tokenHash(approvalToken), expiresAt: new Date(Date.now() + 10 * 60_000), next: safeNext(next ?? "/kabinet", appOrigin()), payload: { ...payload, ...(current && isGuestPhone(current.phone) ? { guestId: current.id } : {}) } }).returning();
  await db().update(s.authChallenges).set({ codeHash: hashOtp(row.id, code) }).where(eq(s.authChallenges.id, row.id));
  jar.set(COOKIE_PREFIX + method, browserToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return { row, approvalToken, code };
}
export const liveChallenge = (id: string) => and(eq(s.authChallenges.id, id), isNull(s.authChallenges.consumedAt), gt(s.authChallenges.expiresAt, new Date()));
export async function assertBrowser(row: Challenge) {
  const raw = (await cookies()).get(COOKIE_PREFIX + row.method)?.value;
  if (!raw || !safeEqual(tokenHash(raw), row.browserHash)) throw new HttpError(403, "Bu kirish so'rovi boshqa brauzerga tegishli.");
}
export async function invalidateChallenge(id: string) {
  await db().update(s.authChallenges).set({ consumedAt: new Date() }).where(eq(s.authChallenges.id, id));
}

async function finish(tx: Tx, row: Challenge, current: Awaited<ReturnType<typeof getSessionUser>>, proof?: IdentityProof) {
  if (current?.blocked) throw new HttpError(403, "Akkaunt bloklangan");
  const identity: IdentityProof = proof ?? (row.method === "email"
    ? { provider: "email", subject: row.identifier }
    : { provider: "telegram", subject: row.payload.telegramId, phone: row.identifier });
  if (!identity.subject) throw new HttpError(400, "Tasdiqlash ma'lumoti topilmadi");
  const guestId = current && isGuestPhone(current.phone) && current.id === row.payload.guestId ? current.id : undefined;
  const userId = await resolveIdentity(tx, identity, guestId);
  await tx.update(s.authChallenges).set({ consumedAt: new Date(), payload: { ...row.payload, completedUserId: userId } }).where(eq(s.authChallenges.id, row.id));
  await createSession(userId, false, tx);
  // Keep the short-lived browser proof so another tab can observe completion.
  // A completed challenge never issues a second session or accepts another code.
  return { ok: true, status: "complete", next: row.next };
}
export async function consumeChallenge(id: string, code?: string, googleProof?: IdentityProof) {
  const current = await getSessionUser();
  const result = await db().transaction(async tx => {
    const [row] = await tx.select().from(s.authChallenges).where(and(eq(s.authChallenges.id, id), gt(s.authChallenges.expiresAt, new Date()))).for("update");
    if (!row) throw new HttpError(410, "Tasdiqlash muddati tugagan. Qaytadan boshlang.");
    if (row.method === "email") throw new HttpError(410, "Email orqali kirish olib tashlangan. Google yoki Telegram orqali kiring.");
    if (row.consumedAt) {
      if (code !== undefined || googleProof || !current || current.blocked || current.id !== row.payload.completedUserId) throw new HttpError(410, "Tasdiqlash muddati tugagan. Qaytadan boshlang.");
      await assertBrowser(row);
      return { ok: true, status: "complete", next: row.next };
    }
    await assertBrowser(row);
    if (row.method === "google" && !googleProof) throw new HttpError(400, "Google orqali tasdiqlang");
    if (code !== undefined) {
      if (row.method !== "email" && row.method !== "telegram_code") throw new HttpError(400, "Bu usul kod bilan tasdiqlanmaydi");
      if (row.attempts >= 5) throw new HttpError(429, "Urinishlar tugadi. Yangi kod so'rang.");
      await tx.update(s.authChallenges).set({ attempts: sql`${s.authChallenges.attempts} + 1` }).where(eq(s.authChallenges.id, id));
      if (!row.codeHash || !safeEqual(row.codeHash, hashOtp(id, code))) return { error: "Kod noto'g'ri", httpStatus: 400 };
    } else if (!row.approvedAt && !googleProof) return { ok: true, status: "waiting" };
    return finish(tx, row, current, googleProof);
  });
  // Wrong attempts must commit even when returning an error.
  if ("error" in result && result.error) throw new HttpError(result.httpStatus ?? 400, result.error);
  return result;
}
