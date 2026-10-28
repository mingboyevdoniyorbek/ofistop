"use client";
import { useState } from "react";
import { useT } from "./I18nProvider";
export default function FavoriteButton({ listingId, initial, loggedIn }: { listingId: string; initial: boolean; loggedIn: boolean }) {
  const t = useT(); const [fav, setFav] = useState(initial); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function toggle() {
    if (!loggedIn) { location.href = `/kirish?next=${encodeURIComponent(location.pathname + location.search)}`; return; }
    setBusy(true); setErr(null);
    const r = await fetch("/api/favorites", { method: fav ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId }) }).catch(() => null);
    setBusy(false);
    if (r?.ok) setFav(!fav); else setErr(t("fav.failed"));
  }
  return (
    <span className="inline-flex flex-col items-end">
      <button type="button" onClick={toggle} disabled={busy} aria-pressed={fav} aria-label={fav ? t("fav.remove") : t("fav.add")}
        className={`rounded-full border px-2.5 py-1 text-sm bg-white/95 ${fav ? "border-red-300 text-red-700" : "border-slate-300 text-slate-700"} disabled:opacity-60`}>
        {fav ? t("fav.saved") : t("fav.save")}
      </button>
      {err && <span role="alert" className="text-xs text-red-700">{err}</span>}
    </span>
  );
}
