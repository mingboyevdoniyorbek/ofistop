import Link from "next/link";
import { centerStats, listCenters } from "@/lib/centers";
import CenterStats from "@/components/CenterStats";
import { getT } from "@/lib/i18n";
import { mediaUrl } from "@/lib/storage";
import { searchKey } from "@/lib/text";
import { pageAlternates } from "@/lib/seo";
export const dynamic = "force-dynamic";
export async function generateMetadata() { const { t } = await getT(); return { title: t("ctr.title"), description: t("ctr.desc"), alternates: await pageAlternates("/markazlar") }; }
export default async function Page({ searchParams }: { searchParams: Promise<{q?:string|string[]; vacant?:string|string[]}> }) {
  const { locale, t } = await getT(); const ru = locale === "ru";
  const sp = await searchParams, q = (Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "", vacant = Array.isArray(sp.vacant) ? sp.vacant[0] : sp.vacant;
  const centers = await listCenters(locale).catch(() => null);
  if (!centers) return <div className="mx-auto max-w-6xl px-4 py-8"><p role="alert" className="text-red-700">{t("ctr.loadFail")}</p></div>;
  const stats = await centerStats(centers.map(c => c.id));
  const shown = centers.filter(c => (!q || searchKey([c.name,c.address,c.region,c.district].join(" ")).includes(searchKey(q))) && (vacant !== "1" || (stats.get(c.id)?.rooms ?? 0) > 0));
  return <div className="mx-auto max-w-6xl px-4 py-8">
    <header className="rounded-3xl bg-brand-dark p-6 text-white sm:p-10">
      <p className="mb-2 text-sm text-blue-200">OfisTop · {ru ? "Бизнес-центры" : "Biznes markazlar"}</p>
      <h1 className="text-3xl font-bold">{ru ? "Ваш следующий офис — здесь" : "Keyingi ofisingiz shu yerda"}</h1>
      <p className="mt-3 max-w-2xl text-blue-100">{ru ? "Познакомьтесь с центром, сравните свободные помещения и свяжитесь с представителем напрямую." : "Markaz bilan tanishing, bo‘sh xonalarni solishtiring va vakili bilan to‘g‘ridan-to‘g‘ri bog‘laning."}</p>
      <form className="mt-6 flex flex-wrap gap-3" action="/markazlar">
        <input name="q" defaultValue={q} aria-label={ru ? "Название или адрес центра" : "Markaz nomi yoki manzili"} placeholder={ru ? "Название, район или ориентир" : "Markaz nomi, tuman yoki mo‘ljal"} className="min-w-0 flex-1 rounded-xl bg-white px-4 py-3 text-slate-900" />
        <button className="rounded-xl bg-accent px-6 py-3 font-semibold">{t("home.search")}</button>
        <label className="flex w-full items-center gap-2 text-sm"><input type="checkbox" name="vacant" value="1" defaultChecked={vacant === "1"} />{ru ? "Только со свободными помещениями" : "Faqat bo‘sh xonasi bor markazlar"}</label>
      </form>
    </header>
    <div className="my-6 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{t("ctr.title")} · {shown.length}</h2><Link href="/kabinet/markazlar" className="text-sm text-brand underline">{ru ? "Кабинет представителя" : "Markaz vakili kabineti"}</Link></div>
    {!shown.length ? <div className="rounded-2xl border border-dashed p-8"><p>{centers.length ? (ru ? "По этим условиям центров нет." : "Bu shartlarga mos markaz topilmadi.") : t("ctr.empty")}</p>{(q || vacant) && <Link href="/markazlar" className="mt-3 inline-block text-brand underline">{ru ? "Сбросить фильтры" : "Filtrlarni tozalash"}</Link>}</div> :
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{shown.map(c => { const cover = mediaUrl(c.cover); return <Link key={c.id} href={`/markazlar/${c.id}-${c.slug}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-lg">
        {cover ? <img src={cover} alt={c.name} loading="lazy" className="aspect-[16/9] w-full object-cover" /> : <div className="grid aspect-[16/9] place-items-center bg-blue-50 text-4xl font-bold text-brand" aria-hidden="true">{c.name.slice(0,2).toUpperCase()}</div>}
        <div className="space-y-2 p-5"><h3 className="text-xl font-bold">{c.name}</h3>{c.tagline && <p className="line-clamp-2 text-sm">{c.tagline}</p>}<p className="text-sm text-slate-500">{[c.district,c.region,c.address].filter(Boolean).join(" · ")}</p><CenterStats st={stats.get(c.id)} />{c.isDemo && <p className="text-xs text-amber-800">{t("ctr.demo")}</p>}<p className="pt-2 text-sm font-semibold text-brand">{ru ? "Посмотреть центр и помещения →" : "Markaz va xonalarni ko‘rish →"}</p></div>
      </Link>; })}</div>}
  </div>;
}
