import { db, schema as s } from "./client";
import { regions, tashDistricts, amenities } from "./reference-data";
import { eq } from "drizzle-orm";
/** Idempotent reference data only; never creates users, listings or admin accounts. */
export async function bootstrap() {
  const d = db();
  await d.transaction(async tx => {
    await tx.insert(s.regions).values(regions.map(([slug, nameUz, nameRu]) => ({slug,nameUz,nameRu}))).onConflictDoNothing();
    const [tash] = await tx.select().from(s.regions).where(eq(s.regions.slug, "toshkent-shahri"));
    await tx.insert(s.districts).values(tashDistricts.map(([slug,nameUz,nameRu]) => ({regionId:tash.id,slug,nameUz,nameRu}))).onConflictDoNothing();
    await tx.insert(s.amenities).values(amenities.map(([code,nameUz,nameRu]) => ({code,nameUz,nameRu}))).onConflictDoNothing();
    await tx.insert(s.settings).values({key:"listing_ttl_days",value:"30"}).onConflictDoNothing();
  });
}
