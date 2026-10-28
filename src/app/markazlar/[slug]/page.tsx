import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { centerIdOf, centerStats } from "@/lib/centers";
import { parseFilters, searchListings } from "@/lib/search";
import Gallery from "@/components/Gallery";
import PlaceMap from "@/components/PlaceMap";
import { mediaUrl } from "@/lib/storage";
import CenterStats from "@/components/CenterStats";
import ListingCard from "@/components/ListingCard";
import { getT } from "@/lib/i18n";
export const dynamic = "force-dynamic";

async function load(id: string, ru = false) {
  const [c] = await db().select({ c: s.businessCenters, region: ru ? s.regions.nameRu : s.regions.nameUz, district: ru ? s.districts.nameRu : s.districts.nameUz })
    .from(s.businessCenters).innerJoin(s.regions, eq(s.regions.id, s.businessCenters.regionId))
    .leftJoin(s.districts, eq(s.districts.id, s.businessCenters.districtId)).where(eq(s.businessCenters.id, id)).limit(1);
  return c;
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { locale, t } = await getT(); const id = centerIdOf((await params).slug); const r = id ? await load(id, locale === "ru").catch(() => null) : null;
  if (!r) return { title: t("ctr.notFound"), robots: { index: false } };
  const desc = `${r.c.name} — ${[r.district, r.region].filter(Boolean).join(", ")}. ${(r.c.description ?? "").slice(0, 120)}`;
  return { title: r.c.name, description: desc, alternates: { canonical: `/markazlar/${r.c.id}-${r.c.slug}` }, openGraph: { title: r.c.name, description: desc, type: "website" } };
}
export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, t } = await getT(); const id = centerIdOf((await params).slug); const r = id ? await load(id, locale === "ru") : null; if (!r) notFound();
  const sp = await searchParams;
  const f = parseFilters({ ...sp, center: r.c.id });
  const [rooms, stats, amen] = await Promise.all([searchListings(f, locale), centerStats([r.c.id]), db().select().from(s.amenities)]);
  const pictures = await db().select().from(s.businessCenterImages).where(eq(s.businessCenterImages.centerId,r.c.id)).orderBy(s.businessCenterImages.position);
  const names = new Map(amen.map((a) => [a.code, locale === "ru" ? a.nameRu : a.nameUz]));
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold">{r.c.name}</h1>
      <p className="text-slate-600">{[r.district, r.region].filter(Boolean).join(", ")} · {r.c.address}</p>
      {r.c.isDemo && <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded p-2">{t("ctr.demoLong")}</p>}
      <div className="mt-4 grid gap-6 md:grid-cols-[1fr_280px]">
        <div className="space-y-3">
          <Gallery images={pictures.flatMap(p => {const url=mediaUrl(p.storageKey);return url?[{url,thumb:url}]:[];})} alt={r.c.name} fallback={t("ctr.noImg")} />
          {r.c.lat && r.c.lng && <PlaceMap lat={Number(r.c.lat)} lng={Number(r.c.lng)} approx={false} radiusM={null} />}
          {r.c.description && <p className="whitespace-pre-line">{r.c.description}</p>}
          {r.c.amenities.length > 0 && <p className="text-sm"><strong>{t("ctr.common")}:</strong> {r.c.amenities.map((a) => names.get(a) ?? a).join(", ")}</p>}
        </div>
        <aside className="rounded border border-slate-200 p-4 space-y-3 self-start">
          <div><p className="text-xs text-slate-500 mb-1">{t("ctr.vacantNow")}</p><CenterStats st={stats.get(r.c.id)} /></div>
          {(r.c.contactPhone || r.c.telegramUsername) && <div className="text-sm"><p className="font-medium">{t("ctr.manager")}</p>
            {r.c.contactPhone && <a className="text-brand underline block" href={`tel:${r.c.contactPhone}`}>{r.c.contactPhone}</a>}
            {r.c.telegramUsername && <a className="text-brand underline block" href={`https://t.me/${encodeURIComponent(r.c.telegramUsername)}`} target="_blank" rel="noopener noreferrer">Telegram</a>}</div>}
        </aside>
      </div>
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3">{t("ctr.rooms")}</h2>
        {rooms.items.length === 0 ? <p className="text-slate-600">{t("ctr.noRooms")}</p>
          : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rooms.items.map((it) => <ListingCard key={it.id} it={it} />)}</div>}
        {rooms.pages > 1 && <p className="mt-4 text-sm text-slate-600">{t("ctr.allRooms")} <Link className="text-brand underline" href={`/joylar?center=${r.c.id}`}>{t("ctr.inCatalog")}</Link></p>}
      </section>
      <p className="mt-6"><Link href="/markazlar" className="text-brand hover:underline">{t("ctr.back")}</Link></p>
    </div>
  );
}
