import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Google Play tekshiruvchisi uchun kirish ("Учетные данные" deklaratsiyasi).
 * Google o'zi hisob ocha olmaydi va WebView ichida Google hisobiga kirish bloklanishi mumkin,
 * shuning uchun tekshiruv davriga oddiy login/parol yo'li ochiladi.
 *
 * Faqat ikkala muhit o'zgaruvchisi qo'yilganda ishlaydi; o'chirilsa yo'lning o'zi yo'qoladi:
 *   REVIEW_LOGIN_EMAIL=review@ofistop.uz
 *   REVIEW_LOGIN_PASSWORD=<kamida 12 belgi, tasodifiy>
 * Hisob oddiy foydalanuvchi huquqida bo'ladi — admin panelga kira olmaydi.
 */
const MIN_PASSWORD = 12;

const email = () => process.env.REVIEW_LOGIN_EMAIL?.trim().toLowerCase() || "";
const password = () => process.env.REVIEW_LOGIN_PASSWORD ?? "";

export function reviewLoginEnabled() {
  const e = email();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && password().length >= MIN_PASSWORD;
}

/** Hisob telefoni o'rnida saqlanadigan barqaror kalit (users.phone unique). */
export const reviewAccountKey = () => `review:${email()}`;

const digest = (v: string) => createHash("sha256").update(v).digest();
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

/** Email va parol mosligi (uzunlikni oshkor qilmaydigan solishtirish). */
export function reviewCredentialsMatch(inputEmail: string, inputPassword: string) {
  if (!reviewLoginEnabled()) return false;
  // Ikkala solishtirish ham doim bajariladi: javob vaqti qaysi maydon xato ekanini ko'rsatmaydi.
  const okEmail = same(inputEmail.trim().toLowerCase(), email());
  const okPassword = same(inputPassword, password());
  return okEmail && okPassword;
}
