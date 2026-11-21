"use client";
import { useId, useState } from "react";
import SheetSelect from "./SheetSelect";
import { SaveSearch } from "./SavedSearch";
import { useLocale, useT } from "./I18nProvider";
import { labels } from "@/lib/format";
import type { Filters } from "@/lib/search";
import FormSelect from "./FormSelect";
type Opt = { id: number; name: string; regionId?: number };
const ic = (d: string) => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
/** Joy turlari ikonkalari (pastdan chiqadigan ro'yxat uchun). */
const CAT_ICON: Record<string, string> = {
  "": "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  office: "M4 21V8h16v13M9 8V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3M4 13h16",
  bc_room: "M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M2.5 21h19M8 8h3M8 12h3M8 16h3",
  coworking: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm13 9v-1a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8",
  retail: "M3 9l1.5-5h15L21 9M3 9h18M3 9v11h18V9M9 20v-6h6v6",
  service_room: "M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4L15 12l-3-3z",
  warehouse: "M3 21V9l9-5 9 5v12M7 21v-8h10v8M7 17h10",
  production: "M3 21V11l5 3V11l5 3V8l8-4v17zM7 18h2M12 18h2M17 18h2",
  building: "M6 21V3h12v18M10 7h4M10 11h4M10 15h4M3 21h18",
  other: "M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
};

/**
 * Filtr (Joymee uslubi, sayt ranglarida): tepada Ijara/Sotuv, joy turi va hudud pastdan chiqadigan ro'yxatda,
 * narx «dan–gacha» + valyuta, maydon; qolganlari «Qo'shimcha filtrlar» ichida. Pastda doim: Saqlash va Qidirish.
 */
export default function FilterForm({ f, regions, districts, amenities, view }: { view?: string; f: Filters; regions: Opt[]; districts: Opt[]; amenities: { code: string; name: string }[] }) {
  const locale = useLocale(); const t = useT(); const L = labels(locale); const ru = locale === "ru";
  const [region, setRegion] = useState(String(f.region ?? ""));
  const [district, setDistrict] = useState(String(f.district ?? ""));
  const [category, setCategory] = useState(f.category ?? "");
  const [metro, setMetro] = useState(f.metro ? String(f.metro) : "");
  const [deal, setDeal] = useState<"rent" | "sale">(f.deal === "sale" ? "sale" : "rent");
  const [currency, setCurrency] = useState<"UZS" | "USD">(f.currencyFilter && f.currency === "USD" ? "USD" : "UZS");
  const [saveQ, setSaveQ] = useState<string | null>(null);
  const hintId = useId();
  const sale = deal === "sale";
  const inp = "h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[15px] placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none";
  const lbl = "mb-1.5 block text-sm font-semibold text-slate-900";
  const seg = (on: boolean) => `flex-1 rounded-xl py-2.5 text-center text-sm font-semibold transition ${on ? "bg-white text-brand shadow-sm" : "text-slate-600"}`;
  // Bo'sh maydonlar manzilga tushmasin; valyuta faqat narx yozilganda yuboriladi (aks holda e'lonlarni valyuta bo'yicha kesib qo'ymaydi).
  const query = (form: HTMLFormElement) => {
    const u = new URLSearchParams();
    for (const [k, v] of new FormData(form).entries()) if (typeof v === "string" && v !== "") u.append(k, v);
    if (!u.get("priceMin") && !u.get("priceMax")) u.delete("currency");
    return u;
  };
  return (<>
    <form method="get" action="/joylar" className="space-y-5 text-sm" onSubmit={(e) => {
      e.preventDefault();
      const u = query(e.currentTarget);
      location.assign(`/joylar${u.toString() ? `?${u}` : ""}`);
    }}>
      <input type="hidden" name="priceMode" value="total" />
      {f.bounds && <input type="hidden" name="bbox" value={f.bounds.join(",")} />}
      {f.near && <><input type="hidden" name="lat" value={f.near.lat}/><input type="hidden" name="lng" value={f.near.lng}/><input type="hidden" name="radius" value={f.near.radius}/></>}
      {f.center && <input type="hidden" name="center" value={f.center} />}
      {sale && <input type="hidden" name="deal" value="sale" />}
      <input type="hidden" name="sort" value={f.sort} />
      {view === "map" && <input type="hidden" name="view" value="map" />}

      <div className="hidden items-center justify-between lg:flex"><p className="text-lg font-bold text-slate-900">{ru ? "Фильтры" : "Filtrlar"}</p><a href={sale ? "/joylar?deal=sale" : "/joylar"} className="text-sm font-semibold text-brand hover:underline">{t("f.reset")}</a></div>
      <div role="radiogroup" aria-label={ru ? "Тип сделки" : "Bitim turi"} className="flex gap-1 rounded-2xl bg-slate-100 p-1 lg:hidden">{/* kompyuterda Ijara/Sotuv ro'yxat tepasida bor */}
        {([["rent", ru ? "Аренда" : "Ijara"], ["sale", ru ? "Продажа" : "Sotuv"]] as const).map(([k, v]) =>
          <button key={k} type="button" role="radio" aria-checked={deal === k} onClick={() => setDeal(k)} className={seg(deal === k)}>{v}</button>)}
      </div>

      <SheetSelect name="category" label={t("f.type")} value={category} onChange={setCategory}
        options={[{ value: "", label: t("f.all"), icon: ic(CAT_ICON[""]) }, ...Object.entries(L.category).map(([k, v]) => ({ value: k, label: v, icon: ic(CAT_ICON[k] ?? CAT_ICON.other) }))]} />
      <SheetSelect name="region" label={t("f.region")} value={region} onChange={(v) => { setRegion(v); setDistrict(""); }} placeholder={ru ? "Выберите регион" : "Hududni tanlang"}
        options={[{ value: "", label: t("f.all") }, ...regions.map((r) => ({ value: String(r.id), label: r.name }))]} />
      <SheetSelect name="district" label={t("f.district")} value={district} onChange={setDistrict} disabled={!region && districts.length > 40}
        placeholder={ru ? "Выберите район" : "Tumanni tanlang"}
        options={[{ value: "", label: t("f.all") }, ...districts.filter((r) => !region || r.regionId === Number(region)).map((r) => ({ value: String(r.id), label: r.name }))]} />

      <SheetSelect name="metro" label={ru ? "До метро пешком" : "Metrogacha piyoda"} value={metro} onChange={setMetro}
        icon={<span className="grid h-5 w-5 place-items-center rounded-full bg-[#e3262f] text-[10px] font-black text-white">M</span>}
        options={[{ value: "", label: ru ? "Не важно" : "Farqi yo‘q" }, ...[5, 10, 15, 20].map((m) => ({ value: String(m), label: ru ? `до ${m} мин` : `${m} daqiqagacha` }))]} />

      <fieldset>
        <legend className={lbl}>{sale ? (ru ? "Цена покупки" : "Sotib olish narxi") : (ru ? "Цена за всё помещение" : "Butun joy narxi")}</legend>
        <div className="grid grid-cols-2 gap-2">
          <input name="priceMin" defaultValue={f.priceMin} inputMode="decimal" enterKeyHint="search" placeholder={t("f.from")} aria-label={t("f.priceFrom")} className={inp} />
          <input name="priceMax" defaultValue={f.priceMax} inputMode="decimal" enterKeyHint="search" placeholder={t("f.to")} aria-label={t("f.priceTo")} className={inp} />
        </div>
        <div role="radiogroup" aria-label={t("f.currency")} className="mt-2 flex gap-1 rounded-2xl bg-slate-100 p-1">
          {([["UZS", ru ? "сум" : "so‘m"], ["USD", "USD"]] as const).map(([k, v]) =>
            <button key={k} type="button" role="radio" aria-checked={currency === k} onClick={() => setCurrency(k)} className={seg(currency === k)}>{v}</button>)}
        </div>
        <input type="hidden" name="currency" value={currency} />
      </fieldset>

      <fieldset><legend className={lbl}>{t("f.area")}</legend>
        <div className="grid grid-cols-2 gap-2">
          <input name="areaMin" defaultValue={f.areaMin} inputMode="decimal" enterKeyHint="search" placeholder={t("f.from")} aria-label={t("f.areaFrom")} className={inp} />
          <input name="areaMax" defaultValue={f.areaMax} inputMode="decimal" enterKeyHint="search" placeholder={t("f.to")} aria-label={t("f.areaTo")} className={inp} />
        </div></fieldset>

      <details className="group rounded-2xl border border-slate-200" open={!!(f.q || f.furnished || f.poster || f.commission || f.availableBy || f.amenities.length || f.floor || f.periodFilter)}>
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">{ru ? "Дополнительные фильтры" : "Qo‘shimcha filtrlar"}<span aria-hidden="true" className="text-slate-400 transition group-open:rotate-180">⌄</span></summary>
        <div className="space-y-4 border-t border-slate-100 p-4">
          <label className="block"><span className={lbl}>{ru ? "Метро, ориентир или название" : "Metro, mo‘ljal yoki nom"}</span><input name="q" type="search" enterKeyHint="search" defaultValue={f.q} className={inp} placeholder={ru ? "Ойбек, Novza, Tashkent City…" : "Oybek, Novza, Tashkent City…"} list={hintId}/><datalist id={hintId}><option value="Oybek"/><option value="Novza"/><option value="Tashkent City"/></datalist></label>
          {!sale && <label className="block"><span className={lbl}>{t("f.period")}</span><FormSelect name="period" defaultValue={f.periodFilter ? f.period : ""} className={inp}><option value="">{t("f.all")}</option><option value="month">{t("period.month")}</option><option value="day">{t("period.day")}</option><option value="hour">{t("period.hour")}</option></FormSelect></label>}
          <label className="block"><span className={lbl}>{t("f.furnished")}</span>
            <FormSelect name="furnished" defaultValue={f.furnished ?? ""} className={inp}><option value="">{t("f.furnAny")}</option><option value="1">{t("f.furnYes")}</option><option value="0">{t("f.furnNo")}</option></FormSelect></label>
          <label className="block"><span className={lbl}>{t("f.poster")}</span>
            <FormSelect name="poster" defaultValue={f.poster ?? ""} className={inp}><option value="">{t("f.all")}</option>{Object.entries(L.poster).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</FormSelect></label>
          <label className="flex items-center gap-2"><input type="checkbox" name="commission" value="none" defaultChecked={f.commission === "none"} className="h-5 w-5 accent-[#12308a]" /> {t("f.noComm")}</label>
          <label className="block"><span className={lbl}>{ru ? "Этаж" : "Qavat"}</span><input name="floor" inputMode="numeric" defaultValue={f.floor} className={inp}/></label>
          {!sale && <label className="block"><span className={lbl}>{t("f.availBy")}</span><input type="date" name="availableBy" defaultValue={f.availableBy} className={inp} /></label>}
          <AmenityBox f={f} amenities={amenities.filter(a => f.amenities.includes(a.code) || !category || !["three_phase", "truck_access"].includes(a.code) || ["warehouse", "production", "retail"].includes(category))} legend={t("f.amenities")} />
        </div>
      </details>

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-slate-100 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <button type="button" onClick={(e) => { const form = e.currentTarget.form; if (form) setSaveQ(query(form).toString()); }}
          className="flex items-center gap-1.5 rounded-2xl border border-brand/30 bg-blue-50 px-4 py-3.5 font-semibold text-brand">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" /></svg>{ru ? "Сохранить" : "Saqlash"}</button>
        <button className="flex-1 rounded-2xl bg-brand py-3.5 text-base font-semibold text-white shadow-sm hover:bg-brand-dark">{t("f.search")}</button>
      </div>
    </form>
    {saveQ !== null && <div className="fixed inset-0 z-[1400] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={ru ? "Сохранить поиск" : "Qidiruvni saqlash"}>
      <button type="button" aria-label={ru ? "Закрыть" : "Yopish"} onClick={() => setSaveQ(null)} className="absolute inset-0 bg-slate-900/40" />
      <div className="relative w-full max-w-lg rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl">
        <span aria-hidden="true" className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-slate-200" />
        <p className="text-lg font-bold text-slate-900">{ru ? "Сохранить поиск" : "Qidiruvni saqlash"}</p>
        <p className="mb-1 text-sm text-slate-500">{ru ? "Сообщим, когда появится подходящее объявление." : "Mos yangi e’lon chiqsa, xabar beramiz."}</p>
        <SaveSearch query={saveQ} startOpen />
      </div>
    </div>}
  </>);
}
// Qulayliklar: bir nechta checkbox -> bitta "amenities=a,b" parametr uchun JS'siz variant: har biri alohida name bilan yuboriladi va serverda birlashtiriladi
function AmenityBox({ f, amenities, legend }: { f: Filters; amenities: { code: string; name: string }[]; legend: string }) {
  return (
    <fieldset><legend className="mb-1.5 block text-sm font-semibold text-slate-900">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {amenities.map((a) => (
          <label key={a.code} className="cursor-pointer"><input type="checkbox" name="amenities" value={a.code} defaultChecked={f.amenities.includes(a.code)} className="peer sr-only" /><span className="inline-block rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 peer-checked:border-brand peer-checked:bg-blue-50 peer-checked:font-semibold peer-checked:text-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand">{a.name}</span></label>
        ))}
      </div>
    </fieldset>
  );
}
