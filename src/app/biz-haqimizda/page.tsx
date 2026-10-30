import Link from "next/link";
import { getT } from "@/lib/i18n";
import { siteInfo } from "@/lib/site-info";
import { pageAlternates } from "@/lib/seo";
import SiteContacts from "@/components/SiteContacts";

export async function generateMetadata() {
  const { locale } = await getT(); const ru = locale === "ru";
  return {
    title: ru ? "О нас" : "Biz haqimizda",
    description: ru ? "OfisTop — платформа для поиска офисов, торговых и коммерческих помещений в аренду в Узбекистане." : "OfisTop — O‘zbekistonda ofis, savdo va tijorat joylarini ijaraga topish platformasi.",
    alternates: await pageAlternates("/biz-haqimizda"),
  };
}
export default async function About() {
  const { locale } = await getT(); const ru = locale === "ru";
  const s = siteInfo();
  const points = ru
    ? [["Только коммерческая недвижимость", "Офисы, помещения в бизнес-центрах, коворкинги, магазины, склады и производство — без жилья и посторонних объявлений."],
       ["Каждое объявление проверяется", "Модератор просматривает объявление до публикации и после каждого важного изменения."],
       ["Бизнес-центры на одной странице", "Свободные помещения центра, цены, удобства и прямой контакт с представителем."],
       ["Прямой контакт", "Вы связываетесь с владельцем или представителем напрямую. Платформа не берёт плату за просмотр контактов."]]
    : [["Faqat tijorat joylari", "Ofis, biznes markazdagi xona, kovorking, do‘kon, ombor va ishlab chiqarish joylari — uy-joy va boshqa e’lonlarsiz."],
       ["Har bir e’lon tekshiriladi", "Moderator e’lonni chop etishdan oldin va har bir muhim o‘zgarishdan keyin ko‘rib chiqadi."],
       ["Biznes markazlar bitta sahifada", "Markazdagi bo‘sh xonalar, narxlar, qulayliklar va vakil bilan to‘g‘ridan-to‘g‘ri aloqa."],
       ["To‘g‘ridan-to‘g‘ri aloqa", "Mulk egasi yoki vakil bilan bevosita bog‘lanasiz. Kontaktni ko‘rish uchun to‘lov olinmaydi."]];
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 leading-relaxed">
      <h1 className="text-3xl font-bold text-brand-dark">{ru ? "О нас" : "Biz haqimizda"}</h1>
      <p className="mt-3 text-lg text-slate-700">{ru
        ? "OfisTop помогает предпринимателям быстро найти подходящее помещение для бизнеса, а владельцам и бизнес-центрам — арендаторов."
        : "OfisTop tadbirkorlarga biznesi uchun mos joyni tez topishga, mulk egalari va biznes markazlarga esa ijarachi topishga yordam beradi."}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {points.map(([h, b]) => <div key={h} className="rounded-2xl border border-slate-200 p-4"><h2 className="font-semibold">{h}</h2><p className="mt-1 text-sm text-slate-600">{b}</p></div>)}
      </div>
      <section className="mt-8 rounded-2xl bg-slate-50 p-5">
        <h2 className="text-lg font-semibold">{ru ? "Контакты" : "Aloqa"}</h2>
        {s.company && <p className="mt-1">{s.company}{s.inn ? ` · ${ru ? "ИНН" : "STIR"}: ${s.inn}` : ""}</p>}
        {s.address && <p className="text-slate-600">{s.address}</p>}
        <SiteContacts className="mt-2 text-brand" />
        <p className="mt-3 text-sm text-slate-600">{ru ? "Для владельцев бизнес-центров: свяжитесь с нами, чтобы открыть страницу центра и кабинет представителя." : "Biznes markaz egalari uchun: markaz sahifasi va vakil kabinetini ochish uchun biz bilan bog‘laning."}</p>
      </section>
      <p className="mt-6 flex flex-wrap gap-4 text-sm"><Link href="/qoidalar" className="text-brand underline">{ru ? "Правила размещения" : "E’lon qoidalari"}</Link><Link href="/shartlar" className="text-brand underline">{ru ? "Условия использования" : "Foydalanish shartlari"}</Link><Link href="/maxfiylik" className="text-brand underline">{ru ? "Конфиденциальность" : "Maxfiylik"}</Link></p>
    </article>
  );
}
