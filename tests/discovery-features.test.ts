import { describe, expect, it } from "vitest";
import { parseFilters, parsePeople } from "@/lib/search";
import { nearestMetro, METRO } from "@/lib/metro";
import { shortPrice, confirmedAgo } from "@/lib/format";
import { uzDistricts } from "@/db/uz-districts";

describe("«N kishi» qidiruvi", () => {
  it("son va so'zni ajratadi, umumiy so'zlarni olib tashlaydi", () => {
    expect(parsePeople("8 kishi")).toEqual({ people: 8 });
    expect(parsePeople("Chilonzor 10 ta xodim uchun ofis")).toEqual({ people: 10, rest: "Chilonzor" });
    expect(parsePeople("офис на 12 сотрудников")).toEqual({ people: 12 });
    expect(parsePeople("2-qavat ofis").people).toBeUndefined();
    expect(parsePeople("20 m2 ofis").people).toBeUndefined();
  });
  it("maydon oralig'ini qo'yadi, lekin foydalanuvchi yozgan maydonni almashtirmaydi", () => {
    const f = parseFilters({ q: "8 kishi" });
    expect([f.people, f.areaMin, f.areaMax, f.q]).toEqual([8, "40", "56", undefined]);
    const g = parseFilters({ q: "8 kishi", areaMin: "100" });
    expect([g.areaMin, g.areaMax]).toEqual(["100", undefined]);
  });
});

describe("metro", () => {
  it("eng yaqin bekat va piyoda daqiqa", () => {
    const [name, lat, lng] = METRO.find(([n]) => n === "Yunusobod")!;
    const m = nearestMetro(lat + 0.003, lng)!; // ~330 m shimolda (keyingi bekat — 1,2 km)
    expect(m.name).toBe(name);
    expect(m.minutes).toBeGreaterThanOrEqual(4);
    expect(m.minutes).toBeLessThanOrEqual(7);
  });
  it("uzoq joyda va koordinatasiz — yo'q", () => {
    expect(nearestMetro(39.65, 66.96)).toBeNull(); // Samarqand
    expect(nearestMetro(null, null)).toBeNull();
  });
  it("filtr faqat ruxsat etilgan qiymatlarni qabul qiladi", () => {
    expect(parseFilters({ metro: "10" }).metro).toBe(10);
    expect(parseFilters({ metro: "7" }).metro).toBeUndefined();
  });
});

describe("qisqa narx va tasdiq vaqti", () => {
  it("mln/ming so'm va dollar", () => {
    expect(shortPrice({ amount: 1800000000n, currency: "UZS", period: "month", basis: "whole" }, null)).toBe("18 mln so‘m/oy");
    expect(shortPrice({ amount: 40500n, currency: "USD", period: "month", basis: "whole" }, null)).toBe("405 $/oy");
    expect(shortPrice({ amount: 1000n, currency: "USD", period: "month", basis: "per_m2" }, "45")).toBe("450 $/oy");
  });
  it("bugun / kecha / N kun oldin", () => {
    expect(confirmedAgo(new Date())).toBe("bugun");
    expect(confirmedAgo(new Date(Date.now() - 864e5 - 1000))).toBe("kecha");
    expect(confirmedAgo(new Date(Date.now() - 3 * 864e5 - 1000), "ru")).toBe("3 дн. назад");
  });
});

describe("tumanlar ro'yxati", () => {
  it("14 hudud, takrorsiz slug, koordinatalar O'zbekiston ichida", () => {
    expect(new Set(uzDistricts.map((d) => d[0])).size).toBe(14);
    expect(uzDistricts.length).toBeGreaterThan(200);
    const keys = uzDistricts.map((d) => `${d[0]}/${d[1]}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const [, , , , lat, lng] of uzDistricts) if (lat != null) { expect(lat).toBeGreaterThan(37); expect(lat).toBeLessThan(46); expect(lng!).toBeGreaterThan(55); expect(lng!).toBeLessThan(74); }
  });
});
