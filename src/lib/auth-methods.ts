import { telegramEnabled } from "./telegram";
import { localTestEnabled } from "./test-mode";
import { emailEnabled } from "./email-login";
import { googleEnabled } from "./google-login";
/** Qaysi kirish usullari hozir ishlaydi (UI faqat ishlaydiganini ko'rsatadi; dekorativ tugma yo'q). */
export function authMethods() {
  return { google: googleEnabled(), email: emailEnabled(), telegram: telegramEnabled(), phone: false, guest: false, test: localTestEnabled() };
}
