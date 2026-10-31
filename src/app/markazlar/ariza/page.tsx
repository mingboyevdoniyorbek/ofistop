import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { isUuid } from "@/lib/guard";
import { pageAlternates } from "@/lib/seo";
import { fmtDate } from "@/lib/format";
import { siteInfo } from "@/lib/site-info";
import CenterApplicationForm from "@/components/CenterApplicationForm";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const ru = (await getT()).locale === "ru";
  return { title: ru ? "Добавить бизнес-центр" : "Biznes markazni qo‘shish",
    description: ru ? "Разместите бизнес-центр и свободные помещения на OfisTop бесплатно." : "Biznes markazingiz va bo‘sh xonalarini OfisTop’da bepul joylang.",
    alternates: await pageAlternates("/markazlar/ariza") };
}

export default async function Apply({ searchParams }: { searchParams: Promise<{ markaz?: string }> }) {
  const { locale } = await getT(); const ru = locale === "ru"; const nm = (x: { nameUz: string; nameRu: string }) => (ru ? x.nameRu : x.nameUz);
  const claimId = (await searchParams).markaz;
  const [center] = claimId && isUuid(claimId) ? await db().select().from(s.businessCenters).where(eq(s.businessCenters.id, claimId)).limit(1) : [];
  const user = await getCurrentUser().catch(() => null);
  const self = `/markazlar/ariza${center ? `?markaz=${center.id}` : ""}`;
  const tg = siteInfo().telegram;
  const steps = ru
    ? ["Заполните заявку (2 минуты)", "Администратор позвонит и проверит данные", "Вы получите доступ: страница центра, фото, помещения и статистика"]
    : ["Arizani to‘ldiring (2 daqiqa)", "Administrator qo‘ng‘iroq qilib ma’lumotlarni tekshiradi", "Sizga kirish ochiladi: markaz sahifasi, rasmlar, xonalar va statistika"];

  let body: React.ReactNode;
  if (!user) {
    body = <div className="rounded-2xl border border-slate-200 p-5">
      <p>{ru ? "Чтобы после одобрения вы сразу управляли центром, войдите в аккаунт (Google или Telegram)." : "Tasdiqlangach markazni darhol o‘zingiz boshqarishingiz uchun hisobingizga kiring (Google yoki Telegram)."}</p>
      <Link href={`/kirish?next=${encodeURIComponent(self)}`} className="mt-4 inline-block rounded-xl bg-brand px-6 py-3 font-semibold text-white">{ru ? "Войти и продолжить" : "Kirish va davom etish"}</Link>
    </div>;
  } else {
    const [regions, districts, [profile], apps] = await Promise.all([
      db().select().from(s.regions).orderBy(asc(s.regions.nameUz)), db().select().from(s.districts).orderBy(asc(s.districts.nameUz)),
      db().select().from(s.profiles).where(eq(s.profiles.userId, user.id)).limit(1),
      db().select().from(s.centerApplications).where(eq(s.centerApplications.userId, user.id)).orderBy(desc(s.centerApplications.createdAt)).limit(10),
    ]);
    const st = { pending: ru ? "На рассмотрении" : "Ko‘rib chiqilmoqda", approved: ru ? "Одобрена" : "Tasdiqlandi", rejected: ru ? "Отклонена" : "Rad etildi" } as const;
    body = <>
      {apps.length > 0 && <section className="mb-6 rounded-2xl border border-slate-200 p-4">
        <h2 className="mb-2 font-semibold">{ru ? "Мои заявки" : "Mening arizalarim"}</h2>
        <ul className="divide-y text-sm">{apps.map((a) => <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span>{a.kind === "claim" ? "🔑 " : "🏢 "}{a.name} <span className="text-slate-500">· {fmtDate(a.createdAt, locale)}</span></span>
          <span className={`rounded-full px-2.5 py-1 text-xs ${a.status === "approved" ? "bg-green-50 text-green-800" : a.status === "rejected" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>{st[a.status]}</span>
          {a.status === "rejected" && a.rejectionReason && <p className="w-full text-xs text-red-700">{a.rejectionReason}</p>}
          {a.status === "approved" && a.centerId && <Link href={`/kabinet/markazlar/${a.centerId}`} className="w-full text-xs text-brand underline">{ru ? "Управлять центром →" : "Markazni boshqarish →"}</Link>}
        </li>)}</ul>
      </section>}
      <CenterApplicationForm
        init={{ centerId: center?.id, name: center?.name ?? "", regionId: center ? String(center.regionId) : "", districtId: center?.districtId ? String(center.districtId) : "", address: center?.address ?? "",
          contactName: profile?.displayName ?? "", phone: profile?.contactPhone ?? (user.phone.startsWith("+") ? user.phone : ""), telegramUsername: profile?.telegramUsername ?? "" }}
        regions={regions.map((r) => ({ id: r.id, name: nm(r) }))} districts={districts.map((d) => ({ id: d.id, regionId: d.regionId, name: nm(d) }))} />
    </>;
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={center ? `/markazlar/${center.id}-${center.slug}` : "/markazlar"} className="text-sm text-brand">← {center ? center.name : (ru ? "Бизнес-центры" : "Biznes markazlar")}</Link>
      <h1 className="mt-3 text-3xl font-bold text-brand-dark">{center ? (ru ? "Запросить управление центром" : "Markaz boshqaruvini so‘rash") : (ru ? "Добавьте свой бизнес-центр" : "Biznes markazingizni qo‘shing")}</h1>
      <p className="mt-2 text-slate-600">{center
        ? (ru ? `Если вы владелец или управляющий «${center.name}», оставьте заявку — после проверки вы сможете управлять страницей и помещениями.` : `Agar siz «${center.name}» egasi yoki boshqaruvchisi bo‘lsangiz, ariza qoldiring — tekshiruvdan so‘ng sahifa va xonalarni boshqarasiz.`)
        : (ru ? "Бесплатно: страница центра с фото, список свободных помещений, прямые звонки арендаторов и ежемесячная статистика." : "Bepul: rasmli markaz sahifasi, bo‘sh xonalar ro‘yxati, ijarachilardan to‘g‘ridan-to‘g‘ri qo‘ng‘iroqlar va oylik statistika.")}</p>
      <ol className="my-6 grid gap-3 sm:grid-cols-3">{steps.map((x, i) => <li key={x} className="rounded-2xl bg-slate-50 p-4 text-sm"><span className="mb-1 grid h-7 w-7 place-items-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>{x}</li>)}</ol>
      {body}
      {tg && <p className="mt-6 text-sm text-slate-600">{ru ? "Есть вопросы? " : "Savollar bormi? "}<a href={`https://t.me/${tg}`} target="_blank" rel="noopener" className="font-semibold text-brand underline">{ru ? "Напишите нам в Telegram" : "Telegram’da yozing"}</a></p>}
    </div>
  );
}
