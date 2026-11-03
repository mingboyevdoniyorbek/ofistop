import { and, eq, gt, inArray, lte, ne, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { parseFilters, searchWhere } from "./search";
import { primaryPrice } from "./format";
import { scheduleTelegramFlush } from "./telegram-notify";
const keys = new Set(["q", "deal", "region", "district", "category", "center", "currency", "period", "basis", "priceMode", "priceMin", "priceMax", "areaMin", "areaMax", "floor", "furnished", "poster", "commission", "availableBy", "amenities", "lat", "lng", "radius", "bbox"]);
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

/**
 * Yangi chop etilgan e'lon qaysi saqlangan qidiruvlarga mos kelishini tekshiradi va egalariga
 * bildirishnoma yaratadi (qo'ng'iroqcha + Telegram, foydalanuvchi bot bilan bog'langan bo'lsa).
 * Bir foydalanuvchiga bitta e'lon uchun faqat bitta xabar ketadi, hatto bir nechta qidiruvi mos kelsa ham.
 * Moslik qidiruv bilan bir xil shart (searchWhere) orqali tekshiriladi — sayt natijasi bilan farq qilmaydi.
 */
export async function notifySavedSearchMatches(listingId: string) {
  const L = s.listings;
  const [l] = await db().select({ id: L.id, slug: L.slug, title: L.title, ownerId: L.ownerId, areaM2: L.areaM2, amount: L.priceAmountMinor, currency: L.currency, period: L.pricePeriod, basis: L.priceBasis, negotiable: L.priceNegotiable, isDemo: L.isDemo })
    .from(L).where(eq(L.id, listingId)).limit(1);
  if (!l || l.isDemo) return 0;
  const searches = await db().select().from(s.savedSearches).where(ne(s.savedSearches.userId, l.ownerId)).limit(5000);
  const matched = new Map<string, { searchIds: string[]; name: string }>();
  for (const saved of searches) {
    if (matched.has(saved.userId)) { matched.get(saved.userId)!.searchIds.push(saved.id); continue; }
    try {
      const where = await searchWhere(filtersFromQuery(saved.query));
      const [hit] = await db().select({ id: L.id }).from(L).leftJoin(s.businessCenters, eq(s.businessCenters.id, L.centerId)).where(and(where, eq(L.id, l.id))).limit(1);
      if (hit) matched.set(saved.userId, { searchIds: [saved.id], name: saved.name });
    } catch (e) { console.error("[saved-search-match]", (e as Error).message); } // bitta buzuq qidiruv qolganlarini to'xtatmasin
  }
  if (!matched.size) return 0;
  const price = primaryPrice({ amount: l.amount, currency: l.currency, period: l.period, basis: l.basis, negotiable: l.negotiable }, l.areaM2, "uz");
  const area = l.areaM2 ? ` · ${Number(l.areaM2)} m²` : "";
  await db().insert(s.notifications).values([...matched].map(([userId, m]) => ({
    userId, title: "Qidiruvingizga mos yangi e’lonlar", body: `${m.name}: ${l.title} — ${price}${area}`, href: `/joylar/${l.id}-${l.slug}`,
  })));
  // Bu e'lon allaqachon xabar qilindi — "yangilarini tekshirish" uni qayta sanamasin.
  const ids = [...matched.values()].flatMap((m) => m.searchIds);
  await db().update(s.savedSearches).set({ lastCheckedAt: new Date() }).where(inArray(s.savedSearches.id, ids));
  scheduleTelegramFlush();
  return matched.size;
}
