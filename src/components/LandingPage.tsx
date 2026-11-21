import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n";
import { parseFilters, searchListings } from "@/lib/search";
import { LANDING_CATS, isLandingSlug, placesWithListings, resolvePlace, categoryCounts } from "@/lib/landing";
import { breadcrumbJsonLd, absUrl } from "@/lib/seo";
import ListingCard from "./ListingCard";
import JsonLd from "./JsonLd";
import { memo } from "@/lib/memo";
import { METRO, METRO_RU, METRO_PAGE_RADIUS_M, metroBySlug, metroSlug } from "@/lib/metro";

export async function landingData(catSlug: string, placeSlug?: string) {
  if (!isLandingSlug(catSlug)) return null;
  // «metro-oybek» — bekat atrofidagi (~15 daqiqa piyoda) e'lonlar sahifasi
  if (placeSlug?.startsWith("metro-")) {
    const st = metroBySlug(placeSlug.slice(6));
    if (!st) return null;
    return { cat: LANDING_CATS[catSlug], catSlug, place: null, metro: { name: st[0], nameRu: METRO_RU[st[0]] ?? st[0], lat: st[1], lng: st[2] } };
  }
  const place = placeSlug ? await resolvePlace(placeSlug) : null;
  if (placeSlug && !place) return null;
  return { cat: LANDING_CATS[catSlug], catSlug, place, metro: null };
}
type Landing = NonNullable<Awaited<ReturnType<typeof landingData>>>;

/** O'zbekcha «-da» qo'shimchasi: «Chilonzor» → «Chilonzorda», «Toshkent viloyati» → «Toshkent viloyatida». */
const da = (name: string) => `${name}da`;

/** Sahifa sarlavhasi — odamlar qidiradigan shaklda: «Chilonzorda ofis ijarasi», «Аренда офиса у метро Ойбек». */
export function landingTitle(d: Landing, ru: boolean) {
  const base = ru ? d.cat.ru : d.cat.uz;
  const lower = base.charAt(0).toLowerCase() + base.slice(1);
  if (d.metro) return ru ? `${base} у метро ${d.metro.nameRu}` : `${d.metro.name} metro yonida ${lower}`;
  if (!d.place) return ru ? `${base} в Ташкенте и Узбекистане` : `Toshkentda ${lower} — O‘zbekiston bo‘ylab`;
  const name = ru ? d.place.nameRu : d.place.nameUz;
  const region = ru ? d.place.regionNameRu : d.place.regionNameUz;
  return ru ? `${base}: ${name}${region ? `, ${region}` : ""}` : `${da(name)} ${lower}${region ? `, ${region}` : ""}`;
}

/** Qidiruv natijasidagi tavsif: e'lonlar soni va asosiy afzalliklar. */
export function landingDescription(d: Landing, ru: boolean, total: number) {
  if (ru) {
    const where = d.metro ? `у метро ${d.metro.nameRu}` : d.place ? `— ${d.place.nameRu}` : "в Ташкенте";
    return `${d.cat.ru} ${where}: актуальные объявления (${total}) с фото, ценами, картой и расстоянием до метро. Свободность подтверждается каждую неделю, контакт владельца — бесплатно.`;
  }
  const where = d.metro ? `${d.metro.name} metro yonida` : d.place ? da(d.place.nameUz) : "Toshkentda";
  return `${where} ijaraga ${d.cat.uzLead}: ${total} ta dolzarb e’lon — rasmlar, narxlar, xarita va metrogacha masofa. Bo‘shligi har hafta tasdiqlanadi, egasining kontakti bepul.`;
}

/** Shu turkum uchun e'lonlar soni (sarlavha/tavsif uchun; 60 soniya kesh). */
export async function landingTotal(d: Landing) {
  const q = landingQuery(d, 1);
  return memo(`landing:total:${JSON.stringify(q)}`, 60_000, async () => (await searchListings(parseFilters(q), "uz")).total).catch(() => 0);
}
function landingQuery(d: Landing, page: number): Record<string, string> {
  const q: Record<string, string> = { category: d.cat.cat, page: String(page) };
  if (d.place?.kind === "region") q.region = String(d.place.id);
  if (d.place?.kind === "district") q.district = String(d.place.id);
  if (d.metro) Object.assign(q, { lat: String(d.metro.lat), lng: String(d.metro.lng), radius: String(METRO_PAGE_RADIUS_M) });
  return q;
}

/** Kategoriya (va joy) bo'yicha indekslanadigan sahifa: noyob sarlavha, matn, e'lonlar va ichki havolalar. */
export default async function LandingPage({ catSlug, placeSlug, page }: { catSlug: string; placeSlug?: string; page: number }) {
  const d = await landingData(catSlug, placeSlug);
  if (!d) notFound();
  const { locale, t } = await getT(); const ru = locale === "ru";
  const q = landingQuery(d, page);
  const [res, places, counts] = await Promise.all([
    searchListings({ ...parseFilters(q), page }, locale),
    memo(`landing:places:${d.cat.cat}`, 60_000, () => placesWithListings(d.cat.cat)),
    memo("landing:catCounts", 60_000, () => categoryCounts()),
  ]);
  const title = landingTitle(d, ru);
  // Metro bekatlari havolalari faqat Toshkent sahifalarida
  const tashkent = !d.place || d.place.slug === "toshkent-shahri" || d.place.regionNameUz === "Toshkent shahri";
  const placeName = d.metro ? (ru ? `районе метро ${d.metro.nameRu}` : `${d.metro.name} metro atrofi`) : d.place ? (ru ? d.place.nameRu : d.place.nameUz) : (ru ? "Ташкенте и других городах Узбекистана" : "Toshkent va O‘zbekistonning boshqa shaharlari");
  const self = `/ijara/${catSlug}${placeSlug ? `/${placeSlug}` : ""}`;
  const crumbs: [string, string][] = [["OfisTop", "/"], [ru ? d.cat.ru : d.cat.uz, `/ijara/${catSlug}`], ...(d.place ? [[ru ? d.place.nameRu : d.place.nameUz, self] as [string, string]] : []), ...(d.metro ? [[ru ? `Метро ${d.metro.nameRu}` : `${d.metro.name} metro`, self] as [string, string]] : [])];
  const searchHref = `/joylar?${new URLSearchParams({ ...q, page: "1" })}`;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", name: title, numberOfItems: res.total,
        itemListElement: res.items.map((it, i) => ({ "@type": "ListItem", position: i + 1, url: absUrl(`/joylar/${it.id}-${it.slug}`), name: it.title })) }} />
      <nav aria-label={ru ? "Навигация" : "Yo‘l"} className="mb-3 text-xs text-slate-500">
        {crumbs.map(([n, h], i) => <span key={h}>{i > 0 && " › "}{i < crumbs.length - 1 ? <Link href={h} className="hover:underline">{n}</Link> : <span>{n}</span>}</span>)}
      </nav>
      <h1 className="text-2xl font-bold text-brand-dark sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-3xl text-slate-600">{ru
        ? `${res.total} актуальных объявлений: ${d.cat.ruLead} в аренду в ${placeName}. Все объявления проверены модератором, контакты владельца — бесплатно.`
        : `${placeName} bo‘yicha ${res.total} ta dolzarb e’lon: ijaraga ${d.cat.uzLead}. Barcha e’lonlar moderator tomonidan tekshirilgan, egasining kontakti bepul.`}</p>
      {places.length > 0 && <div className="mt-4 flex flex-wrap gap-2">
        {places.slice(0, 14).map((p) => <Link key={p.slug} href={`/ijara/${catSlug}/${p.slug}`} aria-current={p.slug === placeSlug ? "page" : undefined}
          className={`rounded-full border px-3 py-1.5 text-sm ${p.slug === placeSlug ? "border-brand bg-brand text-white" : "border-slate-300 hover:border-brand"}`}>{ru ? p.nameRu : p.nameUz} · {p.n}</Link>)}
      </div>}
      <div className="mt-5">
        {res.items.length === 0 ? <p className="rounded border border-dashed border-slate-300 p-6 text-slate-600">{ru ? "Сейчас нет активных объявлений. " : "Hozircha faol e’lon yo‘q. "}<Link href="/joylar" className="text-brand underline">{t("nav.search")}</Link></p>
          : <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-8 lg:grid-cols-4">{res.items.map((it) => <ListingCard key={it.id} it={it} />)}</div>}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {page > 1 && <Link href={`${self}${page > 2 ? `?page=${page - 1}` : ""}`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm">← {ru ? "Назад" : "Oldingi"}</Link>}
        {page < res.pages && <Link href={`${self}?page=${page + 1}`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm">{ru ? "Далее" : "Keyingi"} →</Link>}
        <Link href={searchHref} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">{ru ? "Фильтры и карта" : "Filtrlar va xarita"}</Link>
      </div>
      {tashkent && <section className="mt-10 border-t border-slate-200 pt-6">
        <h2 className="mb-3 font-semibold">{ru ? `${d.cat.ru} у метро` : `Metro yonida: ${d.cat.uz.toLowerCase()}`}</h2>
        <div className="flex flex-wrap gap-2">{METRO.map(([n]) => { const sl = `metro-${metroSlug(n)}`; return (
          <Link key={n} href={`/ijara/${catSlug}/${sl}`} aria-current={sl === placeSlug ? "page" : undefined} className={`rounded-full border px-3 py-1.5 text-sm ${sl === placeSlug ? "border-brand bg-brand text-white" : "border-slate-300 hover:border-brand"}`}>{ru ? METRO_RU[n] ?? n : n}</Link>); })}</div>
      </section>}
      <section className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="mb-3 font-semibold">{ru ? "Другие типы помещений" : "Boshqa joy turlari"}</h2>
        <div className="flex flex-wrap gap-2">{Object.entries(LANDING_CATS).filter(([k]) => k !== catSlug).map(([k, v]) =>
          <Link key={k} href={`/ijara/${k}`} className="rounded-full border border-slate-300 px-3 py-1.5 text-sm hover:border-brand">{ru ? v.ru : v.uz}{counts.get(v.cat) ? ` · ${counts.get(v.cat)}` : ""}</Link>)}</div>
      </section>
    </div>
  );
}
