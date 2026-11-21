import Link from "next/link";
import { getT } from "@/lib/i18n";
import { parseFilters, searchListings } from "@/lib/search";
import ListingCard from "@/components/ListingCard";
import RecentlyViewed from "@/components/RecentlyViewed";
import { memo } from "@/lib/memo";
import { pageAlternates } from "@/lib/seo";
import { CenterSticker, SaleSticker, ServiceSticker, SofaSticker } from "@/components/Stickers";

export const dynamic = "force-dynamic";
export async function generateMetadata() { return { alternates: await pageAlternates("/") }; }

export default async function Home() {
  const { locale, t } = await getT(); const ru = locale === "ru";
  // Ommaviy bloklar 30–60 soniya keshlanadi (har bir tashrifda bazaga borilmaydi).
  // Tartib: 1) TOP (pullik) e'lonlar va 2) biznes markazlardagi xonalar — gorizontal qatorlarda;
  // 3) qolgan e'lonlar — 2 ustunli to'rda, pastga qarab.
  const list = (only: "top" | "center" | "rest", page = 1) => memo(`home:${only}:${page}:${locale}`, 30_000, () => searchListings({ ...parseFilters({}), only, page }, locale)).catch(() => null);
  const [top, inCenters, rest1, rest2] = await Promise.all([list("top"), list("center"), list("rest", 1), list("rest", 2)]);
  const rest = rest1 ? [...rest1.items, ...(rest2?.items ?? [])] : null;
  // Bitta ixcham qator: xarita va asosiy bo'limlar (avval banner + 4 katta tugma + turlar qatori edi — ko'z charchardi).
  const tiles = [
    { href: "/joylar?view=map", icon: <MapPinIcon />, label: ru ? "Карта" : "Xarita" },
    { href: "/markazlar", icon: <CenterSticker className="h-9 w-9" />, label: ru ? "Бизнес-центры" : "Markazlar" },
    { href: "/joylar?deal=sale", icon: <SaleSticker className="h-9 w-9" />, label: ru ? "Продажа" : "Sotuv" },
    { href: "/mebel", icon: <SofaSticker className="h-9 w-9" />, label: ru ? "Мебель" : "Mebel" },
  ];
  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 pt-4 pb-2 sm:pt-8">
        <h1 className="sr-only">{t("home.title")}</h1>
        {/* Ixcham qidiruv: yozib qidirish yoki filtrlar tugmasi (Airbnb/Joymee uslubi) */}
        <form action="/joylar" method="get" role="search" className="flex gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-[0_2px_12px_rgba(15,23,42,0.08)] focus-within:ring-2 focus-within:ring-brand">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0 stroke-slate-500" fill="none" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input name="q" type="search" enterKeyHint="search" autoComplete="off" aria-label={t("home.kw")} placeholder={ru ? "Метро, район или адрес" : "Metro, tuman yoki manzil"} className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-500 focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden" />
          </label>
          <Link href="/joylar?filtr=1" aria-label={ru ? "Фильтры" : "Filtrlar"} className="grid h-[50px] w-[50px] shrink-0 place-items-center rounded-full border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.08)]">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 stroke-slate-700" fill="none" strokeWidth="2" strokeLinecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>
          </Link>
        </form>
        <nav aria-label={ru ? "Разделы" : "Bo‘limlar"} className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
          {tiles.map((x) => <Link key={x.href} href={x.href} className="flex flex-col items-center gap-1 rounded-2xl border border-slate-200 bg-white px-1 py-2.5 text-center text-xs font-semibold text-slate-800 transition hover:border-brand hover:shadow-sm sm:flex-row sm:justify-center sm:gap-2.5 sm:py-3 sm:text-sm">
            {x.icon}{x.label}</Link>)}
        </nav>
      </section>

      {top && top.items.length > 0 && <Rail title={ru ? "VIP объявления" : "VIP e’lonlar"} sub={ru ? "Рекомендуемые" : "Tavsiya etilgan"} href="/joylar" more={t("home.all")}>{top.items.slice(0, 12).map((it) => <RailItem key={it.id}><ListingCard it={it} compact /></RailItem>)}</Rail>}
      {inCenters && inCenters.items.length > 0 && <Rail title={ru ? "Помещения в бизнес-центрах" : "Biznes markazlardagi xonalar"} sub={ru ? `${inCenters.total} свободных помещений` : `${inCenters.total} ta bo‘sh xona`} href="/joylar?category=bc_room" more={t("home.all")}>{inCenters.items.slice(0, 12).map((it) => <RailItem key={it.id}><ListingCard it={it} compact /></RailItem>)}</Rail>}

      <RecentlyViewed />

      {/* Qolgan e'lonlar: telefonda 2 ustun, pastga qarab */}
      <section className="mx-auto max-w-6xl px-4 pt-6" aria-labelledby="all-h">
        <RailHead id="all-h" title={ru ? "Все объявления" : "Barcha e’lonlar"} href="/joylar" more={t("home.all")} />
        {rest === null ? <p className="text-red-700">{t("home.loadFail")}</p>
          : <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-8 lg:grid-cols-4">{rest.map((it) => <ListingCard key={it.id} it={it} />)}</div>}
        <Link href="/joylar" className="mt-5 block rounded-xl border border-brand py-3 text-center font-semibold text-brand hover:bg-blue-50">{ru ? "Показать все объявления →" : "Barcha e’lonlarni ko‘rish →"}</Link>
      </section>

      {/* Pastda bitta asosiy banner (biznes markazlar — saytning asosiy yo'nalishi) va ikkita kichik oq kartochka */}
      <section className="mx-auto mt-10 max-w-6xl space-y-3 px-4 pb-10">
        <div className="relative overflow-hidden rounded-3xl bg-brand-dark p-6 text-white sm:p-8">
          <CenterSticker uid="bc-cta" className="pointer-events-none absolute -bottom-4 -right-3 h-32 w-32 opacity-30" />
          <h2 className="relative max-w-xl text-2xl font-bold">{ru ? "Все помещения вашего центра — на одной странице" : "Markazingizdagi barcha xonalar — bitta sahifada"}</h2>
          <p className="relative mt-2 max-w-xl text-blue-100">{ru ? "Фото, свободные офисы и прямой контакт с арендаторами. Бесплатно." : "Rasmlar, bo‘sh ofislar va ijarachilar bilan to‘g‘ridan-to‘g‘ri aloqa. Bepul."}</p>
          <Link href="/markazlar/ariza" className="relative mt-5 inline-block rounded-xl bg-accent px-5 py-3 font-semibold text-white">{ru ? "Добавить центр" : "Markazni qo‘shish"}</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SmallCard href="/xizmat" icon={<ServiceSticker uid="svc-cta" className="h-12 w-12" />} title={ru ? "Сдадим помещение за вас" : "Joyingizni biz ijaraga beramiz"} sub={ru ? "Примем звонки и покажем помещение" : "Qo‘ng‘iroqlarni qabul qilamiz, joyni ko‘rsatamiz"} />
          <SmallCard href="/mebel" icon={<SofaSticker uid="sofa-cta" className="h-12 w-12" />} title={ru ? "Мебель для офиса" : "Ofisingiz uchun mebel"} sub={ru ? "Проверенные мебельные компании" : "Ishonchli mebel firmalari"} />
        </div>
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
/** Qatordagi karta "Barcha e'lonlar" to'ridagi ustun bilan bir xil kenglikda: telefonda ekranga aniq 2 ta sig'adi (px-4 + gap-3). */
const RailItem = ({ children }: { children: React.ReactNode }) => <div className="w-[calc((100vw-2.75rem)/2)] max-w-[270px] shrink-0 snap-start">{children}</div>;

function SmallCard({ href, icon, title, sub }: { href: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand hover:shadow-sm">
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1"><span className="block font-semibold text-slate-900">{title}</span><span className="block text-sm text-slate-500">{sub}</span></span>
      <span aria-hidden="true" className="text-xl text-slate-400">›</span>
    </Link>
  );
}
const MapPinIcon = () => (
  <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-brand text-white">
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>
  </span>
);
