"use client";
import { useState } from "react";
import { useT } from "./I18nProvider";
import FormSelect from "./FormSelect";

const REASONS = ["already_rented", "wrong_price", "false_info", "duplicate", "fraud_suspected", "other"] as const;
export default function ReportButton({ listingId, loggedIn }: { listingId: string; loggedIn: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (!f.reason) { setMsg({ ok: false, t: t("rep.choose") }); return; } // ro'yxat endi yashirin input orqali — majburiylik shu yerda
    setBusy(true); setMsg(null);
    const r = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, reason: f.reason, comment: f.comment || undefined }) }).catch(() => null);
    const d = await r?.json().catch(() => ({})); setBusy(false);
    if (r?.ok) { setMsg({ ok: true, t: t("rep.ok") }); setOpen(false); }
    else setMsg({ ok: false, t: d?.error ?? t("rep.fail") });
  }
  if (!loggedIn) return <a className="text-sm text-slate-600 underline" href={`/kirish?next=${encodeURIComponent(`/joylar/${listingId}`)}`}>{t("rep.loginNeeded")}</a>;
  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="text-sm text-slate-600 underline">{t("rep.open")}</button>
      {open && (
        <form onSubmit={submit} className="mt-2 space-y-2 rounded border border-slate-200 p-3 text-sm">
          <label className="block">{t("rep.reason")}<FormSelect name="reason" required className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"><option value="">{t("rep.choose")}</option>{REASONS.map((v) => <option key={v} value={v}>{t(`rep.r.${v}` as const)}</option>)}</FormSelect></label>
          <label className="block">{t("rep.comment")}<textarea name="comment" maxLength={1000} rows={3} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5" /></label>
          <button disabled={busy} className="rounded bg-brand px-3 py-1.5 text-white disabled:opacity-60">{busy ? t("rep.sending") : t("rep.send")}</button>
        </form>
      )}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-1 text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.t}</p>}
    </div>
  );
}
