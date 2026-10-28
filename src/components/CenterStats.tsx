import { rangeLabel } from "@/lib/format";
import { getT } from "@/lib/i18n";
import type { CenterStat } from "@/lib/centers";
export default async function CenterStats({ st }: { st?: CenterStat }) {
  const { locale, t } = await getT();
  if (!st || st.rooms === 0) return <p className="text-sm text-slate-500">{t("ctr.stat.none")}</p>;
  return (
    <div className="text-sm space-y-0.5">
      <p className="font-medium">{t("ctr.stat.rooms", { n: st.rooms })}{st.areaMin != null ? ` · ${st.areaMin === st.areaMax ? `${st.areaMin}` : `${st.areaMin}–${st.areaMax}`} ${t("unit.m2")}` : ""}</p>
      {st.prices.map((p) => <p key={`${p.currency}${p.period}${p.basis}`} className="text-brand">{rangeLabel(p.min, p.max, p.currency, p.period, p.basis, locale)}</p>)}
    </div>
  );
}
