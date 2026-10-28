import { cookies } from "next/headers";
import { isLocale, makeT, type Locale } from "./i18n-core";
export * from "./i18n-core";
/** Til `lang` cookie'sida saqlanadi (standart: o'zbek). URL'lar va sitemap o'zgarmaydi. */
export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get("lang")?.value;
  return isLocale(v) ? v : "uz";
}
export async function getT() { const locale = await getLocale(); return { locale, t: makeT(locale) }; }
