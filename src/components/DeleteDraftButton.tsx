"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "./I18nProvider";

/** Qoralamani tasdiq bilan o'chirish. */
export default function DeleteDraftButton({ id }: { id: string }) {
  const ru = useLocale() === "ru"; const router = useRouter();
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function go() {
    if (!confirm(ru ? "Удалить черновик вместе с фотографиями? Это действие нельзя отменить." : "Qoralama rasmlari bilan birga o‘chirilsinmi? Buni qaytarib bo‘lmaydi.")) return;
    setBusy(true); setErr(null);
    const r = await fetch(`/api/listings/${id}`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) { router.refresh(); return; }
    const d = await r?.json().catch(() => null);
    setErr(d?.error ?? (ru ? "Не удалось удалить" : "O‘chirib bo‘lmadi")); setBusy(false);
  }
  return <span className="inline-flex flex-col">
    <button type="button" onClick={go} disabled={busy} className="rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60">🗑 {ru ? "Удалить" : "O‘chirish"}</button>
    {err && <span role="alert" className="text-xs text-red-700">{err}</span>}
  </span>;
}
