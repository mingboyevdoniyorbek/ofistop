import { publicSiteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { publicCond } from "@/lib/search";
export const dynamic = "force-dynamic";
// Faqat ommaviy sahifalar. Filtr kombinatsiyalari, kabinet, admin va profillar kiritilmaydi.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicSiteUrl();
  const fixed = ["", "/joylar", "/markazlar", "/qoidalar", "/maxfiylik", "/shartlar"].map((p) => ({ url: `${base}${p}` }));
  try {
    const prod = process.env.NODE_ENV === "production"; // production sitemap'ida demo ma'lumot bo'lmaydi
    const [ls, cs] = await Promise.all([
      db().select({ id: s.listings.id, slug: s.listings.slug, u: s.listings.updatedAt }).from(s.listings).where(and(publicCond(), prod ? eq(s.listings.isDemo, false) : undefined)),
      db().select({ id: s.businessCenters.id, slug: s.businessCenters.slug }).from(s.businessCenters).where(prod ? eq(s.businessCenters.isDemo, false) : undefined),
    ]);
    return [...fixed, ...ls.map((l) => ({ url: `${base}/joylar/${l.id}-${l.slug}`, lastModified: l.u })), ...cs.map((c) => ({ url: `${base}/markazlar/${c.id}-${c.slug}` }))];
  } catch { return fixed; }
}
