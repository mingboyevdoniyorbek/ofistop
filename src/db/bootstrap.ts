import { db, schema as s } from "./client";
import { regions, tashDistricts, amenities } from "./reference-data";
import { and, eq, isNull } from "drizzle-orm";
import { uzDistricts } from "./uz-districts";
/** Idempotent reference data only; never creates users, listings or admin accounts. */
export async function bootstrap() {
  const d = db();
  await d.transaction(async tx => {
    await tx.insert(s.regions).values(regions.map(([slug, nameUz, nameRu]) => ({slug,nameUz,nameRu}))).onConflictDoNothing();
    const [tash] = await tx.select().from(s.regions).where(eq(s.regions.slug, "toshkent-shahri"));
    await tx.insert(s.districts).values(tashDistricts.map(([slug,nameUz,nameRu]) => ({regionId:tash.id,slug,nameUz,nameRu}))).onConflictDoNothing();
    // Boshqa viloyatlarning tuman va shaharlari; Toshkent shahri tumanlariga faqat markaz koordinatasi qo'shiladi.
    const ids = new Map((await tx.select().from(s.regions)).map((r) => [r.slug, r.id]));
    const rows = uzDistricts.filter(([reg, , uz]) => uz && ids.has(reg)).map(([reg, slug, nameUz, nameRu, lat, lng]) => ({ regionId: ids.get(reg)!, slug, nameUz: nameUz!, nameRu: nameRu!, lat, lng }));
    if (rows.length) await tx.insert(s.districts).values(rows).onConflictDoNothing();
    for (const [reg, slug, uz, , lat, lng] of uzDistricts) if (!uz && lat != null && ids.has(reg))
      await tx.update(s.districts).set({ lat, lng }).where(and(eq(s.districts.regionId, ids.get(reg)!), eq(s.districts.slug, slug), isNull(s.districts.lat)));
    await tx.insert(s.amenities).values(amenities.map(([code,nameUz,nameRu]) => ({code,nameUz,nameRu}))).onConflictDoNothing();
    await tx.insert(s.settings).values({key:"listing_ttl_days",value:"30"}).onConflictDoNothing();
  });
}
