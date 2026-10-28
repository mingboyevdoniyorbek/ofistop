"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "./I18nProvider";

export type Field = { name: string; label: string; type?: "text" | "number" | "textarea" | "select"; options?: { value: string | number; label: string }[]; required?: boolean; placeholder?: string };
export default function AdminForm({ url, fields, submit, extra }: { url: string; fields: Field[]; submit: string; extra?: object }) {
  const t = useT(); const router = useRouter(); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const [ok, setOk] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setBusy(true); setErr(null); setOk(false);
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...extra, ...data }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (r?.ok) { setOk(true); form.reset(); router.refresh(); } else setErr(d?.error ?? t("err.generic"));
  }
  const base = "mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm";
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      {fields.map((f) => (
        <label key={f.name} className={`text-sm ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>{f.label}{f.required && " *"}
          {f.type === "textarea" ? <textarea name={f.name} required={f.required} className={base} rows={3} />
            : f.type === "select" ? <select name={f.name} required={f.required} className={base}><option value="">{t("adm.pick")}</option>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            : <input name={f.name} type={f.type ?? "text"} required={f.required} placeholder={f.placeholder} className={base} />}
        </label>
      ))}
      <div className="sm:col-span-2 flex items-center gap-3">
        <button disabled={busy} className="rounded bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{busy ? t("adm.sending") : submit}</button>
        {err && <span role="alert" className="text-sm text-red-700">{err}</span>}{ok && <span role="status" className="text-sm text-green-700">{t("adm.saved")}</span>}
      </div>
    </form>
  );
}
