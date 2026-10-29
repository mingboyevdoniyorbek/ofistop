"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Map as LMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLocale } from "./I18nProvider";
import { TASHKENT, TILE_ATTRIBUTION, TILE_URL, loadLeaflet, pinIcon } from "./leaflet-setup";
import type { Marker } from "./map-popup";
type Cluster = { id: string; lat: number; lng: number; count: number };
type Data = { total: number; markers: Marker[]; clusters: Cluster[]; groupTotal: number };
function viewport(map: LMap) { const b = map.getBounds(); return [Math.max(-180,b.getWest()),Math.max(-85,b.getSouth()),Math.min(180,b.getEast()),Math.min(85,b.getNorth())].join(","); }
export default function ListingMap({ query, listHref, children }: { query: string; listHref: string; children?: ReactNode }) {
  const ru = useLocale() === "ru", router = useRouter();
  const box = useRef<HTMLDivElement>(null), mapRef = useRef<LMap | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [tileError, setTileError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => mapRef.current?.invalidateSize(), 50);
    const previous = document.body.style.overflow;
    if (fullscreen) document.body.style.overflow = "hidden";
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    document.addEventListener("keydown",escape);
    return () => { clearTimeout(timer); document.body.style.overflow = previous; document.removeEventListener("keydown",escape); };
  }, [fullscreen]);
  const [count, setCount] = useState(0), [moved, setMoved] = useState(false), [sheet, setSheet] = useState(false);
  const [selected, setSelected] = useState<Marker[]>([]), [groupTotal, setGroupTotal] = useState(0);
  const groupRef = useRef<{ id: string; page: number } | null>(null), fetchGroup = useRef<(id: string, page: number) => void>(() => {});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false, controller: AbortController | null = null, timer: ReturnType<typeof setTimeout>;
    let map: LMap | null = null;
    setError(""); setTileError(false); setLoading(true); setSelected([]); setMoved(false);
    (async () => {
      const L = await loadLeaflet(); if (disposed || !box.current) return;
      map = L.map(box.current, { center: TASHKENT, zoom: 11, minZoom: 2, maxZoom: 19, maxBounds: [[-85,-180],[85,180]], maxBoundsViscosity: 1 }); mapRef.current = map;
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).on("tileerror", () => { if (!disposed) setTileError(true); }).on("tileload", () => { if (!disposed) setTileError(false); }).addTo(map);
      const layer = L.layerGroup().addTo(map); let ring: ReturnType<typeof L.circle> | null = null;
      const params = new URLSearchParams(query);
      try {
        const saved = JSON.parse(sessionStorage.getItem("ofistop-map-view") ?? "null");
        const bbox = params.get("bbox")?.split(",").map(Number);
        if (bbox?.length === 4 && bbox.every(Number.isFinite)) map.fitBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]]);
        else if (params.has("lat") && params.has("lng")) map.setView([Number(params.get("lat")), Number(params.get("lng"))], 14);
        else if (saved && Array.isArray(saved.center) && saved.center.length === 2 && saved.center.every(Number.isFinite) && Number.isFinite(saved.zoom)) map.setView(saved.center, saved.zoom);
      } catch {}
      async function refresh(group?: string, page = 1) {
        if (!map || disposed) return;
        controller?.abort(); controller = new AbortController(); const signal = controller.signal;
        setLoading(true); setError("");
        const u = new URLSearchParams(query); u.set("bbox", viewport(map)); u.set("zoom", String(map.getZoom()));
        if (group) { u.set("group", group); u.set("groupPage", String(page)); }
        try {
          const response = await fetch(`/api/map?${u}`, { signal });
          if (!response.ok) throw new Error(ru ? "Не удалось загрузить карту. Повторите попытку." : "Xarita ma’lumotlari yuklanmadi. Qayta urinib ko‘ring.");
          const data: Data = await response.json(); if (disposed || signal.aborted) return;
          setCount(data.total);
          if (group) { setSelected(data.markers); setGroupTotal(data.groupTotal); groupRef.current = { id: group, page }; setSheet(true); return; }
          layer.clearLayers(); ring?.remove(); setSelected([]); setGroupTotal(0); groupRef.current = null;
          for (const c of data.clusters) {
            const icon = L.divIcon({ className: "ofistop-cluster", html: `<span>${c.count}</span>`, iconSize: [48, 48], iconAnchor: [24, 24] });
            L.marker([c.lat, c.lng], { icon, title: `${c.count} ${ru ? "объявлений" : "ta e’lon"}`, keyboard: true }).on("click", () => {
              if (map!.getZoom() < 19) map!.setView([c.lat, c.lng], Math.min(19, map!.getZoom() + 2));
              else void refresh(c.id);
            }).addTo(layer);
          }
          for (const m of data.markers) L.marker([m.lat, m.lng], { icon: pinIcon(L, m.approx), title: m.title, keyboard: true }).on("click", () => {
            ring?.remove(); if (m.approx && m.radiusM) ring = L.circle([m.lat, m.lng], { radius: m.radiusM, color: "#16a34a", weight: 1, fillOpacity: .08 }).addTo(map!);
            setSelected([m]); setGroupTotal(1); setSheet(true); groupRef.current = null;
          }).addTo(layer);
        } catch (e) { if (!signal.aborted && !disposed) setError(e instanceof Error ? e.message : "Xato"); }
        finally { if (!disposed && !signal.aborted) setLoading(false); }
      }
      fetchGroup.current = (id, page) => void refresh(id, page);
      map.on("moveend", () => {
        setMoved(true); try { const c = map!.getCenter(); sessionStorage.setItem("ofistop-map-view", JSON.stringify({ center: [c.lat, c.lng], zoom: map!.getZoom() })); } catch {}
        clearTimeout(timer); timer = setTimeout(() => void refresh(), 180);
      });
      void refresh();
    })().catch(() => { if (!disposed) { setLoading(false); setError(ru ? "Карта недоступна" : "Xarita ochilmadi"); } });
    return () => { disposed = true; clearTimeout(timer); controller?.abort(); map?.remove(); mapRef.current = null; };
  }, [query, ru, attempt]);
  function searchHere() {
    if (!mapRef.current) return; const u = new URLSearchParams(query); u.set("bbox", viewport(mapRef.current)); u.set("view", "map"); u.delete("page"); router.push(`/joylar?${u}`, { scroll: false }); setMoved(false);
  }
  function nearby() {
    if (!navigator.geolocation) { setError(ru ? "Геолокация недоступна" : "Joylashuv aniqlanmadi"); return; }
    navigator.geolocation.getCurrentPosition(p => mapRef.current?.setView([p.coords.latitude, p.coords.longitude], 15), () => setError(ru ? "Разрешите доступ к местоположению или выберите район вручную." : "Joylashuvga ruxsat bering yoki hududni xaritadan tanlang."), { timeout: 10000, maximumAge: 60000 });
  }
  const cards = <>{selected.map(m => <a key={m.id} href={m.href} className="block overflow-hidden rounded-2xl border border-slate-200 bg-white">
    {m.thumb && <img src={m.thumb} alt="" loading="lazy" className="h-36 w-full object-cover"/>}<div className="space-y-1 p-4"><strong className="text-brand">{m.price}</strong><h3 className="font-semibold">{m.title}</h3><p className="text-sm text-slate-600">{m.category} · {m.area} m²</p>{m.total && <p className="text-xs text-slate-500">{m.total}</p>}{m.approx && <p className="text-xs text-green-700">{ru ? "Примерное расположение" : "Taxminiy joylashuv"}</p>}</div>
  </a>)}{groupTotal > 20 && <div className="flex justify-between text-sm"><button disabled={loading || (groupRef.current?.page ?? 1) <= 1} onClick={() => { const g = groupRef.current; if (g) fetchGroup.current(g.id, g.page - 1); }}>{ru ? "Назад" : "Oldingi"}</button><span>{groupRef.current?.page} / {Math.ceil(groupTotal / 20)}</span><button disabled={loading || (groupRef.current?.page ?? 1) * 20 >= groupTotal} onClick={() => { const g = groupRef.current; if (g) fetchGroup.current(g.id, g.page + 1); }}>{ru ? "Далее" : "Keyingi"}</button></div>}</>;
  return <div className={`${fullscreen ? "fixed inset-0 z-[1200] overflow-auto bg-white p-2" : "relative"} grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]`}>
    <aside className={`${sheet ? "fixed inset-x-2 bottom-3 z-[1001] max-h-[58dvh] shadow-2xl" : "hidden"} overflow-auto rounded-3xl bg-white p-3 lg:static lg:block lg:max-h-[75vh] lg:shadow-none`}>
      <button className="mb-3 w-full rounded-xl bg-slate-100 p-2 text-sm lg:hidden" onClick={() => setSheet(false)}>{ru ? "Свернуть ↓" : "Yopish ↓"}</button>
      {selected.length ? <div className="space-y-3"><button className="text-sm text-brand" onClick={() => { setSelected([]); setGroupTotal(0); }}>{ru ? "← Все результаты" : "← Barcha natijalar"}</button>{groupTotal > 1 && <p>{groupTotal} {ru ? "объявлений здесь" : "ta e’lon shu joyda"}</p>}{cards}</div> : children}
    </aside>
    <div className={`relative ${fullscreen ? "h-[calc(100dvh-16px)]" : "h-[76dvh] min-h-[420px]"} overflow-hidden rounded-3xl border border-slate-200 bg-slate-100`}>
      <div ref={box} className="absolute inset-0" aria-label={ru ? "Карта объявлений" : "E’lonlar xaritasi"}/>
      <button aria-pressed={fullscreen} aria-label={fullscreen ? (ru ? "Закрыть полноэкранную карту" : "To‘liq ekran xaritasini yopish") : (ru ? "Карта на весь экран" : "Xaritani to‘liq ekranda ochish")} onClick={()=>setFullscreen(x=>!x)} className="absolute left-3 top-24 z-[500] grid h-10 w-10 place-items-center rounded-xl bg-white text-xl shadow">{fullscreen ? "✕" : "⛶"}</button>
      <div className="pointer-events-none absolute left-14 right-3 top-3 z-[500] flex flex-wrap justify-center gap-2">
        <span role="status" className="rounded-full bg-white px-4 py-2 text-sm shadow">{loading ? (ru ? "Загрузка…" : "Yuklanmoqda…") : `${count} ${ru ? "объявлений на карте" : "ta e’lon xaritada"}`}</span>
        {moved && <button onClick={searchHere} className="pointer-events-auto rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow">{ru ? "Искать здесь" : "Shu hududdan qidirish"}</button>}
      </div>
      {error && <div role="alert" className="absolute inset-x-3 top-24 z-[500] rounded-2xl bg-white p-4 text-sm shadow"><p>{error}</p><button className="mt-2 text-brand underline" onClick={() => setAttempt(x => x + 1)}>{ru ? "Повторить" : "Qayta urinish"}</button></div>}
      {tileError && !error && count > 0 && <div role="status" className="absolute inset-x-3 top-24 z-[500] rounded-xl bg-white/95 p-3 text-xs shadow">{ru ? "Фон карты не загрузился. Проверьте подключение; объявления доступны в списке." : "Xarita foni yuklanmadi. Internetni tekshiring; e’lonlarni ro‘yxatda ko‘rishingiz mumkin."} <button className="text-brand underline" onClick={() => setAttempt(x=>x+1)}>{ru ? "Повторить" : "Qayta urinish"}</button></div>}
      {!loading && !error && count === 0 && <div className="absolute inset-x-4 top-28 z-[500] rounded-2xl bg-white p-4 text-center text-sm shadow"><p>{ru ? "Здесь нет подходящих объявлений. Измените масштаб или фильтры." : "Bu hududda mos joy topilmadi. Xaritani uzoqlashtiring yoki filtrlarni kengaytiring."}</p><a href="/joylar?view=map" className="text-brand underline">{ru ? "Сбросить фильтры" : "Filtrlarni tozalash"}</a></div>}
      <div className="absolute bottom-8 left-3 right-3 z-[500] flex justify-between gap-2"><button onClick={() => setSheet(true)} className="rounded-full bg-brand px-4 py-3 text-sm text-white shadow lg:hidden">{ru ? "Результаты" : "Natijalar"} ↑</button><button onClick={nearby} className="ml-auto rounded-full bg-white px-4 py-3 text-sm font-semibold shadow">⌖ {ru ? "Рядом со мной" : "Menga yaqin"}</button></div>
    </div>
    {!fullscreen && <a className="text-sm text-brand underline lg:col-span-2" href={listHref}>{ru ? "Показать списком" : "Ro‘yxatda ko‘rish"}</a>}
  </div>;
}
