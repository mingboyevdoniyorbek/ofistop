"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "./I18nProvider";
export function SaveSearch({ query }: { query: string }) {
  const ru = useLocale() === "ru", [open, setOpen] = useState(false), [name, setName] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  return <div><button className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm" onClick={() => setOpen(!open)}>☆ {ru ? "Сохранить поиск" : "Qidiruvni saqlash"}</button>{open && <form className="mt-2 flex flex-wrap gap-2 rounded-2xl bg-slate-50 p-3" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setMessage("");
    try { const r = await fetch("/api/saved-searches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, query }) });
      if (r.status === 401) { location.assign(`/kirish?next=${encodeURIComponent(location.pathname + location.search)}`); return; }
      const data = await r.json(); setMessage(r.ok ? (ru ? "Сохранено. Новые совпадения появятся в уведомлениях." : "Saqlandi. Yangi mos e’lonlar bildirishnomalarda chiqadi.") : data.error);
    } catch { setMessage(ru ? "Нет соединения" : "Aloqa uzildi"); } finally { setBusy(false); }
  }}><input className="min-w-0 flex-1 rounded-xl border p-2 text-sm" required maxLength={80} aria-label={ru ? "Название поиска" : "Qidiruv nomi"} placeholder={ru ? "Например: офис у метро" : "Masalan: metro yonida ofis"} value={name} onChange={e => setName(e.target.value)}/><button disabled={busy} className="rounded-xl bg-brand px-4 py-2 text-sm text-white">{ru ? "Сохранить" : "Saqlash"}</button><p className="w-full text-sm" role="status">{message}</p></form>}</div>;
}
export function DeleteSearch({ id }: { id: string }) {
  const router = useRouter(), ru = useLocale() === "ru", [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <><button disabled={busy} className="text-sm text-red-700 underline" onClick={async () => { setBusy(true); setError(""); try { const r = await fetch(`/api/saved-searches?id=${id}`, { method: "DELETE" }); if (!r.ok) throw new Error(); router.refresh(); } catch { setError(ru ? "Не удалось удалить" : "O‘chirib bo‘lmadi"); } finally { setBusy(false); } }}>{ru ? "Удалить" : "O‘chirish"}</button>{error && <p role="alert">{error}</p>}</>;
}
export function SearchUpdates() {
  useEffect(() => { const check = () => { if (document.visibilityState === "visible") void fetch("/api/saved-searches/check", { method: "POST" }).catch(() => {}); }; check(); const timer = setInterval(check, 180000); return () => clearInterval(timer); }, []);
  return null;
}
