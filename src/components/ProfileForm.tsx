"use client";
import { useState } from "react";
import { useLocale, useT } from "./I18nProvider";
import { labels } from "@/lib/format";
export default function ProfileForm({ initial }: { initial: { displayName: string; posterType: string; companyName: string; contactPhone: string; telegramUsername: string } }) {
  const t = useT(); const P = labels(useLocale()).poster;
  const [f, setF] = useState(initial); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null); const [busy, setBusy] = useState(false);
  const inp = "w-full rounded border border-slate-300 px-3 py-2";
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form className="max-w-md space-y-3" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setMsg(null);
      const r = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) }).catch(() => null); const d = await r?.json().catch(() => ({})); setBusy(false);
      setMsg(r?.ok ? { ok: true, t: t("prof.saved") } : { ok: false, t: d?.error ?? t("prof.netErr") }); }}>
      <label className="block text-sm">{t("prof.name")}<input className={inp} value={f.displayName} onChange={set("displayName")} required minLength={2} /></label>
      <label className="block text-sm">{t("prof.poster")}<select className={inp} value={f.posterType} onChange={set("posterType")}>{Object.entries(P).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <p className="text-xs text-slate-500">{t("prof.posterHint")}</p>
      <label className="block text-sm">{t("prof.company")}<input className={inp} value={f.companyName} onChange={set("companyName")} /></label>
      <label className="block text-sm">{t("prof.phone")}<input className={inp} value={f.contactPhone} onChange={set("contactPhone")} inputMode="tel" placeholder="+998 90 123 45 67" /></label>
      <label className="block text-sm">{t("prof.telegram")}<input className={inp} value={f.telegramUsername} onChange={set("telegramUsername")} placeholder="@username" /></label>
      {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-sm text-green-700" : "text-sm text-red-700"}>{msg.t}</p>}
      <button disabled={busy} className="rounded bg-brand px-5 py-2 font-medium text-white disabled:opacity-60">{t("prof.save")}</button>
    </form>
  );
}
