import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { publicCond } from "./search";

export type CenterStat = { rooms: number; areaMin: number | null; areaMax: number | null;
  prices: { currency: "UZS" | "USD"; period: "month" | "day" | "hour"; basis: "whole" | "per_m2" | "per_seat"; min: bigint; max: bigint }[] };

/** Faqat HOZIR ommaviy ko'rinadigan (tasdiqlangan, bo'sh, muddati tugamagan) e'lonlar asosida. */
export async function centerStats(ids: string[]): Promise<Map<string, CenterStat>> {
  const out = new Map<string, CenterStat>();
  if (!ids.length) return out;
  const L = s.listings;
  const rows = await db().select({
    centerId: L.centerId, currency: L.currency, period: L.pricePeriod, basis: L.priceBasis,
    n: sql<number>`count(*)::int`, aMin: sql<string | null>`min(${L.areaM2})`, aMax: sql<string | null>`max(${L.areaM2})`,
    pMin: sql<string | null>`min(${L.priceAmountMinor})`, pMax: sql<string | null>`max(${L.priceAmountMinor})`,
  }).from(L).where(and(publicCond(), inArray(L.centerId, ids))).groupBy(L.centerId, L.currency, L.pricePeriod, L.priceBasis);
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
    region: locale === "ru" ? s.regions.nameRu : s.regions.nameUz, district: locale === "ru" ? s.districts.nameRu : s.districts.nameUz, isDemo: s.businessCenters.isDemo })
    .from(s.businessCenters).innerJoin(s.regions, eq(s.regions.id, s.businessCenters.regionId))
    .leftJoin(s.districts, eq(s.districts.id, s.businessCenters.districtId)).orderBy(s.businessCenters.name);
}
export const centerIdOf = (p: string) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(p) ? p.slice(0, 36) : null);
