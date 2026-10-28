import { ttlDays } from "@/lib/guard";
import { requireStaffPage } from "@/lib/staff";
import { getT } from "@/lib/i18n";
import AdminForm from "@/components/AdminForm";

export default async function Settings() {
  await requireStaffPage(true);
  const { t } = await getT();
  const ttl = await ttlDays();
  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-bold">{t("adm.nav.settings")}</h1>
      <p className="text-sm text-slate-600">{t("adm.s.current", { days: ttl })}</p>
      <AdminForm url="/api/admin/settings" submit={t("adm.s.save")} fields={[{ name: "listing_ttl_days", label: t("adm.s.ttl"), type: "number", required: true }]} />
    </div>
  );
}
