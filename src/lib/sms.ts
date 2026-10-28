// Provayderdan mustaqil SMS adapteri. Hozir ulangan haqiqiy provayder: Eskiz.uz (SMS_PROVIDER=eskiz).
// Haqiqiy provayder sozlangan bo'lsa, development'da ham haqiqiy SMS yuboriladi; test OTP faqat provayder YO'Q bo'lganda.
import { promoEnabled } from "./launch-mode";
export interface SmsProvider { name: string; send(phone: string, text: string): Promise<void>; }
export class SmsNotConfigured extends Error {}
/** Provayder SMS'ni qabul qilmadi (balans, shablon tasdiqlanmagan, test hisob, tarmoq). Xabar logga, foydalanuvchiga umumiy matn. */
export class SmsSendError extends Error {}

export function isDevOtp() {
  return !promoEnabled() && process.env.NODE_ENV !== "production" && (process.env.APP_MODE === "test" || (process.env.DEV_OTP_ENABLED === "true" && !smsConfigured()));
}

export function smsConfigured() {
  return !promoEnabled() && process.env.APP_MODE !== "test" && process.env.SMS_PROVIDER === "eskiz" && !!process.env.ESKIZ_EMAIL && !!process.env.ESKIZ_PASSWORD;
}

/** OTP matni. Eskiz'da SHU matn shabloni moderatsiyadan o'tgan bo'lishi shart ({code} o'rniga raqam qo'yiladi). */
export function otpText(code: string) {
  const tpl = process.env.SMS_OTP_TEMPLATE || "OfisTop: tasdiqlash kodi {code}. Kodni hech kimga bermang.";
  return tpl.replace("{code}", code);
}

// --- Eskiz.uz (https://notify.eskiz.uz, hujjat: documenter.getpostman.com/view/663428/RzfmES4z)
// Token ~30 kun yashaydi: xotirada saqlanadi, 401 bo'lsa bir marta qayta login qilinadi.
let tokenCache: { token: string; until: number } | null = null;
let loginInFlight: Promise<string> | null = null;
const eskizBase = () => (process.env.ESKIZ_API_BASE || "https://notify.eskiz.uz/api").replace(/\/$/, ""); // ESKIZ_API_BASE faqat testlar uchun

async function eskizLogin(): Promise<string> {
  const r = await fetch(`${eskizBase()}/auth/login`, {
    method: "POST", body: new URLSearchParams({ email: process.env.ESKIZ_EMAIL!, password: process.env.ESKIZ_PASSWORD! }),
    signal: AbortSignal.timeout(10_000),
  }).catch((e) => { throw new SmsSendError(`Eskiz login: tarmoq xatosi (${e instanceof Error ? e.name : "?"})`); });
  const d = await r.json().catch(() => null) as { data?: { token?: string }; message?: string } | null;
  const token = d?.data?.token;
  if (!r.ok || !token) throw new SmsSendError(`Eskiz login rad etildi: HTTP ${r.status} ${String(d?.message ?? "").slice(0, 120)}`);
  tokenCache = { token, until: Date.now() + 25 * 864e5 };
  return token;
}
async function eskizToken(force = false) {
  if (!force && tokenCache && tokenCache.until > Date.now()) return tokenCache.token;
  loginInFlight ??= eskizLogin().finally(() => { loginInFlight = null; });
  return loginInFlight;
}
/** Faqat testlar uchun. */
export function resetEskizToken() { tokenCache = null; loginInFlight = null; }

const eskiz: SmsProvider = {
  name: "eskiz",
  async send(phone, text) {
    const body = new URLSearchParams({ mobile_phone: phone.replace(/^\+/, ""), message: text, from: process.env.ESKIZ_FROM || "4546" });
    if (process.env.ESKIZ_CALLBACK_URL) body.set("callback_url", process.env.ESKIZ_CALLBACK_URL);
    const call = async (token: string) => fetch(`${eskizBase()}/message/sms/send`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body, signal: AbortSignal.timeout(10_000),
    }).catch((e) => { throw new SmsSendError(`Eskiz send: tarmoq xatosi (${e instanceof Error ? e.name : "?"})`); });
    let r = await call(await eskizToken());
    if (r.status === 401) r = await call(await eskizToken(true)); // token eskirgan
    const d = await r.json().catch(() => null) as { status?: string; message?: string; id?: string } | null;
    // Muvaffaqiyat: HTTP 2xx va status "waiting"/"success" (yetkazish holati keyin callback orqali keladi).
    if (!r.ok || d?.status === "error" || d?.status === "fail")
      throw new SmsSendError(`Eskiz SMS rad etildi: HTTP ${r.status} ${String(d?.message ?? "").slice(0, 160)}`); // telefon raqami logga yozilmaydi
  },
};

export function getSmsProvider(): SmsProvider {
  if (smsConfigured()) return eskiz;
  if (isDevOtp()) {
    // Haqiqiy SMS YUBORILMAYDI. Kod faqat server konsolida va UI'dagi "TEST REJIMI" blokida.
    return { name: "dev-console", async send(phone, text) { console.log(`[DEV-OTP] SMS yuborilmadi (test rejimi) -> ${phone.slice(0, 7)}***: ${text}`); } };
  }
  throw new SmsNotConfigured("SMS provayder sozlanmagan");
}
