import { and, eq, gt, lte, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { parseFilters, searchWhere } from "./search";
const keys = new Set(["q", "region", "district", "category", "center", "currency", "period", "basis", "priceMode", "priceMin", "priceMax", "areaMin", "areaMax", "floor", "furnished", "poster", "commission", "availableBy", "amenities", "lat", "lng", "radius", "bbox"]);
export function canonicalSearch(query: string) {
  const out = new URLSearchParams();
  const input = new URLSearchParams(query);
  for (const [k, v] of input) if (keys.has(k) && v && k !== "amenities") out.set(k, v);
  const amenities = [...new Set(input.getAll("amenities").flatMap(v => v.split(",")).filter(Boolean))].sort();
  for (const value of amenities) out.append("amenities",value);
  out.sort(); return out.toString();
}
export function filtersFromQuery(query: string) {
  const sp: Record<string, string[]> = {};
  for (const [k, v] of new URLSearchParams(query)) (sp[k] ??= []).push(v);
  return parseFilters(sp);
}
export async function checkSavedSearches(userId: string) {
  const searches = await db().select().from(s.savedSearches).where(eq(s.savedSearches.userId, userId));
  let notifications = 0;
  for (const saved of searches) {
    const f = filtersFromQuery(saved.query), where = await searchWhere(f);
    notifications += await db().transaction(async tx => {
      const [row] = await tx.select().from(s.savedSearches).where(and(eq(s.savedSearches.id, saved.id), eq(s.savedSearches.userId, userId))).for("update");
      if (!row || Date.now() - row.lastCheckedAt.getTime() < 60000) return 0;
      // A repeat check is idempotent. One aggregate notification per saved query.
      const now = new Date();
      const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(s.listings).leftJoin(s.businessCenters, eq(s.businessCenters.id, s.listings.centerId)).where(and(where, gt(s.listings.publishedAt, row.lastCheckedAt), lte(s.listings.publishedAt, now)));
      if (n) await tx.insert(s.notifications).values({ userId, title: "Qidiruvingizga mos yangi e’lonlar", body: `${row.name}: ${n}`, href: `/joylar?${row.query}` });
      await tx.update(s.savedSearches).set({ lastCheckedAt: now }).where(eq(s.savedSearches.id, row.id));
      return n ? 1 : 0;
    });
  }
  return notifications;
}
