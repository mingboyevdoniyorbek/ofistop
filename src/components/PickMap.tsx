"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useT } from "./I18nProvider";
import "leaflet/dist/leaflet.css";
import { TASHKENT, TILE_ATTRIBUTION, TILE_URL, loadLeaflet, pinIcon } from "./leaflet-setup";

const parse = (v: string) => { const n = Number(v.replace(",", ".")); return v.trim() && Number.isFinite(n) ? n : null; };
const fix6 = (n: number) => n.toFixed(6);
type Hit = { lat: string; lon: string; display_name: string };

/**
 * E'lon formasida joylashuvni tanlash (Yandex xaritalaridagidek):
 * - xaritada bosish yoki markerni surish;
 * - hudud/tuman tanlanganda (`focus`) xarita o'zi o'sha joyga yaqinlashadi;
 * - o'ng pastda "Men turgan joy" — telefon joylashuvi bilan nuqta qo'yiladi;
 * - "To'liq ekran" — tepada manzil/mo'ljal qidiruvi bilan.
 * Xarita yuklanmasa, qo'lda kiritish ishlayveradi.
 */
export default function PickMap({ lat, lng, onPick, disabled, focus }: {
  lat: string; lng: string; onPick: (lat: string, lng: string) => void; disabled?: boolean; focus?: [number, number, number] | null;
}) {
  const t = useT(); const ru = useLocale() === "ru";
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const accRef = useRef<import("leaflet").Circle | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const pickRef = useRef(onPick); pickRef.current = onPick;
  const [failed, setFailed] = useState(false);
  const [full, setFull] = useState(false);
  const [locating, setLocating] = useState(false); const [geoErr, setGeoErr] = useState("");
  const [q, setQ] = useState(""); const [hits, setHits] = useState<Hit[]>([]); const [searching, setSearching] = useState(false);
  const pos = useRef({ lat, lng }); pos.current = { lat, lng };
  const markerTitle = t("wiz.mapMarker");

  /** Marker maydonlardagi qiymatga moslanadi (qo'lda kiritilganda ham). */
  const sync = () => {
    const L = LRef.current, map = mapRef.current; if (!L || !map) return;
    const a = parse(pos.current.lat), b = parse(pos.current.lng);
    const ok = a !== null && b !== null && Math.abs(a) <= 90 && Math.abs(b) <= 180;
    if (!ok) { markerRef.current?.remove(); markerRef.current = null; return; }
    if (!markerRef.current) {
      const m = L.marker([a!, b!], { icon: pinIcon(L, false), draggable: !disabled, keyboard: true, title: markerTitle }).addTo(map);
      m.on("dragend", () => { const p = m.getLatLng(); pickRef.current(fix6(p.lat), fix6(p.lng)); });
      markerRef.current = m;
    } else markerRef.current.setLatLng([a!, b!]);
  };
  const place = (la: number, ln: number, zoom = 17) => {
    if (!disabled) pickRef.current(fix6(la), fix6(ln));
    mapRef.current?.flyTo([la, ln], Math.max(zoom, mapRef.current.getZoom()), { duration: 0.6 });
  };

  useEffect(() => {
    let dead = false;
    loadLeaflet().then((L) => {
      if (dead || !box.current) return;
      LRef.current = L;
      const a = parse(lat), b = parse(lng);
      const has = a !== null && b !== null && Math.abs(a) <= 90 && Math.abs(b) <= 180;
      const start: [number, number] = has ? [a!, b!] : focus ? [focus[0], focus[1]] : TASHKENT;
      const map = L.map(box.current, { center: start, zoom: has ? 16 : focus ? focus[2] : 12, scrollWheelZoom: false, zoomControl: false });
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
      mapRef.current = map;
      // Holat atributlari (testlar va nosozlikni aniqlash uchun): xarita markazi va zoom
      const mark = () => { const c = map.getCenter(); box.current?.setAttribute("data-center", `${c.lat.toFixed(3)},${c.lng.toFixed(3)},${map.getZoom()}`); };
      map.on("moveend", mark); mark();
      sync();
      if (!disabled) map.on("click", (e: import("leaflet").LeafletMouseEvent) => pickRef.current(fix6(e.latlng.lat), fix6(e.latlng.lng)));
    }).catch(() => setFailed(true));
    return () => { dead = true; mapRef.current?.remove(); mapRef.current = null; markerRef.current = null; accRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  useEffect(sync, [lat, lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hudud/tuman o'zgarsa — xarita o'sha joyga uchadi (nuqta qo'yilmaydi, faqat ko'rsatiladi).
  const focusKey = focus ? focus.join(",") : "";
  const firstFocus = useRef(true);
  useEffect(() => {
    if (firstFocus.current) { firstFocus.current = false; return; } // birinchi ochilishda markaz allaqachon to'g'ri
    if (focus && mapRef.current) mapRef.current.flyTo([focus[0], focus[1]], focus[2], { duration: 0.8 });
  }, [focusKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // To'liq ekran: xarita o'lchami yangilanadi, Esc bilan yopiladi, sahifa orqada aylanmaydi.
  useEffect(() => {
    const id = setTimeout(() => mapRef.current?.invalidateSize(), 60);
    if (!full) return () => clearTimeout(id);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setFull(false); };
    document.addEventListener("keydown", esc); const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { clearTimeout(id); document.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [full]);

  // Manzil qidiruvi (OpenStreetMap Nominatim, faqat O'zbekiston). Yozish to'xtagach 600 ms dan keyin.
  useEffect(() => {
    const term = q.trim(); if (term.length < 3) { setHits([]); return; }
    const ctl = new AbortController();
    const id = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=uz&accept-language=${ru ? "ru" : "uz"}&q=${encodeURIComponent(term)}`, { signal: ctl.signal });
        setHits(r.ok ? await r.json() : []);
      } catch { /* bekor qilindi yoki tarmoq */ } finally { setSearching(false); }
    }, 600);
    return () => { clearTimeout(id); ctl.abort(); };
  }, [q, ru]);

  function locate() {
    setGeoErr("");
    if (!navigator.geolocation) { setGeoErr(ru ? "Телефон не поддерживает геолокацию" : "Telefon joylashuvni aniqlay olmaydi"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((p) => {
      setLocating(false);
      const { latitude: la, longitude: ln, accuracy } = p.coords;
      const L = LRef.current, map = mapRef.current;
      if (L && map) { accRef.current?.remove(); accRef.current = L.circle([la, ln], { radius: Math.min(accuracy, 500), color: "#2a78d6", weight: 1, fillOpacity: 0.12, interactive: false }).addTo(map); }
      place(la, ln, 17);
    }, (e) => {
      setLocating(false);
      setGeoErr(e.code === 1
        ? (ru ? "Разрешите доступ к местоположению в настройках браузера" : "Brauzer sozlamalarida joylashuvga ruxsat bering")
        : (ru ? "Не удалось определить местоположение. Попробуйте ещё раз" : "Joylashuvni aniqlab bo‘lmadi. Qayta urinib ko‘ring"));
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  }

  if (failed) return <p className="text-sm text-slate-500">{t("wiz.mapFail")}</p>;
  const btn = "grid h-11 w-11 place-items-center rounded-full bg-white text-slate-800 shadow-lg ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60";
  return (
    <div className={full ? "fixed inset-0 z-[1200] bg-white" : "relative"}>
      {full && (
        <div className="absolute inset-x-3 top-3 z-[1001]">
          <div className="flex gap-2">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={ru ? "Улица, ориентир, здание…" : "Ko‘cha, mo‘ljal, bino…"} aria-label={ru ? "Поиск адреса" : "Manzil qidirish"}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-lg" />
            <button type="button" onClick={() => setFull(false)} className="rounded-xl bg-brand px-4 py-3 font-semibold text-white shadow-lg">{ru ? "Готово" : "Tayyor"}</button>
          </div>
          {(hits.length > 0 || searching) && <ul className="mt-2 max-h-64 overflow-y-auto rounded-xl bg-white shadow-xl ring-1 ring-slate-200">
            {searching && !hits.length && <li className="px-4 py-3 text-sm text-slate-500">…</li>}
            {hits.map((h) => <li key={`${h.lat},${h.lon}`}><button type="button" className="block w-full px-4 py-3 text-left text-sm hover:bg-slate-50"
              onClick={() => { place(Number(h.lat), Number(h.lon), 17); setHits([]); setQ(h.display_name.split(",").slice(0, 2).join(",")); }}>{h.display_name}</button></li>)}
          </ul>}
        </div>
      )}
      {/* Xarita va uning tugmalari bitta blokda: tugmalar xarita ichida, pastki izoh matniga tushmaydi */}
      <div className={full ? "relative h-full w-full" : "relative h-72"}>
      <div ref={box} role="region" aria-label={t("wiz.mapAria")} data-testid="pick-map" data-focus={focusKey} className={full ? "h-full w-full" : "h-full rounded border border-slate-200 bg-slate-100"} />
      <div className="absolute bottom-8 right-3 z-[1000] flex flex-col gap-2">
        {/* Yandex'dagidek: o'ng tomonda yaqinlashtirish, to'liq ekran va "men turgan joy" */}
        <div className="flex flex-col overflow-hidden rounded-full bg-white shadow-lg ring-1 ring-slate-200">
          <button type="button" onClick={() => mapRef.current?.zoomIn()} aria-label={ru ? "Приблизить" : "Yaqinlashtirish"} className="grid h-11 w-11 place-items-center text-xl hover:bg-slate-50">+</button>
          <span aria-hidden="true" className="mx-2 h-px bg-slate-200" />
          <button type="button" onClick={() => mapRef.current?.zoomOut()} aria-label={ru ? "Отдалить" : "Uzoqlashtirish"} className="grid h-11 w-11 place-items-center text-xl hover:bg-slate-50">−</button>
        </div>
        {!full && <button type="button" onClick={() => setFull(true)} className={btn} aria-label={ru ? "Открыть карту на весь экран" : "Xaritani to‘liq ekranda ochish"} title={ru ? "На весь экран" : "To‘liq ekran"}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg></button>}
        {!disabled && <button type="button" onClick={locate} disabled={locating} className={btn} aria-label={ru ? "Моё местоположение" : "Men turgan joy"} title={ru ? "Моё местоположение" : "Men turgan joy"}>
          {locating ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            : <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-brand" fill="currentColor"><path d="M21 3 3 10.5l7.5 2.9L13.4 21z" /></svg>}</button>}
      </div>
      </div>
      {geoErr && <p role="alert" className={`${full ? "absolute bottom-8 left-3 right-20 z-[1001] rounded-lg bg-white p-2 shadow" : "mt-2"} text-sm text-red-700`}>{geoErr}</p>}
      {!full && !disabled && <p className="mt-2 text-xs text-slate-500">{ru ? "Нажмите на карту, перетащите метку или нажмите «Моё местоположение», если вы сейчас на объекте." : "Xaritaga bosing, belgini suring yoki joyning o‘zida bo‘lsangiz «Men turgan joy» tugmasini bosing."}</p>}
    </div>
  );
}
