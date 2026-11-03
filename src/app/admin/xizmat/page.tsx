import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema as s } from "@/db/client";
import { requireStaffPage } from "@/lib/staff";
import { getT } from "@/lib/i18n";
import { fmtDate, labels } from "@/lib/format";
import { telHref } from "@/lib/site-info";
import AdminAction from "@/components/AdminAction";

export const dynamic = "force-dynamic";
const TABS = ["new", "in_progress", "done", "rejected"] as const;

/** «Joyingizni biz ijaraga beramiz» arizalari: menejer qo'ng'iroq qiladi va holatni yuritadi. */
export default async function ServiceAdmin({ searchParams }: { searchParams: Promise<{ holat?: string }> }) {
  await requireStaffPage(true);
  const { locale } = await getT(); const ru = locale === "ru"; const cat = labels(locale).category;
  const sp = (await searchParams).holat;
  const tab = (TABS as readonly string[]).includes(sp ?? "") ? (sp as (typeof TABS)[number]) : "new";
  const R = s.serviceRequests; const D = alias(s.districts, "d");
  const rows = await db().select({ r: R, region: ru ? s.regions.nameRu : s.regions.nameUz, district: ru ? D.nameRu : D.nameUz }).from(R)
    .leftJoin(s.regions, eq(s.regions.id, R.regionId)).leftJoin(D, eq(D.id, R.districtId))
    .where(eq(R.status, tab)).orderBy(tab === "new" ? R.createdAt : desc(R.updatedAt)).limit(100);
  const counts = new Map((await db().select({ st: R.status, n: sql<number>`count(*)::int` }).from(R).groupBy(R.status)).map((x) => [x.st, x.n]));
  const label = { new: ru ? "Новые" : "Yangi", in_progress: ru ? "В работе" : "Ishda", done: ru ? "Сдано" : "Bajarildi", rejected: ru ? "Отказ" : "Rad etilgan" };
  return (
    <div>
      <h1 className="text-xl font-bold">{ru ? "Услуга «Сдадим за вас»" : "«Joyingizni biz ijaraga beramiz» xizmati"}</h1>
      <p className="mt-1 text-sm text-slate-600">{ru ? "Позвоните заявителю, договоритесь об осмотре и стоимости." : "Ariza beruvchiga qo‘ng‘iroq qiling, ko‘rish va narxni kelishib oling."} <Link href="/xizmat" className="text-brand underline">/xizmat ↗</Link></p>
      <nav className="my-4 flex flex-wrap gap-2 text-sm">{TABS.map((t) => <Link key={t} href={`/admin/xizmat?holat=${t}`} className={`rounded-full border px-3 py-1.5 ${t === tab ? "border-brand bg-brand text-white" : "border-slate-300"}`}>{label[t]} ({counts.get(t) ?? 0})</Link>)}</nav>
      {rows.length === 0 ? <p className="rounded border border-dashed border-slate-300 p-6 text-slate-500">{ru ? "Заявок нет." : "Arizalar yo‘q."}</p> : (
        <ul className="space-y-3">{rows.map(({ r, region, district }) => (
          <li key={r.id} className="rounded-xl border border-slate-200 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2"><strong className="text-base">🤝 {r.name}</strong><a href={telHref(r.phone)} className="font-semibold text-brand">{r.phone}</a>
              {r.telegramUsername && <a href={`https://t.me/${r.telegramUsername}`} target="_blank" rel="noopener" className="text-brand">@{r.telegramUsername}</a>}
              <span className="text-slate-500">· {fmtDate(r.createdAt, locale)}</span></div>
            <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[160px_1fr]">
              {r.category && <><dt className="text-slate-500">{ru ? "Тип" : "Joy turi"}</dt><dd>{cat[r.category]}</dd></>}
              {(region || r.address) && <><dt className="text-slate-500">{ru ? "Адрес" : "Manzil"}</dt><dd>{[district, region].filter(Boolean).join(", ")}{r.address ? ` · ${r.address}` : ""}</dd></>}
              {r.areaM2 && <><dt className="text-slate-500">{ru ? "Площадь" : "Maydon"}</dt><dd>{r.areaM2} m²</dd></>}
              {r.desiredPrice && <><dt className="text-slate-500">{ru ? "Желаемая цена" : "Kutilayotgan narx"}</dt><dd>{r.desiredPrice}</dd></>}
              {r.comment && <><dt className="text-slate-500">{ru ? "Комментарий" : "Izoh"}</dt><dd className="whitespace-pre-line">{r.comment}</dd></>}
              {r.adminNote && <><dt className="text-slate-500">{ru ? "Заметка" : "Eslatma"}</dt><dd className="text-amber-800">{r.adminNote}</dd></>}
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.status !== "in_progress" && r.status !== "done" && <AdminAction url={`/api/admin/service-requests/${r.id}`} body={{ status: "in_progress" }} tone="primary" label={ru ? "Взять в работу" : "Ishga olish"} />}
              {r.status === "in_progress" && <AdminAction url={`/api/admin/service-requests/${r.id}`} body={{ status: "done" }} tone="primary" label={ru ? "✓ Сдано" : "✓ Ijaraga berildi"} confirm={ru ? "Помещение сдано?" : "Joy ijaraga berildimi?"} />}
              {r.status !== "rejected" && <AdminAction url={`/api/admin/service-requests/${r.id}`} body={{ status: "rejected" }} tone="danger" label={ru ? "Отказ" : "Rad etish"} askReason={ru ? "Причина (для себя):" : "Sabab (o‘zingiz uchun eslatma):"} />}
              {r.status !== "new" && <AdminAction url={`/api/admin/service-requests/${r.id}`} body={{ status: "new" }} label={ru ? "Вернуть в новые" : "Yangilarga qaytarish"} />}
            </div>
          </li>))}</ul>)}
    </div>
  );
}
