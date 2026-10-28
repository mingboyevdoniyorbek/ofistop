import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { schema as s } from "@/db/client";
import { HttpError, type Tx } from "./guard";
import { isGuestPhone } from "./launch-mode";

export type IdentityProof = {
  provider: "email" | "google" | "telegram";
  subject: string;
  email?: string;
  linkEmail?: boolean;
  phone?: string;
  name?: string;
};

export async function resolveIdentity(tx: Tx, proof: IdentityProof, guestId?: string) {
  const identities = [{ provider: proof.provider, subject: proof.subject }];
  if (proof.provider === "google" && proof.linkEmail && proof.email) identities.push({ provider: "email", subject: proof.email });
  // Serialize creation of the same identity, including Google/email races.
  const locks = identities.map(i => `${i.provider}:${i.subject}`);
  if (proof.phone) locks.push(`phone:${proof.phone}`);
  for (const key of locks.sort()) await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
  const ids = new Set<string>();
  for (const i of identities) {
    const [found] = await tx.select().from(s.authIdentities).where(and(eq(s.authIdentities.provider, i.provider), eq(s.authIdentities.subject, i.subject)));
    if (found) ids.add(found.userId);
  }
  if (ids.size > 1) throw new HttpError(409, "Hisoblar bir-biriga mos emas. Avval mavjud usul bilan kiring.");
  let userId = [...ids][0];
  if (!userId && proof.phone) {
    const [existing] = await tx.select().from(s.users).where(eq(s.users.phone, proof.phone));
    if (existing) userId = existing.id;
  }
  if (!userId) {
    const [user] = await tx.insert(s.users).values({ phone: proof.phone ?? `account:${randomUUID()}`, phoneVerifiedAt: proof.phone ? new Date() : null }).returning();
    userId = user.id;
  }
  const [user] = await tx.select().from(s.users).where(eq(s.users.id, userId)).for("update");
  if (!user || user.isBlocked) throw new HttpError(403, "Akkaunt bloklangan");
  if (proof.phone && user.phone === proof.phone) await tx.update(s.users).set({ phoneVerifiedAt: new Date() }).where(eq(s.users.id, userId));
  for (const i of identities) await tx.insert(s.authIdentities).values({ ...i, userId }).onConflictDoNothing();

  if (guestId && guestId !== userId) {
    const [guest] = await tx.select().from(s.users).where(eq(s.users.id, guestId)).for("update");
    if (guest && !guest.isBlocked && isGuestPhone(guest.phone)) {
      await tx.update(s.listings).set({ ownerId: userId }).where(eq(s.listings.ownerId, guestId));
      await tx.update(s.notifications).set({ userId }).where(eq(s.notifications.userId, guestId));
      const favorites = await tx.select().from(s.favorites).where(eq(s.favorites.userId, guestId));
      if (favorites.length) await tx.insert(s.favorites).values(favorites.map(f => ({ userId, listingId: f.listingId }))).onConflictDoNothing();
      await tx.delete(s.favorites).where(eq(s.favorites.userId, guestId));
      const [profile] = await tx.select().from(s.profiles).where(eq(s.profiles.userId, guestId));
      if (profile) await tx.insert(s.profiles).values({ ...profile, userId }).onConflictDoNothing();
      await tx.delete(s.sessions).where(eq(s.sessions.userId, guestId));
      await tx.update(s.users).set({ isBlocked: true }).where(eq(s.users.id, guestId));
      await tx.insert(s.auditLogs).values({ actorId: userId, action: "user.guest_claim", entityType: "user", entityId: userId, meta: { guestId } });
    }
  }
  await tx.insert(s.profiles).values({ userId, displayName: proof.name?.slice(0, 100) || "Foydalanuvchi" }).onConflictDoNothing();
  return userId;
}
