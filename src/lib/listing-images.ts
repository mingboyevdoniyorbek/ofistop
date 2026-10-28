import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { mediaUrl } from "./storage";
import { moderationTransition } from "./status";
import { recordModeration } from "./moderation";
import { HttpError } from "./guard";

export async function listImages(listingId: string, tx?: Tx) {
  const rows = await (tx ?? db()).select().from(s.listingImages).where(eq(s.listingImages.listingId, listingId)).orderBy(asc(s.listingImages.position));
  return rows.map((r) => ({ id: r.id, url: mediaUrl(r.storageKey), thumbUrl: mediaUrl(r.thumbKey ?? r.storageKey), isPrimary: r.isPrimary, isPlaceholder: r.isPlaceholder }));
}

type Tx = Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0];
/** Tasdiqlangan e'londa muhim o'zgarish bo'lsa: pending'ga qaytaradi. Qaytaradi: qayta moderatsiya bo'ldimi. */
export async function remoderateIfApproved(tx: Tx, l: { id: string; moderationStatus: "draft" | "pending" | "approved" | "rejected" }, actorId: string, reason: string) {
  if (l.moderationStatus !== "approved") return false;
  const t = moderationTransition("edit", "approved", "owner");
  if (!t.ok) throw new HttpError(409, t.error);
  await tx.update(s.listings).set({ moderationStatus: t.to, updatedAt: new Date() }).where(eq(s.listings.id, l.id));
  await recordModeration(tx, { listingId: l.id, actorId, from: "approved", to: t.to, reason });
  return true;
}
