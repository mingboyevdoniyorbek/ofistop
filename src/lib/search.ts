import { and, asc, desc, eq, gte, lte, sql, inArray, type SQL } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { validDate } from "./validation";
import { searchKey } from "./text";

export const PAGE_SIZE = Number(process.env.PAGE_SIZE ?? 12);
export type Sort = "new" | "price_asc" | "price_desc" | "area_asc" | "area_desc";
export interface Filters {
  q?: string; region?: number; district?: number; category?: string; center?: string;
  currency: "UZS" | "USD"; period: "month" | "day" | "hour"; basis: "whole" | "per_m2" | "per_seat";
  priceMin?: string; priceMax?: string; areaMin?: string; areaMax?: string; floor?: number;
  furnished?: "1" | "0"; poster?: string; commission?: "none" | "any"; availableBy?: string;
  amenities: string[]; sort: Sort; page: number;
  currencyFilter?: boolean; periodFilter?: boolean; basisFilter?: boolean; errors?: string[];
}

const num = (v: string | undefined) => (v && /^\d{1,12}(\.\d{1,2})?$/.test(v) ? v : undefined);
const int = (v: string | undefined) => (v && /^\d{1,9}$/.test(v) ? Number(v) : undefined);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const sort = one(sp.sort);
  const cur = one(sp.currency), per = one(sp.period), bas = one(sp.basis);
  const errors: string[] = [];
  for (const [a, b] of [["priceMin", "priceMax"], ["areaMin", "areaMax"]]) {
    if ((one(sp[a]) && !num(one(sp[a]))) || (one(sp[b]) && !num(one(sp[b])))) errors.push("Raqamni to‘g‘ri kiriting");
    if (num(one(sp[a])) && num(one(sp[b])) && Number(one(sp[a])) > Number(one(sp[b]))) errors.push("Eng kichik qiymat eng katta qiymatdan oshmasin");
  }
  if (one(sp.availableBy) && !validDate(one(sp.availableBy)!)) errors.push("Sana noto‘g‘ri");
  return {
    errors, currencyFilter: cur === "USD" || cur === "UZS", periodFilter: ["month", "day", "hour"].includes(per ?? ""), basisFilter: ["whole", "per_m2", "per_seat"].includes(bas ?? ""),
    q: one(sp.q)?.slice(0, 100) || undefined, region: int(one(sp.region)), district: int(one(sp.district)),
    category: one(sp.category), center: one(sp.center),
    currency: cur === "USD" ? "USD" : "UZS", period: per === "day" || per === "hour" ? per : "month",
    basis: bas === "per_m2" || bas === "per_seat" ? bas : "whole",
    priceMin: num(one(sp.priceMin)), priceMax: num(one(sp.priceMax)), areaMin: num(one(sp.areaMin)), areaMax: num(one(sp.areaMax)),
    floor: int(one(sp.floor)), furnished: one(sp.furnished) === "1" ? "1" : one(sp.furnished) === "0" ? "0" : undefined,
    poster: one(sp.poster), commission: one(sp.commission) === "none" ? "none" : undefined, availableBy: one(sp.availableBy),
    amenities: [...new Set((Array.isArray(sp.amenities) ? sp.amenities : [sp.amenities ?? ""]).flatMap((x) => x.split(",")).filter((a) => /^[a-z0-9_]{1,30}$/.test(a)))].slice(0, 14),
    sort: (["price_asc", "price_desc", "area_asc", "area_desc"] as const).find((x) => x === sort) ?? "new",
    page: Math.max(1, int(one(sp.page)) ?? 1),
  };
}

/** Ommaviy ko'rinish sharti — status.ts dagi isPubliclyVisible bilan bir xil. */
export const publicCond = () => and(
  eq(s.listings.isSuspended, false),
  sql`EXISTS (SELECT 1 FROM users owner WHERE owner.id = ${s.listings.ownerId} AND NOT owner.is_blocked)`,
  eq(s.listings.moderationStatus, "approved"), eq(s.listings.availabilityStatus, "available"),
  sql`${s.listings.expiresAt} > now()`,
);

// Apostrof variantlari ustunda ham olib tashlanadi (searchKey bilan bir xil qoida)
const APOS = `'ʻʼ‘’\`´′`;
const stripped = (expr: SQL) => sql`translate(lower(${expr}), ${APOS}, '')`;

function buildWhere(f: Filters) {
  const L = s.listings;
  const conds: (SQL | undefined)[] = [publicCond()];
  if (f.errors?.length) conds.push(sql`false`);
  if (f.currencyFilter) conds.push(eq(L.currency, f.currency));
  if (f.periodFilter) conds.push(eq(L.pricePeriod, f.period));
  if (f.basisFilter) conds.push(eq(L.priceBasis, f.basis));
  if (f.region) conds.push(eq(L.regionId, f.region));
  if (f.district) conds.push(eq(L.districtId, f.district));
  if (f.category && (s.categoryEnum.enumValues as readonly string[]).includes(f.category)) conds.push(eq(L.category, f.category as never));
  if (f.center && /^[0-9a-f-]{36}$/.test(f.center)) conds.push(eq(L.centerId, f.center));
  if (f.q) {
    const key = searchKey(f.q).replace(/[%_\\]/g, "\\$&");
    conds.push(sql`${stripped(sql`concat_ws(' ', ${L.title}, ${L.description}, ${L.address}, ${s.businessCenters.name})`)} LIKE ${"%" + key + "%"}`);
  }
  // Narx filtri faqat tanlangan valyuta/davr/birlik doirasida ma'noli
  if (f.priceMin || f.priceMax) {
    conds.push(eq(L.currency, f.currency), eq(L.pricePeriod, f.period), eq(L.priceBasis, f.basis));
    if (f.priceMin) conds.push(gte(L.priceAmountMinor, sql`(${f.priceMin}::numeric * 100)::bigint`));
    if (f.priceMax) conds.push(lte(L.priceAmountMinor, sql`(${f.priceMax}::numeric * 100)::bigint`));
  }
  if (f.areaMin) conds.push(gte(L.areaM2, f.areaMin));
  if (f.areaMax) conds.push(lte(L.areaM2, f.areaMax));
  if (f.floor !== undefined) conds.push(eq(L.floor, f.floor));
  if (f.furnished) conds.push(eq(L.furnished, f.furnished === "1"));
  if (f.poster && (s.posterTypeEnum.enumValues as readonly string[]).includes(f.poster)) conds.push(eq(L.posterType, f.poster as never));
  if (f.commission === "none") conds.push(eq(L.commissionType, "none"));
  if (f.availableBy && validDate(f.availableBy)) conds.push(sql`(${L.availableFrom} IS NULL OR ${L.availableFrom} <= ${f.availableBy})`);
  if (f.amenities.length) {
    conds.push(sql`${L.id} IN (SELECT listing_id FROM listing_amenities WHERE amenity_code IN (${sql.join(f.amenities.map((a) => sql`${a}`), sql`, `)}) GROUP BY listing_id HAVING count(*) = ${f.amenities.length})`);
  }
  return and(...conds);
}

export async function searchListings(f: Filters, locale: "uz" | "ru" = "uz") {
  const L = s.listings;
  const where = buildWhere(f);

  // Narx bo'yicha saralash: tanlangan (valyuta, davr, birlik) doirasidagilar birinchi, qolganlari yangilik tartibida oxirida.
  const inScope = sql`(${L.currency} = ${f.currency} AND ${L.pricePeriod} = ${f.period} AND ${L.priceBasis} = ${f.basis})`;
  const order = {
    new: [desc(L.publishedAt), desc(L.id)],
    price_asc: [desc(inScope), asc(sql`CASE WHEN ${inScope} THEN ${L.priceAmountMinor} END`), desc(L.publishedAt), desc(L.id)],
    price_desc: [desc(inScope), sql`CASE WHEN ${inScope} THEN ${L.priceAmountMinor} END DESC NULLS LAST`, desc(L.publishedAt), desc(L.id)],
    area_asc: [asc(L.areaM2), desc(L.publishedAt)],
    area_desc: [desc(L.areaM2), desc(L.publishedAt)],
  }[f.sort];

  const d = db();
  const base = d.select({
    id: L.id, slug: L.slug, title: L.title, category: L.category, areaM2: L.areaM2, floor: L.floor,
    priceAmountMinor: L.priceAmountMinor, currency: L.currency, pricePeriod: L.pricePeriod, priceBasis: L.priceBasis,
    priceNegotiable: L.priceNegotiable, posterType: L.posterType, availabilityConfirmedAt: L.availabilityConfirmedAt,
    districtName: locale === "ru" ? s.districts.nameRu : s.districts.nameUz, regionName: locale === "ru" ? s.regions.nameRu : s.regions.nameUz, centerName: s.businessCenters.name,
    imageKey: sql<string | null>`(SELECT COALESCE(thumb_key, storage_key) FROM listing_images i WHERE i.listing_id = ${L.id} AND i.is_primary LIMIT 1)`,
    isDemo: L.isDemo,
  }).from(L)
    .innerJoin(s.regions, eq(s.regions.id, L.regionId))
    .leftJoin(s.districts, eq(s.districts.id, L.districtId))
    .leftJoin(s.businessCenters, eq(s.businessCenters.id, L.centerId))
    .where(where);

  const [items, [{ total }]] = await Promise.all([
    base.orderBy(...order).limit(PAGE_SIZE).offset((f.page - 1) * PAGE_SIZE),
    d.select({ total: sql<number>`count(*)::int` }).from(L).leftJoin(s.businessCenters, eq(s.businessCenters.id, L.centerId)).where(where),
  ]);
  return { items, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export const MAP_LIMIT = 500;
/** Xarita markerlari: faqat koordinatali, ommaviy e'lonlar. Koordinata FAQAT publicPoint() orqali chiqadi. */
export async function searchMarkers(f: Filters) {
  const L = s.listings;
  const where = and(buildWhere(f), sql`${L.lat} IS NOT NULL AND ${L.lng} IS NOT NULL`);
  const rows = await db().select({
    id: L.id, slug: L.slug, title: L.title, category: L.category, areaM2: L.areaM2, lat: L.lat, lng: L.lng, exact: L.exactLocationPublic,
    priceAmountMinor: L.priceAmountMinor, currency: L.currency, pricePeriod: L.pricePeriod, priceBasis: L.priceBasis, priceNegotiable: L.priceNegotiable,
    thumbKey: sql<string | null>`(SELECT thumb_key FROM listing_images i WHERE i.listing_id = ${L.id} AND i.is_primary LIMIT 1)`,
  }).from(L).leftJoin(s.businessCenters, eq(s.businessCenters.id, L.centerId)).where(where).orderBy(desc(L.publishedAt)).limit(MAP_LIMIT + 1);
  return { rows: rows.slice(0, MAP_LIMIT), truncated: rows.length > MAP_LIMIT };
}
