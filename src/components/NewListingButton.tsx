"use client";
import { useState } from "react";
import { useT, useLocale } from "./I18nProvider";
export default function NewListingButton({ loggedIn, promo = false, className, centerId, children }: { loggedIn: boolean; promo?: boolean; className?: string; centerId?: string; children?: React.ReactNode }) {
  const t = useT(); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const ru = useLocale() === "ru";
  async function go() {
    if (!loggedIn && !promo) { location.href = "/kirish?next=/kabinet"; return; }
    setBusy(true); setErr(null);
    const r = await fetch("/api/listings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(centerId ? { centerId } : {}) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (r?.status === 401) { location.href = "/kirish?next=/kabinet"; return; }
    if (r?.ok) location.href = `/kabinet/elon/${d.id}`; else { setErr(d?.error ?? t("err.generic")); setBusy(false); }
  }
  return <span className="inline-flex flex-col"><button type="button" onClick={go} disabled={busy} className={className ?? "rounded bg-accent px-3 py-1.5 font-medium text-white hover:bg-green-700 disabled:opacity-60"}>{children ?? (centerId ? (ru ? "+ Добавить помещение" : "+ Xona qo‘shish") : t("nav.newListing"))}</button>{err && <span role="alert" className="text-xs text-red-700">{err}</span>}</span>;
}
