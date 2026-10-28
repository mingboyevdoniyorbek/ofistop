// E'lon formasi: matn ko'rinishidagi maydonlar <-> DB qiymatlari. Server va klient uchun umumiy (DB importi yo'q).
import { validDate } from "./validation";
import { z } from "zod";
import type { listings } from "@/db/schema";
import { parseMajorToMinor } from "./money";
import { normalizePhoneUz } from "./text";

export type ListingRow = typeof listings.$inferSelect;
export type ListingInsert = typeof listings.$inferInsert;

export const CATEGORIES = ["office", "bc_room", "coworking", "retail", "service_room", "warehouse", "production", "other"] as const;
export const POSTERS = ["owner", "business_center", "agency"] as const;
/** Kategoriyaga mos maydonlar: mos bo'lmaganlari forma'da ko'rsatilmaydi va majburiy emas. */
export const USES_SEATS: readonly string[] = ["coworking"];
export const USES_FLOOR: readonly string[] = ["office", "bc_room", "coworking", "retail", "service_room", "other"];

const cur = z.enum(["UZS", "USD"]);
export const formSchema = z.object({
  category: z.enum(CATEGORIES), posterType: z.enum(POSTERS),
  title: z.string().max(120), description: z.string().max(5000),
  centerId: z.string().uuid().nullable(), unitCode: z.string().max(40), unitCodePublic: z.boolean(),
  regionId: z.number().int().positive(), districtId: z.number().int().positive().nullable(),
  address: z.string().max(200), lat: z.string().max(20), lng: z.string().max(20), exactLocationPublic: z.boolean(),
  areaM2: z.string().max(14), floor: z.string().max(5), totalFloors: z.string().max(5), seats: z.string().max(6), roomsCount: z.string().max(6),
  furnished: z.enum(["", "1", "0"]),
  priceAmount: z.string().max(24), currency: cur, pricePeriod: z.enum(["month", "day", "hour"]), priceBasis: z.enum(["whole", "per_m2", "per_seat"]), priceNegotiable: z.boolean(),
  depositAmount: z.string().max(24), depositCurrency: cur,
  commissionType: z.enum(["none", "fixed", "percent"]), commissionFixed: z.string().max(24), commissionCurrency: cur,
  commissionPercent: z.string().max(7), commissionPercentBase: z.enum(["monthly_rent", "annual_rent"]),
  utilities: z.enum(["", "included", "separate", "partly"]),
  serviceFee: z.string().max(24), serviceFeeCurrency: cur, serviceFeePeriod: z.enum(["month", "once"]),
  minTermMonths: z.string().max(4), availableFrom: z.string().max(10),
  amenities: z.array(z.string().regex(/^[a-z0-9_]{1,30}$/)).max(30),
  contactPhone: z.string().max(30), telegramUsername: z.string().max(60),
}).partial().strict();
export type Form = z.infer<typeof formSchema>;

const norm = (v: string) => v.trim().replace(",", ".");
export function normalizeTelegram(v: string): string | null {
  const t = v.trim().replace(/^https?:\/\/t\.me\//i, "").replace(/^@/, "");
  return /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(t) ? t : null;
}

/** Forma -> DB qiymatlari. Faqat berilgan maydonlar qaytadi (PATCH uchun). Bo'sh satr = tozalash. */
export function parseForm(f: Form): { values: Partial<ListingInsert>; errors: Record<string, string> } {
  const v: Partial<ListingInsert> = {}; const e: Record<string, string> = {};
  const has = (k: keyof Form) => f[k] !== undefined;
  const text = (k: "title" | "description" | "address" | "unitCode") => { if (has(k)) v[k] = (f[k] as string).trim() as never; };
  if (has("category")) v.category = f.category; if (has("posterType")) v.posterType = f.posterType;
  text("title"); text("description"); text("address");
  if (has("unitCode")) v.unitCode = f.unitCode!.trim() || null;
  if (has("unitCodePublic")) v.unitCodePublic = f.unitCodePublic;
  if (has("centerId")) v.centerId = f.centerId;
  if (has("regionId")) v.regionId = f.regionId; if (has("districtId")) v.districtId = f.districtId;
  if (has("exactLocationPublic")) v.exactLocationPublic = f.exactLocationPublic;
  if (has("furnished")) v.furnished = f.furnished === "" ? null : f.furnished === "1";
  if (has("currency")) v.currency = f.currency; if (has("pricePeriod")) v.pricePeriod = f.pricePeriod; if (has("priceBasis")) v.priceBasis = f.priceBasis;
  if (has("priceNegotiable")) v.priceNegotiable = f.priceNegotiable;
  if (has("depositCurrency")) v.depositCurrency = f.depositCurrency;
  if (has("commissionCurrency")) v.commissionCurrency = f.commissionCurrency;
  if (has("serviceFeePeriod")) v.serviceFeePeriod = f.serviceFeePeriod;
  if (has("serviceFeeCurrency")) v.serviceFeeCurrency = f.serviceFeeCurrency;
  if (has("commissionPercentBase")) v.commissionPercentBase = f.commissionPercentBase;
  if (has("utilities")) v.utilities = f.utilities === "" ? null : f.utilities;
  if (has("amenities")) v.amenities = [...new Set(f.amenities)];

  const int = (k: "floor" | "totalFloors" | "seats" | "roomsCount" | "minTermMonths", min: number, max: number, label: string) => {
    if (!has(k)) return; const s = f[k]!.trim();
    if (!s) { v[k] = null; return; }
    const n = /^-?\d{1,4}$/.test(s) ? Number(s) : NaN;
    if (!(n >= min && n <= max)) e[k] = `${label}: ${min} dan ${max} gacha butun son kiriting`; else v[k] = n;
  };
  int("floor", -3, 200, "Qavat"); int("totalFloors", 1, 200, "Jami qavatlar"); int("seats", 1, 10000, "Ish o'rinlari");
  int("roomsCount", 1, 1000, "Xonalar soni"); int("minTermMonths", 1, 120, "Minimal muddat (oy)");

  if (has("areaM2")) { const s = norm(f.areaM2!); if (!s) v.areaM2 = null; else if (/^\d{1,8}(\.\d{1,2})?$/.test(s) && Number(s) > 0) v.areaM2 = s; else e.areaM2 = "Maydon: musbat son (m²), ko'pi bilan 2 ta kasr"; }
  for (const k of ["lat", "lng"] as const) if (has(k)) {
    const s = norm(f[k]!); const lim = k === "lat" ? 90 : 180;
    if (!s) v[k] = null; else if (/^-?\d{1,3}(\.\d{1,6})?$/.test(s) && Math.abs(Number(s)) <= lim) v[k] = s; else e[k] = k === "lat" ? "Kenglik -90 dan 90 gacha bo'lishi kerak" : "Uzunlik -180 dan 180 gacha bo'lishi kerak";
  }
  const money = (k: "priceAmount" | "depositAmount" | "commissionFixed" | "serviceFee", col: "priceAmountMinor" | "depositAmountMinor" | "commissionFixedMinor" | "serviceFeeMinor", label: string) => {
    if (!has(k)) return; const s = f[k]!.trim();
    if (!s) { v[col] = null; return; }
    const m = parseMajorToMinor(s);
    if (m === null || m <= 0n) e[k] = `${label}: musbat son kiriting (ko'pi bilan 2 ta kasr)`; else v[col] = m;
  };
  money("priceAmount", "priceAmountMinor", "Narx"); money("depositAmount", "depositAmountMinor", "Depozit");
  money("commissionFixed", "commissionFixedMinor", "Komissiya"); money("serviceFee", "serviceFeeMinor", "Xizmat to'lovi");

  if (has("commissionType")) {
    v.commissionType = f.commissionType;
    if (f.commissionType === "none") { v.commissionFixedMinor = null; v.commissionCurrency = null; v.commissionPercent = null; v.commissionPercentBase = null; }
    if (f.commissionType === "fixed") { v.commissionPercent = null; v.commissionPercentBase = null; }
    if (f.commissionType === "percent") { v.commissionFixedMinor = null; }
  }
  if (has("commissionPercent")) {
    const s = norm(f.commissionPercent!);
    if (!s) v.commissionPercent = null; else if (/^\d{1,3}(\.\d{1,2})?$/.test(s) && Number(s) > 0 && Number(s) <= 100) v.commissionPercent = s; else e.commissionPercent = "Foiz 0 dan katta, 100 dan oshmagan son bo'lsin";
  }
  if (has("availableFrom")) {
    const s = f.availableFrom!.trim();
    if (!s) v.availableFrom = null; else if (validDate(s)) v.availableFrom = s; else e.availableFrom = "Sana noto'g'ri (YYYY-MM-DD)";
  }
  if (has("contactPhone")) {
    const s = f.contactPhone!.trim();
    if (!s) v.contactPhone = null; else { const p = normalizePhoneUz(s); if (p) v.contactPhone = p; else e.contactPhone = "Telefon +998 XX XXX XX XX formatida bo'lsin"; }
  }
  if (has("telegramUsername")) {
    const s = f.telegramUsername!.trim();
    if (!s) v.telegramUsername = null; else { const t = normalizeTelegram(s); if (t) v.telegramUsername = t; else e.telegramUsername = "Telegram username 5–32 belgi (harf, raqam, _)"; }
  }
  if (v.floor != null && v.totalFloors != null && v.floor > v.totalFloors) e.floor = "Qavat jami qavatlar sonidan oshmasin";
  if (has("lat") && has("lng") && ((v.lat == null) !== (v.lng == null))) e.lat = "Kenglik va uzunlikni birga kiriting";
  return { values: v, errors: e };
}

const trimNum = (s: string | null) => (s == null ? "" : s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s);
const major = (b: bigint | null) => (b == null ? "" : `${b / 100n}${b % 100n ? "." + (b % 100n).toString().padStart(2, "0").replace(/0$/, "") : ""}`);

/** DB qatori -> forma (matn). */
export function toForm(r: ListingRow, amenities: string[] = r.amenities): Required<Form> {
  return {
    category: r.category, posterType: r.posterType, title: r.title, description: r.description, centerId: r.centerId,
    unitCode: r.unitCode ?? "", unitCodePublic: r.unitCodePublic, regionId: r.regionId, districtId: r.districtId,
    address: r.address, lat: trimNum(r.lat), lng: trimNum(r.lng), exactLocationPublic: r.exactLocationPublic,
    areaM2: trimNum(r.areaM2), floor: r.floor?.toString() ?? "", totalFloors: r.totalFloors?.toString() ?? "",
    seats: r.seats?.toString() ?? "", roomsCount: r.roomsCount?.toString() ?? "",
    furnished: r.furnished == null ? "" : r.furnished ? "1" : "0",
    priceAmount: major(r.priceAmountMinor), currency: r.currency, pricePeriod: r.pricePeriod, priceBasis: r.priceBasis, priceNegotiable: r.priceNegotiable,
    depositAmount: major(r.depositAmountMinor), depositCurrency: r.depositCurrency ?? r.currency,
    commissionType: r.commissionType, commissionFixed: major(r.commissionFixedMinor), commissionCurrency: r.commissionCurrency ?? r.currency,
    commissionPercent: trimNum(r.commissionPercent), commissionPercentBase: r.commissionPercentBase ?? "monthly_rent",
    utilities: r.utilities ?? "", serviceFee: major(r.serviceFeeMinor), serviceFeeCurrency: r.serviceFeeCurrency ?? r.currency, serviceFeePeriod: r.serviceFeePeriod === "once" ? "once" : "month",
    minTermMonths: r.minTermMonths?.toString() ?? "", availableFrom: r.availableFrom ?? "",
    amenities, contactPhone: r.contactPhone ?? "", telegramUsername: r.telegramUsername ?? "",
  };
}

/** Moderatsiyaga yuborish uchun to'liq tekshiruv. Kalitlar forma maydonlari nomi. */
export function submitErrors(form: Form, imagesCount: number): Record<string, string> {
  const { values: v, errors } = parseForm(form);
  const need = (k: string, ok: boolean, msg: string) => { if (!ok && !errors[k]) errors[k] = msg; };
  need("title", (v.title ?? "").length >= 5, "Sarlavha kamida 5 belgi bo'lsin");
  need("description", (v.description ?? "").length >= 20, "Tavsif kamida 20 belgi bo'lsin");
  need("regionId", !!v.regionId, "Viloyat yoki shaharni tanlang");
  need("address", (v.address ?? "").length >= 3, "Manzilni kiriting");
  need("areaM2", v.areaM2 != null, "Maydonni kiriting");
  need("priceAmount", v.priceAmountMinor != null || !!v.priceNegotiable, "Narxni kiriting yoki “narx kelishiladi”ni belgilang");
  if (v.priceBasis === "per_seat") need("priceBasis", USES_SEATS.includes(v.category ?? "") && v.seats != null, "“Ish o'rni” narxi faqat kovorking uchun va ish o'rinlari soni kiritilganda");
  if (USES_SEATS.includes(v.category ?? "")) need("seats", v.seats != null, "Kovorking uchun ish o'rinlari sonini kiriting");
  if (v.commissionType === "fixed") need("commissionFixed", v.commissionFixedMinor != null && !!v.commissionCurrency, "Komissiya summasi va valyutasini kiriting");
  if (v.commissionType === "percent") { need("commissionPercent", v.commissionPercent != null, "Komissiya foizini kiriting"); need("commissionPercentBase", !!v.commissionPercentBase, "Foiz nimadan hisoblanishini tanlang"); }
  if (v.depositAmountMinor != null) need("depositAmount", !!v.depositCurrency, "Depozit valyutasini tanlang");
  need("contactPhone", !!v.contactPhone || !!v.telegramUsername, "Telefon yoki Telegram'dan kamida bittasini kiriting");
  if (v.category === "bc_room") need("centerId", !!v.centerId, "Biznes markazni tanlang");
  need("images", imagesCount >= 1, "Kamida 1 ta rasm yuklang");
  return errors;
}

export const STEP_OF: Record<string, number> = {
  category: 1, posterType: 1, title: 1, description: 1, centerId: 1, unitCode: 1,
  regionId: 2, districtId: 2, address: 2, lat: 2, lng: 2,
  areaM2: 3, floor: 3, totalFloors: 3, seats: 3, roomsCount: 3, priceAmount: 3, priceBasis: 3, depositAmount: 3, commissionFixed: 3,
  commissionPercent: 3, commissionPercentBase: 3, minTermMonths: 3, availableFrom: 3, serviceFee: 3, images: 4, contactPhone: 5, telegramUsername: 5,
};
