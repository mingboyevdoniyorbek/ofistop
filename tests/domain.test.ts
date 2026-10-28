import { describe, it, expect } from "vitest";
import { parseMajorToMinor, totalPrice, isComparable, percentCommission, formatMinor } from "@/lib/money";
import { moderationTransition, canChangeAvailability, isPubliclyVisible, needsRemoderation, canEditListing, canModerate } from "@/lib/status";
import { normalizePhoneUz, searchKey, slugify } from "@/lib/text";

describe("pul", () => {
  it("parse: butun, kasr, probel va vergul", () => {
    expect(parseMajorToMinor("10")).toBe(1000n);
    expect(parseMajorToMinor("1 250,5")).toBe(125050n);
    expect(parseMajorToMinor("0.1")).toBe(10n);
  });
  it("parse: noto'g'ri kiritish null", () => {
    for (const bad of ["", "abc", "-5", "1.234", "1e5", "1.2.3"]) expect(parseMajorToMinor(bad)).toBeNull();
  });
  it("0.1+0.2 muammosi yo'q (float ishlatilmaydi)", () => {
    expect((parseMajorToMinor("0.1")! + parseMajorToMinor("0.2")!)).toBe(parseMajorToMinor("0.3"));
  });
  it("12) 100 m² x 10 USD/m²/oy = 1 000 USD", () => {
    const p = { amountMinor: parseMajorToMinor("10")!, currency: "USD" as const, period: "month" as const, basis: "per_m2" as const };
    expect(totalPrice(p, "100")).toBe(parseMajorToMinor("1000"));
    expect(formatMinor(totalPrice(p, "100")! / 100n * 100n)).toContain("1\u00a0000");
  });
  it("kasr maydon to'g'ri yaxlitlanadi", () => {
    const p = { amountMinor: 1000n, currency: "USD" as const, period: "month" as const, basis: "per_m2" as const };
    expect(totalPrice(p, "37.5")).toBe(37500n);
  });
  it("m² narxi, maydon yo'q -> hisoblanmaydi", () => {
    const p = { amountMinor: 1000n, currency: "USD" as const, period: "month" as const, basis: "per_m2" as const };
    expect(totalPrice(p, null)).toBeNull();
    expect(totalPrice(p, "0")).toBeNull();
  });
  it("per_seat uchun jami hisoblanmaydi", () => {
    expect(totalPrice({ amountMinor: 1n, currency: "UZS", period: "month", basis: "per_seat" }, "10")).toBeNull();
  });
  it("13) turli valyuta/davr/birlik solishtirilmaydi", () => {
    const a = { currency: "USD", period: "month", basis: "whole" } as const;
    expect(isComparable(a, a)).toBe(true);
    expect(isComparable(a, { ...a, currency: "UZS" })).toBe(false);
    expect(isComparable(a, { ...a, period: "day" })).toBe(false);
    expect(isComparable(a, { ...a, basis: "per_m2" })).toBe(false);
  });
  it("foiz komissiya: baza aniq", () => {
    expect(percentCommission(100000n, "50", "monthly_rent")).toBe(50000n);
    expect(percentCommission(100000n, "10", "annual_rent")).toBe(120000n);
    expect(percentCommission(100000n, "abc", "monthly_rent")).toBeNull();
  });
});

describe("moderatsiya va mavjudlik", () => {
  it("egasi yuboradi, moderator tasdiqlaydi", () => {
    expect(moderationTransition("submit", "draft", "owner")).toEqual({ ok: true, to: "pending" });
    expect(moderationTransition("approve", "pending", "moderator")).toEqual({ ok: true, to: "approved" });
  });
  it("egasi o'zini tasdiqlay olmaydi", () => {
    expect(moderationTransition("approve", "pending", "owner").ok).toBe(false);
  });
  it("rad etish sababsiz mumkin emas", () => {
    expect(moderationTransition("reject", "pending", "moderator").ok).toBe(false);
    expect(moderationTransition("reject", "pending", "moderator", " ").ok).toBe(false);
    expect(moderationTransition("reject", "pending", "moderator", "Rasm sifatsiz").ok).toBe(true);
  });
  it("draft'ni to'g'ridan-to'g'ri tasdiqlab bo'lmaydi", () => {
    expect(moderationTransition("approve", "draft", "moderator").ok).toBe(false);
  });
  it("mavjudlik o'tishlari", () => {
    expect(canChangeAvailability("available", "rented")).toBe(true);
    expect(canChangeAvailability("archived", "available")).toBe(false);
    expect(canChangeAvailability("expired", "available")).toBe(true);
  });
  it("10) ijaraga berilgan va muddati tugagan ommaviy qidiruvda yo'q", () => {
    const future = new Date(Date.now() + 864e5), past = new Date(Date.now() - 864e5);
    const base = { moderationStatus: "approved", availabilityStatus: "available", expiresAt: future } as const;
    expect(isPubliclyVisible(base)).toBe(true);
    expect(isPubliclyVisible({ ...base, availabilityStatus: "rented" })).toBe(false);
    expect(isPubliclyVisible({ ...base, expiresAt: past })).toBe(false);
    expect(isPubliclyVisible({ ...base, moderationStatus: "pending" })).toBe(false);
    expect(isPubliclyVisible({ ...base, expiresAt: null })).toBe(false);
  });
  it("narx va aloqa ma’lumotlari o‘zgarsa qayta moderatsiya", () => {
    expect(needsRemoderation(["priceAmountMinor"])).toBe(true);
    expect(needsRemoderation(["images"])).toBe(true);
    expect(needsRemoderation(["contactPhone"])).toBe(true);
  });
  it("9) begona foydalanuvchi tahrirlay olmaydi (IDOR)", () => {
    const l = { ownerId: "u1" };
    expect(canEditListing({ id: "u2", role: "user" }, l)).toBe(false);
    expect(canEditListing({ id: "u1", role: "user" }, l)).toBe(true);
    expect(canEditListing({ id: "u3", role: "user" }, l, ["c1"], "c1")).toBe(true);
    expect(canEditListing({ id: "u3", role: "user" }, l, ["c2"], "c1")).toBe(false);
    expect(canModerate("user")).toBe(false);
  });
});

describe("matn", () => {
  it("apostrof variantlari qidiruvni buzmaydi", () => {
    const variants = ["o'zbek", "oʻzbek", "o‘zbek", "o’zbek", "o`zbek", "ozbek"];
    const keys = new Set(variants.map(searchKey));
    expect(keys.size).toBe(1);
  });
  it("telefon normalizatsiyasi", () => {
    expect(normalizePhoneUz("+998 90 123-45-67")).toBe("+998901234567");
    expect(normalizePhoneUz("90 123 45 67")).toBe("+998901234567");
    expect(normalizePhoneUz("12345")).toBeNull();
    expect(normalizePhoneUz("+7 900 123 45 67")).toBeNull();
  });
  it("slug", () => {
    expect(slugify("Chilonzor, 35 m² ofis!")).toBe("chilonzor-35-m2-ofis");
    expect(slugify("O‘zbekiston ko‘chasi")).toBe("ozbekiston-kochasi");
  });
});

import { parseForm, submitErrors, toForm, normalizeTelegram } from "@/lib/listing-input";
import { effectiveAvailability } from "@/lib/status";

describe("e'lon formasi", () => {
  const base = { category: "office" as const, title: "Yorug' ofis Yunusobodda", description: "Keng va yorug' ofis, metro yaqinida.", regionId: 1, address: "Test 5", areaM2: "45", priceAmount: "10", currency: "USD" as const, pricePeriod: "month" as const, priceBasis: "per_m2" as const, contactPhone: "901234567" };
  it("narx minor-unit'ga float'siz o'tadi", () => { expect(parseForm({ priceAmount: "1 250,5" }).values.priceAmountMinor).toBe(125050n); expect(parseForm({ priceAmount: "0.1" }).values.priceAmountMinor).toBe(10n); });
  it("noto'g'ri qiymatlar xato beradi", () => {
    const e = parseForm({ priceAmount: "abc", areaM2: "-1", floor: "x", lat: "91", contactPhone: "123", telegramUsername: "ab", availableFrom: "2026-13-45" }).errors;
    for (const k of ["priceAmount", "areaM2", "floor", "lat", "contactPhone", "telegramUsername"]) expect(e[k], k).toBeTruthy();
  });
  it("bo'sh satr maydonni tozalaydi, berilmagan maydonga tegmaydi", () => { const r = parseForm({ floor: "" }); expect(r.values.floor).toBeNull(); expect("title" in r.values).toBe(false); });
  it("telefon +998 ga normallashadi, telegram @ va t.me olib tashlanadi", () => { expect(parseForm({ contactPhone: "90 123 45 67" }).values.contactPhone).toBe("+998901234567"); expect(normalizeTelegram("https://t.me/abc_def")).toBe("abc_def"); expect(normalizeTelegram("@abcde")).toBe("abcde"); });
  it("komissiya turi o'zgarsa ortiqcha maydonlar tozalanadi", () => { const v = parseForm({ commissionType: "none" }).values; expect(v.commissionPercent).toBeNull(); expect(v.commissionFixedMinor).toBeNull(); });
  it("yuborish: to'liq e'lon xatosiz, rasmsiz xato", () => { expect(submitErrors(base, 1)).toEqual({}); expect(submitErrors(base, 0).images).toBeTruthy(); });
  it("yuborish: majburiy maydonlar", () => { const e = submitErrors({ category: "office" }, 0); for (const k of ["title", "description", "address", "areaM2", "priceAmount", "contactPhone", "images"]) expect(e[k], k).toBeTruthy(); });
  it("narx kelishiladi bo'lsa summa shart emas", () => { expect(submitErrors({ ...base, priceAmount: "", priceNegotiable: true }, 1).priceAmount).toBeUndefined(); });
  it("kovorking ish o'rinlarini talab qiladi; boshqa tur 'ish o'rni' narxini olmaydi", () => {
    expect(submitErrors({ ...base, category: "coworking" }, 1).seats).toBeTruthy();
    expect(submitErrors({ ...base, priceBasis: "per_seat", seats: "5" }, 1).priceBasis).toBeTruthy();
    expect(submitErrors({ ...base, category: "coworking", priceBasis: "per_seat", seats: "5" }, 1).priceBasis).toBeUndefined();
  });
  it("foiz komissiya bazasiz bo'lmaydi; qat'iy komissiya summasiz bo'lmaydi", () => {
    expect(submitErrors({ ...base, commissionType: "percent", commissionPercent: "50" }, 1).commissionPercentBase).toBeTruthy(); // baza aniq tanlanmasa rad
    expect(submitErrors({ ...base, commissionType: "percent", commissionPercent: "50", commissionPercentBase: "monthly_rent" }, 1)).toEqual({});
    expect(submitErrors({ ...base, commissionType: "percent" }, 1).commissionPercent).toBeTruthy();
    expect(submitErrors({ ...base, commissionType: "fixed" }, 1).commissionFixed).toBeTruthy();
  });
  it("DB qatori -> forma -> DB qiymatlari aylanishi pulni buzmaydi", () => {
    const row = { category: "office", posterType: "owner", title: "t", description: "", centerId: null, unitCode: null, unitCodePublic: false, regionId: 1, districtId: null, address: "", lat: "41.365000", lng: null, exactLocationPublic: false, areaM2: "45.50", floor: null, totalFloors: null, seats: null, roomsCount: null, furnished: null, priceAmountMinor: 125050n, currency: "USD", pricePeriod: "month", priceBasis: "whole", priceNegotiable: false, depositAmountMinor: null, depositCurrency: null, commissionType: "none", commissionFixedMinor: null, commissionCurrency: null, commissionPercent: null, commissionPercentBase: null, utilities: null, serviceFeeMinor: null, serviceFeeCurrency: null, minTermMonths: null, availableFrom: null, amenities: [], contactPhone: null, telegramUsername: null } as unknown as Parameters<typeof toForm>[0];
    const f = toForm(row); expect(f.priceAmount).toBe("1250.5"); expect(f.areaM2).toBe("45.5"); expect(f.lat).toBe("41.365");
    expect(parseForm({ priceAmount: f.priceAmount }).values.priceAmountMinor).toBe(125050n);
  });
});

describe("holatlar: yangi qoidalar", () => {
  it("tasdiqlangan e'lon tahrirlansa pending'ga qaytadi (faqat egasi)", () => {
    expect(moderationTransition("edit", "approved", "owner")).toEqual({ ok: true, to: "pending" });
    expect(moderationTransition("edit", "approved", "moderator").ok).toBe(false);
    expect(moderationTransition("edit", "draft", "owner").ok).toBe(false);
  });
  it("muddati o'tgan 'available' amalda 'expired'", () => {
    const now = new Date("2026-10-21T00:00:00Z");
    expect(effectiveAvailability({ availabilityStatus: "available", expiresAt: new Date("2026-10-20T00:00:00Z") }, now)).toBe("expired");
    expect(effectiveAvailability({ availabilityStatus: "available", expiresAt: new Date("2026-10-22T00:00:00Z") }, now)).toBe("available");
    expect(effectiveAvailability({ availabilityStatus: "rented", expiresAt: new Date("2026-10-20T00:00:00Z") }, now)).toBe("rented");
  });
});
