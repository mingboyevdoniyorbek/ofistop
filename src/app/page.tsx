import Link from "next/link";
import { labels } from "@/lib/format";
import { getT } from "@/lib/i18n";
import { parseFilters, searchListings, topDistrictCounts, topDistricts } from "@/lib/search";
import ListingCard from "@/components/ListingCard";
import RecentlyViewed from "@/components/RecentlyViewed";
import { landingSlugOf } from "@/lib/landing";
import { memo } from "@/lib/memo";
import { pageAlternates } from "@/lib/seo";
import NewListingButton from "@/components/NewListingButton";
import { promoEnabled, guestAccessEnabled } from "@/lib/launch-mode";
import { getCurrentUser } from "@/lib/auth";
import { centerStats, listCenters } from "@/lib/centers";
import { mediaUrl } from "@/lib/storage";
import ListingPhoto from "@/components/ListingPhoto";
import CenterCta from "@/components/CenterCta";
import CenterBadges from "@/components/CenterBadges";
import { CenterSticker, CoworkSticker, SaleSticker, SofaSticker } from "@/components/Stickers";

export const dynamic = "force-dynamic";
export async function generateMetadata() { return { alternates: await pageAlternates("/") }; }

export default async function Home() {
  const { locale, t } = await getT(); const CAT = labels(locale).category; const ru = locale === "ru";
  const promo = promoEnabled();
  const user = await getCurrentUser();
  // Ommaviy bloklar 30–60 soniya keshlanadi (har bir tashrifda bazaga borilmaydi).
  const [latest, centersAll, forSale, clusters, districts] = await Promise.all([
    memo(`home:latest:${locale}`, 30_000, () => searchListings({ ...parseFilters({}), page: 1 }, locale)).catch(() => null),
    memo(`home:centers:${locale}`, 60_000, () => listCenters(locale)).catch(() => []),
    memo(`home:sale:${locale}`, 30_000, () => searchListings({ ...parseFilters({ deal: "sale" }), page: 1 }, locale)).catch(() => null),
    memo("home:clusters", 60_000, () => topDistrictCounts()).catch(() => []),
    memo(`home:districts:${locale}`, 60_000, () => topDistricts(locale, 3)).catch(() => []),
  ]);
  const centers = centersAll.slice(0, 10);
  const [stats, byDistrict] = await Promise.all([
    memo(`home:centerStats:${centers.map((c) => c.id).join(",")}`, 60_000, () => centerStats(centers.map((c) => c.id))).catch(() => new Map()),
    Promise.all(districts.map((d) => memo(`home:district:${d.id}:${locale}`, 30_000, () => searchListings({ ...parseFilters({ district: String(d.id) }), page: 1 }, locale)).catch(() => null))),
  ]);
  // Bitta asosiy yo'nalish — ijara; qo'shimcha bo'limlar blokchalarda (Joymee kabi).
  const tiles = [
    { href: "/markazlar", icon: <CenterSticker className="h-12 w-12" />, label: ru ? "Бизнес-центры" : "Markazlar", tint: "from-blue-50 ring-blue-100" },
    { href: "/joylar?deal=sale", icon: <SaleSticker className="h-12 w-12" />, label: ru ? "Продажа" : "Sotuv", tint: "from-amber-50 ring-amber-100" },
    { href: "/mebel", icon: <SofaSticker className="h-12 w-12" />, label: ru ? "Мебель" : "Mebel", tint: "from-teal-50 ring-teal-100" },
    { href: landingSlugOf("coworking") ? `/ijara/${landingSlugOf("coworking")}` : "/joylar?category=coworking", icon: <CoworkSticker className="h-12 w-12" />, label: ru ? "Коворкинг" : "Kovorking", tint: "from-indigo-50 ring-indigo-100" },
  ];
  const chips = Object.entries(CAT).filter(([k]) => k !== "building" && k !== "coworking");
  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 pt-4 pb-2 sm:pt-8">
        <h1 className="sr-only">{t("home.title")}</h1>
        {/* Ixcham qidiruv: yozib qidirish yoki filtrlar tugmasi (Airbnb/Joymee uslubi) */}
        <form action="/joylar" method="get" role="search" className="flex gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-[0_2px_12px_rgba(15,23,42,0.08)] focus-within:ring-2 focus-within:ring-brand">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0 stroke-slate-500" fill="none" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input name="q" aria-label={t("home.kw")} placeholder={ru ? "Метро, район или адрес" : "Metro, tuman yoki manzil"} className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-500" />
          </label>
          <Link href="/joylar?filtr=1" aria-label={ru ? "Фильтры" : "Filtrlar"} className="grid h-[50px] w-[50px] shrink-0 place-items-center rounded-full border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.08)]">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 stroke-slate-700" fill="none" strokeWidth="2" strokeLinecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>
          </Link>
        </form>
        <div className="lg:mt-3 lg:grid lg:grid-cols-2 lg:gap-3">
        <MapCard ru={ru} counts={clusters} />
        <nav aria-label={ru ? "Разделы" : "Bo‘limlar"} className="mt-3 grid grid-cols-4 gap-2 lg:mt-0">
          {tiles.map((x) => <Link key={x.href} href={x.href} className={`group flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-b ${x.tint} to-white px-1 pt-2.5 pb-2.5 text-center text-xs font-semibold text-slate-800 ring-1 transition hover:-translate-y-0.5 hover:shadow-md sm:text-sm`}>
            <span className="transition-transform duration-200 group-hover:scale-110">{x.icon}</span>{x.label}</Link>)}
        </nav>
        </div>
        <nav aria-label={t("home.types")} className="-mx-4 mt-3 flex gap-2 no-scrollbar overflow-x-auto px-4 pb-1">
          {chips.map(([k, v]) => <Link key={k} href={landingSlugOf(k) ? `/ijara/${landingSlugOf(k)}` : `/joylar?category=${k}`} className="shrink-0 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-sm hover:border-brand">{v}</Link>)}
        </nav>
      </section>

      {latest === null ? <p className="mx-auto max-w-6xl px-4 py-4 text-red-700">{t("home.loadFail")}</p>
        : latest.items.length > 0 && <Rail title={t("home.latest")} href="/joylar" more={t("home.all")}>{latest.items.slice(0, 10).map((it) => <RailItem key={it.id}><ListingCard it={it} compact /></RailItem>)}</Rail>}
      {districts.map((d, i) => { const r = byDistrict[i]; return r && r.items.length > 1 ? <Rail key={d.id} title={ru ? `Район ${d.name}` : `${d.name} tumanida`} sub={ru ? `${d.n} объявлений` : `${d.n} ta e’lon`} href={`/joylar?district=${d.id}`} more={t("home.all")}>{r.items.slice(0, 10).map((it) => <RailItem key={it.id}><ListingCard it={it} compact /></RailItem>)}</Rail> : null; })}

      <section className="mx-auto max-w-6xl px-4 pt-6" aria-labelledby="centers-h">
          <RailHead id="centers-h" title={ru ? "Бизнес-центры" : "Biznes markazlar"} href="/markazlar" more={t("home.all")} />
          {centers.length > 0 && <div className="-mx-4 flex snap-x snap-mandatory gap-3 no-scrollbar overflow-x-auto scroll-px-4 px-4 pb-2">
            {centers.map((c) => { const st = stats.get(c.id); return (
              <Link key={c.id} href={`/markazlar/${c.id}-${c.slug}`} className="flex w-[70vw] max-w-[280px] shrink-0 snap-start flex-col">
                <ListingPhoto thumb={mediaUrl(c.cover)} alt={c.name} sizes="280px" className="aspect-[16/10] rounded-2xl">
                  <span className="text-3xl font-bold text-brand" aria-hidden="true">{c.name.slice(0, 2).toUpperCase()}</span>
                </ListingPhoto>
                <div className="mt-2 space-y-1 px-0.5">
                  <h3 className="line-clamp-1 font-semibold">{c.name}</h3>
                  <CenterBadges c={c} ru={ru} />
                  <p className="line-clamp-1 text-xs text-slate-500">{[c.district, c.region].filter(Boolean).join(", ")}</p>
                  <p className={`text-sm font-medium ${st?.rooms ? "text-accent" : "text-slate-500"}`}>{st?.rooms ? (ru ? `Свободно помещений: ${st.rooms}` : `${st.rooms} ta bo‘sh xona`) : (ru ? "Нет свободных помещений" : "Bo‘sh xona yo‘q")}</p>
                </div>
              </Link>); })}
          </div>}
          <div className="mt-3"><CenterCta variant="compact" /></div>
        </section>
      {forSale && forSale.total > 0 && <Rail title={`🔑 ${ru ? "Продаются: помещения и здания" : "Sotuvdagi joylar va binolar"}`} sub={ru ? `${forSale.total} объявлений` : `${forSale.total} ta e’lon`} href="/joylar?deal=sale" more={t("home.all")}>
        {forSale.items.slice(0, 10).map((it) => <RailItem key={it.id}><ListingCard it={it} compact /></RailItem>)}</Rail>}
      <RecentlyViewed />
      <section className="mx-auto mt-8 max-w-6xl px-4 pb-10"><div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-dark to-[#0f4c5c] p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-10"><SofaSticker uid="sofa-cta" className="pointer-events-none absolute -bottom-6 -right-4 h-32 w-32 opacity-25 sm:static sm:order-first sm:h-28 sm:w-28 sm:opacity-100" /><div className="relative"><h2 className="text-2xl font-bold">{ru ? "Нужна мебель для офиса?" : "Ofisingizga mebel kerakmi?"}</h2><p className="mt-3 max-w-2xl text-blue-100">{ru ? "Столы, кресла, шкафы — готовые и на заказ. Компании-производители и продавцы в одном разделе." : "Stol, kreslo, shkaf — tayyor va buyurtma asosida. Ishlab chiqaruvchi va sotuvchi firmalar bitta bo‘limda."}</p></div><Link href="/mebel" className="relative mt-5 inline-block shrink-0 rounded-xl bg-white px-5 py-3 font-semibold text-brand sm:mt-0">{ru ? "Офисная мебель →" : "Ofis mebellari →"}</Link></div></section>
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-8 grid gap-4 sm:grid-cols-3 text-sm">
          {[[t("home.s1"), t("home.s1b")], [t("home.s2"), t("home.s2b")], [t("home.s3"), t("home.s3b")]].map(([a, b]) => (
            <div key={a}><h3 className="font-semibold">{a}</h3><p className="text-slate-600">{b}</p></div>))}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-8 text-center">
        <h2 className="text-lg font-semibold">{t("home.ownerTitle")}</h2>
        <p className="text-slate-600 mt-1">{promo ? (ru ? "Разместите объявление бесплатно, без SMS. Оно появится после одобрения администратором." : "E’lonni bepul joylang.") : t("home.ownerBody")}</p>
        <div className="mt-3"><NewListingButton loggedIn={!!user} promo={guestAccessEnabled()} className="rounded bg-accent text-white px-5 py-2.5 font-medium" /></div>
      </section>
    </div>
  );
}

/** Qator sarlavhasi: nomi, ixtiyoriy izoh va o'ngda "hammasi" doira-strelka (Airbnb kabi). */
function RailHead({ id, title, sub, href, more }: { id?: string; title: string; sub?: string; href: string; more: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="min-w-0"><h2 id={id} className="truncate text-lg font-bold text-slate-900 sm:text-xl">{title}</h2>{sub && <p className="text-xs text-slate-500">{sub}</p>}</div>
      <Link href={href} aria-label={`${title}: ${more}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-lg text-slate-800 hover:bg-slate-200">→</Link>
    </div>
  );
}
function Rail({ title, sub, href, more, children }: { title: string; sub?: string; href: string; more: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-6">
      <RailHead title={title} sub={sub} href={href} more={more} />
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 no-scrollbar overflow-x-auto scroll-px-4 px-4 pb-2">{children}</div>
    </section>
  );
}
/** Telefonda ~1.6 ta karta ko'rinadi — yonida yana borligi sezilib turadi. */
const RailItem = ({ children }: { children: React.ReactNode }) => <div className="w-[60vw] max-w-[260px] shrink-0 snap-start">{children}</div>;

/** "Xaritada ko'rish" kartasi: chapda logo va matn, o'ngda hududlardagi e'lonlar soni ko'rsatilgan kichik xarita (haqiqiy xaritadagi klasterlar kabi). */
function MapCard({ ru, counts }: { ru: boolean; counts: number[] }) {
  const spots = ["left-3 top-2 h-9 w-9 text-sm", "left-[68px] top-9 h-8 w-8 text-xs", "right-2 top-1.5 h-7 w-7 text-xs", "bottom-1 right-3 h-6 w-6 text-[11px]"];
  const bubble = "absolute grid place-items-center rounded-full bg-white font-bold text-brand-dark shadow-md ring-2 ring-brand/25";
  return (
    <Link href="/joylar?view=map" className="group mt-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-brand to-brand-dark p-3 text-white shadow-md transition hover:shadow-lg sm:p-4 lg:mt-0">
      <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-sm" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.webp" alt="" width={44} height={44} className="h-11 w-11" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold leading-tight">{ru ? "Смотреть на карте" : "Xaritada ko‘rish"}</span>
      </span>
      <span className="relative h-[76px] w-36 shrink-0 overflow-hidden rounded-xl bg-slate-100" aria-hidden="true">
        <svg viewBox="0 0 144 76" className="absolute inset-0 h-full w-full" fill="none" stroke="#cbd5e1" strokeWidth="3">
          <path d="M-5 52 C40 42 70 64 150 32" /><path d="M30 -5 L52 80" /><path d="M95 -5 C90 30 110 52 104 80" strokeWidth="2" /><path d="M-5 18 L150 12" strokeWidth="2" />
        </svg>
        {counts.slice(0, 4).map((c, i) => <span key={i} className={`${bubble} ${spots[i]}`}>{c}</span>)}
      </span>
    </Link>
  );
}
