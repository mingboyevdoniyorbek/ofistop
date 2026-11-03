import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { labels } from "@/lib/format";
import { pageAlternates } from "@/lib/seo";
import { siteInfo, telHref } from "@/lib/site-info";
import ServiceRequestForm from "@/components/ServiceRequestForm";
import { ServiceSticker } from "@/components/Stickers";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const ru = (await getT()).locale === "ru";
  return { title: ru ? "Сдадим ваше помещение за вас" : "Joyingizni biz ijaraga beramiz",
    description: ru ? "Нет времени общаться с арендаторами? OfisTop найдёт арендатора: примем звонки, покажем помещение, вы только подпишете договор." : "Ijarachilar bilan har kuni gaplashishga vaqtingiz yo‘qmi? OfisTop ijarachi topadi: qo‘ng‘iroqlarni qabul qilamiz, joyni ko‘rsatamiz, siz faqat shartnoma tuzasiz.",
    alternates: await pageAlternates("/xizmat") };
}

export default async function Service() {
  const { locale } = await getT(); const ru = locale === "ru";
  const user = await getCurrentUser().catch(() => null);
  const [regions, districts, profile] = await Promise.all([
    db().select().from(s.regions).orderBy(asc(s.regions.id)),
    db().select().from(s.districts).orderBy(asc(s.districts.nameUz)),
    user ? db().select().from(s.profiles).where(eq(s.profiles.userId, user.id)).limit(1).then((r) => r[0]) : Promise.resolve(undefined),
  ]);
  const site = siteInfo();
  const steps = ru ? [
    ["Оставляете заявку", "Имя и телефон — 1 минута."],
    ["Мы приезжаем и снимаем", "Осматриваем помещение, делаем качественные фото и размещаем объявление."],
    ["Принимаем звонки и показываем", "Отвечаем арендаторам, отбираем подходящих и сами показываем помещение."],
    ["Вы подписываете договор", "Встречаетесь только с подходящим арендатором."],
  ] : [
    ["Ariza qoldirasiz", "Ism va telefon — 1 daqiqa."],
    ["Biz kelib, suratga olamiz", "Joyni ko‘rib chiqamiz, sifatli suratlar olamiz va e’lonni joylaymiz."],
    ["Qo‘ng‘iroqlarni qabul qilib, ko‘rsatamiz", "Ijarachilarga javob beramiz, munosiblarini saralab, joyni o‘zimiz ko‘rsatamiz."],
    ["Siz shartnoma tuzasiz", "Faqat munosib ijarachi bilan uchrashasiz."],
  ];
  const perks = ru
    ? ["Не нужно отвечать на звонки каждый день", "Профессиональные фото и описание", "Показы помещения — наша забота", "Отсеиваем случайные и несерьёзные запросы", "Сообщаем о ходе поиска в Telegram"]
    : ["Har kuni qo‘ng‘iroqlarga javob berish shart emas", "Professional suratlar va tavsif", "Joyni ko‘rsatish — bizning ishimiz", "Tasodifiy va jiddiy bo‘lmagan so‘rovlarni saralaymiz", "Jarayon haqida Telegram’da xabar berib turamiz"];
  const faq = ru ? [
    ["Сколько это стоит?", "Стоимость зависит от помещения и условий — менеджер назовёт её по телефону до начала работы. Без вашего согласия мы ничего не начинаем."],
    ["Кто подписывает договор аренды?", "Договор заключаете вы напрямую с арендатором. Мы находим арендатора и организуем показы."],
    ["Можно ли разместить объявление самому?", "Да, разместить объявление на OfisTop можно бесплатно и самостоятельно. Эта услуга — для тех, у кого нет времени."],
  ] : [
    ["Bu qancha turadi?", "Narx joy va shartlarga bog‘liq — menejer ishni boshlashdan oldin telefonda aytadi. Roziligingizsiz hech narsa boshlanmaydi."],
    ["Ijara shartnomasini kim tuzadi?", "Shartnomani siz ijarachi bilan to‘g‘ridan-to‘g‘ri tuzasiz. Biz ijarachini topamiz va ko‘rsatishlarni tashkil qilamiz."],
    ["E’lonni o‘zim joylasam bo‘ladimi?", "Ha, OfisTop’da e’lonni o‘zingiz bepul joylashingiz mumkin. Bu xizmat — vaqti yo‘qlar uchun."],
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-dark via-brand to-[#1d4ed8] p-6 text-white sm:p-10">
        <div className="relative z-10 max-w-2xl">
          <p className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{ru ? "Услуга OfisTop" : "OfisTop xizmati"}</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">{ru ? "Помещение есть, а времени на арендаторов нет?" : "Joyingiz bor, lekin ijarachilarga vaqtingiz yo‘qmi?"}</h1>
          <p className="mt-3 text-blue-100 sm:text-lg">{ru ? "Сдадим его за вас: примем звонки, покажем помещение и найдём арендатора. Вы только подписываете договор." : "Biz siz uchun ijaraga beramiz: qo‘ng‘iroqlarni qabul qilamiz, joyni ko‘rsatamiz va ijarachi topamiz. Siz faqat shartnoma tuzasiz."}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="#ariza" className="rounded-xl bg-accent px-6 py-3 font-semibold text-white shadow-lg">{ru ? "Оставить заявку" : "Ariza qoldirish"}</a>
            {site.phone && <a href={telHref(site.phone)} className="rounded-xl bg-white/15 px-6 py-3 font-semibold text-white ring-1 ring-white/30">📞 {site.phone}</a>}
            {site.telegram && <a href={`https://t.me/${site.telegram}`} target="_blank" rel="noopener" className="rounded-xl bg-white/15 px-6 py-3 font-semibold text-white ring-1 ring-white/30">Telegram</a>}
          </div>
        </div>
        <div className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 md:block"><div className="rounded-full bg-white/95 p-4 shadow-2xl"><ServiceSticker uid="svc-hero" className="h-32 w-32 sm:h-44 sm:w-44" /></div></div>
      </section>

      <section className="mt-8" aria-labelledby="how-h">
        <h2 id="how-h" className="text-xl font-bold">{ru ? "Как это работает" : "Qanday ishlaydi"}</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{steps.map(([a, b], i) => <li key={a} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>
          <p className="mt-2 font-semibold">{a}</p><p className="mt-1 text-sm text-slate-600">{b}</p></li>)}</ol>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.3fr]" id="ariza">
        <div>
          <h2 className="text-xl font-bold">{ru ? "Что вы получаете" : "Siz nimaga ega bo‘lasiz"}</h2>
          <ul className="mt-4 space-y-2.5">{perks.map((x) => <li key={x} className="flex gap-2.5 text-slate-700"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-green-100 text-xs font-bold text-green-700">✓</span>{x}</li>)}</ul>
          <div className="mt-6 space-y-3">{faq.map(([q, a]) => <details key={q} className="group rounded-2xl border border-slate-200 bg-white p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">{q}<span aria-hidden="true" className="text-slate-400 transition group-open:rotate-45">+</span></summary>
            <p className="mt-2 text-sm text-slate-600">{a}</p></details>)}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">{ru ? "Заявка на услугу" : "Xizmatga ariza"}</h2>
          <p className="mb-4 mt-1 text-sm text-slate-600">{ru ? "Менеджер перезвонит, уточнит детали и назовёт стоимость." : "Menejer qo‘ng‘iroq qilib, tafsilotlarni aniqlaydi va narxini aytadi."}</p>
          <ServiceRequestForm init={{ name: profile?.displayName ?? "", phone: profile?.contactPhone ?? (user?.phone.startsWith("+") ? user.phone : ""), telegramUsername: profile?.telegramUsername ?? "" }}
            regions={regions.map((r) => ({ id: r.id, name: ru ? r.nameRu : r.nameUz }))} districts={districts.map((d) => ({ id: d.id, regionId: d.regionId, name: ru ? d.nameRu : d.nameUz }))}
            categories={Object.entries(labels(locale).category)} />
        </div>
      </section>
    </div>
  );
}
