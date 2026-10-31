"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type AdminNavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number };
const ICONS = {
  dashboard: "M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z",
  listings: "M4 6h16M4 12h16M4 18h10",
  reports: "M5 21V4h11l-1 4 1 4H5",
  users: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm13 9v-1a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8",
  centers: "M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M2.5 21h19M8 8h3M8 12h3M8 16h3",
  apps: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9",
  geo: "M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  audit: "M12 8v4l3 3M3 12a9 9 0 1 0 9-9 9 9 0 0 0-9 9",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z",
  site: "M14 3h7v7M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5",
};
const Icon = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;

/**
 * Admin panel "ilova" ko'rinishida: chapda menyu (telefonda ☰ bilan ochiladi), tepada panel, o'ngda kontent.
 * Sayt sarlavhasi/pastki qismi ustidan butun ekranni egallaydi.
 */
export default function AdminShell({ items, title, role, alerts, logout, children }: {
  items: AdminNavItem[]; title: string; role: string; alerts: number; logout: React.ReactNode; children: React.ReactNode;
}) {
  const path = usePathname().replace(/^\/ru(?=\/|$)/, "") || "/";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href.split("?")[0]));
  const current = items.find((i) => active(i.href));
  return (
    <div className="fixed inset-0 z-[60] flex overflow-hidden bg-slate-100 text-slate-800">
      {open && <button type="button" aria-label="Yopish" onClick={() => setOpen(false)} className="fixed inset-0 z-10 bg-black/40 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-white shadow-xl transition-transform lg:static lg:translate-x-0 lg:shadow-none lg:border-r lg:border-slate-200 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <Link href="/admin" className="flex h-16 shrink-0 items-center gap-2 bg-gradient-to-r from-brand to-[#2a78d6] px-5 text-lg font-bold text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="" width={32} height={32} className="h-8 w-8 rounded-full bg-white p-0.5" />OfisTop <span className="text-sm font-medium text-blue-100">Admin</span>
        </Link>
        <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">{items.map((it) => { const on = active(it.href); return (
            <li key={it.href}><Link href={it.href} aria-current={on ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${on ? "bg-blue-50 font-semibold text-brand" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
              <Icon d={ICONS[it.icon]} /><span className="flex-1">{it.label}</span>
              {!!it.badge && <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">{it.badge}</span>}
            </Link></li>); })}</ul>
        </nav>
        <Link href="/" className="m-3 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 hover:border-brand hover:text-brand"><Icon d={ICONS.site} />Saytga o‘tish</Link>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
          <button type="button" aria-label="Menyu" onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 lg:hidden">☰</button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{current?.label ?? title}</h1>
          {alerts > 0 && <Link href="/admin" title="Ko‘rib chiqish kutayotganlar" className="relative grid h-9 w-9 place-items-center rounded-full border border-slate-200">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9M10 20a2.2 2.2 0 0 0 4 0" /></svg>
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white ring-2 ring-white">{alerts > 99 ? "99+" : alerts}</span></Link>}
          <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 sm:inline">{role}</span>
          <span className="text-sm">{logout}</span>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">{path === "/admin" ? children : <div className="mx-auto max-w-7xl rounded-2xl bg-white p-4 shadow-sm sm:p-6">{children}</div>}</main>
      </div>
    </div>
  );
}
