import { NextResponse } from "next/server";
import { publicPoint } from "@/lib/geo";
import { labels, priceLabel, totalLabel } from "@/lib/format";
import { getT } from "@/lib/i18n";
import { parseFilters, searchMarkers } from "@/lib/search";
import { hit } from "@/lib/ratelimit";

export async function GET(req: Request) {
  const { locale, t } = await getT();
  const L10 = labels(locale);
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (!(await hit(`map:${ip}`, 120, 60))) return NextResponse.json({ error: t("api.map.tooMany") }, { status: 429 });
  const sp: Record<string, string | string[]> = {};
  for (const k of new Set(new URL(req.url).searchParams.keys())) { const v = new URL(req.url).searchParams.getAll(k); sp[k] = v.length > 1 ? v : v[0]; }
  try {
    const filters = parseFilters(sp);
    if (filters.errors?.length) return NextResponse.json({ error: filters.errors.join(". ") }, { status: 400 });
    const { rows, truncated } = await searchMarkers(filters);
    const markers = rows.flatMap((r) => {
      const pt = publicPoint({ id: r.id, lat: r.lat, lng: r.lng, exactLocationPublic: r.exact });
      if (!pt) return [];
      const price = { amount: r.priceAmountMinor, currency: r.currency, period: r.pricePeriod, basis: r.priceBasis, negotiable: r.priceNegotiable };
      // Faqat xavfsiz maydonlar: xom lat/lng/exact bu yerdan chiqmaydi
      return [{ id: r.id, href: `/joylar/${r.id}-${r.slug}`, title: r.title, category: L10.category[r.category], area: r.areaM2 ? Number(r.areaM2) : null,
        price: priceLabel(price, locale), total: totalLabel(price, r.areaM2, locale), thumb: r.thumbKey ? `/api/media/${r.thumbKey}` : null, lat: pt.lat, lng: pt.lng, approx: pt.approx, radiusM: pt.radiusM ?? null }];
    });
    return NextResponse.json({ markers, truncated }, { headers: { "Cache-Control": "public, max-age=30", Vary: "Cookie" } });
  } catch (e) {
    console.error("map error", e);
    return NextResponse.json({ error: t("api.map.fail") }, { status: 500 });
  }
}
