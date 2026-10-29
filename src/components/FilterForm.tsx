"use client";
import { useId, useState } from "react";
import { useLocale, useT } from "./I18nProvider";
import { labels } from "@/lib/format";
import type { Filters } from "@/lib/search";
type Opt = { id: number; name: string; regionId?: number };
export default function FilterForm({ f, regions, districts, amenities, view }: { view?: string; f: Filters; regions: Opt[]; districts: Opt[]; amenities: { code: string; name: string }[] }) {
  const locale = useLocale(); const t = useT(); const L = labels(locale);
  const [region, setRegion] = useState(String(f.region ?? ""));
  const [district, setDistrict] = useState(String(f.district ?? ""));
  const [category, setCategory] = useState(f.category ?? "");
  const hintId = useId();
  const inp = "w-full rounded border border-slate-300 px-2 py-1.5 text-sm";
  return (
    <form method="get" action="/joylar" className="space-y-3 text-sm">
      <input type="hidden" name="priceMode" value="total" />
      {f.bounds && <input type="hidden" name="bbox" value={f.bounds.join(",")} />}
      {f.near && <><input type="hidden" name="lat" value={f.near.lat}/><input type="hidden" name="lng" value={f.near.lng}/><input type="hidden" name="radius" value={f.near.radius}/></>}
      {f.center && <input type="hidden" name="center" value={f.center} />}
      <input type="hidden" name="sort" value={f.sort} />
      {view === "map" && <input type="hidden" name="view" value="map" />}
      <label className="block">{locale === "ru" ? "Метро, ориентир или название" : "Metro, mo‘ljal yoki nom"}<input name="q" defaultValue={f.q} className={inp} placeholder={locale === "ru" ? "Ойбек, Novza, Tashkent City…" : "Oybek, Novza, Tashkent City…"} list={hintId}/><datalist id={hintId}><option value="Oybek"/><option value="Novza"/><option value="Tashkent City"/></datalist></label>
      <label className="block">{t("f.region")}
        <select name="region" value={region} onChange={e => { setRegion(e.target.value); setDistrict(""); }} className={inp}><option value="">{t("f.all")}</option>{regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
      <label className="block">{t("f.district")}
        <select name="district" value={district} onChange={e => setDistrict(e.target.value)} className={inp}><option value="">{t("f.all")}</option>{districts.filter(r => !region || r.regionId === Number(region)).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
      <label className="block">{t("f.type")}
        <select name="category" value={category} onChange={e => setCategory(e.target.value)} className={inp}><option value="">{t("f.all")}</option>{Object.entries(L.category).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <fieldset className="space-y-2"><legend className="font-medium">{locale === "ru" ? "Бюджет на всё помещение" : "Butun joy uchun budjet"}</legend>
        <div className="grid grid-cols-2 gap-2">
          <label>{t("f.currency")}<select name="currency" defaultValue={f.currencyFilter ? f.currency : ""} className={inp}><option value="">{t("f.all")}</option><option>UZS</option><option>USD</option></select></label>
          <label>{t("f.period")}<select name="period" defaultValue={f.periodFilter ? f.period : ""} className={inp}><option value="">{t("f.all")}</option><option value="month">{t("period.month")}</option><option value="day">{t("period.day")}</option><option value="hour">{t("period.hour")}</option></select></label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input name="priceMin" defaultValue={f.priceMin} inputMode="decimal" placeholder={t("f.from")} aria-label={t("f.priceFrom")} className={inp} />
          <input name="priceMax" defaultValue={f.priceMax} inputMode="decimal" placeholder={t("f.to")} aria-label={t("f.priceTo")} className={inp} />
        </div>
        <p className="text-xs text-slate-500">{locale === "ru" ? "Цена за м² умножается на площадь. По умолчанию: UZS за месяц. Доплаты отдельно; цены за место не входят в бюджет целого помещения." : "m² narxi maydonga ko‘paytiriladi. Standart: UZS, oyiga. Qo‘shimcha to‘lovlar alohida; ish o‘rni narxi butun joy budjetiga kirmaydi."}</p>
      </fieldset>
      <fieldset><legend className="font-medium">{t("f.area")}</legend>
        <div className="grid grid-cols-2 gap-2">
          <input name="areaMin" defaultValue={f.areaMin} inputMode="decimal" placeholder={t("f.from")} aria-label={t("f.areaFrom")} className={inp} />
          <input name="areaMax" defaultValue={f.areaMax} inputMode="decimal" placeholder={t("f.to")} aria-label={t("f.areaTo")} className={inp} />
        </div></fieldset>
      <details className="rounded-2xl border border-slate-200 p-3" open={!!(f.furnished || f.poster || f.commission || f.availableBy || f.amenities.length)}><summary className="cursor-pointer font-semibold">{locale === "ru" ? "Дополнительные фильтры" : "Qo‘shimcha filtrlar"}</summary><div className="mt-3 space-y-3">
      <label className="block">{t("f.furnished")}
        <select name="furnished" defaultValue={f.furnished ?? ""} className={inp}><option value="">{t("f.furnAny")}</option><option value="1">{t("f.furnYes")}</option><option value="0">{t("f.furnNo")}</option></select></label>
      <label className="block">{t("f.poster")}
        <select name="poster" defaultValue={f.poster ?? ""} className={inp}><option value="">{t("f.all")}</option>{Object.entries(L.poster).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label className="flex items-center gap-2"><input type="checkbox" name="commission" value="none" defaultChecked={f.commission === "none"} /> {t("f.noComm")}</label>
      <label className="block">{locale === "ru" ? "Этаж" : "Qavat"}<input name="floor" inputMode="numeric" defaultValue={f.floor} className={inp}/></label>
      <label className="block">{t("f.availBy")}<input type="date" name="availableBy" defaultValue={f.availableBy} className={inp} /></label>
      <AmenityBox f={f} amenities={amenities.filter(a => f.amenities.includes(a.code) || !category || !["three_phase", "truck_access"].includes(a.code) || ["warehouse", "production", "retail"].includes(category))} legend={t("f.amenities")} />
      </div></details>
      <div className="flex gap-2 pt-1">
        <button className="flex-1 rounded bg-brand text-white py-2 font-medium hover:bg-brand-dark">{t("f.search")}</button>
        <a href="/joylar" className="rounded border border-slate-300 px-3 py-2">{t("f.reset")}</a>
      </div>
    </form>
  );
}
// Qulayliklar: bir nechta checkbox -> bitta "amenities=a,b" parametr uchun JS'siz variant: har biri alohida name bilan yuboriladi va serverda birlashtiriladi
function AmenityBox({ f, amenities, legend }: { f: Filters; amenities: { code: string; name: string }[]; legend: string }) {
  return (
    <fieldset><legend className="font-medium">{legend}</legend>
      <div className="grid grid-cols-2 gap-1">
        {amenities.map((a) => (
          <label key={a.code} className="flex items-center gap-1.5"><input type="checkbox" name="amenities" value={a.code} defaultChecked={f.amenities.includes(a.code)} />{a.name}</label>
        ))}
      </div>
    </fieldset>
  );
}
