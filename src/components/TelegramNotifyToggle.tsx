"use client";
import { useState } from "react";
import { useLocale } from "./I18nProvider";

/** Bildirishnomalarni Telegram'ga yuborishni yoqish/o'chirish (Telegram bilan bog'langan hisoblar uchun). */
export default function TelegramNotifyToggle({ initial, linked, bot }: { initial: boolean; linked: boolean; bot: string | null }) {
  const ru = useLocale() === "ru"; const [on, setOn] = useState(initial); const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    const r = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telegram: !on }) }).catch(() => null);
    if (r?.ok) setOn(!on); setBusy(false);
  }
  if (!linked) return <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">📱 {ru ? "Чтобы уведомления приходили на телефон, войдите через Telegram" : "Bildirishnomalar telefoningizga kelishi uchun Telegram orqali kiring"}{bot ? <> — <a href={`https://t.me/${bot}`} target="_blank" rel="noopener" className="text-brand underline">@{bot}</a></> : ""}.</p>;
  return <label className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm">
    <span>📱 {ru ? "Дублировать уведомления в Telegram" : "Bildirishnomalarni Telegram’ga ham yuborish"}</span>
    <button type="button" role="switch" aria-checked={on} disabled={busy} onClick={toggle} className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-accent" : "bg-slate-300"} disabled:opacity-60`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  </label>;
}
