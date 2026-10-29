import { publicPoint } from "./geo";
export type Bounds = [number, number, number, number]; // west,south,east,north
export function parseBounds(value?: string): Bounds | undefined {
  if (!value) return;
  if (value.split(",").some(part => !part.trim())) return;
  const n = value.split(",").map(Number);
  if (n.length !== 4 || !n.every(Number.isFinite) || n[0] < -180 || n[2] > 180 || n[1] < -85 || n[3] > 85 || n[0] >= n[2] || n[1] >= n[3]) return;
  return n as Bounds;
}
export function inBounds(p: { lat: number; lng: number }, b: Bounds) { return p.lng >= b[0] && p.lng <= b[2] && p.lat >= b[1] && p.lat <= b[3]; }
export function cellKey(lat: number, lng: number, zoom: number) {
  const scale = 256 * 2 ** zoom, sin = Math.sin(Math.max(-85, Math.min(85, lat)) * Math.PI / 180);
  return `${zoom}:${Math.floor(((lng + 180) / 360 * scale) / 72)}:${Math.floor((0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale / 72)}`;
}
export type MapPoint = { id: string; lat: number; lng: number; approx: boolean; radiusM?: number };
export function clusterPoints(points: MapPoint[], zoom: number, bounds?: Bounds) {
  const groups = new Map<string, MapPoint[]>();
  for (const p of points) { if (bounds && !inBounds(p, bounds)) continue; const key = cellKey(p.lat, p.lng, zoom); const group = groups.get(key) ?? []; group.push(p); groups.set(key, group); }
  return [...groups].map(([id, items]) => ({ id, count: items.length, lat: items.reduce((s, p) => s + p.lat, 0) / items.length, lng: items.reduce((s, p) => s + p.lng, 0) / items.length, items }));
}
export function toPublicPoints(rows: { id: string; lat: string | null; lng: string | null; exact: boolean }[]) {
  return rows.flatMap(r => { const p = publicPoint({ ...r, exactLocationPublic: r.exact }); return p ? [{ id: r.id, ...p }] : []; });
}
