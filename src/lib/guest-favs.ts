// Kirmagan foydalanuvchi sevimlilari brauzerda saqlanadi; kirgach hisobga ko'chiriladi (FavSync).
export const GUEST_FAVS_KEY = "ofistop-favs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const MAX_GUEST_FAVS = 50;
export function readGuestFavs(): string[] {
  try { const v = JSON.parse(localStorage.getItem(GUEST_FAVS_KEY) ?? "[]"); return Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === "string" && UUID.test(x)))].slice(0, MAX_GUEST_FAVS) : []; }
  catch { return []; }
}
export function writeGuestFavs(ids: string[]) { try { localStorage.setItem(GUEST_FAVS_KEY, JSON.stringify(ids.slice(0, MAX_GUEST_FAVS))); } catch {} }
export const isUuid = (s: string) => UUID.test(s);
