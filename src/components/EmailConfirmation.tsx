"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "./I18nProvider";
import { safeNext } from "@/lib/validation";
export default function EmailConfirmation() {
  const ru = useLocale() === "ru";
  const [token, setToken] = useState(""); const [done, setDone] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const initialized = useRef(false);
  useEffect(() => { if (initialized.current) return; initialized.current = true; setToken(new URLSearchParams(location.hash.slice(1)).get("token") ?? ""); history.replaceState(null, "", location.pathname); }, []);
  async function confirm() {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth/email/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setDone(true);
      // Same browser may finish immediately; a different browser can only approve.
      const finish = await fetch("/api/auth/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: data.id }) });
      if (finish.ok) { const next = await finish.json(); if (next.status === "complete") location.assign(safeNext(next.next, location.origin)); }
    } catch { setError(ru ? "Проверьте интернет и повторите." : "Internetni tekshirib, qayta urinib ko‘ring."); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto my-12 max-w-md rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-lg shadow-slate-200/40">
    <div className="text-3xl font-bold text-brand">Ofis<span className="text-accent">Top</span></div>
    <h1 className="mt-7 text-2xl font-bold">{done ? (ru ? "Вход подтверждён" : "Kirish tasdiqlandi") : (ru ? "Подтвердите вход" : "Kirishni tasdiqlang")}</h1>
    <p className="my-5 leading-relaxed text-slate-500">{done ? (ru ? "Вернитесь в окно, где начали вход. Оно откроется автоматически." : "Kirishni boshlagan oynaga qayting. U avtomatik davom etadi.") : (ru ? "Нажимайте кнопку, только если вы сами запросили вход в OfisTop." : "Tugmani faqat OfisTop’ga kirishni o‘zingiz so‘ragan bo‘lsangiz bosing.")}</p>
    {!done && <button disabled={busy || !token} onClick={() => void confirm()} className="w-full rounded-2xl bg-brand px-5 py-4 font-semibold text-white disabled:opacity-50">{busy ? (ru ? "Проверяем…" : "Tekshirilmoqda…") : (ru ? "Подтвердить вход" : "Kirishni tasdiqlash")}</button>}
    {!token && !done && <p className="mt-4 text-sm text-slate-500">{ru ? "Откройте ссылку из письма заново или запросите новое письмо." : "Xatdagi havolani qayta oching yoki yangi xat so‘rang."}</p>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <Link href="/kirish" className="mt-6 inline-block text-sm text-brand underline">{ru ? "Вернуться к входу" : "Kirish sahifasiga qaytish"}</Link>
  </section>;
}
