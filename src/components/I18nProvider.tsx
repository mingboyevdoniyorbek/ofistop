"use client";
import { createContext, useContext, useMemo } from "react";
import { makeT, type Locale, type T } from "@/lib/i18n-core";
const Ctx = createContext<{ locale: Locale; t: T }>({ locale: "uz", t: makeT("uz") });
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const v = useMemo(() => ({ locale, t: makeT(locale) }), [locale]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
export const useT = () => useContext(Ctx).t;
export const useLocale = () => useContext(Ctx).locale;
