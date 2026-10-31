import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { publicCond, rentTotalSql, buildWhere, type Filters } from "./search";

export type CenterStat = { rooms: number; areaMin: number | null; areaMax: number | null;
  prices: { currency: "UZS" | "USD"; period: "month" | "day" | "hour"; basis: "whole" | "per_m2" | "per_seat"; min: bigint; max: bigint }[] };

/** Faqat HOZIR ommaviy ko'rinadigan (tasdiqlangan, bo'sh, muddati tugamagan) e'lonlar asosida. */
export async function centerStats(ids: string[]): Promise<Map<string, CenterStat>> {
  const out = new Map<string, CenterStat>();
  if (!ids.length) return out;
  const L = s.listings;
  const basis = sql<"whole" | "per_seat">`CASE WHEN ${L.priceBasis} = 'per_seat' THEN 'per_seat' ELSE 'whole' END`;
  const amount = sql`CASE WHEN ${L.priceBasis} = 'per_seat' THEN ${L.priceAmountMinor} ELSE ${rentTotalSql()} END`;
  const rows = await db().select({
    centerId: L.centerId, currency: L.currency, period: L.pricePeriod, basis,
    n: sql<number>`count(*)::int`, aMin: sql<string | null>`min(${L.areaM2})`, aMax: sql<string | null>`max(${L.areaM2})`,
    pMin: sql<string | null>`min(${amount})`, pMax: sql<string | null>`max(${amount})`,
  }).from(L).where(and(publicCond(), inArray(L.centerId, ids))).groupBy(L.centerId, L.currency, L.pricePeriod, basis);
  for (const r of rows) {
    const id = r.centerId!; const st = out.get(id) ?? { rooms: 0, areaMin: null, areaMax: null, prices: [] };
    st.rooms += r.n;
    if (r.aMin != null) st.areaMin = st.areaMin == null ? Number(r.aMin) : Math.min(st.areaMin, Number(r.aMin));
    if (r.aMax != null) st.areaMax = st.areaMax == null ? Number(r.aMax) : Math.max(st.areaMax, Number(r.aMax));
    if (r.pMin != null && r.pMax != null) st.prices.push({ currency: r.currency, period: r.period, basis: r.basis, min: BigInt(r.pMin), max: BigInt(r.pMax) });
    out.set(id, st);
  }
  return out;
}

export async function listCenters(locale: "uz" | "ru" = "uz") {
  return db().select({ id: s.businessCenters.id, slug: s.businessCenters.slug, name: s.businessCenters.name, address: s.businessCenters.address,
    tagline: s.businessCenters.tagline, regionId: s.businessCenters.regionId, districtId: s.businessCenters.districtId,
    cover: sql<string | null>`(SELECT storage_key FROM business_center_images WHERE center_id = ${s.businessCenters.id} AND NOT pending ORDER BY position, id LIMIT 1)`,
    region: locale === "ru" ? s.regions.nameRu : s.regions.nameUz, district: locale === "ru" ? s.districts.nameRu : s.districts.nameUz, isDemo: s.businessCenters.isDemo,
    verifiedAt: s.businessCenters.verifiedAt, featuredUntil: s.businessCenters.featuredUntil })
    .from(s.businessCenters).innerJoin(s.regions, eq(s.regions.id, s.businessCenters.regionId))
    .leftJoin(s.districts, eq(s.districts.id, s.businessCenters.districtId))
    // Tavsiya etilganlar (muddati tugamagan) birinchi, keyin tasdiqlanganlar, keyin nom bo'yicha.
    .orderBy(sql`(${s.businessCenters.featuredUntil} > now()) IS TRUE DESC`, sql`${s.businessCenters.verifiedAt} IS NOT NULL DESC`, s.businessCenters.name);
}
export const centerIdOf = (p: string) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(p) ? p.slice(0, 36) : null);

/**
 * Markazlar ro'yxati filtri uchun: har bir markazdagi shartga mos bo'sh xonalar soni va eng arzon oylik jami narx
 * (tanlangan valyutada). Faqat ommaviy (faol) e'lonlar hisoblanadi.
 */
export async function matchingRoomsByCenter(f: Filters) {
  const L = s.listings;
  const total = rentTotalSql();
  const rows = await db().select({
    centerId: L.centerId, rooms: sql<number>`count(*)::int`,
    minTotal: sql<string | null>`min(CASE WHEN ${L.currency} = ${f.currency} AND ${L.pricePeriod} = 'month' THEN ${total} END)`,
  }).from(L).leftJoin(s.businessCenters, eq(s.businessCenters.id, L.centerId))
    .where(and(buildWhere(f), sql`${L.centerId} IS NOT NULL`)).groupBy(L.centerId);
  return new Map(rows.map((r) => [r.centerId!, { rooms: r.rooms, minTotal: r.minTotal == null ? null : BigInt(Math.round(Number(r.minTotal))) }]));
}
