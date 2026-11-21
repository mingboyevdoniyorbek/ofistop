import Link from "next/link";
import { centerStats, listCenters, matchingRoomsByCenter } from "@/lib/centers";
import { asc } from "drizzle-orm";
import { db, schema as dbs } from "@/db/client";
import { parseFilters } from "@/lib/search";
import FormSelect from "@/components/FormSelect";
import RegionDistrictFields from "@/components/RegionDistrictFields";
import { getT } from "@/lib/i18n";
import { mediaUrl } from "@/lib/storage";
import { searchKey } from "@/lib/text";
import { pageAlternates } from "@/lib/seo";
import CenterCta from "@/components/CenterCta";
import { isFeatured } from "@/components/CenterBadges";
import { shortPrice } from "@/lib/format";
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
  const currency: "USD" | "UZS" = one(sp.currency) === "USD" ? "USD" : "UZS";
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
  const filterCount = [region || district, areaMin || areaMax, priceMax, vacant, verified, sort !== "recommended"].filter(Boolean).length;
  const field = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2";
  const nm = (x: { nameUz: string; nameRu: string }) => (ru ? x.nameRu : x.nameUz);
  return <div className="mx-auto max-w-6xl px-4 py-8">
    {/* Tepada faqat sarlavha va qidiruv — bannerlar ro'yxat oxirida */}
    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{ru ? "Бизнес-центры" : "Biznes markazlar"}</h1>
    <p className="mt-1 text-sm text-slate-500">{ru ? "Свободные помещения и прямая связь с представителем центра" : "Bo‘sh xonalar va markaz vakili bilan to‘g‘ridan-to‘g‘ri aloqa"}</p>
    <section aria-labelledby="ctr-filter-h" className="mt-4">
      <h2 id="ctr-filter-h" className="sr-only">{ru ? "Фильтр" : "Filtr"}</h2>
      {/* Tez qidiruv doim ko'rinadi; qolgan filtrlar yig'iladigan "Filtrlar" ichida (faol filtr bo'lsa ochiq) */}
      <form action="/markazlar" className="space-y-3">
        <div className="flex gap-2">
          <input name="q" type="search" enterKeyHint="search" defaultValue={q} aria-label={ru ? "Название, район или ориентир" : "Markaz nomi, tuman yoki mo‘ljal"} className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5" placeholder={ru ? "Название центра, район…" : "Markaz nomi, tuman…"} />
          <button className="shrink-0 rounded-xl bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark">{t("home.search")}</button>
        </div>
        <details className="group rounded-2xl border border-slate-200 bg-white" open={filterCount > 0}>
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true" className="transition group-open:rotate-90">▶</span>{ru ? "Фильтры" : "Filtrlar"}
            {filterCount > 0 && <span className="rounded-full bg-brand px-2 py-0.5 text-xs text-white">{filterCount}</span>}
            {active && <Link href="/markazlar" className="ml-auto text-sm font-normal text-brand-dark underline">{ru ? "Сбросить" : "Tozalash"}</Link>}
          </summary>
          <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="flex flex-col justify-center gap-1.5 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name="vacant" value="1" defaultChecked={vacant} />{ru ? "Только со свободными помещениями" : "Faqat bo‘sh xonasi bor"}</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="verified" value="1" defaultChecked={verified} />{ru ? "Только проверенные" : "Faqat tasdiqlanganlar"}</label>
            </div>
            <button className="self-end rounded-xl bg-brand px-6 py-2.5 font-semibold text-white hover:bg-brand-dark sm:col-span-2 lg:col-span-1">{ru ? "Применить" : "Qo‘llash"}</button>
          </div>
        </details>
        {f.errors?.length ? <p role="alert" className="text-sm text-red-700">{f.errors.join(". ")}</p> : null}
      </form>
    </section>
    <h2 className="mb-4 mt-6 text-sm font-semibold text-slate-500">{ru ? `Найдено: ${shown.length}` : `${shown.length} ta markaz`}</h2>
    {!shown.length ? <div className="rounded-2xl border border-dashed p-8"><p>{centers.length ? (ru ? "По этим условиям центров нет." : "Bu shartlarga mos markaz topilmadi.") : t("ctr.empty")}</p>{active && <Link href="/markazlar" className="mt-3 inline-block text-brand underline">{ru ? "Сбросить фильтры" : "Filtrlarni tozalash"}</Link>}</div> :
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{shown.map(c => { const cover = mediaUrl(c.cover); const m = match.get(c.id); const st = stats.get(c.id);
        const rooms = roomFilter ? m?.rooms ?? 0 : st?.rooms ?? 0;
        const p0 = roomFilter ? (m?.minTotal != null ? { amount: m.minTotal, currency, period: "month" as const, basis: "whole" as const } : null) : st?.prices[0] ? { amount: st.prices[0].min, currency: st.prices[0].currency, period: st.prices[0].period, basis: st.prices[0].basis } : null;
        return <Link key={c.id} href={`/markazlar/${c.id}-${c.slug}${roomFilter ? `?${new URLSearchParams({ ...(areaMin ? { areaMin } : {}), ...(areaMax ? { areaMax } : {}), ...(priceMax ? { priceMax, currency } : {}) })}#xonalar` : ""}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-brand/40 hover:shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {cover ? <img src={cover} alt={c.name} loading="lazy" className="aspect-[2/1] w-full object-cover" /> : <div className="grid h-20 place-items-center bg-gradient-to-br from-blue-50 to-slate-100 text-2xl font-bold text-brand/60" aria-hidden="true">{c.name.slice(0,2).toUpperCase()}</div>}
        <div className="p-4">
          <h3 className="flex items-center gap-1.5 text-lg font-bold text-slate-900"><span className="truncate">{c.name}</span>
            {c.verifiedAt && <span title={ru ? "Проверенный центр" : "Tasdiqlangan markaz"} aria-label={ru ? "Проверенный центр" : "Tasdiqlangan markaz"} className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-[11px] text-white">✓</span>}
            {isFeatured(c) && <span title={ru ? "Рекомендуем" : "Tavsiya etiladi"} className="shrink-0 text-amber-500">★</span>}</h3>
          <p className="truncate text-sm text-slate-500">{[c.district, c.address].filter(Boolean).join(" · ") || c.region}</p>
          {/* Eng muhim ma'lumot: nechta bo'sh xona va narxi qanchadan */}
          {rooms > 0 ? <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-[15px] font-bold text-green-800">{ru ? `${rooms} свободн. ${rooms === 1 ? "помещение" : "помещений"}` : `${rooms} ta bo‘sh xona`}{p0 && <span className="font-semibold"> · {ru ? "от " : ""}{shortPrice(p0, null, locale)}{ru ? "" : " dan"}</span>}</p>
            : <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-500">{t("ctr.stat.none")}</p>}
          {c.isDemo && <p className="mt-2 text-xs text-amber-800">{t("ctr.demo")}</p>}
        </div>
      </Link>; })}</div>}
    <div className="mt-10"><CenterCta variant="compact" /></div>
    <p className="mt-3 text-center text-sm"><Link href="/kabinet/markazlar" className="text-brand underline">{ru ? "Кабинет представителя центра" : "Markaz vakili kabineti"}</Link></p>
  </div>;
}
