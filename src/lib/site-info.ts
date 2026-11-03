/**
 * Sayt egasining ommaviy aloqa ma'lumotlari. Server muhit o'zgaruvchilaridan olinadi;
 * bo'sh qolgan maydon saytda ko'rsatilmaydi (soxta ma'lumot chiqmaydi).
 */
export function siteInfo() {
  const v = (k: string) => process.env[k]?.trim() || null;
  const tg = v("SITE_TELEGRAM")?.replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "") ?? null;
  const ig = v("SITE_INSTAGRAM")?.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "") ?? null;
  return {
    company: v("SITE_COMPANY"),          // masalan: "OfisTop" MChJ yoki YaTT F.I.Sh.
    inn: v("SITE_INN"),
    phone: v("SITE_PHONE"),              // +998 90 123 45 67
    email: v("SITE_EMAIL"),
    telegram: tg,                        // username, @ siz
    telegramChannel: v("SITE_TELEGRAM_CHANNEL")?.replace(/^@/, "") ?? null,
    instagram: ig,
    address: v("SITE_ADDRESS"),
  };
}
export type SiteInfo = ReturnType<typeof siteInfo>;
/**
 * Ko'rishlar soni e'lon beruvchilarga ko'rsatiladimi. Sayt endi o'smoqda: kichik raqamlar e'lon beruvchini
 * ranjitmasligi uchun sukut bo'yicha yashirin (admin panelda doim ko'rinadi). Auditoriya ko'paygach SHOW_VIEW_COUNTS=true.
 */
export const showViewCounts = () => process.env.SHOW_VIEW_COUNTS === "true";
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
