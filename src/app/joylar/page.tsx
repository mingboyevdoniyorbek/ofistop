import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { parseFilters, searchListings } from "@/lib/search";
import ListingCard from "@/components/ListingCard";
import FilterForm from "@/components/FilterForm";
import ListingMap from "@/components/ListingMap";
import { getT } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export async function generateMetadata() { const { t } = await getT(); return { title: t("cat.title"), robots: { index: true, follow: true } }; }

export default async function Catalog({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, t } = await getT();
  const sp = await searchParams;
  const f = parseFilters(sp);
  let data: Awaited<ReturnType<typeof searchListings>> | null = null;
  let regions: { id: number; name: string }[] = [], districts: { id: number; name: string; regionId: number }[] = [], amenities: { code: string; name: string }[] = [];
  const ru = locale === "ru";
  try {
    const d = db();
    [data, regions, districts, amenities] = await Promise.all([
      searchListings(f, locale),
      d.select({ id: s.regions.id, name: ru ? s.regions.nameRu : s.regions.nameUz }).from(s.regions).orderBy(asc(s.regions.id)),
      d.select({ id: s.districts.id, name: ru ? s.districts.nameRu : s.districts.nameUz, regionId: s.districts.regionId }).from(s.districts).orderBy(asc(ru ? s.districts.nameRu : s.districts.nameUz)),
      d.select({ code: s.amenities.code, name: ru ? s.amenities.nameRu : s.amenities.nameUz }).from(s.amenities).orderBy(asc(ru ? s.amenities.nameRu : s.amenities.nameUz)),
    ]);
  } catch (e) { console.error("catalog error", e); }

  if (data && data.items.length === 0 && f.page > 1 && data.total > 0) {
    const u = new URLSearchParams(); for (const [k, v] of Object.entries(sp)) for (const x of Array.isArray(v) ? v : v ? [v] : []) u.append(k, x);
    u.set("page", String(data.pages)); redirect(`/joylar?${u}`);
  }

  const view = (Array.isArray(sp.view) ? sp.view[0] : sp.view) === "map" ? "map" : "list";
  const mapQuery = (() => { const u = new URLSearchParams(); for (const [k, v] of Object.entries(sp)) { if (k === "view" || k === "page") continue; for (const x of Array.isArray(v) ? v : v ? [v] : []) u.append(k, x); } return u.toString(); })();
  const qs = (over: Record<string, string>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) for (const x of Array.isArray(v) ? v : v ? [v] : []) u.append(k, x);
    for (const [k, v] of Object.entries(over)) u.set(k, v);
    return `/joylar?${u}`;
  };
  const sorts = (["new", "price_asc", "price_desc", "area_asc", "area_desc"] as const).map((k) => [k, t(`sort.${k}`)] as [string, string]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside>
        <details className="lg:hidden rounded border border-slate-300 p-3" open={false}>
          <summary className="cursor-pointer font-medium">{t("cat.filters")}</summary>
          <div className="mt-3"><FilterForm view={view} f={f} regions={regions} districts={districts} amenities={amenities} /></div>
        </details>
        <div className="hidden lg:block"><FilterForm view={view} f={f} regions={regions} districts={districts} amenities={amenities} /></div>
      </aside>
      <section>
        {!!f.errors?.length && <p role="alert" className="mb-3 rounded bg-red-50 p-3 text-red-800">{locale === "ru" ? "Проверьте диапазоны чисел и дату" : f.errors.join(". ")}</p>}
        {data === null ? (
          <div role="alert" className="rounded border border-red-300 bg-red-50 p-4 text-red-800">{t("cat.loadFail")} <Link href="/joylar" className="underline">{t("cat.retry")}</Link>.</div>
        ) : (<>
          <div className="flex gap-1.5 mb-3 text-sm" role="group" aria-label={t("cat.view")}>
            <Link href={qs({ view: "list" })} aria-current={view === "list"} className={`rounded border px-3 py-1.5 ${view === "list" ? "border-brand bg-brand text-white" : "border-slate-300"}`}>{t("cat.list")}</Link>
            <Link href={qs({ view: "map" })} aria-current={view === "map"} className={`rounded border px-3 py-1.5 ${view === "map" ? "border-brand bg-brand text-white" : "border-slate-300"}`}>{t("cat.map")}</Link>
          </div>
          {view === "map" ? <ListingMap query={mapQuery} listHref={qs({ view: "list" })} /> : <>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-sm">
            <p>{t("cat.results", { n: data.total })}</p>
            <div className="flex flex-wrap gap-1.5" aria-label={t("cat.sortAria")}>
              {sorts.map(([k, v]) => <Link key={k} href={qs({ sort: k, page: "1" })} aria-current={f.sort === k} className={`rounded-full border px-2.5 py-1 ${f.sort === k ? "border-brand bg-brand text-white" : "border-slate-300"}`}>{v}</Link>)}
            </div>
          </div>
          {(f.sort === "price_asc" || f.sort === "price_desc") && <p className="text-xs text-slate-500 mb-2">{t("cat.sortNote", { cur: f.currency, period: t(`period.${f.period}`), basis: t(`basis.${f.basis}`) })}</p>}
          {data.items.length === 0 ? (
            <div className="rounded border border-slate-200 p-6 text-center">
              <p className="font-medium">{t("cat.empty")}</p>
              <p className="text-sm text-slate-600 mt-1">{t("cat.emptyHint")}</p>
              <Link href="/joylar" className="inline-block mt-3 rounded bg-brand text-white px-4 py-2 text-sm">{t("cat.clear")}</Link>
            </div>
          ) : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.items.map((it) => <ListingCard key={it.id} it={it} />)}</div>}
          {data.pages > 1 && (
            <nav className="flex justify-center gap-3 mt-6 text-sm" aria-label={t("cat.pages")}>
              {f.page > 1 && <Link href={qs({ page: String(f.page - 1) })} className="rounded border px-3 py-1.5">{t("cat.prev")}</Link>}
              <span className="py-1.5">{f.page} / {data.pages}</span>
              {f.page < data.pages && <Link href={qs({ page: String(f.page + 1) })} className="rounded border px-3 py-1.5">{t("cat.next")}</Link>}
            </nav>
          )}
        </>}
        </>)}
      </section>
    </div>
  );
}
