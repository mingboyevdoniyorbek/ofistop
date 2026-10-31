import Link from "next/link";
import { inArray, eq, desc } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { managedCenterIds } from "@/lib/guard";
import { requireUserPage } from "@/lib/page-auth";
import { getT } from "@/lib/i18n";
import { effectiveAvailability } from "@/lib/status";
import NewListingButton from "@/components/NewListingButton";
import ListingActions from "@/components/ListingActions";
import CenterBadges from "@/components/CenterBadges";
import { centerPeriodStats, lastDays } from "@/lib/center-report";
export default async function Page() {
  const user = await requireUserPage("/kabinet/markazlar"), { locale } = await getT(), ru = locale === "ru";
  const ids = await managedCenterIds(user.id), centers = ids.length ? await db().select().from(s.businessCenters).where(inArray(s.businessCenters.id, ids)) : [];
  const period = lastDays(30);
  const stats = new Map(await Promise.all(centers.map(async (c) => [c.id, await centerPeriodStats(c.id, period.from, period.to)] as const)));
  const rooms = ids.length ? await db().select().from(s.listings).where(inArray(s.listings.centerId, ids)).orderBy(desc(s.listings.updatedAt)) : [];
  return <div><h1 className="text-2xl font-bold">{ru ? "Управление бизнес-центрами" : "Biznes markazlarini boshqarish"}</h1><p className="mb-6 mt-2 text-slate-600">{ru ? "Страница центра, комнаты и актуальная доступность — в одном месте." : "Markaz sahifasi, xonalar va bo‘sh joylar — bitta joyda."}</p>
    {!centers.length && <div className="rounded-2xl border border-dashed p-6"><p>{ru ? "У вас пока нет бизнес-центра. Оставьте заявку — после проверки администратор откроет вам управление." : "Sizda hali biznes markaz yo‘q. Ariza qoldiring — tekshiruvdan so‘ng administrator boshqaruvni ochib beradi."}</p>
      <div className="mt-4 flex flex-wrap gap-3"><Link href="/markazlar/ariza" className="rounded-xl bg-accent px-5 py-3 font-semibold text-white">{ru ? "Добавить бизнес-центр" : "Biznes markaz qo‘shish"}</Link><Link href="/markazlar" className="rounded-xl border border-brand px-5 py-3 font-semibold text-brand">{ru ? "Мой центр уже на сайте" : "Markazim saytda bor"}</Link></div></div>}
    {centers.map(c => { const items = rooms.filter(r => r.centerId === c.id); const free = items.filter(r => r.moderationStatus === "approved" && !r.isSuspended && effectiveAvailability(r) === "available"); return <section key={c.id} className="mb-6 rounded-3xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{c.name}</h2><p className="text-sm text-slate-500">{c.address}</p><CenterBadges c={c} ru={ru} className="mt-1" /></div><NewListingButton loggedIn centerId={c.id}/></div>
      <div className="my-4 grid grid-cols-3 gap-3">{[[ru ? "Всего" : "Jami", items.length], [ru ? "Свободно" : "Bo‘sh", free.length], [ru ? "На проверке" : "Tekshiruvda", items.filter(r => r.moderationStatus === "pending").length]].map(([label,n]) => <div className="rounded-2xl bg-slate-50 p-3" key={label}><strong className="block text-2xl text-brand">{n}</strong><span className="text-xs">{label}</span></div>)}</div>
      {c.pendingChanges && <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">✏️ {ru ? "Изменения страницы на проверке у администратора." : "Sahifa o‘zgarishlari administrator tekshiruvida."}</p>}
      {(() => { const st = stats.get(c.id)!; return <div className="mb-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{ru ? "Последние 30 дней" : "Oxirgi 30 kun"}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{[[ru ? "Просмотры центра" : "Markaz ko‘rishlari", st.centerViews], [ru ? "Просмотры помещений" : "Xonalar ko‘rishlari", st.roomViews], [ru ? "Звонки" : "Qo‘ng‘iroqlar", st.phone], ["Telegram", st.telegram], [ru ? "В избранном" : "Saqlanganlar", st.favorites]].map(([l, n]) =>
          <div key={String(l)} className="rounded-2xl border border-slate-200 p-3"><strong className="block text-xl text-brand">{n}</strong><span className="text-xs text-slate-600">{l}</span></div>)}</div>
        <p className="mt-1 text-xs text-slate-500">{ru ? `Всего просмотров страницы: ${c.viewCount}. Отчёт за месяц приходит 1-го числа в уведомления.` : `Sahifa jami ko‘rishlari: ${c.viewCount}. Oylik hisobot har oyning 1-kuni bildirishnomalarga keladi.`}</p></div>; })()}
      <div className="mb-4 flex flex-wrap gap-4 text-sm text-brand"><Link className="underline" href={`/kabinet/markazlar/${c.id}`}>{ru ? "Изменить страницу и фото" : "Sahifa va rasmlarni tahrirlash"}</Link><Link className="underline" href={`/markazlar/${c.id}-${c.slug}`}>{ru ? "Открыть публичную страницу" : "Ommaviy sahifani ko‘rish"}</Link></div>
      <ul className="divide-y">{items.map(r => <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><Link href={`/kabinet/elon/${r.id}`} className="font-medium text-brand">{r.unitCode ? `${r.unitCode} · ` : ""}{r.title || (ru ? "Новая комната" : "Yangi xona")}</Link><p className="text-xs text-slate-500">{r.areaM2 ? `${Number(r.areaM2)} m² · ` : ""}{r.moderationStatus !== "approved" ? (r.moderationStatus === "pending" ? (ru ? "На проверке" : "Tekshiruvda") : (ru ? "Требует заполнения" : "Tahrirlash kerak")) : effectiveAvailability(r) === "available" ? (ru ? "Свободно" : "Bo‘sh") : (ru ? "Недоступно" : "Band yoki faol emas")}</p></div>{r.moderationStatus === "approved" && !r.isSuspended && r.availabilityStatus !== "archived" && <ListingActions id={r.id} actions={effectiveAvailability(r) === "available" ? [{ label: ru ? "Ещё свободно" : "Hali bo‘sh", body: { action: "confirm" } }, { label: ru ? "Сдано" : "Ijaraga berildi", body: { action: "set", to: "rented" }, confirm: ru ? "Помещение сдано?" : "Joy ijaraga berildimi?" }] : [{ label: ru ? "Снова свободно" : "Qayta bo‘sh", body: effectiveAvailability(r) === "expired" ? { action: "confirm" } : { action: "set", to: "available" } }]}/>}</li>)}</ul>
    </section>; })}
  </div>;
}
