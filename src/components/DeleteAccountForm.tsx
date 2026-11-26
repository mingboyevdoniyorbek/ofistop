"use client";
import { useState } from "react";
import { useT } from "./I18nProvider";

/**
 * Hisobni o'chirish tugmasi (Google Play talabi: ilova ichida ham, saytda ham o'chirish yo'li bo'lishi kerak).
 * Ikki qadam: tasdiq belgisi + brauzer so'rovi. Muvaffaqiyatli bo'lsa sessiya ham tugaydi.
 */
export default function DeleteAccountForm() {
  const t = useT();
  const [done, setDone] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (done) return (
    <section role="status" className="rounded-2xl border border-green-200 bg-green-50 p-4">
      <h2 className="font-semibold text-green-900">{t("del.doneH")}</h2>
      <p className="mt-1 text-sm text-green-900">{t("del.done")}</p>
      <a href="/" className="mt-3 inline-block rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">{t("del.home")}</a>
    </section>
  );

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!checked) { setErr(t("del.needConfirm")); return; }
    if (!confirm(t("del.ask"))) return;
    setBusy(true); setErr(null);
    const r = await fetch("/api/account", { method: "DELETE" }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (r?.ok) { setDone(true); return; }
    setErr(d?.error ?? t("del.fail"));
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={checked} onChange={(e) => { setChecked(e.target.checked); setErr(null); }} className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{t("del.confirm")}</span>
      </label>
      <button disabled={busy} className="mt-3 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
        {busy ? t("del.busy") : t("del.button")}
      </button>
      {err && <p role="alert" className="mt-2 text-sm font-medium text-red-800">{err}</p>}
    </form>
  );
}
