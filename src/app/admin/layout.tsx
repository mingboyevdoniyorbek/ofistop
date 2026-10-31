import { getAdminUser } from "@/lib/auth";
import AdminLogout from "@/components/AdminLogout";
import AdminShell, { type AdminNavItem } from "@/components/admin/AdminShell";
import { getT } from "@/lib/i18n";
import { queryClient } from "@/db/client";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await getAdminUser();
  if (!u) return children; // Each data page also checks authorization before querying.
  const { t, locale } = await getT(); const ru = locale === "ru";
  // Ko'rib chiqishni kutayotganlar soni menyuda qizil belgi bilan ko'rinadi.
  const { rows: [c] } = await queryClient().query(`SELECT
    (SELECT count(*) FROM listings WHERE moderation_status='pending')::int AS listings,
    (SELECT count(*) FROM reports WHERE status='open')::int AS reports,
    (SELECT count(*) FROM center_applications WHERE status='pending')::int AS apps,
    (SELECT count(*) FROM business_centers WHERE pending_changes IS NOT NULL OR EXISTS (SELECT 1 FROM business_center_images i WHERE i.center_id = business_centers.id AND i.pending))::int AS edits`);
  const admin = u.role === "admin";
  const items: (AdminNavItem & { adminOnly?: boolean })[] = [
    { href: "/admin", label: ru ? "Панель" : "Boshqaruv paneli", icon: "dashboard" },
    { href: "/admin/elonlar", label: t("adm.nav.listings"), icon: "listings", badge: c.listings },
    { href: "/admin/shikoyatlar", label: t("adm.nav.reports"), icon: "reports", badge: c.reports },
    { href: "/admin/arizalar", label: ru ? "Заявки центров" : "Markaz arizalari", icon: "apps", badge: c.apps, adminOnly: true },
    { href: "/admin/markazlar", label: t("adm.nav.centers"), icon: "centers", badge: c.edits, adminOnly: true },
    { href: "/admin/foydalanuvchilar", label: t("adm.nav.users"), icon: "users", adminOnly: true },
    { href: "/admin/hududlar", label: t("adm.nav.geo"), icon: "geo", adminOnly: true },
    { href: "/admin/audit", label: t("adm.nav.audit"), icon: "audit", adminOnly: true },
    { href: "/admin/sozlamalar", label: t("adm.nav.settings"), icon: "settings", adminOnly: true },
  ];
  const visible = items.filter((i) => admin || !i.adminOnly);
  const alerts = visible.reduce((n, i) => n + (i.badge ?? 0), 0);
  return (
    <AdminShell items={visible.map(({ adminOnly: _, ...i }) => i)} title="Admin" alerts={alerts}
      role={t("adm.role", { role: t(admin ? "adm.role.admin" : "adm.role.moderator") })} logout={<AdminLogout />}>
      {children}
    </AdminShell>
  );
}
