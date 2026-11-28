"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "./I18nProvider";

type A = { label: string; body: object; confirm?: string; tone?: "danger" };
export default function ListingActions({ id, actions, big = false }: { id: string; actions: A[]; big?: boolean }) {
  const t = useT(); const router = useRouter(); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function run(a: A) {
    if (a.confirm && !window.confirm(a.confirm)) return;
    setBusy(true); setErr(null);
    const r = await fetch(`/api/listings/${id}/availability`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a.body) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (r?.ok) router.refresh(); else setErr(d?.error ?? t("err.generic"));
  }
  return (
    <div className={big ? "grid grid-cols-2 gap-2" : "flex flex-wrap items-center gap-2"}>
      {actions.map((a, i) => <button key={a.label} type="button" disabled={busy} onClick={() => run(a)} className={`border disabled:opacity-60 ${big && i === actions.length - 1 && actions.length % 2 ? "col-span-2" : ""} ${big ? "rounded-2xl px-3 py-3 text-sm font-medium" : "rounded px-2.5 py-1 text-sm"} ${a.tone === "danger" ? "border-red-300 text-red-700 hover:bg-red-50" : "border-slate-300 hover:border-brand hover:text-brand"}`}>{a.label}</button>)}
      {err && <span role="alert" className="text-sm text-red-700">{err}</span>}
    </div>
  );
}
