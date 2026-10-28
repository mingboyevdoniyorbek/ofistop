"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "./I18nProvider";

/** Bitta amal tugmasi: serverga POST yuboradi. Sabab kerak bo'lsa so'raydi. Xatoni ko'rsatadi. */
export default function AdminAction({ url, body, label, askReason, confirm, tone }: { url: string; body: object; label: string; askReason?: string; confirm?: string; tone?: "danger" | "primary" }) {
  const t = useT(); const router = useRouter(); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function run() {
    let extra = {};
    if (askReason) { const r = window.prompt(askReason); if (!r || !r.trim()) return; extra = { reason: r.trim() }; }
    else if (confirm && !window.confirm(confirm)) return;
    setBusy(true); setErr(null);
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, ...extra }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (r?.ok) router.refresh(); else setErr(d?.error ?? t("err.generic"));
  }
  const cls = tone === "primary" ? "border-brand bg-brand text-white" : tone === "danger" ? "border-red-300 text-red-700" : "border-slate-300 hover:border-brand";
  return (<span className="inline-flex flex-col"><button type="button" disabled={busy} onClick={run} className={`rounded border px-2.5 py-1 text-sm disabled:opacity-60 ${cls}`}>{label}</button>{err && <span role="alert" className="text-xs text-red-700">{err}</span>}</span>);
}
