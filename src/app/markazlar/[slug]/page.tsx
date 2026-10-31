import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { centerIdOf, centerStats } from "@/lib/centers";
import { parseFilters, searchListings } from "@/lib/search";
import Gallery from "@/components/Gallery";
import PlaceMap from "@/components/PlaceMap";
import { mediaUrl } from "@/lib/storage";
import CenterStats from "@/components/CenterStats";
import ListingCard from "@/components/ListingCard";
import { pageAlternates } from "@/lib/seo";
import { getT } from "@/lib/i18n";
import FormSelect from "@/components/FormSelect";
import ViewPing from "@/components/ViewPing";
import CenterBadges from "@/components/CenterBadges";
import { getCurrentUser } from "@/lib/auth";
import { managedCenterIds } from "@/lib/guard";
import ShareButton from "@/components/ShareButton";
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
  return { title: r.c.name, description: desc, alternates: await pageAlternates(`/markazlar/${r.c.id}-${r.c.slug}`), openGraph: { title: r.c.name, description: desc, type: "website" } };
}
export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, t } = await getT(); const id = centerIdOf((await params).slug); const r = id ? await load(id, locale === "ru") : null; if (!r) notFound();
  const sp = await searchParams;
  const f = parseFilters({ ...sp, center: r.c.id, priceMode: "total" });
  const [rooms, stats, amen] = await Promise.all([searchListings(f, locale), centerStats([r.c.id]), db().select().from(s.amenities)]);
  const pictures = await db().select().from(s.businessCenterImages).where(and(eq(s.businessCenterImages.centerId,r.c.id),eq(s.businessCenterImages.pending,false))).orderBy(s.businessCenterImages.position);
  const names = new Map(amen.map((a) => [a.code, locale === "ru" ? a.nameRu : a.nameUz]));
  const ru = locale === "ru";
  const viewer = await getCurrentUser().catch(() => null);
  const isMember = !!viewer && (await managedCenterIds(viewer.id)).includes(r.c.id);
  const pager = (page: number) => { const q = new URLSearchParams(); for (const [key,value] of Object.entries(sp)) { if (typeof value === "string") q.set(key,value); } q.set("page",String(page)); return `?${q}#xonalar`; };
  const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2";
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link href="/markazlar" className="mb-4 inline-block text-sm text-brand">{t("ctr.back")}</Link>
      <ViewPing id={r.c.id} kind="center" />
      <h1 className="text-3xl font-bold">{r.c.name}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-3"><CenterBadges c={r.c} ru={ru} /><ShareButton path={`/markazlar/${r.c.id}-${r.c.slug}`} title={r.c.name} text={[r.district, r.region].filter(Boolean).join(", ")} /></div>
      {r.c.tagline && <p className="mt-2 text-lg text-brand">{r.c.tagline}</p>}
      <p className="text-slate-600">{[r.district, r.region].filter(Boolean).join(", ")} · {r.c.address}</p>
      {r.c.isDemo && <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded p-2">{t("ctr.demoLong")}</p>}
      <div className="mt-4 grid gap-6 md:grid-cols-[1fr_280px]">
        <div className="space-y-3">
          <Gallery images={pictures.flatMap(p => {const url=mediaUrl(p.storageKey);return url?[{url,thumb:url}]:[];})} alt={r.c.name} fallback={t("ctr.noImg")} />
          {r.c.lat && r.c.lng && <PlaceMap lat={Number(r.c.lat)} lng={Number(r.c.lng)} approx={false} radiusM={null} />}
          {r.c.description && <section className="py-4"><h2 className="mb-3 text-xl font-semibold">{ru ? "О центре" : "Markaz haqida"}</h2><p className="whitespace-pre-line leading-relaxed text-slate-700">{r.c.description}</p></section>}
          {r.c.amenities.length > 0 && <section><h2 className="mb-3 font-semibold">{t("ctr.common")}</h2><ul className="flex flex-wrap gap-2">{r.c.amenities.map(a => <li key={a} className="rounded-full bg-blue-50 px-3 py-2 text-sm text-brand">✓ {names.get(a) ?? a}</li>)}</ul></section>}
        </div>
        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4 self-start md:sticky md:top-4">
          <div><p className="text-xs text-slate-500 mb-1">{t("ctr.vacantNow")}</p><CenterStats st={stats.get(r.c.id)} /></div>
          <a href="#xonalar" className="block rounded-xl bg-brand px-4 py-3 text-center font-semibold text-white">{ru ? "Выбрать помещение" : "Xona tanlash"}</a>
          {r.c.workingHours && <p className="text-sm"><strong>{ru ? "Часы работы" : "Ish vaqti"}:</strong><br />{r.c.workingHours}</p>}
          {(r.c.contactPhone || r.c.telegramUsername) && <div className="space-y-2 text-sm"><p className="font-medium">{t("ctr.manager")}</p>
            {r.c.contactPhone && <a className="block rounded-xl bg-accent px-4 py-3 text-center font-semibold text-white" href={`tel:${r.c.contactPhone}`}>{r.c.contactPhone}</a>}
            {r.c.telegramUsername && <a className="block rounded-xl border border-brand px-4 py-3 text-center text-brand" href={`https://t.me/${encodeURIComponent(r.c.telegramUsername)}`} target="_blank" rel="noopener noreferrer">Telegram</a>}</div>}
          {!isMember && !r.c.isDemo && <div className="border-t border-slate-200 pt-4 text-sm">
            <p className="font-medium">{ru ? "Это ваш центр?" : "Bu markaz sizniki?"}</p>
            <p className="mt-1 text-slate-600">{ru ? "Получите доступ к управлению страницей и помещениями." : "Sahifa va xonalarni boshqarish huquqini oling."}</p>
            <Link href={`/markazlar/ariza?markaz=${r.c.id}`} className="mt-2 inline-block font-semibold text-brand underline">{ru ? "Запросить управление →" : "Boshqaruvni so‘rash →"}</Link>
          </div>}
          {r.c.website && /^https?:\/\//.test(r.c.website) && <a href={r.c.website} target="_blank" rel="noopener noreferrer" className="block text-sm text-brand underline">{ru ? "Сайт центра ↗" : "Markaz veb-sayti ↗"}</a>}
        </aside>
      </div>
      <section className="mt-10 scroll-mt-4" id="xonalar">
        <h2 className="text-2xl font-bold mb-4">{t("ctr.rooms")} · {rooms.total}</h2>
        <form className="mb-6 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4" action="#xonalar">
          <label className="text-sm">{ru ? "Площадь от, м²" : "Maydon, m² dan"}<input className={field} name="areaMin" inputMode="decimal" defaultValue={f.areaMin} /></label>
          <label className="text-sm">{ru ? "Площадь до, м²" : "Maydon, m² gacha"}<input className={field} name="areaMax" inputMode="decimal" defaultValue={f.areaMax} /></label>
          <label className="text-sm">{ru ? "Месячный бюджет до" : "Oylik budjet, gacha"}<input className={field} name="priceMax" inputMode="decimal" defaultValue={f.priceMax} /></label>
          <label className="text-sm">{t("f.currency")}<FormSelect className={field} name="currency" defaultValue={f.currency}><option>UZS</option><option>USD</option></FormSelect></label>
          <input type="hidden" name="period" value="month" />
          <label className="text-sm">{ru ? "Этаж" : "Qavat"}<input className={field} name="floor" inputMode="numeric" defaultValue={f.floor} /></label>
          <label className="text-sm">{ru ? "Сортировка" : "Saralash"}<FormSelect className={field} name="sort" defaultValue={f.sort}><option value="new">{ru ? "Сначала новые" : "Avval yangilari"}</option><option value="price_asc">{ru ? "Дешевле за помещение" : "Jami ijara arzonroq"}</option><option value="area_asc">{ru ? "Меньшая площадь" : "Maydoni kichikroq"}</option><option value="area_desc">{ru ? "Большая площадь" : "Maydoni kattaroq"}</option></FormSelect></label>
          <button className="self-end rounded-lg bg-brand px-4 py-2 text-white">{t("home.search")}</button>
          <Link className="self-end px-4 py-2 text-sm text-brand underline" href={`/markazlar/${r.c.id}-${r.c.slug}#xonalar`}>{ru ? "Сбросить" : "Tozalash"}</Link>
        </form>
        {!!f.errors?.length && <p role="alert" className="mb-4 text-red-700">{ru ? "Проверьте значения фильтров." : "Filtr qiymatlarini tekshiring."}</p>}
        {rooms.items.length === 0 ? <p className="text-slate-600">{t("ctr.noRooms")}</p>
          : <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">{rooms.items.map((it) => <ListingCard key={it.id} it={it} />)}</div>}
        {rooms.pages > 1 && <nav aria-label={ru ? "Страницы помещений" : "Xonalar sahifalari"} className="mt-6 flex items-center justify-center gap-4">{f.page > 1 && <Link href={pager(f.page-1)} className="rounded-lg border px-4 py-2">←</Link>}<span>{f.page} / {rooms.pages}</span>{f.page < rooms.pages && <Link href={pager(f.page+1)} className="rounded-lg border px-4 py-2">→</Link>}</nav>}
      </section>
      <p className="mt-6"><Link href="/markazlar" className="text-brand hover:underline">{t("ctr.back")}</Link></p>
    </div>
  );
}
