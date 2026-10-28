"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "./I18nProvider";

type A = { label: string; body: object; confirm?: string; tone?: "danger" };
export default function ListingActions({ id, actions }: { id: string; actions: A[] }) {
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
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => <button key={a.label} type="button" disabled={busy} onClick={() => run(a)} className={`rounded border px-2.5 py-1 text-sm disabled:opacity-60 ${a.tone === "danger" ? "border-red-300 text-red-700" : "border-slate-300 hover:border-brand"}`}>{a.label}</button>)}
      {err && <span role="alert" className="text-sm text-red-700">{err}</span>}
    </div>
  );
}
