import { telegramEnabled } from "./telegram";
import { isDevOtp, smsConfigured } from "./sms";
import { localTestEnabled } from "./test-mode";
import { promoEnabled } from "./launch-mode";
/** Qaysi kirish usullari hozir ishlaydi (UI faqat ishlaydiganini ko'rsatadi; dekorativ tugma yo'q). */
export function authMethods() {
  if (promoEnabled()) return { telegram: false, phone: false, test: false, guest: true };
  return { telegram: process.env.APP_MODE !== "test" && telegramEnabled(), phone: smsConfigured() || isDevOtp(), test: localTestEnabled() };
}
