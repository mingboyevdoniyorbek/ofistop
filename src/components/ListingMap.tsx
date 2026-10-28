"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { popup, type Marker } from "./map-popup";
import { useT } from "./I18nProvider";
import { TASHKENT, TILE_ATTRIBUTION, TILE_URL, loadLeaflet, pinIcon } from "./leaflet-setup";

export default function ListingMap({ query, listHref }: { query: string; listHref: string }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<{ kind: "loading" } | { kind: "ready"; count: number; truncated: boolean } | { kind: "empty" } | { kind: "error"; text: string }>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false; let map: LMap | null = null;
    setState({ kind: "loading" });
    (async () => {
      try {
        const [L, res] = await Promise.all([loadLeaflet(), fetch(`/api/map?${query}`)]);
        if (!res.ok) throw new Error(res.status === 429 ? t("map.tooMany") : t("map.loadFail"));
        const data = (await res.json()) as { markers: Marker[]; truncated: boolean };
        if (cancelled || !box.current) return;
        if (!data.markers.length) { setState({ kind: "empty" }); return; }
        map = L.map(box.current, { center: TASHKENT, zoom: 11, maxZoom: 19 }); // markercluster maxZoom ni talab qiladi: tile qatlamiga bog'lanib qolmasin
        L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
        const cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 50 });
        let ring: ReturnType<typeof L.circle> | null = null;
        for (const m of data.markers) {
          const mk = L.marker([m.lat, m.lng], { icon: pinIcon(L, m.approx), title: m.title, keyboard: true }).bindPopup(popup(m, { approx: t("map.approxShort"), m2: t("unit.m2") }));
          mk.on("popupopen", () => { ring?.remove(); if (m.approx && m.radiusM && map) ring = L.circle([m.lat, m.lng], { radius: m.radiusM, color: "#16a34a", weight: 1, fillOpacity: 0.08 }).addTo(map); });
          mk.on("popupclose", () => { ring?.remove(); ring = null; });
          cluster.addLayer(mk);
        }
        map.addLayer(cluster);
        map.fitBounds(cluster.getBounds().pad(0.15), { maxZoom: 15 });
        setState({ kind: "ready", count: data.markers.length, truncated: data.truncated });
      } catch (e) {
        if (!cancelled) setState({ kind: "error", text: e instanceof Error ? e.message : t("map.mapFail") });
      }
    })();
    return () => { cancelled = true; map?.remove(); };
  }, [query, attempt]); // eslint-disable-line react-hooks/exhaustive-deps -- t tilga bog'liq, til o'zgarganda sahifa yangilanadi

  return (
    <div>
      <div role="region" aria-label={t("map.aria")} className={`relative rounded border border-slate-200 h-[65vh] min-h-[340px] bg-slate-100 ${state.kind === "ready" || state.kind === "loading" ? "" : "hidden"}`}>
        <div ref={box} className="absolute inset-0 rounded" />
        {state.kind === "loading" && <p className="absolute inset-0 grid place-items-center text-slate-500 z-[500] bg-slate-100/80">{t("map.loading")}</p>}
      </div>
      {state.kind === "ready" && <p className="mt-2 text-xs text-slate-500">{t("map.count", { n: state.count })}{state.truncated ? ` ${t("map.truncated")}` : ""} {t("map.legend")}</p>}
      {state.kind === "empty" && <div className="rounded border border-slate-200 p-6 text-center"><p className="font-medium">{t("map.empty")}</p><a href={listHref} className="inline-block mt-3 rounded bg-brand text-white px-4 py-2 text-sm">{t("map.toList")}</a></div>}
      {state.kind === "error" && (
        <div role="alert" className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p>{t("map.errTail", { text: state.text })}</p>
          <div className="mt-2 flex gap-3"><button className="underline" onClick={() => setAttempt((x) => x + 1)}>{t("map.retry")}</button><a className="underline" href={listHref}>{t("map.backList")}</a></div>
        </div>)}
    </div>
  );
}
