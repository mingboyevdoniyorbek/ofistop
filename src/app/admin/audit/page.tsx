import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { requireStaffPage } from "@/lib/staff";
import { getT } from "@/lib/i18n";

const PAGE = 50;
export default async function Audit({ searchParams }: { searchParams: Promise<{ sahifa?: string }> }) {
  await requireStaffPage(true);
  const { locale, t } = await getT();
  const page = Math.max(1, Number((await searchParams).sahifa) || 1);
  const rows = await db().select({ a: s.auditLogs, phone: s.users.phone }).from(s.auditLogs).leftJoin(s.users, eq(s.users.id, s.auditLogs.actorId))
    .orderBy(desc(s.auditLogs.createdAt)).limit(PAGE + 1).offset((page - 1) * PAGE);
  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">{t("adm.nav.audit")}</h1>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead><tr className="border-b border-slate-200 text-slate-500"><th className="py-2 pr-3">{t("adm.a.time")}</th><th className="pr-3">{t("adm.a.who")}</th><th className="pr-3">{t("adm.a.action")}</th><th className="pr-3">{t("adm.a.object")}</th><th>{t("adm.a.details")}</th></tr></thead>
        <tbody>{rows.slice(0, PAGE).map(({ a, phone }) => (
          <tr key={a.id} className="border-b border-slate-100 align-top">
            <td className="py-2 pr-3 whitespace-nowrap">{new Date(a.createdAt).toLocaleString(locale === "ru" ? "ru-RU" : "uz-UZ")}</td><td className="pr-3">{phone ?? t("adm.a.system")}</td><td className="pr-3">{a.action}</td>
            <td className="pr-3 text-xs">{a.entityType}<br />{a.entityId.slice(0, 8)}</td><td className="text-xs text-slate-600">{a.meta ? JSON.stringify(a.meta) : ""}</td>
          </tr>))}</tbody></table></div>
      {rows.length === 0 && <p className="mt-4 text-slate-500">{t("adm.a.empty")}</p>}
      <div className="mt-4 flex gap-3 text-sm">{page > 1 && <Link className="underline" href={`/admin/audit?sahifa=${page - 1}`}>{t("adm.prev")}</Link>}{rows.length > PAGE && <Link className="underline" href={`/admin/audit?sahifa=${page + 1}`}>{t("adm.next")}</Link>}</div>
    </div>
  );
}
