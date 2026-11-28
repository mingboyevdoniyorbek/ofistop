"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "./I18nProvider";

/** Qoralama yoki arxivdagi e'lonni tasdiq bilan butunlay o'chirish. */
export default function DeleteDraftButton({ id, archived = false, redirectTo, big = false }: { id: string; archived?: boolean; redirectTo?: string; big?: boolean }) {
  const ru = useLocale() === "ru"; const router = useRouter();
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function go() {
    if (!confirm(archived ? (ru ? "Удалить объявление из архива вместе с фотографиями? Это действие нельзя отменить." : "Arxivdagi e’lon rasmlari bilan butunlay o‘chirilsinmi? Buni qaytarib bo‘lmaydi.") : (ru ? "Удалить черновик вместе с фотографиями? Это действие нельзя отменить." : "Qoralama rasmlari bilan birga o‘chirilsinmi? Buni qaytarib bo‘lmaydi."))) return;
    setBusy(true); setErr(null);
    const r = await fetch(`/api/listings/${id}`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) { if (redirectTo) router.replace(redirectTo); router.refresh(); return; }
    const d = await r?.json().catch(() => null);
    setErr(d?.error ?? (ru ? "Не удалось удалить" : "O‘chirib bo‘lmadi")); setBusy(false);
  }
  return <span className={big ? "flex flex-col" : "inline-flex flex-col"}>
    <button type="button" onClick={go} disabled={busy} className={`border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-60 ${big ? "rounded-2xl px-4 py-3 text-sm font-medium" : "rounded px-3 py-1 text-sm"}`}>🗑 {ru ? "Удалить" : "O‘chirish"}</button>
    {err && <span role="alert" className="text-xs text-red-700">{err}</span>}
  </span>;
}
