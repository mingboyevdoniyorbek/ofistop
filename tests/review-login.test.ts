import { describe, it, expect, afterEach } from "vitest";
import { reviewAccountKey, reviewCredentialsMatch, reviewLoginEnabled } from "@/lib/review-login";

const set = (email?: string, password?: string) => {
  if (email === undefined) delete process.env.REVIEW_LOGIN_EMAIL; else process.env.REVIEW_LOGIN_EMAIL = email;
  if (password === undefined) delete process.env.REVIEW_LOGIN_PASSWORD; else process.env.REVIEW_LOGIN_PASSWORD = password;
};
afterEach(() => set(undefined, undefined));

describe("Google Play tekshiruvchisi uchun kirish", () => {
  it("o'zgaruvchilar qo'yilmasa butunlay o'chiq", () => {
    expect(reviewLoginEnabled()).toBe(false);
    expect(reviewCredentialsMatch("review@ofistop.uz", "")).toBe(false);
  });
  it("qisqa parol yoki noto'g'ri email yoqmaydi", () => {
    set("review@ofistop.uz", "qisqa");
    expect(reviewLoginEnabled()).toBe(false);
    set("review", "uzun-parol-12345");
    expect(reviewLoginEnabled()).toBe(false);
  });
  it("to'g'ri juftlik o'tadi, xatosi o'tmaydi", () => {
    set("review@ofistop.uz", "uzun-parol-12345");
    expect(reviewLoginEnabled()).toBe(true);
    expect(reviewCredentialsMatch("Review@OfisTop.uz ", "uzun-parol-12345")).toBe(true); // registr va bo'sh joy muhim emas
    expect(reviewCredentialsMatch("review@ofistop.uz", "uzun-parol-1234")).toBe(false);
    expect(reviewCredentialsMatch("boshqa@ofistop.uz", "uzun-parol-12345")).toBe(false);
    expect(reviewAccountKey()).toBe("review:review@ofistop.uz");
  });
});
