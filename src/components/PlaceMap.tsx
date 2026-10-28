"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "./I18nProvider";
import "leaflet/dist/leaflet.css";
import { TILE_ATTRIBUTION, TILE_URL, loadLeaflet, pinIcon } from "./leaflet-setup";

/** E'lon sahifasidagi bitta nuqta. Faqat serverda publicPoint() dan o'tgan koordinata props sifatida beriladi. */
export default function PlaceMap({ lat, lng, approx, radiusM }: { lat: number; lng: number; approx: boolean; radiusM: number | null }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let map: import("leaflet").Map | null = null; let dead = false;
    loadLeaflet().then((L) => {
      if (dead || !box.current) return;
      map = L.map(box.current, { center: [lat, lng], zoom: approx ? 15 : 16, scrollWheelZoom: false });
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
      if (approx && radiusM) L.circle([lat, lng], { radius: radiusM, color: "#16a34a", weight: 2, fillOpacity: 0.12 }).addTo(map);
      else L.marker([lat, lng], { icon: pinIcon(L, false) }).addTo(map);
    }).catch(() => setFailed(true));
    return () => { dead = true; map?.remove(); };
  }, [lat, lng, approx, radiusM]);
  if (failed) return <p className="text-sm text-slate-500">{t("map.placeFail")}</p>;
  return (<div><div ref={box} role="region" aria-label={t("map.region")} className="h-64 rounded border border-slate-200 bg-slate-100" />
    {approx && <p className="mt-1 text-xs text-slate-500">{t("map.approx")}</p>}</div>);
}
