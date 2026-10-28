import { formatMinor, totalPrice, type Basis, type Currency, type Period } from "./money";
import type { Locale } from "./i18n-core";
export const CATEGORY_UZ: Record<string, string> = {
  office: "Alohida ofis", bc_room: "Biznes markazdagi xona", coworking: "Kovorking", retail: "Savdo joyi / do'kon",
  service_room: "Xizmat ko'rsatish xonasi", warehouse: "Ombor", production: "Ishlab chiqarish joyi", other: "Boshqa tijorat joyi",
};
export const POSTER_UZ: Record<string, string> = { owner: "Mulk egasi", business_center: "Biznes markaz vakili", agency: "Agentlik / vositachi" };
export const AVAIL_UZ: Record<string, string> = {
  available: "Bo'sh", reserved: "Band qilingan", rented: "Ijaraga berilgan", paused: "Vaqtincha yashirilgan", expired: "Muddati tugagan", archived: "Arxivlangan",
};
const PER = { month: "oy", day: "kun", hour: "soat" } as const;
const BAS = { whole: "", per_m2: " / m²", per_seat: " / ish o'rni" } as const;
// Rus tili: kategoriya/e'lon beruvchi/mavjudlik nomlari va narx so'zlari
export const CATEGORY_RU: Record<string, string> = {
  office: "Отдельный офис", bc_room: "Помещение в бизнес-центре", coworking: "Коворкинг", retail: "Торговое помещение / магазин",
  service_room: "Помещение для услуг", warehouse: "Склад", production: "Производственное помещение", other: "Прочее коммерческое помещение",
};
export const POSTER_RU: Record<string, string> = { owner: "Собственник", business_center: "Представитель бизнес-центра", agency: "Агентство / посредник" };
export const AVAIL_RU: Record<string, string> = { available: "Свободно", reserved: "Забронировано", rented: "Сдано", paused: "Временно скрыто", expired: "Срок истёк", archived: "В архиве" };
const W = {
  uz: { per: PER, bas: BAS, neg: "Narx kelishiladi", negSfx: " (kelishiladi)", total: "Jami" },
  ru: { per: { month: "мес", day: "день", hour: "час" }, bas: { whole: "", per_m2: " / м²", per_seat: " / раб. место" }, neg: "Цена договорная", negSfx: " (договорная)", total: "Итого" },
} as const;
export const labels = (l: Locale = "uz") => (l === "ru" ? { category: CATEGORY_RU, poster: POSTER_RU, avail: AVAIL_RU } : { category: CATEGORY_UZ, poster: POSTER_UZ, avail: AVAIL_UZ });

export function priceLabel(p: { amount: bigint | null; currency: Currency; period: Period; basis: Basis; negotiable?: boolean }, l: Locale = "uz") {
  const w = W[l];
  if (p.amount === null) return w.neg;
  return `${formatMinor(p.amount)} ${p.currency}${w.bas[p.basis]} / ${w.per[p.period]}${p.negotiable ? w.negSfx : ""}`;
}
export function totalLabel(p: { amount: bigint | null; currency: Currency; period: Period; basis: Basis }, area: string | null, l: Locale = "uz") {
  if (p.amount === null || p.basis !== "per_m2") return null;
  const t = totalPrice({ amountMinor: p.amount, currency: p.currency, period: p.period, basis: p.basis }, area);
  return t === null ? null : `${W[l].total}: ${formatMinor(t)} ${p.currency} / ${W[l].per[p.period]}`;
}
export const fmtDate = (d: Date | string | null, l: Locale = "uz") => (d ? new Date(d).toLocaleDateString(l === "ru" ? "ru-RU" : "uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }) : "");

/** Narx oralig'i: faqat BIR XIL valyuta/davr/birlik ichida (aralashtirilmaydi). */
export function rangeLabel(min: bigint, max: bigint, currency: string, period: "month" | "day" | "hour", basis: "whole" | "per_m2" | "per_seat", l: Locale = "uz") {
  const per = W[l].per[period];
  const bas = W[l].bas[basis];
  const a = formatMinor(min), b = formatMinor(max);
  return `${a === b ? a : `${a} – ${b}`} ${currency}${bas} / ${per}`;
}
