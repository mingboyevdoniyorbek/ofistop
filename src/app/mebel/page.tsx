import Link from "next/link";
import { getT } from "@/lib/i18n";
import { pageAlternates } from "@/lib/seo";
import { listFirms, FURNITURE_PRODUCTS, KIND_LABELS, PRODUCT_LABELS } from "@/lib/furniture";
import { telHref } from "@/lib/site-info";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const ru = (await getT()).locale === "ru";
  return { title: ru ? "Офисная мебель" : "Ofis mebellari",
    description: ru ? "Мебель для офиса в Узбекистане: столы, кресла, шкафы — готовая и на заказ. Контакты продавцов и производителей." : "O‘zbekistonda ofis mebellari: stol, kreslo, shkaf — tayyor va buyurtma asosida. Sotuvchi va ishlab chiqaruvchilar bilan to‘g‘ridan-to‘g‘ri aloqa.",
    alternates: await pageAlternates("/mebel") };
}

export default async function Furniture({ searchParams }: { searchParams: Promise<{ tur?: string; turi?: string }> }) {
  const { locale } = await getT(); const ru = locale === "ru"; const lang = ru ? "ru" : "uz";
  const sp = await searchParams;
  const product = (FURNITURE_PRODUCTS as readonly string[]).includes(sp.tur ?? "") ? sp.tur : undefined;
  const kind = sp.turi === "ready" || sp.turi === "custom" ? sp.turi : undefined;
  const [firms, all] = await Promise.all([listFirms(locale, { product, kind }).catch(() => []), listFirms(locale).catch(() => [])]);
  const href = (o: { tur?: string; turi?: string }) => { const u = new URLSearchParams(); const t = "tur" in o ? o.tur : product, k = "turi" in o ? o.turi : kind; if (t) u.set("tur", t); if (k) u.set("turi", k); const q = u.toString(); return q ? `/mebel?${q}` : "/mebel"; };
  const chip = (active: boolean) => `shrink-0 rounded-full border px-3.5 py-2 text-sm ${active ? "border-brand bg-brand text-white" : "border-slate-300 bg-white hover:border-brand"}`;
  const cta = (
    <section className="rounded-3xl bg-brand-dark p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8">
      <div><h2 className="text-xl font-bold sm:text-2xl">{ru ? "Вы производите или продаёте офисную мебель?" : "Ofis mebeli ishlab chiqarasizmi yoki sotasizmi?"}</h2>
        <p className="mt-2 max-w-2xl text-blue-100">{ru ? "Люди, которые ищут офис на OfisTop, следующим шагом ищут мебель. Разместите компанию — первый месяц бесплатно." : "OfisTop’da ofis qidirayotganlar keyingi qadamda mebel qidiradi. Firmangizni joylang — birinchi oy bepul."}</p></div>
      <Link href="/mebel/ariza" className="mt-5 inline-block shrink-0 rounded-xl bg-accent px-5 py-3 font-semibold text-white sm:mt-0">{ru ? "Добавить компанию →" : "Firmani qo‘shish →"}</Link>
    </section>);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold text-brand-dark sm:text-3xl">🪑 {ru ? "Офисная мебель" : "Ofis mebellari"}</h1>
      <p className="mt-1 text-slate-600">{ru ? "Столы, кресла, шкафы — готовая мебель и изготовление на заказ. Связывайтесь с компаниями напрямую." : "Stol, kreslo, shkaf — tayyor mebel va buyurtma asosida tayyorlash. Firmalar bilan to‘g‘ridan-to‘g‘ri bog‘laning."}</p>
      {all.length > 0 && <><nav aria-label={ru ? "Вид мебели" : "Mebel turi"} className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href={href({ tur: undefined })} className={chip(!product)}>{ru ? "Все" : "Hammasi"}</Link>
        {FURNITURE_PRODUCTS.map((p) => <Link key={p} href={href({ tur: p })} className={chip(product === p)}>{PRODUCT_LABELS[p].icon} {PRODUCT_LABELS[p][lang]}</Link>)}
      </nav>
      <nav aria-label={ru ? "Тип предложения" : "Taklif turi"} className="mt-3 inline-flex rounded-xl bg-slate-100 p-1 text-sm font-semibold">
        {([[undefined, ru ? "Все" : "Hammasi"], ["ready", ru ? "Готовая" : "Tayyor"], ["custom", ru ? "На заказ" : "Buyurtmaga"]] as const).map(([k, v]) =>
          <Link key={v} href={href({ turi: k })} aria-current={kind === k ? "page" : undefined} className={`rounded-lg px-4 py-1.5 ${kind === k ? "bg-white text-brand shadow-sm" : "text-slate-600"}`}>{v}</Link>)}
      </nav></>}

      {all.length === 0 ? <div className="mt-6 space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold">{ru ? "Раздел только открылся" : "Bo‘lim yangi ochildi"}</h2>
          <p className="mt-1 text-slate-600">{ru ? "Первые мебельные компании сейчас добавляются. Станьте одной из первых — вас увидят все, кто ищет офис." : "Birinchi mebel firmalari hozir qo‘shilmoqda. Birinchilardan bo‘ling — sizni ofis qidirayotgan barcha foydalanuvchilar ko‘radi."}</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">{(ru
            ? ["Страница компании с контактами", "Звонки и сообщения в Telegram напрямую", "Первый месяц — бесплатно"]
            : ["Kontaktlari bilan firma sahifasi", "To‘g‘ridan-to‘g‘ri qo‘ng‘iroq va Telegram", "Birinchi oy — bepul"]).map((x) =>
            <li key={x} className="rounded-2xl bg-white p-4 text-sm shadow-sm">✓ {x}</li>)}</ul>
        </section>{cta}</div> : <>
        <p className="mt-5 text-sm text-slate-600">{ru ? "Компаний" : "Firmalar"}: {firms.length}</p>
        {firms.length === 0 ? <p className="mt-3 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-600">{ru ? "По этому фильтру компаний нет." : "Bu filtr bo‘yicha firma topilmadi."} <Link href="/mebel" className="text-brand underline">{ru ? "Показать все" : "Hammasini ko‘rish"}</Link></p>
          : <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{firms.map(({ f, region }) => (
            <li key={f.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-lg font-bold text-brand">{f.name.slice(0, 2).toUpperCase()}</span>
                <div className="min-w-0"><h2 className="truncate font-semibold">{f.name}</h2><p className="text-xs text-slate-500">{KIND_LABELS[f.kind][lang]} · {region}</p></div>
              </div>
              {f.products.length > 0 && <ul className="mt-3 flex flex-wrap gap-1.5">{f.products.map((p) => { const l = PRODUCT_LABELS[p as keyof typeof PRODUCT_LABELS]; return l ? <li key={p} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{l.icon} {l[lang]}</li> : null; })}</ul>}
              {f.description && <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm text-slate-700">{f.description}</p>}
              {f.address && <p className="mt-2 text-xs text-slate-500">📍 {f.address}</p>}
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <a href={telHref(f.phone)} className="flex-1 rounded-xl bg-accent px-3 py-2.5 text-center text-sm font-semibold text-white">📞 {ru ? "Позвонить" : "Qo‘ng‘iroq"}</a>
                {f.telegramUsername && <a href={`https://t.me/${f.telegramUsername}`} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-xl border-2 border-brand px-3 py-2 text-center text-sm font-semibold text-brand">Telegram</a>}
                {f.website && <a href={f.website} target="_blank" rel="noopener noreferrer nofollow" className="w-full text-center text-sm text-brand underline">{ru ? "Сайт / Instagram ↗" : "Sayt / Instagram ↗"}</a>}
              </div>
            </li>))}</ul>}
        <div className="mt-8">{cta}</div></>}
    </div>
  );
}
