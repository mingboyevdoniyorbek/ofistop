// Moderatsiya amallari. Egasi tomoni (submit/edit) hozir ishlatiladi; moderator tomoni (approve/reject) 4-bosqichda admin panelga ulanadi.
import { count, eq } from "drizzle-orm";
import { submitErrors, toForm } from "./listing-input";
import { db, schema as s } from "@/db/client";
import { moderationTransition, type Moderation, type Role, canModerate } from "./status";

type Tx = Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0];
export async function recordModeration(tx: Tx, p: { listingId: string; actorId: string | null; from: Moderation | null; to: Moderation; reason?: string | null }) {
  await tx.insert(s.moderationEvents).values({ listingId: p.listingId, actorId: p.actorId, fromStatus: p.from, toStatus: p.to, reason: p.reason ?? null });
}

export async function moderate(listingId: string, actor: { id: string; role: Role }, action: "approve" | "reject", reason: string | undefined, ttlDays: number, expectedUpdatedAt?: string) {
  if (!canModerate(actor.role)) return { ok: false as const, error: "Ruxsat yo'q" };
  return db().transaction(async (tx) => {
    const [l] = await tx.select().from(s.listings).where(eq(s.listings.id, listingId)).for("update");
    if (!l) return { ok: false as const, error: "E'lon topilmadi" };
    if (l.isSuspended || l.availabilityStatus === "archived") return { ok: false as const, error: "Bloklangan yoki arxivlangan e’lon tasdiqlanmaydi" };
    if (expectedUpdatedAt && l.updatedAt.toISOString() !== expectedUpdatedAt) return { ok: false as const, error: "E’lon o‘zgargan. Sahifani yangilab qayta tekshiring." };
    if (action === "approve") {
      const [owner] = await tx.select().from(s.users).where(eq(s.users.id, l.ownerId));
      if (!owner || owner.isBlocked) return { ok: false as const, error: "E’lon egasi bloklangan" };
      const [{ n }] = await tx.select({ n: count() }).from(s.listingImages).where(eq(s.listingImages.listingId, l.id));
      const errors = submitErrors(toForm(l), n);
      if (Object.keys(errors).length) return { ok: false as const, error: Object.values(errors).join("; ") };
    }
    const t = moderationTransition(action, l.moderationStatus, "moderator", reason);
    if (!t.ok) return t;
    const now = new Date();
    await tx.update(s.listings).set(action === "approve"
      ? { moderationStatus: t.to, rejectionReason: null, publishedAt: l.publishedAt ?? now, expiresAt: new Date(now.getTime() + ttlDays * 864e5), availabilityConfirmedAt: l.availabilityConfirmedAt ?? now, updatedAt: now }
      : { moderationStatus: t.to, rejectionReason: reason!.trim(), updatedAt: now }).where(eq(s.listings.id, listingId));
    await recordModeration(tx, { listingId, actorId: actor.id, from: l.moderationStatus, to: t.to, reason });
    await tx.insert(s.auditLogs).values({ actorId: actor.id, action: `listing.${action}`, entityType: "listing", entityId: listingId, meta: reason ? { reason } : null });
    return { ok: true as const, to: t.to };
  });
}
