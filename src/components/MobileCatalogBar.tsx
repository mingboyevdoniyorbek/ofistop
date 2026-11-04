"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "./I18nProvider";
import { SaveSearch } from "./SavedSearch";

/**
 * Telefondagi katalog boshqaruvi (Joymee/Airbnb uslubi): qidiruv qatori + filtr tugmasi (to'liq ekranli oyna),
 * ostida bitta suriladigan qatorda: Ijara/Sotuv, Xarita/Ro'yxat, Saralash, Menga yaqin, Saqlash.
 * Kompyuterda ko'rinmaydi (u yerda chap tomondagi filtr paneli bor).
 */
export default function MobileCatalogBar({ query, q, deal, view, sort, sorts, filterCount, openFilters, children }: {
  query: string; q: string; deal: "rent" | "sale"; view: "list" | "map"; sort: string; sorts: [string, string][]; filterCount: number; openFilters: boolean; children: React.ReactNode;
}) {
  const ru = useLocale() === "ru"; const router = useRouter();
  const [open, setOpen] = useState(openFilters);
  const [save, setSave] = useState(false);
  const [geoErr, setGeoErr] = useState("");
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", esc); };
  }, [open]);
  const href = (over: Record<string, string | null>) => {
    const u = new URLSearchParams(query);
    for (const [k, v] of Object.entries(over)) { if (v === null) u.delete(k); else u.set(k, v); }
    u.delete("page"); u.delete("filtr"); const s = u.toString(); return s ? `/joylar?${s}` : "/joylar";
  };
  const chip = "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium";
  function nearby() {
    setGeoErr("");
    if (!navigator.geolocation) return setGeoErr(ru ? "Геолокация недоступна" : "Joylashuv aniqlanmadi");
    navigator.geolocation.getCurrentPosition((p) => router.push(href({ lat: String(p.coords.latitude), lng: String(p.coords.longitude), radius: "3000", bbox: null })),
      () => setGeoErr(ru ? "Разрешите геолокацию или выберите район в фильтре." : "Joylashuvga ruxsat bering yoki filtrda tumanni tanlang."), { timeout: 10000, maximumAge: 60000 });
  }
  return (
    <div className="mb-4 space-y-3 lg:hidden">
      <form role="search" className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get("q") ?? "").trim(); router.push(href({ q: v || null })); }}>
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-[0_2px_12px_rgba(15,23,42,0.08)] focus-within:ring-2 focus-within:ring-brand">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0 stroke-slate-500" fill="none" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input name="q" type="search" enterKeyHint="search" autoComplete="off" defaultValue={q} aria-label={ru ? "Поиск" : "Qidiruv"} placeholder={ru ? "Метро, район или адрес" : "Metro, tuman yoki manzil"}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-500 focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden" />
        </label>
        <button type="button" onClick={() => setOpen(true)} aria-label={ru ? "Фильтры" : "Filtrlar"} className="relative grid h-[50px] w-[50px] shrink-0 place-items-center rounded-full border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.08)]">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 stroke-slate-700" fill="none" strokeWidth="2" strokeLinecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>
          {filterCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">{filterCount}</span>}
        </button>
      </form>
      <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 sm:-mx-6 sm:px-6">
        <span className="inline-flex shrink-0 rounded-full bg-slate-100 p-1 text-sm font-semibold">
          {([["rent", ru ? "Аренда" : "Ijara"], ["sale", ru ? "Продажа" : "Sotuv"]] as const).map(([k, v]) =>
            <Link key={k} href={href({ deal: k === "sale" ? "sale" : null, priceMin: null, priceMax: null, period: null, sort: null })} aria-current={deal === k ? "page" : undefined}
              className={`rounded-full px-3.5 py-1.5 ${deal === k ? "bg-white text-brand shadow-sm" : "text-slate-600"}`}>{v}</Link>)}
        </span>
        <Link href={href({ view: view === "map" ? null : "map" })} className={`${chip} ${view === "map" ? "border-brand bg-brand text-white" : "border-slate-300 bg-white"}`}>{view === "map" ? (ru ? "☰ Список" : "☰ Ro‘yxat") : (ru ? "🗺 Карта" : "🗺 Xarita")}</Link>
        <label className={`${chip} relative border-slate-300 bg-white`}>
          <span aria-hidden="true">⇅</span><span>{sorts.find(([k]) => k === sort)?.[1] ?? sorts[0][1]}</span><span aria-hidden="true" className="text-slate-400">▾</span>
          <select aria-label={ru ? "Сортировка" : "Saralash"} value={sort} onChange={(e) => router.push(href({ sort: e.target.value === "new" ? null : e.target.value }))} className="absolute inset-0 cursor-pointer opacity-0">
            {sorts.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <button type="button" onClick={nearby} className={`${chip} border-slate-300 bg-white`}>⌖ {ru ? "Рядом" : "Menga yaqin"}</button>
        <button type="button" onClick={() => setSave((x) => !x)} aria-expanded={save} className={`${chip} border-slate-300 bg-white`}>☆ {ru ? "Сохранить поиск" : "Qidiruvni saqlash"}</button>
      </div>
      {geoErr && <p role="alert" className="text-sm text-red-700">{geoErr}</p>}
      {save && <SaveSearch query={query} startOpen />}
      {open && <div role="dialog" aria-modal="true" aria-label={ru ? "Фильтры" : "Filtrlar"} className="fixed inset-0 z-[1300] flex flex-col bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <button type="button" onClick={() => setOpen(false)} aria-label={ru ? "Закрыть" : "Yopish"} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-lg">✕</button>
          <p className="font-semibold">{ru ? "Фильтры" : "Filtrlar"}</p>
          <Link href={deal === "sale" ? "/joylar?deal=sale" : "/joylar"} className="text-sm font-semibold text-brand">{ru ? "Сбросить" : "Tozalash"}</Link>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>}
    </div>
  );
}
