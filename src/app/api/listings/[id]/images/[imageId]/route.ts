import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { handle, requireUser, loadEditable, isUuid, HttpError } from "@/lib/guard";
import { deleteObject } from "@/lib/storage";
import { listImages, remoderateIfApproved } from "@/lib/listing-images";

export const DELETE = handle(async (req, ctx) => {
  const user = await requireUser(req);
  const { id, imageId } = await ctx.params;
  let keys: string[] = [];
  const response = await db().transaction(async (locked) => {
  const l = await loadEditable(id, user, locked);
  if (l.availabilityStatus === "archived") throw new HttpError(409, "Arxivlangan e’londa rasmlarni o‘zgartirib bo‘lmaydi");
  if (!isUuid(imageId)) throw new HttpError(404, "Rasm topilmadi");
  const d = locked;
  const rows = await d.select().from(s.listingImages).where(eq(s.listingImages.listingId, l.id)).orderBy(asc(s.listingImages.position));
  const img = rows.find((r) => r.id === imageId);
  if (!img) throw new HttpError(404, "Rasm topilmadi");
  if (rows.length === 1 && (l.moderationStatus === "approved" || l.moderationStatus === "pending")) throw new HttpError(409, "Tekshiruvdagi yoki tasdiqlangan e'londa kamida 1 ta rasm qolishi kerak");
  let remod = false;
  await d.transaction(async (tx) => {
    await tx.delete(s.listingImages).where(and(eq(s.listingImages.id, imageId), eq(s.listingImages.listingId, l.id)));
    if (img.isPrimary) { const next = rows.find((r) => r.id !== imageId); if (next) await tx.update(s.listingImages).set({ isPrimary: true }).where(eq(s.listingImages.id, next.id)); }
    remod = await remoderateIfApproved(tx, l, user.id, "Muallif rasm o'chirdi");
  });
  keys = [img.storageKey, ...(img.thumbKey ? [img.thumbKey] : [])];
  const [current] = await locked.update(s.listings).set({updatedAt:new Date()}).where(eq(s.listings.id,l.id)).returning({updatedAt:s.listings.updatedAt});
  return NextResponse.json({ updatedAt: current.updatedAt.toISOString(), images: await listImages(l.id, locked), remoderation: remod });
  });
  await Promise.all(keys.map(deleteObject));
  return response;
});
