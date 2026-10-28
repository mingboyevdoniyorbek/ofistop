import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import http from "http";
import type { AddressInfo } from "net";
import { getSmsProvider, isDevOtp, otpText, resetEskizToken, smsConfigured, SmsNotConfigured, SmsSendError } from "@/lib/sms";

// Soxta Eskiz API: HAQIQIY Eskiz'ga so'rov yuborilmaydi.
type Req = { path: string; auth?: string; form: Record<string, string> };
const reqs: Req[] = [];
let mode: "ok" | "expire-once" | "reject-send" | "bad-login" = "ok";
let expired = false;
const srv = http.createServer((req, res) => {
  let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => {
    const form = Object.fromEntries(new URLSearchParams(b));
    reqs.push({ path: req.url!, auth: req.headers.authorization, form });
    res.setHeader("content-type", "application/json");
    if (req.url === "/api/auth/login") {
      if (mode === "bad-login") { res.statusCode = 401; return res.end('{"message":"Invalid credentials"}'); }
      return res.end(JSON.stringify({ message: "token_generated", data: { token: `tok${reqs.filter((r) => r.path === "/api/auth/login").length}` }, token_type: "bearer" }));
    }
    if (req.url === "/api/message/sms/send") {
      if (mode === "expire-once" && !expired && req.headers.authorization === "Bearer tok1") { expired = true; res.statusCode = 401; return res.end('{"message":"Expired"}'); }
      if (mode === "reject-send") { res.statusCode = 400; return res.end('{"status":"error","message":"Text not approved"}'); }
      return res.end('{"id":"abc","message":"Waiting for SMS provider","status":"waiting"}');
    }
    res.statusCode = 404; res.end("{}");
  });
});

const ENV = { ...process.env };
beforeAll(async () => { await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r)); });
afterAll(() => { srv.close(); process.env = ENV; });
beforeEach(() => {
  reqs.length = 0; mode = "ok"; expired = false; resetEskizToken();
  Object.assign(process.env, { SMS_PROVIDER: "eskiz", ESKIZ_EMAIL: "test@example.uz", ESKIZ_PASSWORD: "secret", ESKIZ_API_BASE: `http://127.0.0.1:${(srv.address() as AddressInfo).port}/api`, ESKIZ_FROM: "4546" });
  delete process.env.SMS_OTP_TEMPLATE;
});

describe("Eskiz SMS adapteri", () => {
  it("login + yuborish: to'g'ri maydonlar, raqam '+'siz, Bearer token", async () => {
    const p = getSmsProvider(); expect(p.name).toBe("eskiz");
    await p.send("+998991234567", otpText("123456"));
    expect(reqs.map((r) => r.path)).toEqual(["/api/auth/login", "/api/message/sms/send"]);
    expect(reqs[0].form).toEqual({ email: "test@example.uz", password: "secret" });
    expect(reqs[1].auth).toBe("Bearer tok1");
    expect(reqs[1].form).toEqual({ mobile_phone: "998991234567", message: "OfisIjara: tasdiqlash kodi 123456. Kodni hech kimga bermang.", from: "4546" });
  });
  it("token qayta ishlatiladi (har SMS'da login qilinmaydi)", async () => {
    const p = getSmsProvider(); await p.send("+998991234567", "a"); await p.send("+998991234567", "b");
    expect(reqs.filter((r) => r.path === "/api/auth/login")).toHaveLength(1);
  });
  it("401 (token eskirgan) -> bir marta qayta login va qayta yuborish", async () => {
    mode = "expire-once";
    await getSmsProvider().send("+998991234567", "x");
    expect(reqs.map((r) => r.path)).toEqual(["/api/auth/login", "/api/message/sms/send", "/api/auth/login", "/api/message/sms/send"]);
    expect(reqs[3].auth).toBe("Bearer tok2");
  });
  it("provayder rad etsa SmsSendError (sabab bilan), yolg'on muvaffaqiyat yo'q", async () => {
    mode = "reject-send";
    await expect(getSmsProvider().send("+998991234567", "x")).rejects.toThrow(SmsSendError);
    await expect(getSmsProvider().send("+998991234567", "x")).rejects.toThrow(/Text not approved/);
  });
  it("noto'g'ri login ma'lumotlari -> SmsSendError, xabarda telefon yo'q", async () => {
    mode = "bad-login";
    const e = await getSmsProvider().send("+998991234567", "x").catch((x) => x);
    expect(e).toBeInstanceOf(SmsSendError); expect(String(e.message)).not.toContain("991234567");
  });
  it("shablon env orqali (Eskiz'da tasdiqlangan matnga moslash uchun)", () => {
    process.env.SMS_OTP_TEMPLATE = "ofisijara.uz saytiga kirish kodi: {code}";
    expect(otpText("000111")).toBe("ofisijara.uz saytiga kirish kodi: 000111");
  });
  it("sozlamalar: provayder bor bo'lsa test OTP o'chadi; hech biri bo'lmasa xato", () => {
    process.env.DEV_OTP_ENABLED = "true";
    expect(smsConfigured()).toBe(true); expect(isDevOtp()).toBe(false);
    delete process.env.ESKIZ_PASSWORD;
    expect(smsConfigured()).toBe(false); expect(isDevOtp()).toBe(true); expect(getSmsProvider().name).toBe("dev-console");
    process.env.DEV_OTP_ENABLED = "false";
    expect(() => getSmsProvider()).toThrow(SmsNotConfigured);
  });
});
