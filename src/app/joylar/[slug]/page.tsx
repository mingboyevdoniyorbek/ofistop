import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { labels, fmtDate, priceLabel, totalLabel, primaryPrice, availLabel } from "@/lib/format";
import { getT } from "@/lib/i18n";
import { formatMinor } from "@/lib/money";
import { parseFilters, publicCond, searchListings } from "@/lib/search";
import { effectiveAvailability, isPubliclyVisible } from "@/lib/status";
import { publicPoint } from "@/lib/geo";
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
  const [l] = await db().select({ ownerBlocked: s.users.isBlocked, l: L, region: ru ? s.regions.nameRu : s.regions.nameUz, district: ru ? s.districts.nameRu : s.districts.nameUz, centerName: s.businessCenters.name })
    .from(L).innerJoin(s.users, eq(s.users.id, L.ownerId)).innerJoin(s.regions, eq(s.regions.id, L.regionId)).leftJoin(s.districts, eq(s.districts.id, L.districtId))
    .leftJoin(s.businessCenters, eq(s.businessCenters.id, L.centerId)).where(eq(L.id, id)).limit(1);
  return l;
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { locale, t } = await getT(); const id = idOf((await params).slug); const r = id ? await load(id, locale === "ru").catch(() => null) : null;
  if (!r || r.ownerBlocked || r.l.isSuspended || r.l.moderationStatus !== "approved") return { title: t("det.notFound"), robots: { index: false } };
  const pictures = await listImagesCached(r.l.id);
  const ogImages = pictures.filter(i => i.url).slice(0, 1).map(i => ({ url: i.url! }));
  return { alternates: await pageAlternates(`/joylar/${r.l.id}-${r.l.slug}`), openGraph: { title: r.l.title, ...(ogImages.length ? { images: ogImages } : {}) }, title: r.l.title, description: t("det.metaDesc", { cat: labels(locale).category[r.l.category], place: r.district ?? r.region, text: r.l.description.slice(0, 120) }), robots: { index: isPubliclyVisible(r.l) } };
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
          <p className="text-brand text-2xl font-bold mt-2">{primaryPrice(price, l.areaM2, locale)}</p>
          {total && <p className="text-sm text-slate-600">{priceLabel(price, locale)}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2"><span title={ru ? "Администратор проверил объявление. Это не техническая проверка здания." : "Administrator e’lon ma’lumotlarini ko‘rib chiqqan. Bu binoning texnik tekshiruvi emas."} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs text-brand">✓ {ru ? "Объявление проверено" : "E’lon tekshirilgan"}</span>{l.availabilityConfirmedAt && visible && <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs text-green-800">{ru ? "Доступность подтверждена" : "Bo‘shligi tasdiqlangan"}: {fmtDate(l.availabilityConfirmedAt, locale)}</span>}{visible && <CompareButton id={l.id} />}{showViewCounts() && <span className="text-xs text-slate-500">{ru ? "Просмотры" : "Ko‘rishlar"}: {l.viewCount}</span>}</div>
          <dl className="mt-4 grid grid-cols-[150px_1fr] gap-y-1.5 text-sm">
            {rows.filter(([, v]) => v).map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd>{v}</dd></div>)}
          </dl>
          {l.description && <p className="mt-4 whitespace-pre-line">{l.description}</p>}
          {l.amenities.length > 0 && <p className="mt-4 text-sm"><strong>{t("det.amenities")}:</strong> {l.amenities.map((c) => amNames.get(c) ?? c).join(", ")}</p>}
          {pt && <section className="mt-4"><h2 className="font-semibold mb-2">{t("det.onMap")}</h2><PlaceMap lat={pt.lat} lng={pt.lng} approx={pt.approx} radiusM={pt.radiusM ?? null} /></section>}
          {l.isDemo && <p className="mt-4 text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded p-2">{t("det.demo")}</p>}
        </div>
        <aside id="aloqa" className="space-y-3 md:sticky md:top-20 self-start scroll-mt-20">
          <div className="rounded border border-slate-200 p-4 space-y-3">
            <p className="text-sm text-slate-600">{L10.poster[l.posterType]}{r.centerName ? ` · ${r.centerName}` : ""}</p>
            {visible ? <ContactButtons listingId={l.id} hasPhone={!!l.contactPhone} hasTelegram={!!l.telegramUsername} /> : <p className="text-sm text-slate-500">{t("det.contactHidden")}</p>}
            {visible && <div className="mt-3 border-t border-slate-200 pt-3"><ReportButton listingId={l.id} loggedIn={fav.loggedIn} /></div>}
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
