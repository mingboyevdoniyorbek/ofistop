import { formatMinor, totalPrice, type Basis, type Currency, type Period } from "./money";
/** Main amount is rent for the entire unit; per-seat prices remain explicitly per-seat. */
export function primaryPrice(p: Parameters<typeof priceLabel>[0], area: string | null | undefined, locale: "uz" | "ru" = "uz") {
  const total = p.amount == null ? null : totalPrice({ amountMinor: p.amount, currency: p.currency, period: p.period, basis: p.basis }, area);
  return total == null ? priceLabel(p, locale) : priceLabel({ ...p, amount: total, basis: "whole" }, locale);
}
import type { Locale } from "./i18n-core";
export const CATEGORY_UZ: Record<string, string> = {
  office: "Alohida ofis", bc_room: "Biznes markazdagi xona", coworking: "Kovorking", retail: "Savdo joyi / do'kon",
  service_room: "Xizmat ko'rsatish xonasi", warehouse: "Ombor", production: "Ishlab chiqarish joyi", building: "Butun bino", other: "Boshqa tijorat joyi",
};
export const POSTER_UZ: Record<string, string> = { owner: "Mulk egasi", business_center: "Biznes markaz vakili", agency: "Agentlik / vositachi" };
export const AVAIL_UZ: Record<string, string> = {
  available: "Bo'sh", reserved: "Band qilingan", rented: "Ijaraga berilgan", paused: "Vaqtincha yashirilgan", expired: "Muddati tugagan", archived: "Arxivlangan",
};
const PER = { month: "oy", day: "kun", hour: "soat", once: "" } as const;
const BAS = { whole: "", per_m2: " / m²", per_seat: " / ish o'rni" } as const;
// Rus tili: kategoriya/e'lon beruvchi/mavjudlik nomlari va narx so'zlari
export const CATEGORY_RU: Record<string, string> = {
  office: "Отдельный офис", bc_room: "Помещение в бизнес-центре", coworking: "Коворкинг", retail: "Торговое помещение / магазин",
  service_room: "Помещение для услуг", warehouse: "Склад", production: "Производственное помещение", building: "Здание целиком", other: "Прочее коммерческое помещение",
};
export const POSTER_RU: Record<string, string> = { owner: "Собственник", business_center: "Представитель бизнес-центра", agency: "Агентство / посредник" };
export const AVAIL_RU: Record<string, string> = { available: "Свободно", reserved: "Забронировано", rented: "Сдано", paused: "Временно скрыто", expired: "Срок истёк", archived: "В архиве" };
const W = {
  uz: { per: PER, bas: BAS, neg: "Narx kelishiladi", negSfx: " (kelishiladi)", total: "Jami" },
  ru: { per: { month: "мес", day: "день", hour: "час", once: "" }, bas: { whole: "", per_m2: " / м²", per_seat: " / раб. место" }, neg: "Цена договорная", negSfx: " (договорная)", total: "Итого" },
} as const;
/** Sotuv narxida davr yo'q ("once") — " / oy" qo'shilmaydi. */
const per = (x: string) => (x ? ` / ${x}` : "");
export const DEAL_UZ = { rent: "Ijara", sale: "Sotuv" } as const;
export const DEAL_RU = { rent: "Аренда", sale: "Продажа" } as const;
/** Mavjudlik holati: sotuvdagi "rented" — "Sotilgan". */
export function availLabel(status: string, deal: "rent" | "sale" | null | undefined, l: Locale = "uz") {
  if (deal === "sale" && status === "rented") return l === "ru" ? "Продано" : "Sotilgan";
  return (l === "ru" ? AVAIL_RU : AVAIL_UZ)[status] ?? status;
}
export const labels = (l: Locale = "uz") => (l === "ru" ? { category: CATEGORY_RU, poster: POSTER_RU, avail: AVAIL_RU } : { category: CATEGORY_UZ, poster: POSTER_UZ, avail: AVAIL_UZ });

export function priceLabel(p: { amount: bigint | null; currency: Currency; period: Period; basis: Basis; negotiable?: boolean }, l: Locale = "uz") {
  const w = W[l];
  if (p.amount === null) return w.neg;
  return `${formatMinor(p.amount)} ${p.currency}${w.bas[p.basis]}${per(w.per[p.period])}${p.negotiable ? w.negSfx : ""}`;
}
export function totalLabel(p: { amount: bigint | null; currency: Currency; period: Period; basis: Basis }, area: string | null, l: Locale = "uz") {
  if (p.amount === null || p.basis !== "per_m2") return null;
  const t = totalPrice({ amountMinor: p.amount, currency: p.currency, period: p.period, basis: p.basis }, area);
  return t === null ? null : `${W[l].total}: ${formatMinor(t)} ${p.currency}${per(W[l].per[p.period])}`;
}
export const fmtDate = (d: Date | string | null, l: Locale = "uz") => (d ? new Date(d).toLocaleDateString(l === "ru" ? "ru-RU" : "uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }) : "");

/** Narx oralig'i: faqat BIR XIL valyuta/davr/birlik ichida (aralashtirilmaydi). */
export function rangeLabel(min: bigint, max: bigint, currency: string, period: Period, basis: "whole" | "per_m2" | "per_seat", l: Locale = "uz") {
  const per = W[l].per[period];
  const bas = W[l].bas[basis];
  const a = formatMinor(min), b = formatMinor(max);
  return `${a === b ? a : `${a} – ${b}`} ${currency}${bas}${per ? ` / ${per}` : ""}`;
}

/**
 * Kartochkalar uchun qisqa narx: «18 mln so‘m/oy», «850 ming so‘m/oy», «405 $/oy», «1,2 mln $».
 * Butun joy narxi (m² narxi bo'lsa maydonga ko'paytirilgan) ko'rsatiladi; batafsil narx e'lon sahifasida.
 */
export function shortPrice(p: Parameters<typeof priceLabel>[0], area: string | null | undefined, l: Locale = "uz") {
  if (p.amount === null) return W[l].neg;
  const total = totalPrice({ amountMinor: p.amount, currency: p.currency, period: p.period, basis: p.basis }, area);
  const amount = total ?? p.amount, basis = total == null ? p.basis : "whole";
  const v = Number(amount) / 100;
  const num = (x: number, d = 1) => x.toLocaleString(l === "ru" ? "ru-RU" : "uz-UZ", { maximumFractionDigits: d }).replace(/\s/g, " ");
  const ru = l === "ru";
  const cur = p.currency === "UZS" ? (ru ? "сум" : "so‘m") : p.currency === "USD" ? "$" : p.currency;
  const big = v >= 1e9 ? `${num(v / 1e9)} ${ru ? "млрд" : "mlrd"}` : v >= 1e6 ? `${num(v / 1e6, v < 1e7 ? 2 : 1)} ${ru ? "млн" : "mln"}`
    : p.currency === "UZS" && v >= 1e4 ? `${num(v / 1e3, 0)} ${ru ? "тыс." : "ming"}` : num(v, 2);
  const unit = { whole: "", per_m2: "/m²", per_seat: ru ? "/место" : "/o‘rin" }[basis];
  const per = { month: ru ? "/мес" : "/oy", day: ru ? "/день" : "/kun", hour: ru ? "/час" : "/soat", once: "" }[p.period];
  return `${big} ${cur}${unit}${per}`;
}
