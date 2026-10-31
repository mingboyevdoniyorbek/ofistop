"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "./I18nProvider";

type Item = { id: string; title: string; body: string | null; href: string | null; at: string; read: boolean };

/**
 * Bildirishnomalar qo'ng'iroqchasi (telefon va kompyuterda header'da). O'qilmaganlar soni qizil belgida;
 * yangi xabar kelganda qo'ng'iroqcha silkinadi (telefon titraydi, agar brauzer ruxsat bersa).
 * Har 60 soniyada, ilova/tabga qaytganda va sahifa almashganda yangilanadi.
 */
export default function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const ru = useLocale() === "ru"; const path = usePathname();
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Item[] | null>(null);
  const [open, setOpen] = useState(false); const [ring, setRing] = useState(false);
  const last = useRef(initialUnread); const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/notifications", { cache: "no-store" }).catch(() => null);
    if (!r?.ok) return;
    const d = await r.json() as { unread: number; items: Item[] };
    if (d.unread > last.current) { setRing(true); setTimeout(() => setRing(false), 1200); try { navigator.vibrate?.(120); } catch {} }
    last.current = d.unread; setUnread(d.unread); setItems(d.items);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 60_000);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis); window.addEventListener("focus", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", onVis); };
  }, [load]);
  useEffect(() => { setOpen(false); load(); }, [path, load]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => { if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("click", close); document.addEventListener("keydown", close);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", close); };
  }, [open]);

  async function markAll() {
    await fetch("/api/notifications", { method: "POST" }).catch(() => null);
    last.current = 0; setUnread(0); setItems((x) => x?.map((i) => ({ ...i, read: true })) ?? x);
  }
  const label = ru ? `Уведомления${unread ? `: ${unread} новых` : ""}` : `Bildirishnomalar${unread ? `: ${unread} ta yangi` : ""}`;
  const when = (iso: string) => { const d = new Date(iso), p = (n: number) => String(n).padStart(2, "0"); return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`; };
  return (
    <div ref={box} className="relative">
      <button type="button" aria-label={label} title={label} aria-expanded={open} onClick={() => { setOpen((o) => !o); if (!open) load(); }}
        className="relative grid h-9 w-9 place-items-center rounded-full border border-slate-300 bg-white hover:border-brand">
        <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-5 w-5 stroke-slate-700 ${ring ? "animate-[bell_0.4s_ease-in-out_3]" : ""}`} fill="none" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9" /><path d="M10 20a2.2 2.2 0 0 0 4 0" />
        </svg>
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <p className="font-semibold">{ru ? "Уведомления" : "Bildirishnomalar"}</p>
            {unread > 0 && <button type="button" onClick={markAll} className="text-xs text-brand hover:underline">{ru ? "Прочитать все" : "Hammasini o‘qilgan qilish"}</button>}
          </div>
          {items === null ? <p className="p-4 text-sm text-slate-500">…</p> : items.length === 0 ? <p className="p-4 text-sm text-slate-500">{ru ? "Пока нет уведомлений." : "Hozircha bildirishnoma yo‘q."}</p> : (
            <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">{items.map((n) => {
              const inner = <><p className={`text-sm ${n.read ? "text-slate-700" : "font-semibold text-slate-900"}`}>{!n.read && <span aria-hidden="true" className="mr-1.5 inline-block h-2 w-2 rounded-full bg-red-600 align-middle" />}{n.title}</p>
                {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{n.body}</p>}<p className="mt-1 text-[11px] text-slate-400">{when(n.at)}</p></>;
              return <li key={n.id}>{n.href ? <Link href={n.href} className={`block px-4 py-3 hover:bg-slate-50 ${n.read ? "" : "bg-blue-50/50"}`}>{inner}</Link> : <div className={`px-4 py-3 ${n.read ? "" : "bg-blue-50/50"}`}>{inner}</div>}</li>;
            })}</ul>)}
          <Link href="/kabinet/bildirishnomalar" className="block border-t border-slate-100 px-4 py-2.5 text-center text-sm font-medium text-brand hover:bg-slate-50">{ru ? "Все уведомления" : "Barcha bildirishnomalar"}</Link>
        </div>)}
    </div>
  );
}
