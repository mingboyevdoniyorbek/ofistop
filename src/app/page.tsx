import Link from "next/link";
import { labels } from "@/lib/format";
import { getT } from "@/lib/i18n";
import { parseFilters, searchListings } from "@/lib/search";
import ListingCard from "@/components/ListingCard";
import NewListingButton from "@/components/NewListingButton";
import { promoEnabled, guestAccessEnabled } from "@/lib/launch-mode";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { locale, t } = await getT(); const CAT = labels(locale).category;
  const promo = promoEnabled();
  const user = await getCurrentUser();
  const latest = await searchListings({ ...parseFilters({}), page: 1 }, locale).catch(() => null);
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
          <div className="mt-4 flex flex-wrap gap-3"><Link href="/joylar?view=map" className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white">⌖ {locale === "ru" ? "Найти на карте" : "Xaritadan joy topish"}</Link><Link href="/markazlar" className="rounded-xl border border-brand px-5 py-3 text-sm font-semibold text-brand">{locale === "ru" ? "Бизнес-центры и свободные помещения →" : "Biznes markazlar va bo‘sh xonalar →"}</Link></div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-lg font-semibold mb-3">{t("home.types")}</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CAT).map(([k, v]) => <Link key={k} href={`/joylar?category=${k}`} className="rounded-full border border-slate-300 px-3 py-1.5 text-sm hover:border-brand">{v}</Link>)}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-10">
        <div className="flex items-baseline justify-between mb-3"><h2 className="text-lg font-semibold">{t("home.latest")}</h2><Link href="/joylar" className="text-sm text-brand hover:underline">{t("home.all")}</Link></div>
        {latest === null ? <p className="text-red-700">{t("home.loadFail")}</p>
          : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{latest.items.slice(0, 8).map((it) => <ListingCard key={it.id} it={it} />)}</div>}
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
