"use client";
import { useEffect, useState } from "react";
import { useT } from "./I18nProvider";
const EVT = "ofistop-fav";
export default function FavoriteButton({ listingId, initial, loggedIn, variant = "pill" }: { listingId: string; initial: boolean; loggedIn: boolean; variant?: "pill" | "icon" }) {
  const t = useT(); const [fav, setFav] = useState(initial); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  // Bir sahifadagi bir xil e'lonning barcha tugmalari sinxron bo'ladi.
  useEffect(() => {
    const sync = (e: Event) => { const d = (e as CustomEvent<{ id: string; fav: boolean }>).detail; if (d.id === listingId) setFav(d.fav); };
    window.addEventListener(EVT, sync); return () => window.removeEventListener(EVT, sync);
  }, [listingId]);
  async function toggle(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (!loggedIn) { location.href = `/kirish?next=${encodeURIComponent(location.pathname + location.search)}`; return; }
    setBusy(true); setErr(null);
    const r = await fetch("/api/favorites", { method: fav ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId }) }).catch(() => null);
    setBusy(false);
    if (r?.ok) window.dispatchEvent(new CustomEvent(EVT, { detail: { id: listingId, fav: !fav } })); else setErr(t("fav.failed"));
  }
  if (variant === "icon") return (
    <span className="inline-flex flex-col items-end">
      <button type="button" onClick={toggle} disabled={busy} aria-pressed={fav} aria-label={fav ? t("fav.remove") : t("fav.add")} title={fav ? t("fav.remove") : t("fav.add")}
        className="grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow-sm ring-1 ring-slate-200 transition active:scale-90 disabled:opacity-60">
        <HeartIcon filled={fav} />
      </button>
      {err && <span role="alert" className="mt-1 rounded bg-white px-1 text-[11px] text-red-700">{err}</span>}
    </span>
  );
  return (
    <span className="inline-flex flex-col items-end">
      <button type="button" onClick={toggle} disabled={busy} aria-pressed={fav} aria-label={fav ? t("fav.remove") : t("fav.add")}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm bg-white/95 ${fav ? "border-red-300 text-red-700" : "border-slate-300 text-slate-700"} disabled:opacity-60`}>
        <HeartIcon filled={fav} small />{fav ? t("fav.saved") : t("fav.save")}
      </button>
      {err && <span role="alert" className="text-xs text-red-700">{err}</span>}
    </span>
  );
}
export function HeartIcon({ filled, small = false }: { filled: boolean; small?: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={`${small ? "h-4 w-4" : "h-5 w-5"} ${filled ? "fill-red-600 stroke-red-600" : "fill-none stroke-slate-700"}`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.7 3.5 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
  </svg>;
}
