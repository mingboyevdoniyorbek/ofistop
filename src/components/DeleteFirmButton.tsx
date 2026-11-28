"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "./I18nProvider";

export default function DeleteFirmButton({ id }: { id: string }) {
  const ru = useLocale() === "ru"; const router = useRouter(); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function go() {
    if (!confirm(ru ? "Удалить компанию вместе с фото? Это нельзя отменить." : "Firma rasmlari bilan butunlay o‘chirilsinmi? Buni qaytarib bo‘lmaydi.")) return;
    setBusy(true); setErr(null);
    const r = await fetch(`/api/furniture/${id}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (r?.ok) router.refresh(); else setErr(ru ? "Не удалось удалить" : "O‘chirib bo‘lmadi");
  }
  return <span className="inline-flex flex-col"><button type="button" disabled={busy} onClick={go} className="rounded-xl border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60">🗑 {ru ? "Удалить компанию" : "Firmani o‘chirish"}</button>{err && <span role="alert" className="text-xs text-red-700">{err}</span>}</span>;
}
