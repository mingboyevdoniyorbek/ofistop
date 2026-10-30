import { and, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { publicCond } from "./search";

/** SEO sahifalari: /ijara/{kategoriya}[/{hudud yoki tuman}]. */
export const LANDING_CATS = {
  ofis: { cat: "office", uz: "Ofis ijarasi", ru: "Аренда офиса", uzLead: "ofis", ruLead: "офис" },
  "biznes-markaz": { cat: "bc_room", uz: "Biznes markazda xona ijarasi", ru: "Аренда помещения в бизнес-центре", uzLead: "biznes markazdagi xona", ruLead: "помещение в бизнес-центре" },
  kovorking: { cat: "coworking", uz: "Kovorking ijarasi", ru: "Аренда коворкинга", uzLead: "kovorking", ruLead: "коворкинг" },
  dokon: { cat: "retail", uz: "Do‘kon va savdo joyi ijarasi", ru: "Аренда магазина и торговой площади", uzLead: "do‘kon yoki savdo joyi", ruLead: "магазин или торговую площадь" },
  "xizmat-xonasi": { cat: "service_room", uz: "Xizmat ko‘rsatish xonasi ijarasi", ru: "Аренда помещения под услуги", uzLead: "xizmat ko‘rsatish xonasi", ruLead: "помещение под услуги" },
  ombor: { cat: "warehouse", uz: "Ombor ijarasi", ru: "Аренда склада", uzLead: "ombor", ruLead: "склад" },
  "ishlab-chiqarish": { cat: "production", uz: "Ishlab chiqarish joyi ijarasi", ru: "Аренда производственного помещения", uzLead: "ishlab chiqarish joyi", ruLead: "производственное помещение" },
  tijorat: { cat: "other", uz: "Tijorat joyi ijarasi", ru: "Аренда коммерческой недвижимости", uzLead: "tijorat joyi", ruLead: "коммерческое помещение" },
} as const;
export type LandingSlug = keyof typeof LANDING_CATS;
export const landingSlugOf = (category: string) => (Object.entries(LANDING_CATS).find(([, v]) => v.cat === category)?.[0] ?? null) as LandingSlug | null;
export const isLandingSlug = (s: string): s is LandingSlug => s in LANDING_CATS;

/** Joy slug'i: avval viloyat/shahar, keyin tuman (Toshkent shahri tumanlari ustun). */
export async function resolvePlace(slug: string) {
  const [r] = await db().select().from(s.regions).where(eq(s.regions.slug, slug)).limit(1);
  if (r) return { kind: "region" as const, id: r.id, slug, nameUz: r.nameUz, nameRu: r.nameRu, regionNameUz: null, regionNameRu: null };
  const ds = await db().select({ d: s.districts, r: s.regions }).from(s.districts).innerJoin(s.regions, eq(s.regions.id, s.districts.regionId)).where(eq(s.districts.slug, slug));
  const d = ds.find((x) => x.r.slug === "toshkent-shahri") ?? ds[0];
  return d ? { kind: "district" as const, id: d.d.id, slug, nameUz: d.d.nameUz, nameRu: d.d.nameRu, regionNameUz: d.r.nameUz, regionNameRu: d.r.nameRu } : null;
}

/** Kategoriya bo'yicha faol e'lonlari bor tumanlar (ichki havolalar va sitemap uchun). */
export async function placesWithListings(category?: string) {
  const L = s.listings;
  return db().select({ slug: s.districts.slug, nameUz: s.districts.nameUz, nameRu: s.districts.nameRu, n: sql<number>`count(*)::int` })
    .from(L).innerJoin(s.districts, eq(s.districts.id, L.districtId))
    .where(and(publicCond(), category ? sql`${L.category} = ${category}` : undefined))
    .groupBy(s.districts.slug, s.districts.nameUz, s.districts.nameRu).orderBy(sql`count(*) desc`);
}

/** Har bir kategoriya bo'yicha faol e'lonlar soni. */
export async function categoryCounts() {
  const rows = await db().select({ c: s.listings.category, n: sql<number>`count(*)::int` }).from(s.listings).where(publicCond()).groupBy(s.listings.category);
  return new Map(rows.map((r) => [r.c as string, r.n]));
}
