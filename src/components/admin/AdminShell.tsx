"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export type AdminNavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number; sub?: string };
const ICONS = {
  dashboard: "M3.5 10.5 12 4l8.5 6.5V20a1 1 0 0 1-1 1H15v-6h-6v6H4.5a1 1 0 0 1-1-1z",
  listings: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  reports: "M5 21V4h11l-1 4 1 4H5",
  users: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm13 9v-1a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8",
  centers: "M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M2.5 21h19M8 8h3M8 12h3M8 16h3",
  apps: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9",
  service: "M3 12h3l2-3h5l2 2h2l4 4M3 12v5h3M21 15l-3 3-4-1-4-3M11 9l-2 3",
  furniture: "M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM6 18v2M18 18v2",
  geo: "M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  audit: "M12 8v4l3 3M3 12a9 9 0 1 0 9-9 9 9 0 0 0-9 9",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z",
  site: "M14 3h7v7M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5",
  expand: "M9 6l6 6-6 6",
  collapse: "M15 6l-6 6 6 6",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2-4.3-4.3",
  bell: "M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9M10 20a2.2 2.2 0 0 0 4 0",
  menu: "M4 7h16M4 12h16M4 17h16",
};
export const AdminIcon = ({ name, className = "h-5 w-5" }: { name: keyof typeof ICONS; className?: string }) =>
  <svg viewBox="0 0 24 24" aria-hidden="true" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[name]} /></svg>;

/**
 * Admin panel — qorong'i "shisha" uslubi: chapda ixcham ikonkali menyu (kompyuterda kengaytirsa bo'ladi),
 * tepada sahifa nomi, qidiruv, bildirishnoma va profil. Ichki sahifalar `.adm-dark` mavzusida chiziladi.
 */
export default function AdminShell({ items, title, role, initials, alerts, logout, children }: {
  items: AdminNavItem[]; title: string; role: string; initials: string; alerts: number; logout: React.ReactNode; children: React.ReactNode;
}) {
  const path = usePathname().replace(/^\/ru(?=\/|$)/, "") || "/";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => setOpen(false), [path]);
  useEffect(() => { try { setWide(localStorage.getItem("adm-wide") === "1"); } catch { /* ixtiyoriy */ } }, []);
  const toggleWide = () => setWide((w) => { try { localStorage.setItem("adm-wide", w ? "0" : "1"); } catch { /* ixtiyoriy */ } return !w; });
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href.split("?")[0]));
  const current = items.find((i) => active(i.href));

  const nav = (labels: boolean) => (
    <ul className="space-y-1.5">{items.map((it) => { const on = active(it.href); return (
      <li key={it.href} className="group relative">
        <Link href={it.href} aria-current={on ? "page" : undefined} aria-label={labels ? undefined : it.label}
          className={`relative flex items-center gap-3 rounded-2xl transition ${labels ? "px-3 py-2.5" : "mx-auto h-12 w-12 justify-center"} ${on
            ? "bg-gradient-to-br from-[#38bdf8] to-[#2563eb] text-white shadow-[0_8px_24px_-6px_rgba(56,189,248,.65)]"
            : "text-slate-400 hover:bg-white/[.07] hover:text-white"}`}>
          <AdminIcon name={it.icon} className={labels ? "h-5 w-5" : "h-[22px] w-[22px]"} />
          {labels && <span className="flex-1 truncate text-sm font-medium">{it.label}</span>}
          {!!it.badge && (labels
            ? <span className="rounded-full bg-[#f43f5e] px-2 py-0.5 text-[11px] font-bold text-white">{it.badge}</span>
            : <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#f43f5e] px-1 text-[10px] font-bold text-white ring-2 ring-[#0b1424]">{it.badge > 99 ? "99+" : it.badge}</span>)}
        </Link>
        {!labels && <span role="tooltip" className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-xl border border-white/10 bg-[#0f1b33]/95 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition group-hover:opacity-100 group-focus-within:opacity-100">{it.label}</span>}
      </li>); })}</ul>
  );
  const logo = <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/95 shadow-[0_6px_20px_-6px_rgba(56,189,248,.6)]">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/logo.webp" alt="" width={30} height={30} className="h-7 w-7" /></span>;

  return (
    <div className="adm-dark fixed inset-0 z-[60] flex overflow-hidden bg-[#070d1a] text-[#e2e8f0]">
      {/* Fon: qorong'i ko'k + yumshoq rangli dog'lar (videodagi shisha effekti uchun) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#1d4ed8]/35 blur-[120px]" />
        <div className="absolute right-[-10%] top-[20%] h-[460px] w-[460px] rounded-full bg-[#0ea5e9]/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[35%] h-[420px] w-[520px] rounded-full bg-[#f59e0b]/[.13] blur-[130px]" />
      </div>

      {open && <button type="button" aria-label="Yopish" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" />}
      {/* Telefon: chapdan chiqadigan menyu */}
      <aside className={`adm-glass fixed inset-y-2 left-2 z-40 flex w-72 flex-col rounded-3xl !bg-[#0b1424]/95 p-3 transition-transform lg:hidden ${open ? "translate-x-0" : "-translate-x-[110%]"}`}>
        <Link href="/admin" className="mb-4 flex items-center gap-3 px-2 pt-1">{logo}<span className="font-bold text-white">OfisTop <span className="font-medium text-sky-300">Admin</span></span></Link>
        <nav aria-label="Admin" className="flex-1 overflow-y-auto">{nav(true)}</nav>
        <Link href="/" className="mt-3 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/[.07] hover:text-white"><AdminIcon name="site" />Saytga o‘tish</Link>
        <div className="mt-2 flex items-center gap-3 border-t border-white/10 px-3 pt-3 text-sm text-[#cbd5e1]">
          <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#38bdf8] to-[#2563eb] text-xs font-bold text-white">{initials}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-xs text-slate-400">{role}</span>{logout}</span>
        </div>
      </aside>
      {/* Kompyuter: ixcham ikonka menyu */}
      <aside className={`adm-glass relative z-20 my-3 ml-3 hidden shrink-0 flex-col rounded-[28px] py-4 transition-[width] duration-300 lg:flex ${wide ? "w-64 px-3" : "w-[84px] px-2"}`}>
        <Link href="/admin" className={`mb-6 flex items-center gap-3 ${wide ? "px-2" : "justify-center"}`} aria-label="OfisTop Admin">{logo}{wide && <span className="font-bold text-white">OfisTop <span className="font-medium text-sky-300">Admin</span></span>}</Link>
        <nav aria-label="Admin" className={`flex-1 ${wide ? "overflow-y-auto" : ""}`}>{nav(wide)}</nav>
        <div className="mt-3 space-y-1.5">
          <Link href="/" aria-label="Saytga o‘tish" title="Saytga o‘tish" className={`flex items-center gap-3 rounded-2xl text-slate-400 transition hover:bg-white/[.07] hover:text-white ${wide ? "px-3 py-2.5 text-sm" : "mx-auto h-11 w-11 justify-center"}`}><AdminIcon name="site" />{wide && "Saytga o‘tish"}</Link>
          <button type="button" onClick={toggleWide} aria-label={wide ? "Menyuni yig‘ish" : "Menyuni kengaytirish"} title={wide ? "Menyuni yig‘ish" : "Menyuni kengaytirish"}
            className={`flex items-center gap-3 rounded-2xl text-slate-400 transition hover:bg-white/[.07] hover:text-white ${wide ? "w-full px-3 py-2.5 text-sm" : "mx-auto h-11 w-11 justify-center"}`}><AdminIcon name={wide ? "collapse" : "expand"} />{wide && "Yig‘ish"}</button>
          <span aria-hidden="true" className={`mt-2 grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#38bdf8] to-[#2563eb] text-sm font-bold text-white ${wide ? "ml-1" : "mx-auto"}`}>{initials}</span>
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 flex-wrap items-center gap-3 px-4 pb-2 pt-4 sm:px-6 lg:pt-6">
          <button type="button" aria-label="Menyu" onClick={() => setOpen(true)} className="adm-glass grid h-11 w-11 place-items-center rounded-2xl text-white lg:hidden"><AdminIcon name="menu" /></button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold tracking-tight text-white sm:text-2xl">{current?.label ?? title}</h1>
            <p className="truncate text-xs text-slate-400 sm:text-sm">{current?.sub ?? role}</p>
          </div>
          <form role="search" onSubmit={(e) => { e.preventDefault(); const v = q.trim(); router.push(v ? `/admin/elonlar?holat=all&q=${encodeURIComponent(v)}` : "/admin/elonlar"); }}
            className="adm-glass order-last flex h-11 w-full items-center gap-2 rounded-2xl px-3.5 sm:order-none sm:w-72">
            <AdminIcon name="search" className="h-4 w-4 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} type="search" enterKeyHint="search" aria-label="E’lonlarni qidirish" placeholder="E’lon, telefon, sarlavha…"
              className="min-w-0 flex-1 !border-0 !bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden" />
          </form>
          <Link href="/admin" title="Ko‘rib chiqish kutayotganlar" aria-label={`Ko‘rib chiqish kutayotganlar: ${alerts}`} className="adm-glass relative grid h-11 w-11 place-items-center rounded-2xl text-[#e2e8f0] hover:text-white">
            <AdminIcon name="bell" />
            {alerts > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#f43f5e] ring-2 ring-[#0b1424]" />}
          </Link>
          <span className="adm-glass hidden h-11 items-center gap-2 rounded-2xl pl-1.5 pr-3 text-sm sm:flex">
            <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#38bdf8] to-[#2563eb] text-xs font-bold text-white">{initials}</span>
            <span className="text-[#cbd5e1]">{logout}</span>
          </span>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-8 pt-3 sm:px-6">
          {path === "/admin" ? children : <div className="adm-glass adm-page mx-auto max-w-7xl rounded-[28px] p-4 sm:p-6">{children}</div>}
        </main>
      </div>
    </div>
  );
}
