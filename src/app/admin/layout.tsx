import Link from "next/link";
import { getAdminUser } from "@/lib/auth";
import AdminLogout from "@/components/AdminLogout";
import { getT } from "@/lib/i18n";
import { eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await getAdminUser();
  if (!u) return children; // Each data page also checks authorization before querying.
  const { t, locale } = await getT(); const ru = locale === "ru";
  // Ko'rib chiqilmagan markaz arizalari va vakil o'zgarishlari soni menyuda ko'rinadi.
  const [{ n: pendingApps }] = await db().select({ n: sql<number>`count(*)::int` }).from(s.centerApplications).where(eq(s.centerApplications.status, "pending"));
  const [{ n: pendingEdits }] = await db().select({ n: sql<number>`count(*)::int` }).from(s.businessCenters).where(sql`${s.businessCenters.pendingChanges} IS NOT NULL OR EXISTS (SELECT 1 FROM business_center_images i WHERE i.center_id = ${s.businessCenters.id} AND i.pending)`);
  const links = [
    ["/admin/elonlar", t("adm.nav.listings"), false], ["/admin/shikoyatlar", t("adm.nav.reports"), false],
    ["/admin/foydalanuvchilar", t("adm.nav.users"), true], ["/admin/markazlar", `${t("adm.nav.centers")}${pendingEdits ? ` (✏️ ${pendingEdits})` : ""}`, true],
    ["/admin/arizalar", `${ru ? "Заявки центров" : "Markaz arizalari"}${pendingApps ? ` (${pendingApps})` : ""}`, true],
    ["/admin/hududlar", t("adm.nav.geo"), true], ["/admin/audit", t("adm.nav.audit"), true], ["/admin/sozlamalar", t("adm.nav.settings"), true],
  ] as const;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <nav aria-label={t("nav.admin")} className="mb-5 flex flex-wrap gap-4 border-b border-slate-200 pb-2 text-sm">
        {links.filter(([, , adminOnly]) => !adminOnly || u.role === "admin").map(([h, l]) => <Link key={h} href={h} className="hover:underline">{l}</Link>)}
        <span className="ml-auto text-slate-500">{t("adm.role", { role: t(u.role === "admin" ? "adm.role.admin" : "adm.role.moderator") })}</span>
        <AdminLogout />
      </nav>
      {children}
    </div>
  );
}
