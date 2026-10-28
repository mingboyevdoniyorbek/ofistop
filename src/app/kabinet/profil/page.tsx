import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { requireUserPage } from "@/lib/page-auth";
import ProfileForm from "@/components/ProfileForm";
import { getT } from "@/lib/i18n";
import { isGuestPhone } from "@/lib/launch-mode";

export const dynamic = "force-dynamic";
export default async function Profil() {
  const user = await requireUserPage("/kabinet/profil");
  const { t } = await getT();
  const d = db();
  const [p] = await d.select().from(s.profiles).where(eq(s.profiles.userId, user.id)).limit(1);
  const centers = await d.select({ id: s.businessCenters.id, name: s.businessCenters.name, address: s.businessCenters.address }).from(s.businessCenterMemberships).innerJoin(s.businessCenters, eq(s.businessCenters.id, s.businessCenterMemberships.centerId)).where(eq(s.businessCenterMemberships.userId, user.id));
  return (
    <div className="space-y-8">
      <section><h1 className="mb-1 text-xl font-bold">{t("cab.nav.profile")}</h1>{!isGuestPhone(user.phone) && <p className="mb-4 text-sm text-slate-600">{t("prof.loginPhone", { phone: `${user.phone.slice(0, 7)}***` })}</p>}
        <ProfileForm initial={{ displayName: p?.displayName ?? "", posterType: p?.posterType ?? "owner", companyName: p?.companyName ?? "", contactPhone: p?.contactPhone ?? "", telegramUsername: p?.telegramUsername ?? "" }} /></section>
      <section><h2 className="mb-2 font-semibold">{t("prof.centers")}</h2>
        {centers.length ? <ul className="list-disc pl-5 text-sm">{centers.map((c) => <li key={c.id}>{c.name} — {c.address}</li>)}</ul> : <p className="text-sm text-slate-600">{t("prof.noCenters")}</p>}</section>
    </div>
  );
}
