// Server va klient uchun umumiy (next/headers'siz) qism.
import { uz, type MsgKey } from "@/messages/uz";
import { ru } from "@/messages/ru";
export const LOCALES = ["uz", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DICTS: Record<Locale, Record<MsgKey, string>> = { uz, ru };
export type T = (key: MsgKey, params?: Record<string, string | number>) => string;
export const makeT = (locale: Locale): T => (key, params) => {
  const s = DICTS[locale][key] ?? uz[key] ?? key; // ru'da kalit bo'lmasa o'zbekchaga qaytadi, kalit nomini ko'rsatmaydi
  return params ? s.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? "")) : s;
};
export const isLocale = (v: unknown): v is Locale => v === "uz" || v === "ru";
