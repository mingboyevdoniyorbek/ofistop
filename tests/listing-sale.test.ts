import { describe, expect, it } from "vitest";
import { parseForm } from "@/lib/listing-input";
import { priceLabel, availLabel, totalLabel } from "@/lib/format";
import { parseFilters } from "@/lib/search";

describe("sotuv e'lonlari", () => {
  it("sotuvda narx davri 'once', ijaraga oid maydonlar tozalanadi", () => {
    const { values, errors } = parseForm({ dealType: "sale", pricePeriod: "month", priceAmount: "250000", depositAmount: "100", minTermMonths: "6",
      commissionPercentBase: "monthly_rent", landAreaSotix: "4.5", documentsReady: "1", installment: "0" });
    expect(errors).toEqual({});
    expect(values.pricePeriod).toBe("once");
    expect(values.depositAmountMinor).toBeNull();
    expect(values.minTermMonths).toBeNull();
    expect(values.commissionPercentBase).toBe("sale_price");
    expect(values.landAreaSotix).toBe("4.5");
    expect(values.documentsReady).toBe(true);
    expect(values.installment).toBe(false);
  });
  it("ijaraga qaytganda 'once' oylikka, sotuv maydonlari bo'shga o'tadi", () => {
    const { values } = parseForm({ dealType: "rent", pricePeriod: "once", landAreaSotix: "3", commissionPercentBase: "sale_price" });
    expect(values.pricePeriod).toBe("month");
    expect(values.landAreaSotix).toBeNull();
    expect(values.commissionPercentBase).toBe("monthly_rent");
  });
  it("noto'g'ri yer maydoni xato beradi", () => {
    expect(parseForm({ dealType: "sale", landAreaSotix: "-2" }).errors.landAreaSotix).toBeTruthy();
  });
  it("sotuv narxida ' / oy' yozilmaydi", () => {
    expect(priceLabel({ amount: 25000000n, currency: "USD", period: "once", basis: "whole" })).toBe("250 000 USD");
    expect(priceLabel({ amount: 120000n, currency: "USD", period: "once", basis: "per_m2" }, "ru")).toBe("1 200 USD / м²");
    expect(totalLabel({ amount: 120000n, currency: "USD", period: "once", basis: "per_m2" }, "100")).toBe("Jami: 120 000 USD");
    expect(priceLabel({ amount: 100000n, currency: "USD", period: "month", basis: "whole" })).toBe("1 000 USD / oy");
  });
  it("sotilgan holat nomi", () => {
    expect(availLabel("rented", "sale")).toBe("Sotilgan");
    expect(availLabel("rented", "rent")).toBe("Ijaraga berilgan");
  });
  it("filtr: deal=sale narx davrini 'once' qiladi", () => {
    const f = parseFilters({ deal: "sale", period: "month", priceMax: "100" });
    expect(f.deal).toBe("sale"); expect(f.period).toBe("once"); expect(f.periodFilter).toBe(false);
    expect(parseFilters({}).deal).toBeUndefined();
    expect(parseFilters({ deal: "x" }).deal).toBeUndefined();
  });
});
