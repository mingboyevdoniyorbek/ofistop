import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { tgCall } from "./telegram";
import { primaryPrice, labels } from "./format";
import { mediaUrl } from "./storage";
import { publicSiteUrl } from "./site-url";

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Yangi tasdiqlangan e'lonni Telegram kanalga joylaydi (TELEGRAM_CHANNEL_ID, masalan @ofistop_uz yoki -100…).
 * Bot kanalga admin sifatida qo'shilgan bo'lishi kerak. Xato e'lon tasdiqlanishiga ta'sir qilmaydi.
 */
export async function postListingToChannel(listingId: string) {
  const channel = process.env.TELEGRAM_CHANNEL_ID?.trim();
  if (!channel || !process.env.TELEGRAM_BOT_TOKEN) return;
  try {
    const L = s.listings;
    const [r] = await db().select({ l: L, district: s.districts.nameUz, region: s.regions.nameUz }).from(L)
      .innerJoin(s.regions, eq(s.regions.id, L.regionId)).leftJoin(s.districts, eq(s.districts.id, L.districtId)).where(eq(L.id, listingId)).limit(1);
    if (!r || r.l.isDemo) return;
    const [img] = await db().select({ k: s.listingImages.storageKey }).from(s.listingImages).where(and(eq(s.listingImages.listingId, listingId), eq(s.listingImages.isPrimary, true))).limit(1);
    const l = r.l, base = publicSiteUrl();
    const url = `${base}/joylar/${l.id}-${l.slug}`;
    const price = primaryPrice({ amount: l.priceAmountMinor, currency: l.currency, period: l.pricePeriod, basis: l.priceBasis, negotiable: l.priceNegotiable }, l.areaM2, "uz");
    const lines = [
      `🏢 <b>${esc(l.title)}</b>`,
      `💰 ${esc(price)}`,
      `📍 ${esc([r.district, r.region].filter(Boolean).join(", "))}`,
      [l.areaM2 ? `📐 ${Number(l.areaM2)} m²` : "", l.floor != null ? `${l.floor}-qavat` : ""].filter(Boolean).join(" · "),
      `🏷 ${esc(labels("uz").category[l.category])}`,
      "", `👉 <a href="${url}">Batafsil va aloqa — OfisTop</a>`,
    ].filter((x) => x !== "");
    const text = lines.join("\n").slice(0, 1000);
    const photo = mediaUrl(img?.k);
    if (photo) await tgCall("sendPhoto", { chat_id: channel, photo: /^https?:/.test(photo) ? photo : `${base}${photo}`, caption: text, parse_mode: "HTML" });
    else await tgCall("sendMessage", { chat_id: channel, text, parse_mode: "HTML", link_preview_options: { url } });
  } catch (e) {
    console.error("[telegram-channel] e'lonni kanalga joylab bo'lmadi:", (e as Error).message);
  }
}
