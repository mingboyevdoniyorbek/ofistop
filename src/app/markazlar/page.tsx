import Link from "next/link";
import { centerStats, listCenters, matchingRoomsByCenter } from "@/lib/centers";
import { asc } from "drizzle-orm";
import { db, schema as dbs } from "@/db/client";
import { parseFilters } from "@/lib/search";
import { formatMinor } from "@/lib/money";
import FormSelect from "@/components/FormSelect";
import RegionDistrictFields from "@/components/RegionDistrictFields";
import CenterStats from "@/components/CenterStats";
import { getT } from "@/lib/i18n";
import { mediaUrl } from "@/lib/storage";
import { searchKey } from "@/lib/text";
import { pageAlternates } from "@/lib/seo";
import CenterCta from "@/components/CenterCta";
import CenterBadges from "@/components/CenterBadges";
export const dynamic = "force-dynamic";
export async function generateMetadata() { const { t } = await getT(); return { title: t("ctr.title"), description: t("ctr.desc"), alternates: await pageAlternates("/markazlar") }; }
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const SORTS = ["recommended", "rooms", "price", "name"] as const;

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const { locale, t } = await getT(); const ru = locale === "ru";
  const sp = await searchParams;
  const q = one(sp.q), vacant = one(sp.vacant) === "1", verified = one(sp.verified) === "1";
  const region = one(sp.region), district = one(sp.district), areaMin = one(sp.areaMin), areaMax = one(sp.areaMax), priceMax = one(sp.priceMax);
  const currency = one(sp.currency) === "USD" ? "USD" : "UZS";
  const sort = (SORTS as readonly string[]).includes(one(sp.sort)) ? (one(sp.sort) as (typeof SORTS)[number]) : "recommended";
  // Xona shartlari (maydon, budjet) bo'lsa — markazda shunday bo'sh xona bo'lishi kerak.
  const roomFilter = !!(areaMin || areaMax || priceMax);
  const f = parseFilters({ areaMin, areaMax, priceMax, currency, period: "month", priceMode: "total" });
  const [centers, regions, districts] = await Promise.all([
    listCenters(locale).catch(() => null),
    db().select().from(dbs.regions).orderBy(asc(dbs.regions.nameUz)), db().select().from(dbs.districts).orderBy(asc(dbs.districts.nameUz)),
  ]);
  if (!centers) return <div className="mx-auto max-w-6xl px-4 py-8"><p role="alert" className="text-red-700">{t("ctr.loadFail")}</p></div>;
  const [stats, match] = await Promise.all([centerStats(centers.map(c => c.id)), matchingRoomsByCenter(f)]);
  const shown = centers.filter(c => (!q || searchKey([c.name, c.address, c.region, c.district].join(" ")).includes(searchKey(q)))
    && (!region || String(c.regionId) === region) && (!district || String(c.districtId) === district)
    && (!vacant || (stats.get(c.id)?.rooms ?? 0) > 0) && (!verified || !!c.verifiedAt)
    && (!roomFilter || (match.get(c.id)?.rooms ?? 0) > 0));
  const minPrice = (id: string) => match.get(id)?.minTotal ?? null;
  if (sort === "rooms") shown.sort((a, b) => ((roomFilter ? match.get(b.id)?.rooms : stats.get(b.id)?.rooms) ?? 0) - ((roomFilter ? match.get(a.id)?.rooms : stats.get(a.id)?.rooms) ?? 0));
  if (sort === "price") shown.sort((a, b) => { const x = minPrice(a.id), y = minPrice(b.id); return x == null ? 1 : y == null ? -1 : x < y ? -1 : x > y ? 1 : 0; });
  if (sort === "name") shown.sort((a, b) => a.name.localeCompare(b.name, ru ? "ru" : "uz"));
  const active = !!(q || region || district || vacant || verified || roomFilter || sort !== "recommended");
  const field = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2";
  const nm = (x: { nameUz: string; nameRu: string }) => (ru ? x.nameRu : x.nameUz);
  return <div className="mx-auto max-w-6xl px-4 py-8">
    <div className="mb-5"><CenterCta variant="compact" /></div>
    <header className="rounded-3xl bg-brand-dark p-6 text-white sm:p-10">
      <p className="mb-2 text-sm text-blue-200">OfisTop · {ru ? "Бизнес-центры" : "Biznes markazlar"}</p>
      <h1 className="text-3xl font-bold">{ru ? "Ваш следующий офис — здесь" : "Keyingi ofisingiz shu yerda"}</h1>
      <p className="mt-3 max-w-2xl text-blue-100">{ru ? "Познакомьтесь с центром, сравните свободные помещения и свяжитесь с представителем напрямую." : "Markaz bilan tanishing, bo‘sh xonalarni solishtiring va vakili bilan to‘g‘ridan-to‘g‘ri bog‘laning."}</p>
    </header>
    <section aria-labelledby="ctr-filter-h" className="mt-6">
      <h2 id="ctr-filter-h" className="sr-only">{ru ? "Фильтр" : "Filtr"}</h2>
      <form action="/markazlar" className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm sm:col-span-2">{ru ? "Название, район или ориентир" : "Markaz nomi, tuman yoki mo‘ljal"}<input name="q" defaultValue={q} className={field} placeholder={ru ? "Например: Ташкент Сити" : "Masalan: Tashkent City"} /></label>
        <RegionDistrictFields regions={regions.map(r => ({ id: r.id, name: nm(r) }))} districts={districts.map(d => ({ id: d.id, regionId: d.regionId, name: nm(d) }))} region={region} district={district} className={field}
          labels={{ region: ru ? "Регион" : "Hudud", district: ru ? "Район" : "Tuman", all: ru ? "Все" : "Hammasi" }} />
        <label className="text-sm">{ru ? "Площадь от, м²" : "Maydon, m² dan"}<input className={field} name="areaMin" inputMode="decimal" defaultValue={areaMin} /></label>
        <label className="text-sm">{ru ? "Площадь до, м²" : "Maydon, m² gacha"}<input className={field} name="areaMax" inputMode="decimal" defaultValue={areaMax} /></label>
        <label className="text-sm">{ru ? "Бюджет в месяц, до" : "Oylik budjet, gacha"}<input className={field} name="priceMax" inputMode="decimal" defaultValue={priceMax} /></label>
        <label className="text-sm">{ru ? "Валюта" : "Valyuta"}<FormSelect className={field} name="currency" defaultValue={currency}><option>UZS</option><option>USD</option></FormSelect></label>
        <label className="text-sm">{ru ? "Сортировка" : "Saralash"}<FormSelect className={field} name="sort" defaultValue={sort}>
          <option value="recommended">{ru ? "Рекомендуемые" : "Tavsiya etilganlar"}</option>
          <option value="rooms">{ru ? "Больше свободных помещений" : "Bo‘sh xonalar ko‘p"}</option>
          <option value="price">{ru ? "Сначала дешевле" : "Avval arzonlari"}</option>
          <option value="name">{ru ? "По названию" : "Nomi bo‘yicha"}</option></FormSelect></label>
        <div className="flex flex-col justify-center gap-1.5 text-sm sm:col-span-2 lg:col-span-1">
          <label className="flex items-center gap-2"><input type="checkbox" name="vacant" value="1" defaultChecked={vacant} />{ru ? "Только со свободными помещениями" : "Faqat bo‘sh xonasi bor"}</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="verified" value="1" defaultChecked={verified} />{ru ? "Только проверенные" : "Faqat tasdiqlanganlar"}</label>
        </div>
        <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-2">
          <button className="flex-1 rounded-xl bg-brand px-6 py-2.5 font-semibold text-white hover:bg-brand-dark">{t("home.search")}</button>
          {active && <Link href="/markazlar" className="py-2.5 text-sm text-brand-dark underline">{ru ? "Сбросить" : "Tozalash"}</Link>}
        </div>
        {f.errors?.length ? <p role="alert" className="text-sm text-red-700 sm:col-span-2 lg:col-span-4">{f.errors.join(". ")}</p> : null}
      </form>
    </section>
    <div className="my-6 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{t("ctr.title")} · {shown.length}</h2><Link href="/kabinet/markazlar" className="text-sm text-brand underline">{ru ? "Кабинет представителя" : "Markaz vakili kabineti"}</Link></div>
    {!shown.length ? <div className="rounded-2xl border border-dashed p-8"><p>{centers.length ? (ru ? "По этим условиям центров нет." : "Bu shartlarga mos markaz topilmadi.") : t("ctr.empty")}</p>{active && <Link href="/markazlar" className="mt-3 inline-block text-brand underline">{ru ? "Сбросить фильтры" : "Filtrlarni tozalash"}</Link>}</div> :
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{shown.map(c => { const cover = mediaUrl(c.cover); const m = match.get(c.id); return <Link key={c.id} href={`/markazlar/${c.id}-${c.slug}${roomFilter ? `?${new URLSearchParams({ ...(areaMin ? { areaMin } : {}), ...(areaMax ? { areaMax } : {}), ...(priceMax ? { priceMax, currency } : {}) })}#xonalar` : ""}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {cover ? <img src={cover} alt={c.name} loading="lazy" className="aspect-[16/9] w-full object-cover" /> : <div className="grid aspect-[16/9] place-items-center bg-blue-50 text-4xl font-bold text-brand" aria-hidden="true">{c.name.slice(0,2).toUpperCase()}</div>}
        <div className="space-y-2 p-5"><h3 className="text-xl font-bold">{c.name}</h3><CenterBadges c={c} ru={ru} />{c.tagline && <p className="line-clamp-2 text-sm">{c.tagline}</p>}<p className="text-sm text-slate-500">{[c.district,c.region,c.address].filter(Boolean).join(" · ")}</p>
          {roomFilter && m ? <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800">{ru ? `Подходящих помещений: ${m.rooms}` : `${m.rooms} ta mos xona`}{m.minTotal != null && ` · ${ru ? "от" : ""} ${formatMinor(m.minTotal)} ${currency}${ru ? "/мес" : " dan / oy"}`}</p> : <CenterStats st={stats.get(c.id)} />}
          {c.isDemo && <p className="text-xs text-amber-800">{t("ctr.demo")}</p>}<p className="pt-2 text-sm font-semibold text-brand">{ru ? "Посмотреть центр и помещения →" : "Markaz va xonalarni ko‘rish →"}</p></div>
      </Link>; })}</div>}
  </div>;
}
