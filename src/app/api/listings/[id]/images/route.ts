import { NextResponse } from "next/server";
import { count, eq, max } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db/client";
import { handle, requireUser, loadEditable, HttpError } from "@/lib/guard";
import { ImageError, StorageError, MAX_IMAGES, MAX_UPLOAD_BYTES, MAX_IMAGE_BYTES, storeImage, deleteObject } from "@/lib/storage";
import { listImages, remoderateIfApproved } from "@/lib/listing-images";
import { hit } from "@/lib/ratelimit";

export const POST = handle(async (req, ctx) => {
  const user = await requireUser(req);
  if (!(await hit(`img:${user.id}`, 60, 3600))) throw new HttpError(429, "Juda ko'p yuklash. Keyinroq urinib ko'ring.");
  const stored: Awaited<ReturnType<typeof storeImage>>[] = [];
  try { return await db().transaction(async (locked) => {
  const l = await loadEditable((await ctx.params).id, user, locked);
  if (l.availabilityStatus === "archived") throw new HttpError(409, "Arxivlangan e’londa rasmlarni o‘zgartirib bo‘lmaydi");
  if (Number(req.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES) throw new HttpError(413, "So'rov hajmi juda katta");
  const form = await req.formData().catch(() => null);
  const files = (form?.getAll("files") ?? []).filter((f): f is File => typeof f !== "string");
  if (files.reduce((n, f) => n + f.size, 0) > MAX_UPLOAD_BYTES) throw new HttpError(413, "So‘rov hajmi juda katta");
  if (!files.length) throw new HttpError(400, "Fayl tanlanmagan");
  if (files.length > 10) throw new HttpError(400, "Bir vaqtda ko'pi bilan 10 ta rasm yuklash mumkin");
  const d = locked;
  const [{ n }] = await d.select({ n: count() }).from(s.listingImages).where(eq(s.listingImages.listingId, l.id));
  if (n + files.length > MAX_IMAGES) throw new HttpError(400, `Ko'pi bilan ${MAX_IMAGES} ta rasm (hozir ${n} ta)`);

  const results: { name: string; ok: boolean; error?: string }[] = [];
  for (const f of files) {
    try { if (f.size > MAX_IMAGE_BYTES) throw new ImageError("Fayl hajmi 8 MB dan oshmasligi kerak"); stored.push(await storeImage(Buffer.from(await f.arrayBuffer()))); results.push({ name: f.name, ok: true }); }
    catch (e) { results.push({ name: f.name, ok: false, error: e instanceof ImageError || e instanceof StorageError ? e.message : "Rasmni qayta ishlab bo'lmadi" }); }
  }
  let remod = false;
  if (stored.length) {
    await d.transaction(async (tx) => {
      const [{ m }] = await tx.select({ m: max(s.listingImages.position) }).from(s.listingImages).where(eq(s.listingImages.listingId, l.id));
      let pos = (m ?? -1) + 1;
      for (const [i, im] of stored.entries())
        await tx.insert(s.listingImages).values({ listingId: l.id, storageKey: im.key, thumbKey: im.thumbKey, width: im.width, height: im.height, position: pos++, isPrimary: n === 0 && i === 0 });
      remod = await remoderateIfApproved(tx, l, user.id, "Muallif rasm qo'shdi");
    });
  }
  const [current] = await locked.update(s.listings).set({updatedAt:new Date()}).where(eq(s.listings.id,l.id)).returning({updatedAt:s.listings.updatedAt});
  return NextResponse.json({ updatedAt: current.updatedAt.toISOString(), results, images: await listImages(l.id, locked), remoderation: remod }, { status: stored.length ? 200 : 422 });
  }); } catch (e) { await Promise.all(stored.flatMap(im => [deleteObject(im.key), deleteObject(im.thumbKey)])); throw e; }
});

// Tartib va asosiy rasm
export const PATCH = handle(async (req, ctx) => {
  const user = await requireUser(req);
  const stored: Awaited<ReturnType<typeof storeImage>>[] = [];
  try { return await db().transaction(async (locked) => {
  const l = await loadEditable((await ctx.params).id, user, locked);
  if (l.availabilityStatus === "archived") throw new HttpError(409, "Arxivlangan e’londa rasmlarni o‘zgartirib bo‘lmaydi");
  const b = z.object({ order: z.array(z.string().uuid()).max(MAX_IMAGES), primary: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!b.success) throw new HttpError(400, "Noto'g'ri so'rov");
  const d = locked;
  const ids = (await d.select({ id: s.listingImages.id }).from(s.listingImages).where(eq(s.listingImages.listingId, l.id))).map((r) => r.id);
  if (ids.length !== b.data.order.length || new Set(b.data.order).size !== ids.length || !b.data.order.every((x) => ids.includes(x)) || !ids.includes(b.data.primary)) throw new HttpError(400, "Rasmlar ro'yxati mos emas");
  await d.transaction(async (tx) => {
    await tx.update(s.listingImages).set({ isPrimary: false }).where(eq(s.listingImages.listingId, l.id));
    for (const [i, id] of b.data.order.entries()) await tx.update(s.listingImages).set({ position: i, isPrimary: id === b.data.primary }).where(eq(s.listingImages.id, id));
  });
  const [current] = await locked.update(s.listings).set({updatedAt:new Date()}).where(eq(s.listings.id,l.id)).returning({updatedAt:s.listings.updatedAt});
  return NextResponse.json({ updatedAt: current.updatedAt.toISOString(), images: await listImages(l.id, locked) });
  }); } catch (e) { await Promise.all(stored.flatMap(im => [deleteObject(im.key), deleteObject(im.thumbKey)])); throw e; }
});
