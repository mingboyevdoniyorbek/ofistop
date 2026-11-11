"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS = {
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2-4.3-4.3",
  building: "M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M2.5 21h19M8 8h3M8 12h3M8 16h3",
  sofa: "M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM6 18v2M18 18v2",
  key: "M15 7a4 4 0 1 1-3.9 4.9L4 19v2h3v-2h2v-2h2l1.1-1.1A4 4 0 0 1 15 7zm1.5 2.5h.01",
  heart: "M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.7 3.5 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7.5 8.5c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  bookmark: "M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  clock: "M12 8v4l3 3M3 12a9 9 0 1 0 9-9 9 9 0 0 0-9 9",
  bell: "M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9M10 20a2.2 2.2 0 0 0 4 0",
};
export type HeaderIcon = keyof typeof ICONS;
export const NavIcon = ({ name, className = "h-[18px] w-[18px]" }: { name: HeaderIcon; className?: string }) =>
  <svg viewBox="0 0 24 24" aria-hidden="true" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[name]} /></svg>;

/**
 * Kompyuterdagi asosiy menyu: har bir bo'lim ikonka + nom, faol bo'lim yumshoq ko'k "tabletka" ichida.
 * `from` — qaysi ekran kengligidan boshlab ko'rinishi; `iconOnly` — faqat ikonka (nomi maslahat sifatida chiqadi).
 */
export default function HeaderNav({ items }: { items: { href: string; label: string; icon: HeaderIcon; also?: string[]; from?: "md" | "lg" | "xl"; iconOnly?: boolean }[] }) {
  const path = usePathname().replace(/^\/ru(?=\/|$)/, "") || "/";
  const show = { md: "hidden md:flex", lg: "hidden lg:flex", xl: "hidden xl:flex" };
  // Bir nechta bo'lim mos kelsa (masalan /kabinet va /kabinet/sevimlilar) — eng aniq mos kelgani faol.
  const len = (it: { href: string; also?: string[] }) => Math.max(-1, ...[it.href, ...(it.also ?? [])].filter((h) => path === h || path.startsWith(h + "/")).map((h) => h.length));
  const best = Math.max(-1, ...items.map(len));
  return <>{items.map((it) => {
    const on = best >= 0 && len(it) === best;
    return (
      <Link key={it.href} href={it.href} aria-current={on ? "page" : undefined} aria-label={it.label} title={it.label}
        className={`${show[it.from ?? "md"]} items-center gap-1.5 whitespace-nowrap rounded-full transition ${it.iconOnly ? "h-10 w-10 justify-center" : "h-10 justify-center px-3 lg:h-auto lg:py-1.5"} ${on
          ? "bg-gradient-to-br from-[#e8f0ff] to-[#d6e4ff] font-semibold text-brand shadow-[inset_0_0_0_1px_rgba(18,48,138,.08)]"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"}`}>
        <NavIcon name={it.icon} className={it.iconOnly ? "h-5 w-5" : undefined} />{!it.iconOnly && <span className="hidden lg:inline">{it.label}</span>}
      </Link>);
  })}</>;
}
