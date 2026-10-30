import Link from "next/link";
import { labels } from "@/lib/format";
import { getT } from "@/lib/i18n";
import { parseFilters, searchListings, topDistrictCounts } from "@/lib/search";
import ListingCard from "@/components/ListingCard";
import RecentlyViewed from "@/components/RecentlyViewed";
import NewListingButton from "@/components/NewListingButton";
import { promoEnabled, guestAccessEnabled } from "@/lib/launch-mode";
import { getCurrentUser } from "@/lib/auth";
import { centerStats, listCenters } from "@/lib/centers";
import { mediaUrl } from "@/lib/storage";
import ListingPhoto from "@/components/ListingPhoto";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { locale, t } = await getT(); const CAT = labels(locale).category;
  const promo = promoEnabled();
  const user = await getCurrentUser();
  const latest = await searchListings({ ...parseFilters({}), page: 1 }, locale).catch(() => null);
  const centers = (await listCenters(locale).catch(() => [])).slice(0, 10);
  const stats = await centerStats(centers.map((c) => c.id)).catch(() => new Map());
  const clusters = await topDistrictCounts().catch(() => []);
  return (
    <div>
      <section className="bg-slate-50 border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-dark">{t("home.title")}</h1>
          <p className="mt-2 text-slate-600">{t("home.sub")}</p>
          <form action="/joylar" method="get" className="mt-5 grid gap-2 sm:grid-cols-[1fr_200px_auto]">
            <input name="q" aria-label={t("home.kw")} placeholder={t("home.kwPh")} className="rounded border border-slate-300 px-3 py-2.5" />
            <select name="category" aria-label={t("home.type")} className="rounded border border-slate-300 px-3 py-2.5"><option value="">{t("home.allTypes")}</option>
              {Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <button className="rounded bg-brand text-white px-6 py-2.5 font-medium hover:bg-brand-dark">{t("home.search")}</button>
          </form>
          <MapCard ru={locale === "ru"} counts={clusters} />
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-lg font-semibold mb-3">{t("home.types")}</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CAT).map(([k, v]) => <Link key={k} href={`/joylar?category=${k}`} className="rounded-full border border-slate-300 px-3 py-1.5 text-sm hover:border-brand">{v}</Link>)}
        </div>
      </section>
      {centers.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-8" aria-labelledby="centers-h">
          <div className="mb-3 flex items-baseline justify-between"><h2 id="centers-h" className="text-lg font-semibold">{locale === "ru" ? "Бизнес-центры" : "Biznes markazlar"}</h2><Link href="/markazlar" className="text-sm text-brand hover:underline">{t("home.all")}</Link></div>
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2">
            {centers.map((c) => { const st = stats.get(c.id); return (
              <Link key={c.id} href={`/markazlar/${c.id}-${c.slug}`} className="flex w-[70vw] max-w-[280px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-md">
                <ListingPhoto thumb={mediaUrl(c.cover)} alt={c.name} sizes="280px" className="aspect-[16/10]">
                  <span className="text-3xl font-bold text-brand" aria-hidden="true">{c.name.slice(0, 2).toUpperCase()}</span>
                </ListingPhoto>
                <div className="space-y-1 p-3">
                  <h3 className="line-clamp-1 font-semibold">{c.name}</h3>
                  <p className="line-clamp-1 text-xs text-slate-500">{[c.district, c.region].filter(Boolean).join(", ")}</p>
                  <p className={`text-sm font-medium ${st?.rooms ? "text-accent" : "text-slate-500"}`}>{st?.rooms ? (locale === "ru" ? `Свободно помещений: ${st.rooms}` : `${st.rooms} ta bo‘sh xona`) : (locale === "ru" ? "Нет свободных помещений" : "Bo‘sh xona yo‘q")}</p>
                </div>
              </Link>); })}
          </div>
        </section>
      )}
      <RecentlyViewed />
      <section className="mx-auto max-w-6xl px-4 pb-10">
        <div className="flex items-baseline justify-between mb-3"><h2 className="text-lg font-semibold">{t("home.latest")}</h2><Link href="/joylar" className="text-sm text-brand hover:underline">{t("home.all")}</Link></div>
        {latest === null ? <p className="text-red-700">{t("home.loadFail")}</p>
          : <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{latest.items.slice(0, 8).map((it) => <ListingCard key={it.id} it={it} />)}</div>}
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-10"><div className="rounded-3xl bg-brand-dark p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-10"><div><h2 className="text-2xl font-bold">{locale === "ru" ? "Все помещения вашего центра — на одной странице" : "Markazingizdagi barcha xonalar — bitta sahifada"}</h2><p className="mt-3 max-w-2xl text-blue-100">{locale === "ru" ? "Фотографии, удобства, свободные офисы и прямой контакт с представителем. Выбирайте центр и найдите подходящее помещение." : "Rasmlar, qulayliklar, bo‘sh ofislar va vakil bilan to‘g‘ridan-to‘g‘ri aloqa. Markazni tanlang va o‘zingizga mos xonani toping."}</p></div><Link href="/markazlar" className="mt-5 inline-block shrink-0 rounded-xl bg-white px-5 py-3 font-semibold text-brand sm:mt-0">{locale === "ru" ? "Смотреть центры →" : "Markazlarni ko‘rish →"}</Link></div></section>
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-8 grid gap-4 sm:grid-cols-3 text-sm">
          {[[t("home.s1"), t("home.s1b")], [t("home.s2"), t("home.s2b")], [t("home.s3"), t("home.s3b")]].map(([a, b]) => (
            <div key={a}><h3 className="font-semibold">{a}</h3><p className="text-slate-600">{b}</p></div>))}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-8 text-center">
        <h2 className="text-lg font-semibold">{t("home.ownerTitle")}</h2>
        <p className="text-slate-600 mt-1">{promo ? (locale === "ru" ? "Разместите объявление бесплатно, без SMS. Оно появится после одобрения администратором." : "E’lonni bepul joylang.") : t("home.ownerBody")}</p>
        <div className="mt-3"><NewListingButton loggedIn={!!user} promo={guestAccessEnabled()} className="rounded bg-accent text-white px-5 py-2.5 font-medium" /></div>
      </section>
    </div>
  );
}

/** "Xaritada ko'rish" kartasi: chapda logo va matn, o'ngda hududlardagi e'lonlar soni ko'rsatilgan kichik xarita (haqiqiy xaritadagi klasterlar kabi). */
function MapCard({ ru, counts }: { ru: boolean; counts: number[] }) {
  const spots = ["left-3 top-2 h-9 w-9 text-sm", "left-[68px] top-9 h-8 w-8 text-xs", "right-2 top-1.5 h-7 w-7 text-xs", "bottom-1 right-3 h-6 w-6 text-[11px]"];
  const bubble = "absolute grid place-items-center rounded-full bg-white font-bold text-brand-dark shadow-md ring-2 ring-brand/25";
  return (
    <Link href="/joylar?view=map" className="group mt-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-brand to-brand-dark p-3 text-white shadow-md transition hover:shadow-lg sm:max-w-xl sm:p-4">
      <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-sm" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.webp" alt="" width={44} height={44} className="h-11 w-11" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold leading-tight">{ru ? "Смотреть на карте" : "Xaritada ko‘rish"}</span>
        <span className="block text-sm text-blue-100">{ru ? "Объявления по районам" : "Hududlar bo‘yicha e’lonlar"}</span>
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
