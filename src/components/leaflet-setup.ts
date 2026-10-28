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
