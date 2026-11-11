"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useT } from "./I18nProvider";
import "leaflet/dist/leaflet.css";
import { TILE_ATTRIBUTION, TILE_URL, loadLeaflet, pinIcon } from "./leaflet-setup";

// Yandex Maps JS API 2.1 kaliti (developer.tech.yandex.ru → «JavaScript API и HTTP Геокодер»). Bo'lmasa OpenStreetMap ko'rsatiladi.
const YANDEX_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY || "";

type YMaps = { ready: (cb: () => void) => void; Map: new (el: HTMLElement, s: object, o?: object) => { behaviors: { disable: (b: string[]) => void }; geoObjects: { add: (o: unknown) => void }; destroy: () => void };
  Placemark: new (c: number[], p?: object, o?: object) => unknown; Circle: new (g: [number[], number], p?: object, o?: object) => unknown };
let ymapsPromise: Promise<YMaps> | null = null;
function loadYandex(): Promise<YMaps> {
  const w = window as unknown as { ymaps?: YMaps };
  if (w.ymaps) return new Promise((r) => w.ymaps!.ready(() => r(w.ymaps!)));
  ymapsPromise ??= new Promise((resolve, reject) => {
    const sc = document.createElement("script");
    sc.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(YANDEX_KEY)}&lang=ru_RU`;
    sc.async = true;
    sc.onload = () => w.ymaps ? w.ymaps.ready(() => resolve(w.ymaps!)) : reject(new Error("ymaps"));
    sc.onerror = () => { ymapsPromise = null; reject(new Error("ymaps")); };
    document.head.appendChild(sc);
  });
  return ymapsPromise;
}

/**
 * E'lon / markaz sahifasidagi joylashuv. Xarita faqat RASM sifatida ko'rsatiladi: barmoq bilan sahifani
 * yuqoriga surganda xarita surilib ketmaydi. Ustiga BOSILGANDA — Yandex Xaritalar / Google Maps / Yandex Go tanlovi chiqadi
 * (telefonda ilova o'rnatilgan bo'lsa, o'sha ilovada ochiladi).
 * Faqat serverda publicPoint() dan o'tgan koordinata props sifatida beriladi.
 */
export default function PlaceMap({ lat, lng, approx, radiusM, label }: { lat: number; lng: number; approx: boolean; radiusM: number | null; label?: string }) {
  const t = useT(); const ru = useLocale() === "ru";
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [sheet, setSheet] = useState(false);
  const zoom = approx ? 15 : 16;

  useEffect(() => {
    let dead = false; let cleanup = () => {};
    const leaflet = () => loadLeaflet().then((L) => {
      if (dead || !box.current) return;
      // Hech qanday harakat yo'q: surish, kattalashtirish, klaviatura — o'chiq (sahifa bemalol aylanadi).
      const map = L.map(box.current, { center: [lat, lng], zoom, dragging: false, touchZoom: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, zoomControl: false, attributionControl: true });
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
      if (approx && radiusM) L.circle([lat, lng], { radius: radiusM, color: "#16a34a", weight: 2, fillOpacity: 0.12, interactive: false }).addTo(map);
      else L.marker([lat, lng], { icon: pinIcon(L, false), interactive: false, keyboard: false }).addTo(map);
      cleanup = () => map.remove();
    });
    const yandex = () => loadYandex().then((ym) => {
      if (dead || !box.current) return;
      const map = new ym.Map(box.current, { center: [lat, lng], zoom, controls: [] }, { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true });
      map.behaviors.disable(["drag", "scrollZoom", "dblClickZoom", "multiTouch", "rightMouseButtonMagnifier", "leftMouseButtonMagnifier"]);
      map.geoObjects.add(approx && radiusM
        ? new ym.Circle([[lat, lng], radiusM], {}, { fillColor: "#16a34a22", strokeColor: "#16a34a", strokeWidth: 2 })
        : new ym.Placemark([lat, lng], {}, { preset: "islands#blueDotIcon", iconColor: "#12308a" }));
      cleanup = () => map.destroy();
    });
    (YANDEX_KEY ? yandex().catch(() => (dead ? undefined : leaflet())) : leaflet()).catch(() => { if (!dead) setFailed(true); });
    return () => { dead = true; cleanup(); };
  }, [lat, lng, approx, radiusM, zoom]);

  useEffect(() => {
    if (!sheet) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    document.addEventListener("keydown", esc); return () => document.removeEventListener("keydown", esc);
  }, [sheet]);

  const name = encodeURIComponent(label ?? "");
  const links = [
    { href: `https://yandex.ru/maps/?pt=${lng},${lat}&z=${zoom}&l=map${label ? `&text=${name}` : ""}`, title: ru ? "Яндекс Карты" : "Yandex Xaritalar", sub: ru ? "Открыть точку и маршрут" : "Nuqta va yo‘nalish", color: "bg-[#fc3f1d]", letter: "Я" },
    { href: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, title: "Google Maps", sub: ru ? "Открыть в Google Картах" : "Google xaritada ochish", color: "bg-[#1a73e8]", letter: "G" },
    { href: `https://3.redirect.appmetrica.yandex.com/route?end-lat=${lat}&end-lon=${lng}&appmetrica_tracking_id=1178268795219780156&ref=ofistop`, title: ru ? "Яндекс Go — такси" : "Yandex Go — taksi", sub: ru ? "Вызвать такси до места" : "Shu joygacha taksi chaqirish", color: "bg-[#ffdb4d] !text-[#111]", letter: "Go" },
  ];

  if (failed) return <a href={links[0].href} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-brand">📍 {links[0].title}</a>;
  return (
    <div>
      <div className="relative isolate z-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        <div ref={box} aria-hidden="true" className="pointer-events-none h-56 sm:h-64" />
        {/* Butun xarita ustidagi tugma: barmoq bilan surish — sahifani aylantiradi, bosish — ilovada ochadi */}
        <button type="button" onClick={() => setSheet(true)} aria-label={`${t("map.region")} — ${ru ? "открыть в картах" : "xaritada ochish"}`}
          className="absolute inset-0 z-[500] flex items-end justify-end p-3 focus-visible:outline-offset-[-3px]">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-2 text-sm font-semibold text-brand shadow-lg ring-1 ring-black/5">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-8-8 18-2-8z" /></svg>
            {ru ? "Открыть в картах" : "Xaritada ochish"}
          </span>
        </button>
      </div>
      {approx && <p className="mt-1 text-xs text-slate-500">{t("map.approx")}</p>}

      {sheet && <div className="fixed inset-0 z-[1300] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={ru ? "Открыть в приложении" : "Ilovada ochish"}>
        <button type="button" aria-label={ru ? "Закрыть" : "Yopish"} onClick={() => setSheet(false)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" />
        <div className="relative w-full max-w-md rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl">
          <span aria-hidden="true" className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />
          <p className="px-1 text-base font-bold text-slate-900">{ru ? "Открыть в приложении" : "Qaysi ilovada ochamiz?"}</p>
          {label && <p className="truncate px-1 text-sm text-slate-500">{label}</p>}
          <ul className="mt-3 space-y-2">{links.map((l) => (
            <li key={l.title}><a href={l.href} target="_blank" rel="noopener" onClick={() => setSheet(false)} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 transition hover:border-brand hover:bg-slate-50">
              <span aria-hidden="true" className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-black text-white ${l.color}`}>{l.letter}</span>
              <span className="min-w-0 flex-1"><span className="block font-semibold text-slate-900">{l.title}</span><span className="block truncate text-xs text-slate-500">{l.sub}</span></span>
              <span aria-hidden="true" className="text-slate-400">›</span>
            </a></li>))}</ul>
          <button type="button" onClick={() => setSheet(false)} className="mt-3 w-full rounded-2xl bg-slate-100 py-3 text-sm font-semibold text-slate-700">{ru ? "Отмена" : "Bekor qilish"}</button>
        </div>
      </div>}
    </div>
  );
}
