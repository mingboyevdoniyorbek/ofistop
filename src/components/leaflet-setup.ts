import type * as LType from "leaflet";
// Tile provayderi almashtiriladigan. OSM'ning rasmiy serveri og'ir/tijorat yuklama uchun mo'ljallanmagan:
// production'da NEXT_PUBLIC_TILE_URL ni o'z tile xizmatingizga o'zgartiring (DEPLOY.md).
export const TILE_URL = process.env.NEXT_PUBLIC_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION = process.env.NEXT_PUBLIC_TILE_ATTRIBUTION || "© <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\" rel=\"noopener noreferrer\">OpenStreetMap</a> contributors";
export const TASHKENT: [number, number] = [41.3111, 69.2406];

export async function loadLeaflet(): Promise<typeof LType> {
  const L = (await import("leaflet")).default as typeof LType;
  (window as unknown as { L: typeof LType }).L = L; // markercluster global L ni kutadi
  await import("leaflet.markercluster");
  return L;
}
export function pinIcon(L: typeof LType, approx: boolean) {
  return L.divIcon({ className: "oi-pin", html: `<span class="${approx ? "oi-approx" : ""}"></span>`, iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -10] });
}

/**
 * Telefonda sahifa ichidagi xarita: BIR barmoq bilan surilsa — sahifa aylanadi (xarita «ushlab qolmaydi»),
 * ekranda «ikki barmoq» maslahati chiqadi; IKKI barmoq bilan — xarita suriladi va kattalashadi (Google Maps kabi).
 * Qaytgan funksiya `free(true)` — to'liq ekran rejimi: xarita odatdagidek bir barmoq bilan suriladi.
 * Sichqoncha/kompyuterda hech narsa o'zgarmaydi.
 */
export function mobileGestures(map: LType.Map, text: string): (free: boolean) => void {
  if (typeof window === "undefined" || !window.matchMedia("(pointer: coarse)").matches) return () => {};
  const el = map.getContainer();
  const hint = document.createElement("div");
  hint.className = "oi-gesture"; hint.setAttribute("aria-hidden", "true"); hint.textContent = text;
  el.appendChild(hint);
  let free = false; let timer: ReturnType<typeof setTimeout> | undefined;
  const apply = () => {
    if (free) { map.dragging.enable(); el.style.touchAction = "none"; }
    else { map.dragging.disable(); el.style.touchAction = "pan-y"; } // bir barmoq — brauzer sahifani aylantiradi; ikki barmoq — Leaflet (touchZoom) suradi va kattalashtiradi
    hint.classList.remove("on");
  };
  el.addEventListener("touchmove", (e) => {
    if (free) return;
    if (e.touches.length === 1) { hint.classList.add("on"); clearTimeout(timer); timer = setTimeout(() => hint.classList.remove("on"), 1300); }
    else hint.classList.remove("on");
  }, { passive: true });
  apply();
  return (f: boolean) => { free = f; apply(); };
}
