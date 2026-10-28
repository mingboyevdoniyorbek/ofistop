"use client";
import { useState } from "react";
import { useLocale } from "./I18nProvider";
export default function AdminLogout() {
  const ru = useLocale() === "ru";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return <span><button disabled={busy} className="underline" onClick={async () => {
    setBusy(true); setError(false);
    try { const r = await fetch("/api/auth/admin-login", { method: "DELETE" }); if (!r.ok) throw new Error(); location.href = "/admin"; }
    catch { setError(true); setBusy(false); }
  }}>{ru ? "Выйти из админки" : "Admindan chiqish"}</button>{error && <span role="alert">{ru ? " Ошибка сети" : " Tarmoq xatosi"}</span>}</span>;
}
