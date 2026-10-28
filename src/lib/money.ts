// Pul butun son (minor-unit) sifatida saqlanadi. Float ishlatilmaydi.
export type Currency = "UZS" | "USD";
export type Period = "month" | "day" | "hour";
export type Basis = "whole" | "per_m2" | "per_seat";

export interface Price {
  amountMinor: bigint;
  currency: Currency;
  period: Period;
  basis: Basis;
}

// UZS ham, USD ham 100 ga bo'linadi (tiyin/sent) — yagona qoida soddalik uchun.
const MINOR = 100n;

/** "1250.50" yoki "1 250,5" -> minor-unit. Noto'g'ri kiritish uchun null. */
export function parseMajorToMinor(input: string): bigint | null {
  const s = input.trim().replace(/[\s\u00a0]/g, "").replace(",", ".");
  const m = /^(\d{1,15})(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const frac = (m[2] ?? "").padEnd(2, "0");
  return BigInt(m[1]) * MINOR + BigInt(frac);
}

export function formatMinor(minor: bigint, locale = "uz"): string {
  const whole = minor / MINOR;
  const frac = minor % MINOR;
  const w = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  return frac === 0n ? w : `${w}.${frac.toString().padStart(2, "0")}`;
}

/** m² narxidan jami narx. Faqat basis=per_m2 va maydon mavjud bo'lsa. Aks holda null. */
export function totalPrice(p: Price, areaM2: string | null | undefined): bigint | null {
  if (p.basis !== "per_m2") return p.basis === "whole" ? p.amountMinor : null;
  if (!areaM2) return null;
  const m = /^(\d{1,8})(?:\.(\d{1,2}))?$/.exec(areaM2);
  if (!m) return null;
  const areaHundredths = BigInt(m[1]) * 100n + BigInt((m[2] ?? "").padEnd(2, "0") || "0");
  if (areaHundredths <= 0n) return null;
  // amountMinor * area (m² * 100) / 100, yarim-yuqoriga yaxlitlash
  const num = p.amountMinor * areaHundredths;
  return (num + 50n) / 100n;
}

/** Narx bo'yicha saralash faqat bir xil valyuta+davr+birlikda mantiqiy. */
export function isComparable(a: Pick<Price, "currency" | "period" | "basis">, b: Pick<Price, "currency" | "period" | "basis">) {
  return a.currency === b.currency && a.period === b.period && a.basis === b.basis;
}

/** Foiz komissiya: qaysi bazadan hisoblanishi MAJBURIY. Natija minor-unit. */
export function percentCommission(monthlyRentMinor: bigint, percent: string, base: "monthly_rent" | "annual_rent"): bigint | null {
  const m = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(percent);
  if (!m) return null;
  const basisAmount = base === "annual_rent" ? monthlyRentMinor * 12n : monthlyRentMinor;
  const pHundredths = BigInt(m[1]) * 100n + BigInt((m[2] ?? "").padEnd(2, "0") || "0");
  return (basisAmount * pHundredths + 5000n) / 10000n;
}
