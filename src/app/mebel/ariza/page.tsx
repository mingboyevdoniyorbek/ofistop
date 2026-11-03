import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { pageAlternates } from "@/lib/seo";
import { fmtDate } from "@/lib/format";
import { siteInfo } from "@/lib/site-info";
import FurnitureApplicationForm from "@/components/FurnitureApplicationForm";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const ru = (await getT()).locale === "ru";
  return { title: ru ? "Добавить мебельную компанию" : "Mebel firmasini qo‘shish",
    description: ru ? "Разместите мебельную компанию в разделе «Офисная мебель» на OfisTop. Первый месяц бесплатно." : "Mebel firmangizni OfisTop’ning «Ofis mebellari» bo‘limiga joylang. Birinchi oy bepul.",
    alternates: await pageAlternates("/mebel/ariza") };
}

export default async function FurnitureApply() {
  const { locale } = await getT(); const ru = locale === "ru";
  const user = await getCurrentUser().catch(() => null);
  const tg = siteInfo().telegram;
  const steps = ru
    ? ["Заполните заявку (2 минуты)", "Администратор проверит данные", "Компания появится в разделе «Офисная мебель»"]
    : ["Arizani to‘ldiring (2 daqiqa)", "Administrator ma’lumotlarni tekshiradi", "Firmangiz «Ofis mebellari» bo‘limida chiqadi"];
  let body: React.ReactNode;
  if (!user) {
    body = <div className="rounded-2xl border border-slate-200 p-5">
      <p>{ru ? "Войдите в аккаунт (Google или Telegram), чтобы отправить заявку и получить ответ." : "Ariza yuborish va javob olish uchun hisobingizga kiring (Google yoki Telegram)."}</p>
      <Link href={`/kirish?next=${encodeURIComponent("/mebel/ariza")}`} className="mt-4 inline-block rounded-xl bg-brand px-6 py-3 font-semibold text-white">{ru ? "Войти и продолжить" : "Kirish va davom etish"}</Link>
    </div>;
  } else {
    const [regions, [profile], apps] = await Promise.all([
      db().select().from(s.regions).orderBy(asc(s.regions.id)),
      db().select().from(s.profiles).where(eq(s.profiles.userId, user.id)).limit(1),
      db().select().from(s.furnitureFirms).where(eq(s.furnitureFirms.userId, user.id)).orderBy(desc(s.furnitureFirms.createdAt)).limit(10),
    ]);
    const st = { pending: ru ? "На рассмотрении" : "Ko‘rib chiqilmoqda", approved: ru ? "Одобрена" : "Tasdiqlandi", rejected: ru ? "Отклонена" : "Rad etildi" } as const;
    body = <>
      {apps.length > 0 && <section className="mb-6 rounded-2xl border border-slate-200 p-4">
        <h2 className="mb-2 font-semibold">{ru ? "Мои заявки" : "Mening arizalarim"}</h2>
        <ul className="divide-y text-sm">{apps.map((a) => <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span>🪑 {a.name} <span className="text-slate-500">· {fmtDate(a.createdAt, locale)}</span></span>
          <span className={`rounded-full px-2.5 py-1 text-xs ${a.status === "approved" ? "bg-green-50 text-green-800" : a.status === "rejected" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>{st[a.status]}</span>
          {a.status === "rejected" && a.rejectionReason && <p className="w-full text-xs text-red-700">{a.rejectionReason}</p>}
        </li>)}</ul>
      </section>}
      <FurnitureApplicationForm init={{ contactName: profile?.displayName ?? "", phone: profile?.contactPhone ?? (user.phone.startsWith("+") ? user.phone : ""), telegramUsername: profile?.telegramUsername ?? "" }}
        regions={regions.map((r) => ({ id: r.id, name: ru ? r.nameRu : r.nameUz }))} />
    </>;
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/mebel" className="text-sm text-brand">← {ru ? "Офисная мебель" : "Ofis mebellari"}</Link>
      <h1 className="mt-3 text-3xl font-bold text-brand-dark">{ru ? "Добавьте мебельную компанию" : "Mebel firmangizni qo‘shing"}</h1>
      <p className="mt-2 text-slate-600">{ru ? "Для производителей и продавцов офисной мебели. Первый месяц — бесплатно." : "Ofis mebeli ishlab chiqaruvchi va sotuvchilar uchun. Birinchi oy — bepul."}</p>
      <ol className="my-6 grid gap-3 sm:grid-cols-3">{steps.map((x, i) => <li key={x} className="rounded-2xl bg-slate-50 p-4 text-sm"><span className="mb-1 grid h-7 w-7 place-items-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>{x}</li>)}</ol>
      {body}
      {tg && <p className="mt-6 text-sm text-slate-600">{ru ? "Есть вопросы? " : "Savollar bormi? "}<a href={`https://t.me/${tg}`} target="_blank" rel="noopener" className="font-semibold text-brand underline">{ru ? "Напишите нам в Telegram" : "Telegram’da yozing"}</a></p>}
    </div>
  );
}
