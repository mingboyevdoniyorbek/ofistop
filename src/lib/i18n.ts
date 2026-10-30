import { cookies, headers } from "next/headers";
import { isLocale, makeT, type Locale } from "./i18n-core";
export * from "./i18n-core";
/** /ru/... manzili (proxy "x-lang" sarlavhasini qo'yadi) ustun; aks holda `lang` cookie (standart: o'zbek). */
export async function getLocale(): Promise<Locale> {
  if ((await headers()).get("x-lang") === "ru") return "ru";
  const v = (await cookies()).get("lang")?.value;
  return isLocale(v) ? v : "uz";
}
/** Sahifa /ru/ manzili orqali ochilganmi (canonical uchun; cookie hisobga olinmaydi). */
export async function isRuPath() { return (await headers()).get("x-lang") === "ru"; }
export async function getT() { const locale = await getLocale(); return { locale, t: makeT(locale) }; }
