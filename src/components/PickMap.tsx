"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "./I18nProvider";
import "leaflet/dist/leaflet.css";
import { TASHKENT, TILE_ATTRIBUTION, TILE_URL, loadLeaflet, pinIcon } from "./leaflet-setup";

const parse = (v: string) => { const n = Number(v.replace(",", ".")); return v.trim() && Number.isFinite(n) ? n : null; };
const fix6 = (n: number) => n.toFixed(6);

/** E'lon formasida joylashuvni tanlash: xaritada bosish yoki markerni surish. Xarita yuklanmasa, qo'lda kiritish ishlayveradi. */
export default function PickMap({ lat, lng, onPick, disabled }: { lat: string; lng: string; onPick: (lat: string, lng: string) => void; disabled?: boolean }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const pickRef = useRef(onPick); pickRef.current = onPick;
  const [failed, setFailed] = useState(false);
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

  useEffect(() => {
    let dead = false;
    loadLeaflet().then((L) => {
      if (dead || !box.current) return;
      LRef.current = L;
      const a = parse(lat), b = parse(lng);
      const has = a !== null && b !== null && Math.abs(a) <= 90 && Math.abs(b) <= 180;
      const map = L.map(box.current, { center: has ? [a!, b!] : TASHKENT, zoom: has ? 16 : 12, scrollWheelZoom: false });
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
      mapRef.current = map;
      sync();
      if (!disabled) map.on("click", (e: import("leaflet").LeafletMouseEvent) => pickRef.current(fix6(e.latlng.lat), fix6(e.latlng.lng)));
    }).catch(() => setFailed(true));
    return () => { dead = true; mapRef.current?.remove(); mapRef.current = null; markerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  useEffect(sync, [lat, lng]); // eslint-disable-line react-hooks/exhaustive-deps

  if (failed) return <p className="text-sm text-slate-500">{t("wiz.mapFail")}</p>;
  return <div ref={box} role="region" aria-label={t("wiz.mapAria")} data-testid="pick-map" className="h-64 rounded border border-slate-200 bg-slate-100" />;
}
