import { publicSiteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { publicCond } from "@/lib/search";
import { LANDING_CATS, placesWithListings } from "@/lib/landing";
export const dynamic = "force-dynamic";
// Faqat ommaviy sahifalar (har biri o'zbekcha va /ru/ ruscha manzil bilan). Filtr kombinatsiyalari, kabinet va admin kiritilmaydi.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicSiteUrl();
  const entry = (p: string, extra: Partial<MetadataRoute.Sitemap[number]> = {}) => {
    const ru = p === "" ? "/ru" : `/ru${p}`;
    return [{ url: `${base}${p}`, alternates: { languages: { uz: `${base}${p}`, ru: `${base}${ru}` } }, ...extra },
      { url: `${base}${ru}`, alternates: { languages: { uz: `${base}${p}`, ru: `${base}${ru}` } }, ...extra }];
  };
  const fixed = ["", "/joylar", "/markazlar", "/biz-haqimizda", "/qoidalar", "/maxfiylik", "/shartlar", ...Object.keys(LANDING_CATS).map((k) => `/ijara/${k}`)].flatMap((p) => entry(p));
  try {
    const prod = process.env.NODE_ENV === "production"; // production sitemap'ida demo ma'lumot bo'lmaydi
    const [ls, cs, ...places] = await Promise.all([
      db().select({ id: s.listings.id, slug: s.listings.slug, u: s.listings.updatedAt }).from(s.listings).where(and(publicCond(), prod ? eq(s.listings.isDemo, false) : undefined)),
      db().select({ id: s.businessCenters.id, slug: s.businessCenters.slug }).from(s.businessCenters).where(prod ? eq(s.businessCenters.isDemo, false) : undefined),
      ...Object.values(LANDING_CATS).map((c) => placesWithListings(c.cat)),
    ]);
    const landing = Object.keys(LANDING_CATS).flatMap((k, i) => places[i].map((p) => `/ijara/${k}/${p.slug}`));
    return [...fixed, ...landing.flatMap((p) => entry(p)),
      ...ls.flatMap((l) => entry(`/joylar/${l.id}-${l.slug}`, { lastModified: l.u })),
      ...cs.flatMap((c) => entry(`/markazlar/${c.id}-${c.slug}`))];
  } catch { return fixed; }
}
