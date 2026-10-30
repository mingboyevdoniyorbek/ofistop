import { NextResponse } from "next/server";
import { inArray, and, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { labels, primaryPrice, priceLabel } from "@/lib/format";
import { getT } from "@/lib/i18n";
import { parseFilters, publicSearchPoints, publicCond } from "@/lib/search";
import { clusterPoints } from "@/lib/map-clusters";
import { hit } from "@/lib/ratelimit";
import { handle, HttpError } from "@/lib/guard";
import { clientIp } from "@/lib/client-ip";
import { mediaUrl } from "@/lib/storage";

export const GET = handle(async req => {
  const { locale, t } = await getT(); const u = new URL(req.url);
  const ip = clientIp(req);
  if (!await hit(`map:${ip}`, 120, 60)) throw new HttpError(429, t("api.map.tooMany"));
  const sp: Record<string, string | string[]> = {};
  for (const k of new Set(u.searchParams.keys())) { const v = u.searchParams.getAll(k); sp[k] = v.length > 1 ? v : v[0]; }
  const f = parseFilters({ ...sp, priceMode: sp.priceMode ?? "total" }); if (f.errors?.length) throw new HttpError(400, f.errors.join(". "));
  const z = Number(u.searchParams.get("zoom") ?? 11);
  if (!Number.isInteger(z) || z < 2 || z > 19) throw new HttpError(400, "Xarita hududi noto‘g‘ri");
  // No 500-listing truncation: aggregate all matching lightweight public points.
  const points = await publicSearchPoints(f), groups = clusterPoints(points, z);
  const group = u.searchParams.get("group"), page = Math.max(1, Math.min(100000, Math.floor(Number(u.searchParams.get("groupPage"))) || 1));
  const selected = group ? groups.find(g => g.id === group)?.items ?? [] : groups.flatMap(g => g.count === 1 ? g.items : []);
  const sample = group ? selected.slice((page - 1) * 20, page * 20) : selected;
  const ids = sample.map(p => p.id), byId = new Map(sample.map(p => [p.id, p]));
  const rows = ids.length ? await db().select({ l: s.listings, thumb: sql<string | null>`(SELECT COALESCE(thumb_key, storage_key) FROM listing_images WHERE listing_id = ${s.listings.id} AND is_primary LIMIT 1)` }).from(s.listings).where(and(publicCond(), inArray(s.listings.id, ids))) : [];
  const markers = rows.map(({ l, thumb }) => {
    const p = byId.get(l.id)!; const price = { amount: l.priceAmountMinor, currency: l.currency, period: l.pricePeriod, basis: l.priceBasis, negotiable: l.priceNegotiable };
    return { ...p, radiusM: p.radiusM ?? null, title: l.title, href: `/joylar/${l.id}-${l.slug}`, category: labels(locale).category[l.category], area: l.areaM2 ? Number(l.areaM2) : null,
      price: primaryPrice(price, l.areaM2, locale), total: l.priceBasis === "per_m2" ? priceLabel(price, locale) : null, thumb: mediaUrl(thumb) };
  });
  return NextResponse.json({ total: points.length, clusters: groups.filter(g => g.count > 1).map(({ items, ...g }) => g), markers, groupTotal: group ? selected.length : 0, groupPage: page, truncated: false }, { headers: { "Cache-Control": "no-store" } });
});
