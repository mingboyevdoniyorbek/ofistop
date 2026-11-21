import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { labels, fmtDate, priceLabel, totalLabel, primaryPrice, availLabel, confirmedAgo, shortPrice } from "@/lib/format";
import { getT } from "@/lib/i18n";
import { formatMinor } from "@/lib/money";
import { parseFilters, publicCond, searchListings } from "@/lib/search";
import { effectiveAvailability, isPubliclyVisible } from "@/lib/status";
import { publicPoint } from "@/lib/geo";
import { nearestMetro, METRO_RU } from "@/lib/metro";
import PlaceMap from "@/components/PlaceMap";
import ContactButtons from "@/components/ContactButtons";
import ListingCard from "@/components/ListingCard";
import Gallery from "@/components/Gallery";
import JsonLd from "@/components/JsonLd";
import ViewPing from "@/components/ViewPing";
import { pageAlternates, breadcrumbJsonLd, absUrl } from "@/lib/seo";
import { landingSlugOf } from "@/lib/landing";
import { TrackView } from "@/components/RecentlyViewed";
import FavoriteButton from "@/components/FavoriteButton";
import ReportButton from "@/components/ReportButton";
import { CompareButton } from "@/components/Compare";
import { listImages } from "@/lib/listing-images";
import { favState } from "@/lib/favorites";
import ShareButton from "@/components/ShareButton";
import { cache } from "react";
import { memo } from "@/lib/memo";
import { showViewCounts, telHref } from "@/lib/site-info";
import { topFirms, KIND_LABELS } from "@/lib/furniture";
import { SofaSticker } from "@/components/Stickers";
const listImagesCached = cache((id: string) => listImages(id));

export const dynamic = "force-dynamic";
const idOf = (p: string) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(p) ? p.slice(0, 36) : null);

// generateMetadata va sahifa bir so'rovda ikki marta chaqiradi — React cache bitta bazaga murojaatga qisqartiradi.
const load = cache(async function load(id: string, ru = false) {
  const L = s.listings;
  const [l] = await db().select({ ownerBlocked: s.users.isBlocked, l: L, region: ru ? s.regions.nameRu : s.regions.nameUz, district: ru ? s.districts.nameRu : s.districts.nameUz, centerName: s.businessCenters.name, centerSlug: s.businessCenters.slug })
    .from(L).innerJoin(s.users, eq(s.users.id, L.ownerId)).innerJoin(s.regions, eq(s.regions.id, L.regionId)).leftJoin(s.districts, eq(s.districts.id, L.districtId))
    .leftJoin(s.businessCenters, eq(s.businessCenters.id, L.centerId)).where(eq(L.id, id)).limit(1);
  return l;
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { locale, t } = await getT(); const id = idOf((await params).slug); const r = id ? await load(id, locale === "ru").catch(() => null) : null;
  if (!r || r.ownerBlocked || r.l.isSuspended || r.l.moderationStatus !== "approved") return { title: t("det.notFound"), robots: { index: false } };
  const pictures = await listImagesCached(r.l.id);
  const ogImages = pictures.filter(i => i.url).slice(0, 1).map(i => ({ url: i.url! }));
  // Qidiruv natijasida ko'rinadigan sarlavha va tavsif: narx, tuman, maydon va metro — odam bosishdan oldin asosiysini ko'radi.
  const l = r.l, ru = locale === "ru";
  const price = shortPrice({ amount: l.priceAmountMinor, currency: l.currency, period: l.pricePeriod, basis: l.priceBasis, negotiable: l.priceNegotiable }, l.areaM2, locale);
  const place = r.district ?? r.region;
  const pt = (() => { try { return publicPoint({ id: l.id, lat: l.lat, lng: l.lng, exactLocationPublic: l.exactLocationPublic }); } catch { return null; } })();
  const metro = pt ? nearestMetro(pt.lat, pt.lng) : null;
  const facts = [labels(locale).category[l.category], place, l.areaM2 ? `${Number(l.areaM2)} m²` : null, l.floor != null ? (ru ? `${l.floor} этаж` : `${l.floor}-qavat`) : null, price,
    metro ? (ru ? `метро ${METRO_RU[metro.name] ?? metro.name} — ${metro.minutes} мин` : `${metro.name} metro — ${metro.minutes} daq`) : null].filter(Boolean).join(" · ");
  const title = `${l.title} — ${price}, ${place}`;
  return { alternates: await pageAlternates(`/joylar/${l.id}-${l.slug}`), openGraph: { title, description: facts, ...(ogImages.length ? { images: ogImages } : {}) }, title,
    description: `${facts}. ${l.description.replace(/\s+/g, " ").slice(0, 110)}`, robots: { index: isPubliclyVisible(l) } };
}

export default async function Detail({ params }: { params: Promise<{ slug: string }> }) {
  const { locale, t } = await getT(); const L10 = labels(locale); const ru = locale === "ru";
  const id = idOf((await params).slug);
  const r = id ? await load(id, ru) : null;
  if (!r || r.ownerBlocked || r.l.isSuspended || r.l.moderationStatus !== "approved") notFound(); // qoralama/kutilayotgan/rad etilgan ommaga ko'rinmaydi
  const { l } = r;
  if ((await params).slug !== `${l.id}-${l.slug}`) permanentRedirect(`/joylar/${l.id}-${l.slug}`);
  const visible = isPubliclyVisible(l);
  const price = { amount: l.priceAmountMinor, currency: l.currency, period: l.pricePeriod, basis: l.priceBasis, negotiable: l.priceNegotiable };
  const total = totalLabel(price, l.areaM2, locale);
  // Bir-biriga bog'liq bo'lmagan so'rovlar parallel (ketma-ket emas) bajariladi.
  const [pics, fav, amenityRows, similarRes, firms] = await Promise.all([
    listImagesCached(l.id), favState(), memo("amenities", 600_000, () => db().select().from(s.amenities)),
    searchListings({ ...parseFilters({ category: l.category, region: String(l.regionId), deal: l.dealType }), page: 1 }, locale),
    l.dealType === "rent" ? memo(`top-firms:${locale}`, 60_000, () => topFirms(locale)).catch(() => []) : Promise.resolve([]),
  ]);
  const imgs = pics.filter((i) => i.url).map((i) => ({ url: i.url!, thumb: i.thumbUrl ?? i.url! }));
  const amNames = new Map(amenityRows.map((a) => [a.code, ru ? a.nameRu : a.nameUz]));
  const pt = visible ? publicPoint({ id: l.id, lat: l.lat, lng: l.lng, exactLocationPublic: l.exactLocationPublic }) : null; // faqat shu nuqta klientga beriladi
  const similar = similarRes.items.filter((x) => x.id !== l.id).slice(0, 4);
  const sale = l.dealType === "sale";
  const yesNo = (b: boolean | null) => (b == null ? null : b ? t("det.yes") : t("det.no"));
  const rows: [string, string | null][] = [
    [ru ? "Сделка" : "Bitim turi", sale ? (ru ? "Продажа" : "Sotuv") : (ru ? "Аренда" : "Ijara")],
    [t("det.type"), L10.category[l.category]], [t("det.area"), l.areaM2 ? `${Number(l.areaM2)} ${t("unit.m2")}` : null],
    [ru ? "Площадь участка" : "Yer maydoni", l.landAreaSotix ? `${Number(l.landAreaSotix)} ${ru ? "сот." : "sotix"}` : null],
    [ru ? "Этажей в здании" : "Binodagi qavatlar", l.floor == null && l.totalFloors ? String(l.totalFloors) : null],
    [ru ? "Документы (кадастр)" : "Hujjatlar (kadastr)", sale ? (l.documentsReady == null ? null : l.documentsReady ? (ru ? "Готовы" : "Tayyor") : (ru ? "Оформляются" : "Rasmiylashtirilmoqda")) : null],
    [ru ? "Рассрочка" : "Bo‘lib to‘lash", sale ? (l.installment ? (ru ? "Возможна" : "Mumkin") : yesNo(l.installment)) : null],
    [t("det.floor"), l.floor != null ? `${l.floor}${l.totalFloors ? ` / ${l.totalFloors}` : ""}` : null], [t("det.seats"), l.seats ? String(l.seats) : null],
    [t("det.furnished"), l.furnished == null ? null : l.furnished ? t("det.yes") : t("det.no")],
    [t("det.deposit"), l.depositAmountMinor != null ? t("det.depositNote", { amt: formatMinor(l.depositAmountMinor), cur: l.depositCurrency ?? "" }) : null],
    [t("det.commission"), l.commissionType === "none" ? t("det.no") : l.commissionType === "percent" ? t("det.commPercent", { p: Number(l.commissionPercent), base: l.commissionPercentBase === "sale_price" ? (ru ? "цены продажи" : "sotuv narxidan") : l.commissionPercentBase === "annual_rent" ? t("det.commAnnual") : t("det.commMonthly") }) : l.commissionFixedMinor != null ? `${formatMinor(l.commissionFixedMinor)} ${l.commissionCurrency}` : null],
    [t("det.utilities"), l.utilities === "included" ? t("det.utilIncluded") : l.utilities === "separate" ? t("det.utilSeparate") : l.utilities === "partly" ? t("det.utilPartly") : null],
    [locale === "ru" ? "Количество комнат" : "Xonalar soni", l.roomsCount ? String(l.roomsCount) : null],
    [locale === "ru" ? "Обслуживание" : "Xizmat to‘lovi", l.serviceFeeMinor != null ? `${formatMinor(l.serviceFeeMinor)} ${l.serviceFeeCurrency} / ${l.serviceFeePeriod === "once" ? (ru ? "однократно" : "bir martalik") : (ru ? "месяц" : "oy")}` : null],
    [t("det.minTerm"), l.minTermMonths ? t("det.months", { n: l.minTermMonths }) : null], [t("det.availFrom"), l.availableFrom ? fmtDate(l.availableFrom, locale) : null],
    [t("det.confirmed"), l.availabilityConfirmedAt ? fmtDate(l.availabilityConfirmedAt, locale) : null],
    [t("det.address"), [r.district, r.region].filter(Boolean).join(", ") + (l.exactLocationPublic && l.address ? ` — ${l.address}` : "")],
    [t("det.unitCode"), l.unitCodePublic ? l.unitCode : null],
  ];
  const place = r.district ?? r.region;
  const metro = pt ? nearestMetro(pt.lat, pt.lng) : null;
  const facts = [
    { label: t("det.area"), value: l.areaM2 ? `${Number(l.areaM2)} ${t("unit.m2")}` : "—", icon: "M4 4h16v16H4zM4 9h16M9 4v16" },
    { label: t("det.floor"), value: l.floor != null ? `${l.floor}${l.totalFloors ? ` / ${l.totalFloors}` : ""}` : l.totalFloors ? `${l.totalFloors} ${ru ? "эт." : "qavatli"}` : "—", icon: "M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M2.5 21h19M8 8h3M8 12h3M8 16h3" },
    { label: ru ? "Район" : "Tuman", value: place, icon: "M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
    { label: ru ? "Разместил" : "Joylashtirgan", value: r.centerName ?? L10.poster[l.posterType], icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7.5 8.5c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5" },
  ];
  // Jadval: yuqoridagi katakchalarda bor qatorlar takrorlanmaydi; eng kerakli 6 tasi ko'rinadi, qolgani «Barchasini ko'rsatish» ortida.
  const inFacts = new Set([t("det.area"), t("det.floor"), ru ? "Сделка" : "Bitim turi"]);
  const first = [t("det.type"), t("det.deposit"), t("det.commission"), t("det.utilities"), t("det.minTerm"), t("det.furnished"), ru ? "Документы (кадастр)" : "Hujjatlar (kadastr)", ru ? "Рассрочка" : "Bo‘lib to‘lash"];
  const rank = (k: string) => { const i = first.indexOf(k); return i < 0 ? 99 : i; };
  const tableRows = [...rows, [ru ? "Кто разместил" : "Kim joylashtirdi", L10.poster[l.posterType]] as [string, string], [ru ? "Размещено" : "Joylashtirilgan", l.publishedAt ? fmtDate(l.publishedAt, locale) : null] as [string, string | null]]
    .filter((x): x is [string, string] => !!x[1] && !inFacts.has(x[0]))
    .map((x, i) => ({ x, i })).sort((a, b) => rank(a.x[0]) - rank(b.x[0]) || a.i - b.i).map((o) => o.x);
  return (
    <div className={`mx-auto max-w-5xl px-4 py-6 ${visible ? "pb-24 md:pb-6" : ""}`}>
      {!visible && (
        <div role="status" className="mb-4 rounded border border-amber-400 bg-amber-50 p-4">
          <p className="font-semibold">{t("det.unavailable", { status: availLabel(effectiveAvailability(l), l.dealType, locale) })}</p>
          <p className="text-sm">{t("det.similarHint")}</p>
        </div>
      )}
      <JsonLd data={breadcrumbJsonLd([["OfisTop", "/"], [L10.category[l.category], landingSlugOf(l.category) ? `/ijara/${landingSlugOf(l.category)}` : "/joylar"], [l.title, `/joylar/${l.id}-${l.slug}`]])} />
      {visible && <JsonLd data={{
        "@context": "https://schema.org", "@type": "Offer", url: absUrl(`/joylar/${l.id}-${l.slug}`), name: l.title, description: l.description.slice(0, 500),
        image: imgs.slice(0, 5).map((i) => absUrl(i.url)), businessFunction: sale ? "http://purl.org/goodrelations/v1#Sell" : "http://purl.org/goodrelations/v1#LeaseOut", category: L10.category[l.category],
        availability: "https://schema.org/InStock", ...(l.publishedAt ? { validFrom: new Date(l.publishedAt).toISOString() } : {}),
        ...(l.priceAmountMinor != null ? { price: (Number(l.priceAmountMinor) / 100).toFixed(2), priceCurrency: l.currency,
          ...(sale ? {} : { priceSpecification: { "@type": "UnitPriceSpecification", price: (Number(l.priceAmountMinor) / 100).toFixed(2), priceCurrency: l.currency, unitCode: l.pricePeriod === "month" ? "MON" : l.pricePeriod === "day" ? "DAY" : "HUR" } }) } : {}),
        itemOffered: { "@type": "Place", name: l.title, address: { "@type": "PostalAddress", addressLocality: r.district ?? undefined, addressRegion: r.region, addressCountry: "UZ" },
          ...(l.areaM2 ? { floorSize: { "@type": "QuantitativeValue", value: Number(l.areaM2), unitCode: "MTK" } } : {}),
          ...(pt && !pt.approx ? { geo: { "@type": "GeoCoordinates", latitude: pt.lat, longitude: pt.lng } } : {}) },
      }} />}
      {visible && <ViewPing id={l.id} />}
      {visible && <TrackView item={{ id: l.id, href: `/joylar/${l.id}-${l.slug}`, title: l.title, price: primaryPrice(price, l.areaM2, locale),
        place: [r.district, r.region].filter(Boolean).join(", "), area: l.areaM2 ? `${Number(l.areaM2)} ${t("unit.m2")}` : "",
        thumb: imgs[0]?.thumb ?? null, full: imgs[0]?.url ?? null, date: fmtDate(l.publishedAt, locale) }} />}
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div>
          <Gallery images={imgs} alt={l.title} fallback={l.isDemo ? t("det.demoImg") : t("det.noImg")} />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><h1 className="min-w-0 break-words text-2xl font-bold">{l.title}</h1><div className="flex shrink-0 flex-wrap items-start gap-2 sm:justify-end"><FavoriteButton listingId={l.id} initial={fav.ids.has(l.id)} loggedIn={fav.loggedIn} />{visible && <ShareButton path={`/joylar/${l.id}-${l.slug}`} title={l.title} text={`${primaryPrice(price, l.areaM2, locale)} · ${[r.district, r.region].filter(Boolean).join(", ")}`} />}</div></div>
          {sale && <span className="mt-2 inline-block rounded bg-emerald-100 px-2 py-0.5 text-sm font-semibold text-emerald-800">{ru ? "Продаётся" : "Sotiladi"}</span>}
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-brand">{primaryPrice(price, l.areaM2, locale)}</p>
          {total && <p className="text-sm text-slate-600">{priceLabel(price, locale)}</p>}
          {/* Bir qarashda: maydon, qavat, joy, kim joylashtirgan */}
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{facts.map((f) => (
            <li key={f.label} className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3">
              <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-brand"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon} /></svg></span>
              <span className="min-w-0"><span className="block text-[11px] text-slate-500">{f.label}</span><span className="block truncate text-sm font-semibold text-slate-900">{f.value}</span></span>
            </li>))}</ul>
          {metro && <p className="mt-3 flex items-center gap-2 text-[15px] text-slate-700"><span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-black text-white" style={{ background: metro.color }}>M</span>
            <span><b>{metro.name}</b> {ru ? "метро" : "metro"} — {pt?.approx ? "≈" : ""}{metro.minutes} {ru ? "мин пешком" : "daqiqa piyoda"}</span></p>}
          <div className="mt-3 flex flex-wrap items-center gap-2"><span title={ru ? "Администратор проверил объявление. Это не техническая проверка здания." : "Administrator e’lon ma’lumotlarini ko‘rib chiqqan. Bu binoning texnik tekshiruvi emas."} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs text-brand">✓ {ru ? "Объявление проверено" : "E’lon tekshirilgan"}</span>{l.availabilityConfirmedAt && visible && <span title={fmtDate(l.availabilityConfirmedAt, locale)} className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-800">✓ {ru ? `Свободно — подтверждено ${confirmedAgo(l.availabilityConfirmedAt, locale)}` : `Bo‘sh — ${confirmedAgo(l.availabilityConfirmedAt, locale)} tasdiqlangan`}</span>}{visible && <CompareButton id={l.id} />}{showViewCounts() && <span className="text-xs text-slate-500">{ru ? "Просмотры" : "Ko‘rishlar"}: {l.viewCount}</span>}</div>
          {l.isDemo && <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">{t("det.demo")}</p>}
          {l.description && <section className="mt-5"><h2 className="mb-2 font-semibold">{ru ? "Описание" : "Tavsif"}</h2><p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{l.description}</p></section>}
          <section className="mt-5">
            <h2 className="mb-2 font-semibold">{ru ? "Характеристики" : "Ma’lumotlar"}</h2>
            <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-4 text-sm">
              {tableRows.slice(0, 6).map(([k, v]) => <Row key={k} k={k} v={v} />)}
            </dl>
            {tableRows.length > 6 && <details className="group mt-2">
              <summary className="cursor-pointer list-none rounded-xl py-2 text-sm font-semibold text-brand [&::-webkit-details-marker]:hidden">{ru ? "Показать все характеристики" : "Barchasini ko‘rsatish"} <span className="inline-block transition group-open:rotate-180">▾</span></summary>
              <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-4 text-sm">{tableRows.slice(6).map(([k, v]) => <Row key={k} k={k} v={v} />)}</dl>
            </details>}
          </section>
          {l.amenities.length > 0 && <section className="mt-5"><h2 className="mb-2 font-semibold">{t("det.amenities")}</h2><ul className="flex flex-wrap gap-2">{l.amenities.map((c) => <li key={c} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">✓ {amNames.get(c) ?? c}</li>)}</ul></section>}
          {pt && <section className="mt-5"><h2 className="mb-1 font-semibold">{ru ? "Расположение" : "Joylashuv"}</h2><p className="mb-2 text-sm text-slate-600">📍 {[r.district, r.region].filter(Boolean).join(", ")}{l.exactLocationPublic && l.address ? ` — ${l.address}` : ""}</p><PlaceMap lat={pt.lat} lng={pt.lng} approx={pt.approx} radiusM={pt.radiusM ?? null} label={l.title} /></section>}
          {visible && <div className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 pt-4 text-sm text-slate-500">{ru ? "Проблема с объявлением?" : "E’lon bilan muammo bormi?"} <ReportButton variant="link" listingId={l.id} loggedIn={fav.loggedIn} /></div>}
        </div>
        <aside id="aloqa" className="self-start scroll-mt-20 md:sticky md:top-20">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.18)]">
            <div className="hidden md:block">
              <p className="text-2xl font-extrabold tracking-tight text-brand">{primaryPrice(price, l.areaM2, locale)}</p>
              <p className="mt-1 text-sm text-slate-600">{facts.slice(0, 3).map((f) => f.value).join(" · ")}</p>
            </div>
            <p className="text-sm text-slate-600 md:border-t md:border-slate-100 md:pt-3">{L10.poster[l.posterType]}{r.centerName && l.centerId ? <> · <Link href={`/markazlar/${l.centerId}-${r.centerSlug}`} className="font-semibold text-brand hover:underline">{r.centerName}</Link></> : ""}</p>
            {visible ? <ContactButtons listingId={l.id} hasPhone={!!l.contactPhone} hasTelegram={!!l.telegramUsername} /> : <p className="text-sm text-slate-500">{t("det.contactHidden")}</p>}
          </div>
        </aside>
      </div>
      {similar.length > 0 && (
        <section className="mt-10"><h2 className="font-semibold mb-3">{t("det.similar")}</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-8 lg:grid-cols-4">{similar.map((it) => <ListingCard key={it.id} it={it} />)}</div></section>
      )}
      {/* Ofis ijarasidan keyingi ehtiyoj: faqat TOP (pullik) mebel firmalari taklif qilinadi */}
      {visible && firms.length > 0 && <section className="mt-10 rounded-3xl bg-gradient-to-br from-teal-50 to-white p-4 ring-1 ring-teal-100 sm:p-5" aria-labelledby="firms-h">
        <div className="flex items-center gap-3"><SofaSticker uid="sofa-det" className="h-12 w-12 shrink-0" /><div><h2 id="firms-h" className="font-semibold">{ru ? "Мебель для этого офиса" : "Bu ofis uchun mebel"}</h2><p className="text-xs text-slate-500">{ru ? "Рекомендуемые компании OfisTop" : "OfisTop tavsiya etgan firmalar"}</p></div></div>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">{firms.map(({ f, region }) => <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
          <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 font-bold text-brand">{f.name.slice(0, 2).toUpperCase()}</span>
          <div className="min-w-0 flex-1"><p className="truncate font-semibold">{f.name}</p><p className="truncate text-xs text-slate-500">{KIND_LABELS[f.kind][ru ? "ru" : "uz"]} · {region}</p></div>
          <a href={telHref(f.phone)} className="shrink-0 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white">📞</a></li>)}</ul>
        <Link href="/mebel" className="mt-3 inline-block text-sm text-brand hover:underline">{ru ? "Все мебельные компании →" : "Barcha mebel firmalari →"}</Link>
      </section>}
      {visible && <ContactButtons variant="bar" listingId={l.id} hasPhone={!!l.contactPhone} hasTelegram={!!l.telegramUsername} />}
      <p className="mt-6"><Link href="/joylar" className="text-brand hover:underline">{t("det.back")}</Link></p>
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between gap-4 py-2.5"><dt className="text-slate-500">{k}</dt><dd className="text-right font-medium text-slate-900">{v}</dd></div>;
