import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { adminPasswordHash } from "./admin-password";
import type { Tx } from "./guard";

const COOKIE = "oi_session";
const SESSION_DAYS = 30;
const secret = () => {
  const v = process.env.SESSION_SECRET;
  if (!v || v.length < 32) throw new Error("SESSION_SECRET kamida 32 belgi bo'lishi shart");
  return v;
};
const sha = (x: string) => createHash("sha256").update(x).digest("hex");
export const hashOtp = (phone: string, code: string) => sha(`${secret()}|${phone}|${code}`);
export const newOtp = () => String(randomInt(0, 1_000_000)).padStart(6, "0");
export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const sessionHash = (token: string, admin: boolean) => sha(admin ? `admin|${adminPasswordHash()}|${token}` : token);
export async function createSession(userId: string, admin = false, tx?: Tx) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (admin ? 8 * 3600_000 : SESSION_DAYS * 864e5));
  await (tx ?? db()).insert(s.sessions).values({ userId, tokenHash: sessionHash(token, admin), expiresAt });
  (await cookies()).set(admin ? "oi_admin_session" : COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt,
  });
}

export async function getSessionUser(admin = false) {
  const token = (await cookies()).get(admin ? "oi_admin_session" : COOKIE)?.value;
  if (!token) return null;
  const rows = await db().select({ id: s.users.id, phone: s.users.phone, role: s.users.role, blocked: s.users.isBlocked })
    .from(s.sessions).innerJoin(s.users, eq(s.users.id, s.sessions.userId))
    .where(and(eq(s.sessions.tokenHash, sessionHash(token, admin)), gt(s.sessions.expiresAt, new Date()))).limit(1);
  return rows[0] ?? null;
}

export async function getCurrentUser(): Promise<Awaited<ReturnType<typeof getSessionUser>>> {
  const u = await getSessionUser();
  // Public OTP/demo sessions never carry staff privileges. Admin uses its own cookie.
  return u && !u.blocked ? { ...u, role: "user" as const } : null;
}

export async function getAdminUser() {
  const u = await getSessionUser(true);
  return u && !u.blocked && (u.role === "admin" || u.role === "moderator") ? u : null;
}

export async function destroySession(admin = false) {
  const c = await cookies();
  const name = admin ? "oi_admin_session" : COOKIE;
  const token = c.get(name)?.value;
  if (token) await db().delete(s.sessions).where(eq(s.sessions.tokenHash, sessionHash(token, admin)));
  c.delete(name);
}
