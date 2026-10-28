import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { createSession, getCurrentUser, hashOtp, safeEqual } from "./auth";
import { hit } from "./ratelimit";
import { promoEnabled, isGuestPhone } from "./launch-mode";

export type OtpResult = { ok: true } | { ok: false; status: number; error: string };
/** Telefon + kodni tekshiradi, bir martalik iste'mol qiladi, foydalanuvchi va sessiya yaratadi. SMS va Telegram uchun umumiy. */
export async function verifyOtpAndSignIn(phone: string, code: string): Promise<OtpResult> {
  if (promoEnabled()) return { ok: false, status: 503, error: "Reklama davrida SMSsiz davom eting" };
  if (!(await hit(`verify:phone:${phone}`, 10, 600))) return { ok: false, status: 429, error: "Juda ko'p urinish. Keyinroq urinib ko'ring." };
  const current = await getCurrentUser();
  const result = await db().transaction(async d => {
  const [ch] = await d.select().from(s.otpChallenges)
    .where(and(eq(s.otpChallenges.phone, phone), isNull(s.otpChallenges.consumedAt), gt(s.otpChallenges.expiresAt, new Date())))
    .orderBy(desc(s.otpChallenges.createdAt)).limit(1).for("update");
  if (!ch || ch.attempts >= 5) return { ok: false, status: 400, error: "Kod muddati tugagan yoki urinishlar tugagan. Yangi kod so'rang." };
  await d.update(s.otpChallenges).set({ attempts: sql`${s.otpChallenges.attempts} + 1` }).where(eq(s.otpChallenges.id, ch.id));
  if (!safeEqual(ch.codeHash, hashOtp(phone, code))) return { ok: false, status: 400, error: "Kod noto'g'ri" };
  const used = await d.update(s.otpChallenges).set({ consumedAt: new Date() })
    .where(and(eq(s.otpChallenges.id, ch.id), isNull(s.otpChallenges.consumedAt))).returning({ id: s.otpChallenges.id });
  if (!used.length) return { ok: false, status: 400, error: "Kod allaqachon ishlatilgan" };
  const [user] = await d.insert(s.users).values({ phone, phoneVerifiedAt: new Date() })
    .onConflictDoUpdate({ target: s.users.phone, set: { phoneVerifiedAt: new Date() } }).returning();
  if (user.isBlocked) return { ok: false, status: 403, error: "Akkaunt bloklangan" };
  // When SMS is re-enabled, proof of the phone AND the guest session preserves
  // launch-period listings. Contact numbers alone are never used for claiming.
  if (current && isGuestPhone(current.phone) && current.id !== user.id) {
    const [guest] = await d.select().from(s.users).where(eq(s.users.id, current.id)).for("update");
    if (guest && !guest.isBlocked && isGuestPhone(guest.phone)) {
      await d.update(s.listings).set({ ownerId: user.id }).where(eq(s.listings.ownerId, guest.id));
      await d.update(s.notifications).set({ userId: user.id }).where(eq(s.notifications.userId, guest.id));
      const favorites = await d.select().from(s.favorites).where(eq(s.favorites.userId, guest.id));
      if (favorites.length) await d.insert(s.favorites).values(favorites.map(f => ({ userId: user.id, listingId: f.listingId }))).onConflictDoNothing();
      await d.delete(s.favorites).where(eq(s.favorites.userId, guest.id));
      const [profile] = await d.select().from(s.profiles).where(eq(s.profiles.userId, guest.id));
      if (profile) await d.insert(s.profiles).values({ ...profile, userId: user.id }).onConflictDoNothing();
      await d.delete(s.sessions).where(eq(s.sessions.userId, guest.id));
      await d.update(s.users).set({ isBlocked: true }).where(eq(s.users.id, guest.id));
      await d.insert(s.auditLogs).values({ actorId: user.id, action: "user.guest_claim", entityType: "user", entityId: user.id, meta: { guestId: guest.id } });
    }
  }
  await d.insert(s.profiles).values({ userId: user.id, displayName: "Foydalanuvchi" }).onConflictDoNothing();
  return { ok: true as const, userId: user.id };
  });
  if (!result.ok || !result.userId) return result as OtpResult;
  await createSession(result.userId);
  return { ok: true };
}
