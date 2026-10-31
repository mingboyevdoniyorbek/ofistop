"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "./I18nProvider";

/** Admin: markazni o'chirish. Tasodifiy bosilmasligi uchun markaz nomini qo'lda yozish talab qilinadi. */
export default function DeleteCenterButton({ id, name, rooms }: { id: string; name: string; rooms: number }) {
  const ru = useLocale() === "ru"; const router = useRouter();
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function run() {
    const warn = ru
      ? `Удалить «${name}» навсегда?\n\nФото и представители будут удалены. Привязанные объявления (${rooms}) останутся, но без центра.\n\nДля подтверждения введите название центра:`
      : `«${name}» butunlay o‘chirilsinmi?\n\nRasmlar va vakillar biriktiruvi o‘chadi. Bog‘langan e’lonlar (${rooms} ta) qoladi, lekin markazsiz.\n\nTasdiqlash uchun markaz nomini yozing:`;
    const typed = window.prompt(warn); if (typed === null) return;
    setBusy(true); setErr(null);
    const r = await fetch(`/api/admin/centers/${id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", confirmName: typed }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (r?.ok) router.refresh(); else setErr(d?.error ?? (ru ? "Не удалось удалить" : "O‘chirib bo‘lmadi"));
  }
  return <span className="inline-flex flex-col"><button type="button" onClick={run} disabled={busy} className="rounded border border-red-300 px-2.5 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60">🗑 {ru ? "Удалить центр" : "Markazni o‘chirish"}</button>{err && <span role="alert" className="text-xs text-red-700">{err}</span>}</span>;
}
