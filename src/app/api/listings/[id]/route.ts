import { NextResponse } from "next/server";
import { and, count, eq, ne, notInArray, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { handle, requireUser, loadEditable, managedCenterIds, listingAmenities, HttpError } from "@/lib/guard";
import { formSchema, parseForm, submitErrors, toForm, type ListingRow } from "@/lib/listing-input";
import { needsRemoderation } from "@/lib/status";
import { remoderateIfApproved } from "@/lib/listing-images";
import { z } from "zod";
import { deleteDraft } from "@/lib/drafts";

const pgCode = (e: unknown) => (e as { code?: string; cause?: { code?: string } })?.code ?? (e as { cause?: { code?: string } })?.cause?.code;

export const PATCH = handle(async (req, ctx) => {
  const user = await requireUser(req);
  return db().transaction(async (locked) => {
  const l = await loadEditable((await ctx.params).id, user, locked);
  if (l.availabilityStatus === "archived") throw new HttpError(409, "Arxivlangan e'lonni tahrirlab bo'lmaydi");
  const body = z.object({ fields: formSchema, expectedUpdatedAt: z.string().optional() }).safeParse(await req.json().catch(() => null));
  if (!body.success) throw new HttpError(400, "Noto'g'ri so'rov");
  if (body.data.expectedUpdatedAt && l.updatedAt.toISOString() !== body.data.expectedUpdatedAt) throw new HttpError(409, "E’lon boshqa oynada o‘zgargan. Sahifani yangilang.");
  const { values, errors } = parseForm(body.data.fields);
  if (Object.keys(errors).length) throw new HttpError(422, "Maydonlarda xato bor", { errors });

  const d = locked;
  const regionId = values.regionId ?? l.regionId; const districtId = values.districtId !== undefined ? values.districtId : l.districtId;
  if (values.regionId !== undefined && !(await d.select({ id: s.regions.id }).from(s.regions).where(eq(s.regions.id, values.regionId)).limit(1)).length) throw new HttpError(422, "Hudud topilmadi", { errors: { regionId: "Hududni tanlang" } });
  if (districtId) {
    const [dist] = await d.select().from(s.districts).where(eq(s.districts.id, districtId)).limit(1);
    if (!dist || dist.regionId !== regionId) throw new HttpError(422, "Tuman tanlangan hududga tegishli emas", { errors: { districtId: "Tuman tanlangan hududga tegishli emas" } });
  }
  if (values.centerId && values.centerId !== l.centerId && user.role !== "admin" && !(await managedCenterIds(user.id, locked)).includes(values.centerId))
    throw new HttpError(403, "Siz bu biznes markazga biriktirilmagansiz", { errors: { centerId: "Bu markazga e'lon bog'lash huquqingiz yo'q" } });
  if (values.amenities) {
    const known = new Set((await d.select({ c: s.amenities.code }).from(s.amenities)).map((a) => a.c));
    if (values.amenities.some((a) => !known.has(a))) throw new HttpError(422, "Noma'lum qulaylik");
  }

  const merged = { ...l, ...values } as ListingRow;
  const mergedErrors = parseForm(toForm(merged, values.amenities ?? l.amenities)).errors;
  if (Object.keys(mergedErrors).length) throw new HttpError(422, "Maydonlarda xato bor", { errors: mergedErrors });
  const before = toForm(l), after = toForm(merged);
  const aliases: Record<string,string> = {priceAmount:"priceAmountMinor",depositAmount:"depositAmountMinor",commissionFixed:"commissionFixedMinor",serviceFee:"serviceFeeMinor"};
  const changed = Object.keys(before).filter(key => {
    const k = key as keyof typeof before;
    if (key === "depositCurrency" && !before.depositAmount && !after.depositAmount) return false;
    if (["serviceFeeCurrency","serviceFeePeriod"].includes(key) && !before.serviceFee && !after.serviceFee) return false;
    if (["commissionCurrency","commissionPercentBase","commissionPercent","commissionFixed"].includes(key) && before.commissionType === "none" && after.commissionType === "none") return false;
    const canonical = (value: unknown) => Array.isArray(value) ? JSON.stringify([...value].sort()) : String(value ?? "");
    return canonical(before[k]) !== canonical(after[k]);
  }).map(k => aliases[k] ?? k);

  const [{ n: imgCount }] = await d.select({ n: count() }).from(s.listingImages).where(eq(s.listingImages.listingId, l.id));
  const amenities = values.amenities ?? await listingAmenities(l.id, locked);
  let remod = false;
  if (l.moderationStatus === "pending" || l.moderationStatus === "approved") {
    const e = submitErrors(toForm(merged, amenities), imgCount);
    if (Object.keys(e).length) throw new HttpError(422, "Tasdiqlangan e'lon muhim maydonlari o'zgarganda barcha majburiy maydonlar to'ldirilgan bo'lishi kerak", { errors: e });
    remod = l.moderationStatus === "approved" && needsRemoderation(changed);
  }

  try {
    await d.transaction(async (tx) => {
      if (Object.keys(values).length) await tx.update(s.listings).set({ ...values, updatedAt: new Date() }).where(eq(s.listings.id, l.id));
      if (values.amenities) {
        await tx.delete(s.listingAmenities).where(eq(s.listingAmenities.listingId, l.id));
        if (values.amenities.length) await tx.insert(s.listingAmenities).values(values.amenities.map((a) => ({ listingId: l.id, amenityCode: a })));
      }
      if (remod) remod = await remoderateIfApproved(tx, l, user.id, `Muallif o'zgartirdi: ${changed.join(", ")}`);
    });
  } catch (e) {
    if (pgCode(e) === "23505") throw new HttpError(409, "Bu biznes markazda shu xona raqami bilan faol e'lon allaqachon mavjud. Xona ikki marta e'lon qilinmasin.", { errors: { unitCode: "Bu xona raqami bilan faol e'lon allaqachon bor" } });
    throw e;
  }

  // Yumshoq ogohlantirish: o'zingizning shu manzil va maydondagi boshqa faol e'loningiz
  const warnings: string[] = [];
  const addr = (values.address ?? l.address).trim().toLowerCase(); const area = values.areaM2 ?? l.areaM2;
  if (addr && area) {
    const dup = await d.select({ id: s.listings.id }).from(s.listings).where(and(
      eq(s.listings.ownerId, l.ownerId), ne(s.listings.id, l.id), eq(sql`lower(trim(${s.listings.address}))`, addr), eq(s.listings.areaM2, String(area)),
      notInArray(s.listings.availabilityStatus, ["archived", "rented", "expired"]))).limit(1);
    if (dup.length) warnings.push("Sizda shu manzil va maydonli boshqa e'lon bor. Bir joyni takror e'lon qilmang.");
  }
  const [current] = await locked.select({updatedAt:s.listings.updatedAt}).from(s.listings).where(eq(s.listings.id,l.id));
  return NextResponse.json({ ok: true, remoderation: remod, warnings, updatedAt: current.updatedAt.toISOString() });
  });
});

/** Qoralamani o'chirish. Chop etilgan yoki moderatsiyaga yuborilgan e'lon o'chirilmaydi (ular arxivlanadi). */
export const DELETE = handle(async (req, ctx) => {
  const user = await requireUser(req);
  const l = await loadEditable((await ctx.params).id, user);
  if (l.moderationStatus !== "draft" || l.publishedAt) throw new HttpError(409, "Faqat qoralamani o'chirish mumkin");
  const n = await deleteDraft(l.id, user.role === "admin" ? null : l.ownerId);
  if (!n) throw new HttpError(404, "E'lon topilmadi");
  return NextResponse.json({ ok: true });
});
