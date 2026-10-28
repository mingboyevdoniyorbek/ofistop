import { asc } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { requireStaffPage } from "@/lib/staff";
import { labels } from "@/lib/format";
import { getT } from "@/lib/i18n";
import AdminForm from "@/components/AdminForm";

export default async function Geo() {
  await requireStaffPage(true);
  const { locale, t } = await getT(); const lb = labels(locale); const nm = (x: { nameUz: string; nameRu: string }) => (locale === "ru" ? x.nameRu : x.nameUz);
  const regions = await db().select().from(s.regions).orderBy(asc(s.regions.nameUz));
  const districts = await db().select().from(s.districts).orderBy(asc(s.districts.nameUz));
  const names = [{ name: "nameUz", label: t("adm.g.nameUz"), required: true }, { name: "nameRu", label: t("adm.g.nameRu"), required: true }];
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t("adm.nav.geo")}</h1>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-slate-200 p-4"><h2 className="mb-3 font-semibold">{t("adm.g.newRegion")}</h2>
          <AdminForm url="/api/admin/geo" extra={{ kind: "region" }} submit={t("adm.g.add")} fields={names} /></div>
        <div className="rounded border border-slate-200 p-4"><h2 className="mb-3 font-semibold">{t("adm.g.newDistrict")}</h2>
          <AdminForm url="/api/admin/geo" extra={{ kind: "district" }} submit={t("adm.g.add")} fields={[{ name: "regionId", label: t("adm.c.region"), type: "select", required: true, options: regions.map((r) => ({ value: r.id, label: nm(r) })) }, ...names]} /></div>
      </section>
      <section><h2 className="mb-2 font-semibold">{t("adm.g.existing")}</h2>
        <ul className="space-y-1 text-sm">{regions.map((r) => <li key={r.id}><b>{nm(r)}</b>: {districts.filter((x) => x.regionId === r.id).map(nm).join(", ") || t("adm.g.noDistricts")}</li>)}</ul></section>
      <section><h2 className="mb-2 font-semibold">{t("adm.g.catTitle")}</h2>
        <p className="mb-2 text-sm text-slate-600">{t("adm.g.catNote")}</p>
        <ul className="flex flex-wrap gap-2 text-sm">{Object.values(lb.category).map((c) => <li key={c} className="rounded-full border border-slate-300 px-3 py-1">{c}</li>)}</ul></section>
    </div>
  );
}
