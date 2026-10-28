"use client";
import { useRouter } from "next/navigation";
import { useLocale, useT } from "./I18nProvider";
export default function LangSwitch() {
  const router = useRouter(); const cur = useLocale(); const t = useT();
  const set = (l: "uz" | "ru") => { document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`; router.refresh(); };
  return (
    <span role="group" aria-label={t("lang.aria")} className="inline-flex overflow-hidden rounded border border-slate-300 text-xs">
      {(["uz", "ru"] as const).map((l) => <button key={l} type="button" lang={l} aria-pressed={cur === l} onClick={() => set(l)} className={`px-2 py-1 ${cur === l ? "bg-brand text-white" : "bg-white"}`}>{l.toUpperCase()}</button>)}
    </span>);
}
