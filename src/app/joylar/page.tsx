import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { parseFilters, searchListings } from "@/lib/search";
import ListingCard from "@/components/ListingCard";
import { pageAlternates } from "@/lib/seo";
import FilterForm from "@/components/FilterForm";
import ListingMap from "@/components/ListingMap";
import { getT } from "@/lib/i18n";
import SearchTools from "@/components/SearchTools";
import SearchRestore from "@/components/SearchRestore";

export const dynamic = "force-dynamic";
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, locale } = await getT(); const ru = locale === "ru";
  // Filtr kombinatsiyalari indekslanmaydi (ular uchun /ijara/... sahifalari bor); asosiy katalog — canonical.
  const filtered = Object.keys(await searchParams).some((k) => k !== "page" && k !== "view");
  return { title: t("cat.title"),
    description: ru ? "Каталог офисов, магазинов, складов, зданий и других коммерческих помещений в аренду и на продажу: фильтры по цене, площади, району и карта." : "Ofis, do‘kon, ombor, bino va boshqa tijorat joylari ijarasi va sotuvi katalogi: narx, maydon, tuman bo‘yicha filtrlar va xarita.",
    robots: { index: !filtered, follow: true }, alternates: await pageAlternates("/joylar") };
}

export default async function Catalog({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, t } = await getT();
  const sp = await searchParams;
  const f = parseFilters({ ...sp, priceMode: sp.priceMode ?? "total" });
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
  const mapQuery = (() => { const u = new URLSearchParams(); for (const [k, v] of Object.entries(sp)) { if (k === "view" || k === "page") continue; for (const x of Array.isArray(v) ? v : v ? [v] : []) u.append(k, x); } if (!u.has("priceMode")) u.set("priceMode", "total"); return u.toString(); })();
  const qs = (over: Record<string, string>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) for (const x of Array.isArray(v) ? v : v ? [v] : []) u.append(k, x);
    for (const [k, v] of Object.entries(over)) u.set(k, v);
    return `/joylar?${u}`;
  };
  // Ijara / sotuv tanlovi: narx filtrlari turga bog'liq bo'lgani uchun almashganda narx/davr/sahifa tozalanadi.
  const dealHref = (deal: "" | "sale") => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) { if (["deal", "page", "priceMin", "priceMax", "period", "sort"].includes(k)) continue; for (const x of Array.isArray(v) ? v : v ? [v] : []) u.append(k, x); }
    if (deal) u.set("deal", deal);
    const q = u.toString(); return q ? `/joylar?${q}` : "/joylar";
  };
  const deals = [["", ru ? "Аренда" : "Ijara"], ["sale", ru ? "Продажа" : "Sotuv"]] as const;
  const dealKey = f.deal === "sale" ? "sale" : "";
  const sorts = (["new", "price_asc", "price_desc", "area_asc", "area_desc"] as const).map((k) => [k, t(`sort.${k}`)] as [string, string]);

  return (
    <div className={`mx-auto max-w-[1440px] px-3 py-5 sm:px-6 ${view === "map" ? "space-y-4" : "grid gap-6 lg:grid-cols-[280px_1fr]"}`}>
      <SearchRestore/>
      <aside>
        <details className={`${view === "map" ? "" : "lg:hidden"} rounded-2xl border border-slate-200 bg-white p-3`} open={sp.filtr === "1"}>
          <summary className="cursor-pointer font-medium">{t("cat.filters")}</summary>
          <div className="mt-3"><FilterForm view={view} f={f} regions={regions} districts={districts} amenities={amenities} /></div>
        </details>
        {view !== "map" && <div className="hidden rounded-2xl border border-slate-200 bg-white p-4 lg:block"><FilterForm view={view} f={f} regions={regions} districts={districts} amenities={amenities} /></div>}
      </aside>
      <section className="min-w-0">
        <h1 className="mb-3 text-2xl font-bold text-brand-dark">{locale === "ru" ? "Найдите место для бизнеса" : "Biznesingizga mos joyni toping"}</h1>
        <nav aria-label={ru ? "Тип сделки" : "Bitim turi"} className="mb-4 inline-flex rounded-xl bg-slate-100 p-1 text-sm font-semibold">
          {deals.map(([k, v]) => <Link key={k} href={dealHref(k)} aria-current={dealKey === k ? "page" : undefined}
            className={`rounded-lg px-4 py-1.5 ${dealKey === k ? "bg-white text-brand shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{v}</Link>)}
        </nav>
        <SearchTools key={mapQuery} query={`${mapQuery}&view=${view}`} regions={regions} districts={districts} amenities={amenities}/>
        {!!f.errors?.length && <p role="alert" className="mb-3 rounded bg-red-50 p-3 text-red-800">{locale === "ru" ? "Проверьте диапазоны чисел и дату" : f.errors.join(". ")}</p>}
        {data === null ? (
          <div role="alert" className="rounded border border-red-300 bg-red-50 p-4 text-red-800">{t("cat.loadFail")} <Link href="/joylar" className="underline">{t("cat.retry")}</Link>.</div>
        ) : (<>
          <div className="flex gap-1.5 mb-3 text-sm" role="group" aria-label={t("cat.view")}>
            <Link href={qs({ view: "list" })} aria-current={view === "list"} className={`rounded border px-3 py-1.5 ${view === "list" ? "border-brand bg-brand text-white" : "border-slate-300"}`}>{t("cat.list")}</Link>
            <Link href={qs({ view: "map" })} aria-current={view === "map"} className={`rounded border px-3 py-1.5 ${view === "map" ? "border-brand bg-brand text-white" : "border-slate-300"}`}>{t("cat.map")}<span className="hidden lg:inline"> + {ru ? "список" : "ro‘yxat"}</span></Link>
          </div>
          {view === "map" ? <ListingMap query={mapQuery} listHref={qs({ view: "list" })}><p className="mb-3 font-semibold">{t("cat.results", { n: data.total })}</p><div className="space-y-3">{data.items.map(it => <ListingCard key={it.id} it={it}/>)}</div>{data.pages > 1 && <Link className="mt-4 block text-brand underline" href={qs({ view: "list", page: "1" })}>{locale === "ru" ? "Все результаты" : "Barcha natijalar"}</Link>}</ListingMap> : <>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-sm">
            <p>{t("cat.results", { n: data.total })}</p>
            <div className="flex flex-wrap gap-1.5" aria-label={t("cat.sortAria")}>
              {sorts.map(([k, v]) => <Link key={k} href={qs({ sort: k, page: "1" })} aria-current={f.sort === k} className={`rounded-full border px-2.5 py-1 ${f.sort === k ? "border-brand bg-brand text-white" : "border-slate-300"}`}>{v}</Link>)}
            </div>
          </div>
          {(f.sort === "price_asc" || f.sort === "price_desc") && <p className="text-xs text-slate-500 mb-2">{f.deal === "sale" ? (ru ? "Сначала цены в выбранной валюте; другие ниже." : "Avval tanlangan valyutadagi narxlar; boshqalari keyin.") : ru ? "Сначала общая аренда в выбранной валюте и периоде; другие цены ниже." : "Avval tanlangan valyuta va davrdagi jami ijara; boshqa narxlar keyin."} {f.currency}{f.deal === "sale" ? "" : ` / ${t(`period.${f.period}`)}`}</p>}
          {data.items.length === 0 ? (
            <div className="rounded border border-slate-200 p-6 text-center">
              <p className="font-medium">{t("cat.empty")}</p>
              <p className="text-sm text-slate-600 mt-1">{t("cat.emptyHint")}</p>
              <Link href="/joylar" className="inline-block mt-3 rounded bg-brand text-white px-4 py-2 text-sm">{t("cat.clear")}</Link>
            </div>
          ) : <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">{data.items.map((it) => <ListingCard key={it.id} it={it} />)}</div>}
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
