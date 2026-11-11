"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon, type HeaderIcon } from "./HeaderNav";

/**
 * Kabinet menyusi: ikonka + nom, faol bo'lim ko'k gradient "tabletka"da (admin paneldagi uslub, sayt ranglarida).
 * Telefonda bitta qatorda suriladi. E'lon berish/tahrirlash sahifasida yashiriladi — foydalanuvchi faqat formaga e'tibor beradi.
 */
export default function CabinetNav({ items, label, extra }: { items: { href: string; label: string; icon: HeaderIcon }[]; label: string; extra?: React.ReactNode }) {
  const path = (usePathname() ?? "").replace(/^\/ru(?=\/|$)/, "") || "/";
  if (/^\/kabinet\/elon\//.test(path)) return null;
  const on = (href: string) => (href === "/kabinet" ? path === "/kabinet" : path === href || path.startsWith(href + "/"));
  return (
    <nav aria-label={label} className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
      {extra}
      {items.map((it) => { const a = on(it.href); return (
        <Link key={it.href} href={it.href} aria-current={a ? "page" : undefined}
          className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${a
            ? "bg-gradient-to-br from-[#2a78d6] to-[#12308a] text-white shadow-[0_8px_20px_-8px_rgba(18,48,138,.6)]"
            : "border border-slate-200 bg-white text-slate-700 hover:border-brand hover:text-brand"}`}>
          <NavIcon name={it.icon} />{it.label}
        </Link>); })}
    </nav>
  );
}
