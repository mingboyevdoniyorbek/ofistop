import Link from "next/link";
import { desc, eq, ilike, or } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { requireStaffPage } from "@/lib/staff";
import { fmtDate } from "@/lib/format";
import { getT } from "@/lib/i18n";
import type { MsgKey } from "@/messages/uz";
import AdminAction from "@/components/AdminAction";

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireStaffPage(true); // faqat admin
  const { locale, t } = await getT();
  const q = ((await searchParams).q ?? "").trim().slice(0, 40);
  const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  const rows = await db().select({ u: s.users, p: s.profiles }).from(s.users).leftJoin(s.profiles, eq(s.profiles.userId, s.users.id))
    .where(q ? or(ilike(s.users.phone, like), ilike(s.profiles.displayName, like)) : undefined).orderBy(desc(s.users.createdAt)).limit(100);
  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">{t("adm.nav.users")}</h1>
      <form className="mb-4 flex gap-2" role="search"><input name="q" defaultValue={q} placeholder={t("adm.u.search")} aria-label={t("adm.u.find")} className="rounded border border-slate-300 px-2 py-1.5 text-sm" /><button className="rounded border border-slate-300 px-3 text-sm">{t("adm.u.find")}</button></form>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead><tr className="border-b border-slate-200 text-slate-500"><th className="py-2 pr-3">{t("adm.u.phone")}</th><th className="pr-3">{t("adm.u.name")}</th><th className="pr-3">{t("adm.u.role")}</th><th className="pr-3">{t("adm.l.status")}</th><th className="pr-3">{t("adm.u.created")}</th><th>{t("adm.u.actions")}</th></tr></thead>
        <tbody>{rows.map(({ u, p }) => (
          <tr key={u.id} className="border-b border-slate-100 align-top">
            <td className="py-2 pr-3">{u.phone}{u.isDemo && <span className="ml-1 rounded bg-amber-100 px-1 text-xs text-amber-800">DEMO</span>}</td>
            <td className="pr-3">{p?.displayName}{p?.verifiedByStaffAt && <span className="ml-1 text-green-700" title={t("adm.u.verifiedTitle")}>✓</span>}</td>
            <td className="pr-3">{t(`adm.role.${u.role}` as MsgKey)}</td><td className="pr-3">{u.isBlocked ? t("adm.u.blocked") : t("adm.u.active")}</td><td className="pr-3">{fmtDate(u.createdAt, locale)}</td>
            <td><div className="flex flex-wrap gap-1.5">
              {u.id !== me.id && <>
                {(["user", "moderator", "admin"] as const).filter((r) => r !== u.role).map((r) => <AdminAction key={r} url={`/api/admin/users/${u.id}`} body={{ action: "role", role: r }} label={`→ ${t(`adm.role.${r}` as MsgKey)}`} confirm={t("adm.u.confirmRole", { phone: u.phone, role: t(`adm.role.${r}` as MsgKey) })} />)}
                <AdminAction url={`/api/admin/users/${u.id}`} body={{ action: u.isBlocked ? "unblock" : "block" }} label={u.isBlocked ? t("adm.u.unblock") : t("adm.u.block")} tone={u.isBlocked ? undefined : "danger"} confirm={u.isBlocked ? undefined : t("adm.u.confirmBlock", { phone: u.phone })} />
              </>}
              <AdminAction url={`/api/admin/users/${u.id}`} body={{ action: p?.verifiedByStaffAt ? "unverify" : "verify" }} label={p?.verifiedByStaffAt ? t("adm.u.unverify") : t("adm.u.verify")} />
            </div></td>
          </tr>))}
        </tbody></table></div>
      <p className="mt-3 text-xs text-slate-500">{t("adm.u.note")} <Link href="/admin/audit" className="underline">{t("adm.nav.audit")}</Link></p>
    </div>
  );
}
