import { createHmac } from "crypto";

export const APPROX_MIN_M = 200;
export const APPROX_MAX_M = 500;

export interface PublicPoint { lat: number; lng: number; approx: boolean; radiusM?: number }

/**
 * Ommaga ko'rsatiladigan nuqta. Faqat SHU funksiya natijasi public API/sahifalarga chiqadi.
 * - exactLocationPublic=true: haqiqiy koordinata.
 * - aks holda: haqiqiy nuqtadan 200–500 m masofadagi, e'lon ID va maxfiy kalitdan HMAC bilan olingan DETERMINISTIK siljish.
 *   (Tasodifiy emas, shuning uchun qayta-qayta so'rab o'rtachalab haqiqiy nuqtani topib bo'lmaydi.)
 */
export function publicPoint(l: { id: string; lat: string | number | null; lng: string | number | null; exactLocationPublic: boolean }, secret = process.env.SESSION_SECRET): PublicPoint | null {
  if (l.lat == null || l.lng == null) return null;
  const lat = Number(l.lat), lng = Number(l.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (l.exactLocationPublic) return { lat, lng, approx: false };
  if (!secret) throw new Error("SESSION_SECRET sozlanmagan: taxminiy joylashuvni hisoblab bo'lmaydi");
  const h = createHmac("sha256", secret).update(`geo|${l.id}`).digest();
  const u1 = h.readUInt32BE(0) / 2 ** 32, u2 = h.readUInt32BE(4) / 2 ** 32;
  const angle = u1 * 2 * Math.PI, dist = APPROX_MIN_M + u2 * (APPROX_MAX_M - APPROX_MIN_M);
  const dLat = (dist * Math.cos(angle)) / 111_320;
  const dLng = (dist * Math.sin(angle)) / (111_320 * Math.cos((lat * Math.PI) / 180));
  return { lat: +(lat + dLat).toFixed(5), lng: +(lng + dLng).toFixed(5), approx: true, radiusM: APPROX_MAX_M };
}

export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6_371_000, rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
