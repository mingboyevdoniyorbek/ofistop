import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { deleteObject } from "./storage";

/** Qoralama oxirgi tahrirdan keyin shuncha soat o'tgach avtomatik o'chiriladi (24 soat). */
export const DRAFT_TTL_HOURS = 24;

/**
 * Qoralamalarni rasmlari bilan birga o'chiradi. Faqat hech qachon chop etilmagan qoralamalar
 * (moderation_status = draft, published_at yo'q) — boshqa holatdagi e'longa tegmaydi.
 */
async function removeDrafts(where: ReturnType<typeof and>) {
  return removeListings(and(eq(s.listings.moderationStatus, "draft"), isNull(s.listings.publishedAt), where));
}

/** E'lonlarni (rasmlar fayllari bilan) butunlay o'chiradi; bog'liq yozuvlar cascade bilan o'chadi. */
async function removeListings(where: ReturnType<typeof and>) {
  const L = s.listings;
  const keys: string[] = [];
  const ids = await db().transaction(async (tx) => {
    const rows = await tx.select({ id: L.id }).from(L).where(where).for("update");
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    for (const im of await tx.select({ k: s.listingImages.storageKey, t: s.listingImages.thumbKey, m: s.listingImages.mediumKey }).from(s.listingImages).where(inArray(s.listingImages.listingId, ids)))
      keys.push(im.k, ...(im.t ? [im.t] : []), ...(im.m ? [im.m] : []));
    await tx.delete(L).where(inArray(L.id, ids)); // rasmlar, sevimlilar va boshqa bog'liq yozuvlar cascade bilan o'chadi
    return ids;
  });
  // Fayllar tranzaksiyadan keyin o'chiriladi; xato bo'lsa `npm run cleanup` bog'lanmagan fayllarni keyin tozalaydi.
  await Promise.allSettled(keys.map((k) => deleteObject(k)));
  return ids.length;
}

/** Foydalanuvchining bitta qoralamasini o'chirish (egasi yoki admin). */
export const deleteDraft = (id: string, ownerId: string | null) =>
  removeDrafts(and(eq(s.listings.id, id), ownerId ? eq(s.listings.ownerId, ownerId) : undefined));

/** Muddati o'tgan qoralamalar (ixtiyoriy: faqat bitta foydalanuvchiniki). */
export const purgeStaleDrafts = (ownerId?: string) =>
  removeDrafts(and(lt(s.listings.updatedAt, sql`now() - make_interval(hours => ${DRAFT_TTL_HOURS})`), ownerId ? eq(s.listings.ownerId, ownerId) : undefined));

/** Arxivdagi e'lonni butunlay o'chirish (egasi yoki admin). Faqat arxivlangan e'lon — faol e'longa tegmaydi. */
export const deleteArchived = (id: string, ownerId: string | null) =>
  removeListings(and(eq(s.listings.id, id), eq(s.listings.availabilityStatus, "archived"), ownerId ? eq(s.listings.ownerId, ownerId) : undefined));

/** Rad etilgan e'lon shuncha soatdan keyin (tuzatib qayta yuborilmasa) rasmlari bilan o'chiriladi. */
export const REJECTED_TTL_HOURS = 24;
/** Rad etilganiga 24 soat bo'lgan e'lonlar (ixtiyoriy: faqat bitta foydalanuvchiniki). */
export const purgeRejected = (ownerId?: string) =>
  removeListings(and(eq(s.listings.moderationStatus, "rejected"), lt(s.listings.updatedAt, sql`now() - make_interval(hours => ${REJECTED_TTL_HOURS})`), ownerId ? eq(s.listings.ownerId, ownerId) : undefined));
