import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { labels, fmtDate, priceLabel, totalLabel } from "@/lib/format";
import { getT } from "@/lib/i18n";
import { formatMinor } from "@/lib/money";
import { parseFilters, publicCond, searchListings } from "@/lib/search";
import { effectiveAvailability, isPubliclyVisible } from "@/lib/status";
import { publicPoint } from "@/lib/geo";
import PlaceMap from "@/components/PlaceMap";
import ContactButtons from "@/components/ContactButtons";
import ListingCard from "@/components/ListingCard";
import Gallery from "@/components/Gallery";
import FavoriteButton from "@/components/FavoriteButton";
import ReportButton from "@/components/ReportButton";
import { listImages } from "@/lib/listing-images";
import { favState } from "@/lib/favorites";

export const dynamic = "force-dynamic";
const idOf = (p: string) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(p) ? p.slice(0, 36) : null);

async function load(id: string, ru = false) {
  const L = s.listings;
  const [l] = await db().select({ ownerBlocked: s.users.isBlocked, l: L, region: ru ? s.regions.nameRu : s.regions.nameUz, district: ru ? s.districts.nameRu : s.districts.nameUz, centerName: s.businessCenters.name })
    .from(L).innerJoin(s.users, eq(s.users.id, L.ownerId)).innerJoin(s.regions, eq(s.regions.id, L.regionId)).leftJoin(s.districts, eq(s.districts.id, L.districtId))
    .leftJoin(s.businessCenters, eq(s.businessCenters.id, L.centerId)).where(eq(L.id, id)).limit(1);
  return l;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { locale, t } = await getT(); const id = idOf((await params).slug); const r = id ? await load(id, locale === "ru").catch(() => null) : null;
  if (!r || r.ownerBlocked || r.l.isSuspended || r.l.moderationStatus !== "approved") return { title: t("det.notFound"), robots: { index: false } };
  const pictures = await listImages(r.l.id);
  return { alternates: { canonical: `/joylar/${r.l.id}-${r.l.slug}` }, openGraph: { title: r.l.title, images: pictures.filter(i => i.url).slice(0, 1).map(i => ({ url: i.url! })) }, title: r.l.title, description: t("det.metaDesc", { cat: labels(locale).category[r.l.category], place: r.district ?? r.region, text: r.l.description.slice(0, 120) }), robots: { index: isPubliclyVisible(r.l) } };
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
  const imgs = (await listImages(l.id)).filter((i) => i.url).map((i) => ({ url: i.url!, thumb: i.thumbUrl ?? i.url! }));
  const fav = await favState();
  const amNames = new Map((await db().select().from(s.amenities)).map((a) => [a.code, ru ? a.nameRu : a.nameUz]));
  const pt = visible ? publicPoint({ id: l.id, lat: l.lat, lng: l.lng, exactLocationPublic: l.exactLocationPublic }) : null; // faqat shu nuqta klientga beriladi
  const similar = (await searchListings({ ...parseFilters({ category: l.category, region: String(l.regionId) }), page: 1 }, locale)).items.filter((x) => x.id !== l.id).slice(0, 3);
  const rows: [string, string | null][] = [
    [t("det.type"), L10.category[l.category]], [t("det.area"), l.areaM2 ? `${Number(l.areaM2)} ${t("unit.m2")}` : null],
    [t("det.floor"), l.floor != null ? `${l.floor}${l.totalFloors ? ` / ${l.totalFloors}` : ""}` : null], [t("det.seats"), l.seats ? String(l.seats) : null],
    [t("det.furnished"), l.furnished == null ? null : l.furnished ? t("det.yes") : t("det.no")],
    [t("det.deposit"), l.depositAmountMinor != null ? t("det.depositNote", { amt: formatMinor(l.depositAmountMinor), cur: l.depositCurrency ?? "" }) : null],
    [t("det.commission"), l.commissionType === "none" ? t("det.no") : l.commissionType === "percent" ? t("det.commPercent", { p: Number(l.commissionPercent), base: l.commissionPercentBase === "annual_rent" ? t("det.commAnnual") : t("det.commMonthly") }) : l.commissionFixedMinor != null ? `${formatMinor(l.commissionFixedMinor)} ${l.commissionCurrency}` : null],
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
          <p className="font-semibold">{t("det.unavailable", { status: L10.avail[effectiveAvailability(l)] ?? t("det.unavailableFallback") })}</p>
          <p className="text-sm">{t("det.similarHint")}</p>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div>
          <Gallery images={imgs} alt={l.title} fallback={l.isDemo ? t("det.demoImg") : t("det.noImg")} />
          <div className="mt-4 flex items-start justify-between gap-3"><h1 className="text-2xl font-bold">{l.title}</h1><FavoriteButton listingId={l.id} initial={fav.ids.has(l.id)} loggedIn={fav.loggedIn} /></div>
          <p className="text-brand text-xl font-bold mt-1">{priceLabel(price, locale)}</p>
          {total && <p className="text-slate-700">{total}</p>}
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
          <div className="grid gap-4 sm:grid-cols-3">{similar.map((it) => <ListingCard key={it.id} it={it} />)}</div></section>
      )}
      {visible && <a href="#aloqa" className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:hidden"><span className="block rounded bg-brand py-2.5 text-center font-medium text-white">{t("det.contactJump")}</span></a>}
      <p className="mt-6"><Link href="/joylar" className="text-brand hover:underline">{t("det.back")}</Link></p>
    </div>
  );
}
