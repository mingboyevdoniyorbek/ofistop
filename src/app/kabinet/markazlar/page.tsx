import Link from "next/link";
import { inArray, eq, desc } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { managedCenterIds } from "@/lib/guard";
import { requireUserPage } from "@/lib/page-auth";
import { getT } from "@/lib/i18n";
import { effectiveAvailability } from "@/lib/status";
import NewListingButton from "@/components/NewListingButton";
import ListingActions from "@/components/ListingActions";
export default async function Page() {
  const user = await requireUserPage("/kabinet/markazlar"), { locale } = await getT(), ru = locale === "ru";
  const ids = await managedCenterIds(user.id), centers = ids.length ? await db().select().from(s.businessCenters).where(inArray(s.businessCenters.id, ids)) : [];
  const rooms = ids.length ? await db().select().from(s.listings).where(inArray(s.listings.centerId, ids)).orderBy(desc(s.listings.updatedAt)) : [];
  return <div><h1 className="text-2xl font-bold">{ru ? "Управление бизнес-центрами" : "Biznes markazlarini boshqarish"}</h1><p className="mb-6 mt-2 text-slate-600">{ru ? "Страница центра, комнаты и актуальная доступность — в одном месте." : "Markaz sahifasi, xonalar va bo‘sh joylar — bitta joyda."}</p>
    {!centers.length && <p className="rounded-2xl border border-dashed p-6">{ru ? "Администратор должен назначить вас представителем центра." : "Markaz vakili sifatida administrator sizni markazga biriktiradi."}</p>}
    {centers.map(c => { const items = rooms.filter(r => r.centerId === c.id); const free = items.filter(r => r.moderationStatus === "approved" && !r.isSuspended && effectiveAvailability(r) === "available"); return <section key={c.id} className="mb-6 rounded-3xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{c.name}</h2><p className="text-sm text-slate-500">{c.address}</p></div><NewListingButton loggedIn centerId={c.id}/></div>
      <div className="my-4 grid grid-cols-3 gap-3">{[[ru ? "Всего" : "Jami", items.length], [ru ? "Свободно" : "Bo‘sh", free.length], [ru ? "На проверке" : "Tekshiruvda", items.filter(r => r.moderationStatus === "pending").length]].map(([label,n]) => <div className="rounded-2xl bg-slate-50 p-3" key={label}><strong className="block text-2xl text-brand">{n}</strong><span className="text-xs">{label}</span></div>)}</div>
      <div className="mb-4 flex flex-wrap gap-4 text-sm text-brand"><Link className="underline" href={`/kabinet/markazlar/${c.id}`}>{ru ? "Изменить страницу и фото" : "Sahifa va rasmlarni tahrirlash"}</Link><Link className="underline" href={`/markazlar/${c.id}-${c.slug}`}>{ru ? "Открыть публичную страницу" : "Ommaviy sahifani ko‘rish"}</Link></div>
      <ul className="divide-y">{items.map(r => <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><Link href={`/kabinet/elon/${r.id}`} className="font-medium text-brand">{r.unitCode ? `${r.unitCode} · ` : ""}{r.title || (ru ? "Новая комната" : "Yangi xona")}</Link><p className="text-xs text-slate-500">{r.areaM2 ? `${Number(r.areaM2)} m² · ` : ""}{r.moderationStatus !== "approved" ? (r.moderationStatus === "pending" ? (ru ? "На проверке" : "Tekshiruvda") : (ru ? "Требует заполнения" : "Tahrirlash kerak")) : effectiveAvailability(r) === "available" ? (ru ? "Свободно" : "Bo‘sh") : (ru ? "Недоступно" : "Band yoki faol emas")}</p></div>{r.moderationStatus === "approved" && !r.isSuspended && r.availabilityStatus !== "archived" && <ListingActions id={r.id} actions={effectiveAvailability(r) === "available" ? [{ label: ru ? "Ещё свободно" : "Hali bo‘sh", body: { action: "confirm" } }, { label: ru ? "Сдано" : "Ijaraga berildi", body: { action: "set", to: "rented" }, confirm: ru ? "Помещение сдано?" : "Joy ijaraga berildimi?" }] : [{ label: ru ? "Снова свободно" : "Qayta bo‘sh", body: effectiveAvailability(r) === "expired" ? { action: "confirm" } : { action: "set", to: "available" } }]}/>}</li>)}</ul>
    </section>; })}
  </div>;
}
