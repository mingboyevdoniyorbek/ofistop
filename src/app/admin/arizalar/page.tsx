import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema as s } from "@/db/client";
import { requireStaffPage } from "@/lib/staff";
import { getT } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";
import { telHref } from "@/lib/site-info";
import AdminAction from "@/components/AdminAction";
import { searchKey } from "@/lib/text";

export const dynamic = "force-dynamic";
const TABS = ["pending", "approved", "rejected"] as const;

/** Biznes markaz arizalari: yangi markaz va "Bu markaz sizniki?" so'rovlari. Tasdiqlash markaz yaratadi va vakil biriktiradi. */
export default async function Applications({ searchParams }: { searchParams: Promise<{ holat?: string }> }) {
  await requireStaffPage(true);
  const { locale } = await getT(); const ru = locale === "ru";
  const sp = (await searchParams).holat;
  const tab = (TABS as readonly string[]).includes(sp ?? "") ? (sp as (typeof TABS)[number]) : "pending";
  const A = s.centerApplications; const D = alias(s.districts, "d");
  const rows = await db().select({ a: A, region: ru ? s.regions.nameRu : s.regions.nameUz, district: ru ? D.nameRu : D.nameUz, center: s.businessCenters, login: s.users.phone })
    .from(A).innerJoin(s.regions, eq(s.regions.id, A.regionId)).leftJoin(D, eq(D.id, A.districtId))
    .leftJoin(s.businessCenters, eq(s.businessCenters.id, A.centerId)).innerJoin(s.users, eq(s.users.id, A.userId))
    .where(eq(A.status, tab)).orderBy(tab === "pending" ? A.createdAt : desc(A.reviewedAt)).limit(100);
  // Takroriy markaz yaratmaslik uchun: shu nomdagi (apostrof/registrdan qat'i nazar) markazlar.
  const existing = await db().select({ id: s.businessCenters.id, slug: s.businessCenters.slug, name: s.businessCenters.name }).from(s.businessCenters);
  const same = (name: string) => { const k = searchKey(name); return existing.filter((c) => { const e = searchKey(c.name); return e === k || e.includes(k) || k.includes(e); }); };
  const counts = new Map((await db().select({ st: A.status, n: sql<number>`count(*)::int` }).from(A).groupBy(A.status)).map((r) => [r.st, r.n]));
  const label = { pending: ru ? "Ожидают" : "Kutilmoqda", approved: ru ? "Одобрены" : "Tasdiqlangan", rejected: ru ? "Отклонены" : "Rad etilgan" };
  return (
    <div>
      <h1 className="text-xl font-bold">{ru ? "Заявки бизнес-центров" : "Biznes markaz arizalari"}</h1>
      <p className="mt-1 text-sm text-slate-600">{ru ? "Перед одобрением позвоните заявителю и убедитесь, что он представляет центр." : "Tasdiqlashdan oldin ariza beruvchiga qo‘ng‘iroq qilib, u markaz vakili ekanini tekshiring."}</p>
      <nav className="my-4 flex flex-wrap gap-2 text-sm">{TABS.map((t) => <Link key={t} href={`/admin/arizalar?holat=${t}`} className={`rounded-full border px-3 py-1.5 ${t === tab ? "border-brand bg-brand text-white" : "border-slate-300"}`}>{label[t]} ({counts.get(t) ?? 0})</Link>)}</nav>
      {rows.length === 0 ? <p className="rounded border border-dashed border-slate-300 p-6 text-slate-500">{ru ? "Заявок нет." : "Arizalar yo‘q."}</p> : (
        <ul className="space-y-3">{rows.map(({ a, region, district, center, login }) => (
          <li key={a.id} className="rounded-xl border border-slate-200 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${a.kind === "claim" ? "bg-purple-50 text-purple-800" : "bg-blue-50 text-brand"}`}>{a.kind === "claim" ? (ru ? "🔑 Запрос управления" : "🔑 Boshqaruv so‘rovi") : (ru ? "🏢 Новый центр" : "🏢 Yangi markaz")}</span>
              <strong className="text-base">{a.name}</strong>
              <span className="text-slate-500">· {fmtDate(a.createdAt, locale)}</span>
            </div>
            {a.kind === "new" && a.status === "pending" && same(a.name).length > 0 && <p role="alert" className="mt-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-900">⚠ {ru ? "Похожий центр уже есть на сайте — возможно, это запрос управления, а не новый центр:" : "Saytda shunga o‘xshash markaz bor — ehtimol bu yangi markaz emas, boshqaruv so‘rovi:"} {same(a.name).map((c, i) => <span key={c.id}>{i > 0 && ", "}<Link href={`/markazlar/${c.id}-${c.slug}`} className="underline">{c.name}</Link></span>)}</p>}
            <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[160px_1fr]">
              <dt className="text-slate-500">{ru ? "Адрес" : "Manzil"}</dt><dd>{[district, region].filter(Boolean).join(", ")} · {a.address}</dd>
              <dt className="text-slate-500">{ru ? "Контакт" : "Mas’ul shaxs"}</dt><dd>{a.contactName} · <a href={telHref(a.phone)} className="font-semibold text-brand">{a.phone}</a>{a.telegramUsername && <> · <a href={`https://t.me/${a.telegramUsername}`} target="_blank" rel="noopener" className="text-brand">@{a.telegramUsername}</a></>}</dd>
              {(a.floors != null || a.freeRooms != null) && <><dt className="text-slate-500">{ru ? "Здание" : "Bino"}</dt><dd>{a.floors != null && `${a.floors} ${ru ? "эт." : "qavat"}`}{a.floors != null && a.freeRooms != null && " · "}{a.freeRooms != null && `${a.freeRooms} ${ru ? "свободных помещений" : "ta bo‘sh xona"}`}</dd></>}
              {a.website && <><dt className="text-slate-500">{ru ? "Сайт" : "Sayt"}</dt><dd><a href={a.website} target="_blank" rel="noopener noreferrer" className="text-brand underline">{a.website}</a></dd></>}
              {a.comment && <><dt className="text-slate-500">{ru ? "Комментарий" : "Izoh"}</dt><dd className="whitespace-pre-line">{a.comment}</dd></>}
              <dt className="text-slate-500">{ru ? "Аккаунт" : "Hisob"}</dt><dd className="text-slate-600">{login.startsWith("+") ? login : (ru ? "вход через Google/Telegram" : "Google/Telegram orqali kirgan")}</dd>
              {center && <><dt className="text-slate-500">{ru ? "Центр" : "Markaz"}</dt><dd><Link href={`/markazlar/${center.id}-${center.slug}`} className="text-brand underline">{center.name}</Link></dd></>}
              {a.status === "rejected" && <><dt className="text-slate-500">{ru ? "Причина" : "Sabab"}</dt><dd className="text-red-700">{a.rejectionReason}</dd></>}
            </dl>
            {a.status === "pending" && <div className="mt-3 flex flex-wrap gap-2">
              <AdminAction url={`/api/admin/center-applications/${a.id}`} body={{ action: "approve", verify: true }} tone="primary" label={ru ? "✓ Одобрить и отметить «Проверенный»" : "✓ Tasdiqlash va «Tasdiqlangan» belgisi"} confirm={ru ? "Вы позвонили и проверили заявителя?" : "Ariza beruvchiga qo‘ng‘iroq qilib tekshirdingizmi?"} />
              <AdminAction url={`/api/admin/center-applications/${a.id}`} body={{ action: "approve", verify: false }} label={ru ? "Одобрить без отметки" : "Belgisiz tasdiqlash"} confirm={ru ? "Одобрить заявку?" : "Arizani tasdiqlaysizmi?"} />
              <AdminAction url={`/api/admin/center-applications/${a.id}`} body={{ action: "reject" }} tone="danger" label={ru ? "Отклонить" : "Rad etish"} askReason={ru ? "Причина отказа (её увидит заявитель):" : "Rad etish sababi (ariza beruvchi ko‘radi):"} />
            </div>}
          </li>))}</ul>)}
    </div>
  );
}
