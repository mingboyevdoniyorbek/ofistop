import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { getCurrentUser } from "./auth";
import { canEditListing } from "./status";
import { getLocale } from "./i18n";
import { localizeBody } from "./server-i18n";

export class HttpError extends Error { constructor(public status: number, msg: string, public extra: object = {}) { super(msg); } }
type Ctx = { params: Promise<Record<string, string>> };
/** API wrapper: HttpError -> JSON; javobdagi xabarlar `lang` cookie bo'yicha tarjima qilinadi (manba o'zbekcha, `messages/server.ts`). */
export const handle = (fn: (req: Request, ctx: Ctx) => Promise<Response>) => async (req: Request, ctx: Ctx) => {
  let res: Response;
  try { res = await fn(req, ctx); }
  catch (e) {
    if (e instanceof HttpError) res = NextResponse.json({ error: e.message, ...e.extra }, { status: e.status });
    else {
      console.error("API xatosi:", e instanceof Error ? e.message : "noma'lum"); // telefon va shaxsiy ma'lumot log qilinmaydi
      res = NextResponse.json({ error: "Server xatosi. Keyinroq urinib ko'ring." }, { status: 500 });
    }
  }
  return localizeResponse(res);
};
async function localizeResponse(res: Response): Promise<Response> {
  if (!res.headers.get("content-type")?.includes("application/json")) return res;
  const locale = await getLocale().catch(() => "uz" as const);
  if (locale === "uz") return res;
  const raw = await res.clone().text().catch(() => null);
  if (raw === null) return res;
  let body: unknown; try { body = JSON.parse(raw); } catch { return res; }
  const out = JSON.stringify(localizeBody(body, locale));
  if (out === raw) return res;
  const headers = new Headers(res.headers); headers.delete("content-length");
  return new Response(out, { status: res.status, statusText: res.statusText, headers });
}
/** CSRF qatlami: o'zgartiruvchi so'rovlar faqat shu saytdan. */
export function sameOrigin(req: Request) {
  const o = req.headers.get("origin"); if (!o) return;
  const host = process.env.APP_URL ? new URL(process.env.APP_URL).host : new URL(req.url).host;
  if (!host || new URL(o).host !== host) throw new HttpError(403, "Ruxsat yo'q");
}
export async function requireUser(req: Request) {
  if (req.method !== "GET") sameOrigin(req);
  const u = await getCurrentUser();
  if (!u) throw new HttpError(401, "Avval tizimga kiring");
  return u;
}
export const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);

export async function managedCenterIds(userId: string, tx?: Tx) {
  return (await (tx ?? db()).select({ id: s.businessCenterMemberships.centerId }).from(s.businessCenterMemberships).where(eq(s.businessCenterMemberships.userId, userId))).map((r) => r.id);
}
/** E'lonni yuklaydi va tahrirlash huquqini tekshiradi. Begona e'lon uchun 404 (mavjudligi oshkor bo'lmasin — IDOR). */
export type Tx = Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0];
export async function loadEditable(id: string, user: { id: string; role: "user" | "moderator" | "admin" }, tx?: Tx) {
  if (!isUuid(id)) throw new HttpError(404, "E'lon topilmadi");
  const query = (tx ?? db()).select().from(s.listings).where(eq(s.listings.id, id)).limit(1);
  const [l] = await (tx ? query.for("update") : query);
  if (!l) throw new HttpError(404, "E'lon topilmadi");
  const centers = l.centerId ? await managedCenterIds(user.id, tx) : [];
  if (!canEditListing(user, l, centers, l.centerId)) throw new HttpError(404, "E'lon topilmadi");
  return l;
}
export async function ttlDays(tx?: Tx) {
  const [r] = await (tx ?? db()).select().from(s.settings).where(eq(s.settings.key, "listing_ttl_days")).limit(1);
  const n = Number(r?.value); return Number.isInteger(n) && n > 0 && n <= 365 ? n : 30;
}
export async function listingAmenities(id: string, tx?: Tx) {
  return (await (tx ?? db()).select({ c: s.listingAmenities.amenityCode }).from(s.listingAmenities).where(eq(s.listingAmenities.listingId, id))).map((r) => r.c);
}
export { and, eq };
