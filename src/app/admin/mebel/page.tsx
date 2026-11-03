import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { requireStaffPage } from "@/lib/staff";
import { getT } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";
import { telHref } from "@/lib/site-info";
import AdminAction from "@/components/AdminAction";
import { KIND_LABELS, PRODUCT_LABELS } from "@/lib/furniture";

export const dynamic = "force-dynamic";
const TABS = ["pending", "approved", "rejected"] as const;

/** Mebel firmalari arizalari: tasdiqlangan firma /mebel sahifasida chiqadi. */
export default async function FurnitureAdmin({ searchParams }: { searchParams: Promise<{ holat?: string }> }) {
  await requireStaffPage(true);
  const { locale } = await getT(); const ru = locale === "ru"; const lang = ru ? "ru" : "uz";
  const sp = (await searchParams).holat;
  const tab = (TABS as readonly string[]).includes(sp ?? "") ? (sp as (typeof TABS)[number]) : "pending";
  const F = s.furnitureFirms;
  const rows = await db().select({ f: F, region: ru ? s.regions.nameRu : s.regions.nameUz }).from(F).innerJoin(s.regions, eq(s.regions.id, F.regionId))
    .where(eq(F.status, tab)).orderBy(tab === "pending" ? F.createdAt : desc(F.reviewedAt)).limit(100);
  const counts = new Map((await db().select({ st: F.status, n: sql<number>`count(*)::int` }).from(F).groupBy(F.status)).map((r) => [r.st, r.n]));
  const label = { pending: ru ? "Ожидают" : "Kutilmoqda", approved: ru ? "Одобрены" : "Tasdiqlangan", rejected: ru ? "Отклонены" : "Rad etilgan" };
  return (
    <div>
      <h1 className="text-xl font-bold">{ru ? "Мебельные компании" : "Mebel firmalari"}</h1>
      <p className="mt-1 text-sm text-slate-600">{ru ? "Одобренные компании показываются на странице /mebel." : "Tasdiqlangan firmalar /mebel sahifasida chiqadi."} <Link href="/mebel" className="text-brand underline">/mebel ↗</Link></p>
      <nav className="my-4 flex flex-wrap gap-2 text-sm">{TABS.map((t) => <Link key={t} href={`/admin/mebel?holat=${t}`} className={`rounded-full border px-3 py-1.5 ${t === tab ? "border-brand bg-brand text-white" : "border-slate-300"}`}>{label[t]} ({counts.get(t) ?? 0})</Link>)}</nav>
      {rows.length === 0 ? <p className="rounded border border-dashed border-slate-300 p-6 text-slate-500">{ru ? "Заявок нет." : "Arizalar yo‘q."}</p> : (
        <ul className="space-y-3">{rows.map(({ f, region }) => (
          <li key={f.id} className="rounded-xl border border-slate-200 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2"><strong className="text-base">🪑 {f.name}</strong><span className="text-slate-500">· {KIND_LABELS[f.kind][lang]} · {fmtDate(f.createdAt, locale)}</span></div>
            <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[160px_1fr]">
              <dt className="text-slate-500">{ru ? "Регион" : "Hudud"}</dt><dd>{region}{f.address ? ` · ${f.address}` : ""}</dd>
              <dt className="text-slate-500">{ru ? "Контакт" : "Mas’ul shaxs"}</dt><dd>{f.contactName} · <a href={telHref(f.phone)} className="font-semibold text-brand">{f.phone}</a>{f.telegramUsername && <> · <a href={`https://t.me/${f.telegramUsername}`} target="_blank" rel="noopener" className="text-brand">@{f.telegramUsername}</a></>}</dd>
              {f.products.length > 0 && <><dt className="text-slate-500">{ru ? "Предлагает" : "Taklif"}</dt><dd>{f.products.map((p) => PRODUCT_LABELS[p as keyof typeof PRODUCT_LABELS]?.[lang] ?? p).join(", ")}</dd></>}
              {f.website && <><dt className="text-slate-500">{ru ? "Сайт" : "Sayt"}</dt><dd><a href={f.website} target="_blank" rel="noopener noreferrer" className="text-brand underline">{f.website}</a></dd></>}
              {f.description && <><dt className="text-slate-500">{ru ? "Описание" : "Tavsif"}</dt><dd className="whitespace-pre-line">{f.description}</dd></>}
              {f.status === "rejected" && <><dt className="text-slate-500">{ru ? "Причина" : "Sabab"}</dt><dd className="text-red-700">{f.rejectionReason}</dd></>}
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              {f.status === "pending" && <>
                <AdminAction url={`/api/admin/furniture/${f.id}`} body={{ action: "approve" }} tone="primary" label={ru ? "✓ Одобрить" : "✓ Tasdiqlash"} confirm={ru ? "Одобрить компанию?" : "Firmani tasdiqlaysizmi?"} />
                <AdminAction url={`/api/admin/furniture/${f.id}`} body={{ action: "reject" }} tone="danger" label={ru ? "Отклонить" : "Rad etish"} askReason={ru ? "Причина отказа (её увидит заявитель):" : "Rad etish sababi (ariza beruvchi ko‘radi):"} />
              </>}
              {f.status === "approved" && <>
                {f.featuredUntil && f.featuredUntil > new Date() && <span className="rounded bg-gradient-to-b from-[#ffe27a] to-[#f5b400] px-2 py-1 text-xs font-black text-[#4a3000]"> VIP · {fmtDate(f.featuredUntil, locale)} {ru ? "до" : "gacha"}</span>}
                <AdminAction url={`/api/admin/furniture/${f.id}`} body={{ action: "feature", days: 30 }} label={ru ? "VIP +30 дн." : "VIP +30 kun"} confirm={ru ? "Сделать компанию VIP на 30 дней? (после оплаты)" : "Firma 30 kunga VIP qilinsinmi? (to‘lovdan keyin)"} />
                {f.featuredUntil && f.featuredUntil > new Date() && <AdminAction url={`/api/admin/furniture/${f.id}`} body={{ action: "unfeature" }} label={ru ? "Убрать VIP" : "VIP’ni olib tashlash"} />}
              </>}
              <AdminAction url={`/api/admin/furniture/${f.id}`} body={{ action: "remove" }} tone="danger" label={ru ? "Удалить" : "O‘chirish"} confirm={ru ? "Удалить компанию навсегда?" : "Firma butunlay o‘chirilsinmi?"} />
            </div>
          </li>))}</ul>)}
    </div>
  );
}
