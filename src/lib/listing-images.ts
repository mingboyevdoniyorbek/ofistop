import { and, asc, eq, isNull, like } from "drizzle-orm";
import sharp from "sharp";
import { db, schema as s } from "@/db/client";
import { getObject, mediaUrl, putObject } from "./storage";
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

/**
 * Eski rasmlar uchun o'rta (~800px) nusxani yaratadi: 1600px asosiy rasmdan (belgisi bilan) kichraytiriladi.
 * Kunlik cron oz-ozdan chaqiradi (vaqt chegarasi bilan); `npm run images:medium` hammasini birdan to'ldiradi.
 */
export async function backfillMediumImages(limit = 100, budgetMs = 40_000) {
  const started = Date.now();
  const rows = await db().select({ id: s.listingImages.id, key: s.listingImages.storageKey }).from(s.listingImages)
    .where(and(isNull(s.listingImages.mediumKey), eq(s.listingImages.isPlaceholder, false), like(s.listingImages.storageKey, "img/%"))).limit(limit);
  let done = 0;
  for (const r of rows) {
    if (Date.now() - started > budgetMs) break;
    const m = /^img\/([0-9a-f-]{36})\.webp$/.exec(r.key); if (!m) continue;
    try {
      const src = await getObject(r.key); if (!src) continue;
      const md = await sharp(src).resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true }).webp({ quality: 76, effort: 4 }).toBuffer();
      const mediumKey = `img/${m[1]}.md.webp`;
      await putObject(mediumKey, md);
      await db().update(s.listingImages).set({ mediumKey }).where(eq(s.listingImages.id, r.id));
      done++;
    } catch (e) { console.error("[images:medium]", r.key, (e as Error).message); }
  }
  return done;
}
