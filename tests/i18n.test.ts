import { describe, it, expect } from "vitest";
import { uz } from "@/messages/uz";
import { ru } from "@/messages/ru";
import { makeT } from "@/lib/i18n-core";
import { priceLabel, totalLabel, rangeLabel, labels, fmtDate } from "@/lib/format";

describe("i18n lug'atlari", () => {
  const keys = Object.keys(uz) as (keyof typeof uz)[];
  it("ru va uz kalitlari bir xil", () => { expect(Object.keys(ru).sort()).toEqual([...keys].sort()); });
  it("hech bir tarjima bo'sh emas", () => { for (const k of keys) { expect(uz[k].trim(), `uz ${k}`).not.toBe(""); expect(ru[k].trim(), `ru ${k}`).not.toBe(""); } });
  it("{param} to'plami ikkala tilda bir xil", () => {
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
    for (const k of keys) expect(ph(ru[k]), k).toBe(ph(uz[k]));
  });
  it("rus matnida kirill bor (tarjima qilinmay qolmagan)", () => {
    const same = keys.filter((k) => ru[k] === uz[k] && /[a-z]{4,}/i.test(uz[k].replace(/\{\w+\}/g, "")));
    expect(same).toEqual([]);
  });
  it("parametrlar o'rniga qo'yiladi", () => { expect(makeT("ru")("cat.results", { n: 12 })).toBe("Найдено: 12"); expect(makeT("uz")("cat.results", { n: 12 })).toBe("12 ta natija"); });
});

describe("narx va sana: rus tili", () => {
  const p = { amount: 1000n * 100n, currency: "USD" as const, period: "month" as const, basis: "per_m2" as const };
  it("o'zbekcha standart o'zgarmagan", () => { expect(priceLabel({ ...p, amount: 1000n }, "uz")).toBe(priceLabel({ ...p, amount: 1000n })); expect(priceLabel({ ...p, amount: 1000n })).toContain("/ m² / oy"); });
  it("ruscha narx, jami va kelishiladi", () => {
    expect(priceLabel({ ...p, amount: 1000n }, "ru")).toContain("/ м² / мес");
    expect(totalLabel({ ...p, amount: 1000n }, "90", "ru")).toMatch(/^Итого: .* USD \/ мес$/);
    expect(priceLabel({ ...p, amount: null }, "ru")).toBe("Цена договорная");
    expect(priceLabel({ ...p, amount: 1000n, negotiable: true }, "ru")).toContain("(договорная)");
  });
  it("oraliq va yorliqlar", () => { expect(rangeLabel(40000n, 65000n, "USD", "month", "whole", "ru")).toContain("/ мес"); expect(labels("ru").category.warehouse).toBe("Склад"); expect(fmtDate("2026-10-05", "ru")).toMatch(/05\.10\.2026/); });
});
