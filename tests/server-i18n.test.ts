import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { SERVER_MSGS } from "@/messages/server";
import { trServer, localizeBody } from "@/lib/server-i18n";
import { parseForm, submitErrors, type Form } from "@/lib/listing-input";

const CYR = /[а-яё]/i;
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : []; });
const SERVER_SRC = [...files("src/app/api"), ...files("src/lib")].map((p) => ({ p, s: readFileSync(p, "utf8") }));
const grab = (re: RegExp) => SERVER_SRC.flatMap(({ p, s }) => [...s.matchAll(re)].map((m) => ({ p, msg: m[1] })));

describe("server lug'ati", () => {
  it("har bir yozuvda ruscha tarjima va bir xil {param}lar", () => {
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
    for (const [uz, ru] of SERVER_MSGS) { expect(CYR.test(ru), uz).toBe(true); expect(ph(ru), uz).toBe(ph(uz)); }
  });
  it("o'zbekcha manba takrorlanmaydi", () => {
    const seen = new Set<string>(); const dup = SERVER_MSGS.map(([u]) => u).filter((u) => (seen.has(u) ? true : (seen.add(u), false)));
    expect(dup).toEqual([]);
  });
  it("uz tilida matn o'zgarmaydi, noma'lum (foydalanuvchi) matn o'zgarmaydi", () => {
    expect(trServer("Kod noto'g'ri", "uz")).toBe("Kod noto'g'ri");
    expect(trServer("Rasmlar sifatsiz, qayta yuklang", "ru")).toBe("Rasmlar sifatsiz, qayta yuklang");
  });
  it("shablon va parametr tarjimasi", () => {
    expect(trServer("Ko'pi bilan 15 ta rasm (hozir 14 ta)", "ru")).toBe("Не более 15 фото (сейчас 14)");
    expect(trServer("Qavat: -3 dan 200 gacha butun son kiriting", "ru")).toBe("Этаж: введите целое число от -3 до 200");
    expect(trServer('"Yunusobod ofisi" qidiruvdan chiqarildi. Qayta faollashtirish uchun mavjudligini tasdiqlang.', "ru")).toBe("«Yunusobod ofisi» убрано из поиска. Чтобы снова активировать, подтвердите доступность.");
  });
  it("javob tanasi: error, errors, warnings, results", () => {
    const b = localizeBody({ error: "Maydonlarda xato bor", errors: { areaM2: "Maydonni kiriting" }, warnings: ["Sizda shu manzil va maydonli boshqa e'lon bor. Bir joyni takror e'lon qilmang."], results: [{ name: "a.jpg", ok: false, error: "Fayl rasm emas yoki buzilgan" }], ok: false }, "ru") as Record<string, unknown>;
    expect(b.error).toBe("В полях есть ошибки");
    expect((b.errors as Record<string, string>).areaM2).toBe("Укажите площадь");
    expect(CYR.test((b.warnings as string[])[0])).toBe(true);
    expect((b.results as { error: string }[])[0].error).toBe("Файл не является изображением или повреждён");
    expect(localizeBody({ error: "Kod noto'g'ri" }, "uz")).toEqual({ error: "Kod noto'g'ri" });
  });
});

describe("koddagi har bir o'zbekcha xato matni lug'atda bor", () => {
  const untranslated = (list: { p: string; msg: string }[]) => list.filter(({ msg }) => trServer(msg, "ru") === msg).map(({ p, msg }) => `${p}: ${msg}`);
  it("HttpError(..., \"...\")", () => { const l = grab(/HttpError\(\d+,\s*"([^"]+)"/g); expect(l.length).toBeGreaterThan(40); expect(untranslated(l)).toEqual([]); });
  it("{ error: \"...\" } javoblari", () => { const l = grab(/error:\s*"([^"]+)"/g); expect(l.length).toBeGreaterThan(15); expect(untranslated(l)).toEqual([]); });
  it("ImageError, warnings, notify", () => {
    const l = [...grab(/ImageError\([`"]([^`"]+)[`"]\)/g), ...grab(/warnings\.push\("([^"]+)"\)/g), ...grab(/notify\([^,]+,\s*"([^"]+)"/g), ...grab(/\? "(E'loningiz [^"]+)" : "([^"]+)"/g)];
    expect(l.length).toBeGreaterThan(5); expect(untranslated(l)).toEqual([]);
  });
  it("forma validatsiyasi (parseForm, submitErrors) xabarlari", () => {
    const bad: Form = { floor: "x", totalFloors: "0", seats: "-1", roomsCount: "abc", minTermMonths: "999", areaM2: "-5", lat: "100", lng: "200", priceAmount: "-1", depositAmount: "abc", commissionFixed: "0", serviceFee: "x", commissionPercent: "150", availableFrom: "2026-13", contactPhone: "123", telegramUsername: "a" };
    const msgs = Object.values(parseForm(bad).errors);
    expect(msgs.length).toBe(16);
    msgs.push(...Object.values(submitErrors({ category: "coworking", priceBasis: "per_seat", commissionType: "percent", commissionPercent: "", depositAmount: "100" }, 0)));
    msgs.push(...Object.values(submitErrors({ commissionType: "fixed", commissionFixed: "" }, 0)));
    const left = msgs.filter((m) => !CYR.test(trServer(m, "ru")));
    expect(left).toEqual([]);
  });
});
