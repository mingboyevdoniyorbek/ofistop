"use client";
import { useState } from "react";
import { useT } from "./I18nProvider";
export default function ContactButtons({ listingId, hasPhone, hasTelegram }: { listingId: string; hasPhone: boolean; hasTelegram: boolean }) {
  const t = useT();
  const [phone, setPhone] = useState<string | null>(null);
  const [tgUrl, setTgUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function reveal() {
    setErr(null);
    const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, kind: "phone_reveal" }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (!r?.ok) return setErr(d?.error ?? t("err.generic"));
    setPhone(d.phone);
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
  return (
    <div className="space-y-2">
      {hasPhone && (phone
        ? <a href={`tel:${phone}`} className={`${btn} block bg-accent text-white`}>{t("ctc.call", { phone })}</a>
        : <button onClick={reveal} className={`${btn} w-full bg-brand text-white`}>{t("ctc.reveal")}</button>)}
      {hasTelegram && <button onClick={tg} className={`${btn} w-full border border-brand text-brand`}>{t("ctc.tg")}</button>}
      {tgUrl && <a className="block text-brand underline" href={tgUrl} target="_blank" rel="noopener noreferrer">Telegram →</a>}
      {!hasPhone && !hasTelegram && <p className="text-sm text-slate-500">{t("ctc.none")}</p>}
      {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
    </div>
  );
}
