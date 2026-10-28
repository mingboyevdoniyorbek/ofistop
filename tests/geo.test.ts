import { describe, it, expect } from "vitest";
import { publicPoint, haversineM, APPROX_MIN_M, APPROX_MAX_M } from "@/lib/geo";

const S = "test-secret-0123456789abcdef-0123456789";
const real = { lat: "41.311081", lng: "69.240562" };
describe("taxminiy joylashuv", () => {
  it("aniq rejim: haqiqiy koordinata", () => {
    expect(publicPoint({ id: "a", ...real, exactLocationPublic: true }, S)).toEqual({ lat: 41.311081, lng: 69.240562, approx: false });
  });
  it("koordinata yo'q -> null", () => {
    expect(publicPoint({ id: "a", lat: null, lng: null, exactLocationPublic: false }, S)).toBeNull();
    expect(publicPoint({ id: "a", lat: "abc", lng: "1", exactLocationPublic: false }, S)).toBeNull();
  });
  it("taxminiy rejim: haqiqiy nuqtadan 200–500 m (300 ta turli e'lon)", () => {
    for (let i = 0; i < 300; i++) {
      const p = publicPoint({ id: `listing-${i}`, ...real, exactLocationPublic: false }, S)!;
      const d = haversineM({ lat: 41.311081, lng: 69.240562 }, p);
      expect(p.approx).toBe(true);
      expect(d).toBeGreaterThan(APPROX_MIN_M - 3); // 5 xona yaxlitlash xatosi
      expect(d).toBeLessThan(APPROX_MAX_M + 3);
      expect(p.lat).not.toBe(41.311081);
    }
  });
  it("deterministik: qayta so'ralsa bir xil (o'rtachalab topib bo'lmaydi)", () => {
    const a = publicPoint({ id: "x", ...real, exactLocationPublic: false }, S), b = publicPoint({ id: "x", ...real, exactLocationPublic: false }, S);
    expect(a).toEqual(b);
  });
  it("turli e'lon yoki kalit -> boshqa siljish", () => {
    const base = publicPoint({ id: "x", ...real, exactLocationPublic: false }, S)!;
    expect(publicPoint({ id: "y", ...real, exactLocationPublic: false }, S)).not.toEqual(base);
    expect(publicPoint({ id: "x", ...real, exactLocationPublic: false }, S + "!")).not.toEqual(base);
  });
  it("siljishlar bir tomonga to'planmaydi (har 4 chorakda bor)", () => {
    const q = new Set<string>();
    for (let i = 0; i < 100; i++) { const p = publicPoint({ id: `q${i}`, ...real, exactLocationPublic: false }, S)!; q.add(`${Math.sign(p.lat - 41.311081)}${Math.sign(p.lng - 69.240562)}`); }
    expect(q.size).toBe(4);
  });
  it("kalit yo'q bo'lsa xavfsiz xato (haqiqiy nuqtani qaytarmaydi)", () => {
    expect(() => publicPoint({ id: "x", ...real, exactLocationPublic: false }, "")).toThrow();
  });
});
