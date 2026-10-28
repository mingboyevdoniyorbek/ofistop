import Link from "next/link";
import { centerStats, listCenters } from "@/lib/centers";
import CenterStats from "@/components/CenterStats";
import { getT } from "@/lib/i18n";
export const dynamic = "force-dynamic";
export async function generateMetadata() { const { t } = await getT(); return { title: t("ctr.title"), description: t("ctr.desc") }; }
export default async function Page() {
  const { locale, t } = await getT();
  const centers = await listCenters(locale).catch(() => null);
  if (!centers) return <div className="mx-auto max-w-6xl px-4 py-8"><p role="alert" className="text-red-700">{t("ctr.loadFail")}</p></div>;
  const stats = await centerStats(centers.map((c) => c.id));
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">{t("ctr.title")}</h1>
      {centers.length === 0 ? <p className="text-slate-600">{t("ctr.empty")}</p> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {centers.map((c) => (
            <Link key={c.id} href={`/markazlar/${c.id}-${c.slug}`} className="rounded-lg border border-slate-200 p-4 hover:shadow-md bg-white space-y-1">
              <h2 className="font-semibold">{c.name}</h2>
              <p className="text-sm text-slate-600">{[c.district, c.region].filter(Boolean).join(", ")}</p>
              <p className="text-sm text-slate-500">{c.address}</p>
              <div className="pt-1"><CenterStats st={stats.get(c.id)} /></div>
              {c.isDemo && <p className="text-xs text-amber-800">{t("ctr.demo")}</p>}
            </Link>))}
        </div>)}
    </div>
  );
}
