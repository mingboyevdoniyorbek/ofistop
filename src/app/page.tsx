import Link from "next/link";
import { getT } from "@/lib/i18n";
import { parseFilters, searchListings } from "@/lib/search";
import ListingCard from "@/components/ListingCard";
import { memo } from "@/lib/memo";
import { pageAlternates } from "@/lib/seo";

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
    { href: "/joylar?view=map", icon: <LineIcon d={LINE.map} />, label: ru ? "Карта" : "Xarita" },
    { href: "/markazlar", icon: <LineIcon d={LINE.building} />, label: ru ? "Бизнес-центры" : "Markazlar" },
    { href: "/joylar?deal=sale", icon: <LineIcon d={LINE.tag} />, label: ru ? "Продажа" : "Sotuv" },
    { href: "/mebel", icon: <LineIcon d={LINE.sofa} />, label: ru ? "Мебель" : "Mebel" },
  ];  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 pt-4 pb-2 sm:pt-8">
        <h1 className="sr-only">{t("home.title")}</h1>
        {/* Ixcham qidiruv: yozib qidirish yoki filtrlar tugmasi (Airbnb/Joymee uslubi) */}
        <form action="/joylar" method="get" role="search" className="flex gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-[0_2px_12px_rgba(15,23,42,0.08)] focus-within:ring-2 focus-within:ring-brand">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0 stroke-slate-500" fill="none" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input name="q" type="search" enterKeyHint="search" autoComplete="off" aria-label={t("home.kw")} placeholder={ru ? "Метро, район или «8 человек»" : "Metro, tuman yoki «8 kishi»"} className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-500 focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden" />
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

      {top && top.items.length > 0 && <Rail vip title={ru ? "VIP объявления" : "VIP e’lonlar"} sub={ru ? "Лучшие предложения недели" : "Haftaning eng yaxshi takliflari"} href="/joylar" more={t("home.all")}>{top.items.slice(0, 12).map((it) => <RailItem key={it.id}><ListingCard it={it} compact /></RailItem>)}</Rail>}
      {inCenters && inCenters.items.length > 0 && <Rail title={ru ? "Помещения в бизнес-центрах" : "Biznes markazlardagi xonalar"} sub={ru ? `${inCenters.total} свободных помещений` : `${inCenters.total} ta bo‘sh xona`} href="/joylar?category=bc_room" more={t("home.all")}>{inCenters.items.slice(0, 12).map((it) => <RailItem key={it.id}><ListingCard it={it} compact /></RailItem>)}</Rail>}

      {/* Qolgan e'lonlar: telefonda 2 ustun, pastga qarab */}
      <section className="mx-auto max-w-6xl px-4 pt-3" aria-labelledby="all-h">
        <RailHead id="all-h" title={ru ? "Все объявления" : "Barcha e’lonlar"} href="/joylar" more={t("home.all")} />
        {rest === null ? <p className="text-red-700">{t("home.loadFail")}</p>
          : <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-8 lg:grid-cols-4">{rest.map((it) => <ListingCard key={it.id} it={it} />)}</div>}
        <Link href="/joylar" className="mt-5 block rounded-xl border border-brand py-3 text-center font-semibold text-brand hover:bg-blue-50">{ru ? "Показать все объявления →" : "Barcha e’lonlarni ko‘rish →"}</Link>
      </section>

      {/* Pastda bitta asosiy banner (biznes markazlar — saytning asosiy yo'nalishi) va ikkita kichik oq kartochka */}
      <section className="mx-auto mt-10 max-w-6xl space-y-3 px-4 pb-6">
        <div className="relative overflow-hidden rounded-3xl bg-brand-dark p-6 text-white sm:p-8">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute -bottom-2 right-2 h-32 w-32 text-white/25 drop-shadow-[0_0_14px_rgba(255,255,255,.45)] sm:right-8" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"><path d={LINE.building} /></svg>
          <h2 className="relative max-w-xl text-2xl font-bold">{ru ? "Все помещения вашего центра — на одной странице" : "Markazingizdagi barcha xonalar — bitta sahifada"}</h2>
          <p className="relative mt-2 max-w-xl text-blue-100">{ru ? "Фото, свободные офисы и прямой контакт с арендаторами. Бесплатно." : "Rasmlar, bo‘sh ofislar va ijarachilar bilan to‘g‘ridan-to‘g‘ri aloqa. Bepul."}</p>
          <Link href="/markazlar/ariza" className="relative mt-5 inline-block rounded-xl bg-accent px-5 py-3 font-semibold text-white">{ru ? "Добавить центр" : "Markazni qo‘shish"}</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SmallCard href="/xizmat" icon={<LineIcon d={LINE.key} />} title={ru ? "Сдадим помещение за вас" : "Joyingizni biz ijaraga beramiz"} sub={ru ? "Примем звонки и покажем помещение" : "Qo‘ng‘iroqlarni qabul qilamiz, joyni ko‘rsatamiz"} />
          <SmallCard href="/mebel" icon={<LineIcon d={LINE.sofa} />} title={ru ? "Мебель для офиса" : "Ofisingiz uchun mebel"} sub={ru ? "Проверенные мебельные компании" : "Ishonchli mebel firmalari"} />
        </div>
      </section>
    </div>
  );
}

/** Qator sarlavhasi: nomi, ixtiyoriy izoh va o'ngda "hammasi" doira-strelka (Airbnb kabi). */
function RailHead({ id, title, sub, href, more, vip = false }: { id?: string; title: string; sub?: string; href: string; more: string; vip?: boolean }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {vip && <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#ffe27a] to-[#f5b400] shadow-[0_4px_12px_-4px_rgba(180,120,0,.6)]"><svg viewBox="0 0 16 12" className="h-3.5 w-4"><path d="M1 3.5 4.5 6 8 1l3.5 5L15 3.5 13.6 11H2.4Z" fill="#4a3000" /></svg></span>}
        <div className="min-w-0"><h2 id={id} className="truncate text-lg font-bold text-slate-900 sm:text-xl">{title}</h2>{sub && <p className={`text-xs ${vip ? "font-medium text-amber-800" : "text-slate-500"}`}>{sub}</p>}</div>
      </div>
      <Link href={href} aria-label={`${title}: ${more}`} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg text-slate-800 ${vip ? "bg-white shadow-sm ring-1 ring-amber-200 hover:bg-amber-50" : "bg-slate-100 hover:bg-slate-200"}`}>→</Link>
    </div>
  );
}
function Rail({ title, sub, href, more, children, vip = false }: { title: string; sub?: string; href: string; more: string; children: React.ReactNode; vip?: boolean }) {
  const body = <>
    <RailHead title={title} sub={sub} href={href} more={more} vip={vip} />
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 no-scrollbar overflow-x-auto scroll-px-4 px-4 pb-2">{children}</div>
  </>;
  // VIP qatori: alohida fon yo'q — sarlavhadagi toj va kartochkalardagi oltin hoshiya yetarli (toza ko'rinish).
  return <section className="mx-auto max-w-6xl px-4 pt-6">{body}</section>;
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
/** Bir xil uslubdagi oq chiziqli ikonkalar (ko'k doira ichida, yengil yorug'lik) — rangli stikerlar o'rniga. */
const LINE = {
  map: "M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  building: "M5 21V4.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5V21M15 9h3.5a.5.5 0 0 1 .5.5V21M3 21h18M8 7.5h1.5M11 7.5h1.5M8 11h1.5M11 11h1.5M8 14.5h1.5M11 14.5h1.5M9 21v-3h3v3",
  tag: "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01",
  key: "M15 7a4 4 0 1 1-3.9 4.9L4 19v2h3v-2h2v-2h2l1.1-1.1A4 4 0 0 1 15 7zm1.5 2.5h.01",
  sofa: "M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM6 18v2M18 18v2",
};
const LineIcon = ({ d }: { d: string }) => (
  <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#2a78d6] to-[#12308a] text-white shadow-[0_6px_16px_-6px_rgba(18,48,138,.7)]">
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] drop-shadow-[0_0_4px_rgba(255,255,255,.55)]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
  </span>
);
