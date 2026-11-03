"use client";
import { useState } from "react";
import { useT } from "./I18nProvider";
/** variant="bar" — telefonda pastda doim turadigan panel: bitta bosishda qo'ng'iroq yoki Telegram. */
export default function ContactButtons({ listingId, hasPhone, hasTelegram, variant = "stack" }: { listingId: string; hasPhone: boolean; hasTelegram: boolean; variant?: "stack" | "bar" }) {
  const t = useT();
  const [phone, setPhone] = useState<string | null>(null);
  const [tgUrl, setTgUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function reveal(call = false) {
    setErr(null);
    const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, kind: "phone_reveal" }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (!r?.ok) return setErr(d?.error ?? t("err.generic"));
    setPhone(d.phone);
    if (call && d.phone) window.location.href = `tel:${d.phone}`; // panel tugmasi: raqam ochilishi bilan qo'ng'iroq
  }
  async function tg() {
    setErr(null);
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, kind: "telegram_click" }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (!r?.ok || !d.telegram) { popup?.close(); return setErr(d?.error ?? t("err.generic")); }
    const url = `https://t.me/${encodeURIComponent(d.telegram)}`; setTgUrl(url); if (popup) popup.location.href = url; else window.location.assign(url);
  }
  const btn = "rounded px-4 py-2.5 font-medium text-center";
  if (variant === "bar") {
    if (!hasPhone && !hasTelegram) return null;
    const b = "flex min-h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 text-base font-semibold";
    return (
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        {err && <p role="alert" className="mb-1 text-center text-sm text-red-700">{err}</p>}
        <div className="flex gap-2">
          {hasPhone && (phone
            ? <a href={`tel:${phone}`} className={`${b} bg-accent text-white`}><span aria-hidden="true">📞</span>{phone}</a>
            : <button type="button" onClick={() => reveal(true)} className={`${b} bg-accent text-white`}><span aria-hidden="true">📞</span>{t("ctc.callShort")}</button>)}
          {hasTelegram && <button type="button" onClick={tg} className={`${b} ${hasPhone ? "border-2 border-brand text-brand" : "bg-brand text-white"}`}><span aria-hidden="true">✈️</span>Telegram</button>}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {hasPhone && (phone
        ? <a href={`tel:${phone}`} className={`${btn} block bg-accent text-white`}>{t("ctc.call", { phone })}</a>
        : <button onClick={() => reveal()} className={`${btn} w-full bg-brand text-white`}>{t("ctc.reveal")}</button>)}
      {hasTelegram && <button onClick={tg} className={`${btn} w-full border border-brand text-brand`}>{t("ctc.tg")}</button>}
      {tgUrl && <a className="block text-brand underline" href={tgUrl} target="_blank" rel="noopener noreferrer">Telegram →</a>}
      {!hasPhone && !hasTelegram && <p className="text-sm text-slate-500">{t("ctc.none")}</p>}
      {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
    </div>
  );
}
