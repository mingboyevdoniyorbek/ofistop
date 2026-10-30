"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "./I18nProvider";
import NewListingButton from "./NewListingButton";

/** Telefon uchun pastki menyu. Pastga aylantirilganda yashirinadi, tepaga qaytganda yana chiqadi. */
const HIDDEN_ON = [/^\/admin/, /^\/joylar\/[^/]+/, /^\/kabinet\/elon\//, /^\/kirish/];

const Icon = ({ d, active }: { d: string; active: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-6 w-6 ${active ? "stroke-brand" : "stroke-slate-600"}`} fill="none" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const ICONS = {
  home: "M3.5 10.5 12 4l8.5 6.5V20a1 1 0 0 1-1 1H15v-6h-6v6H4.5a1 1 0 0 1-1-1z",
  building: "M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M2.5 21h19M8 8h3M8 12h3M8 16h3",
  heart: "M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.7 3.5 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7.5 8.5c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5",
};

export default function BottomNav({ loggedIn, promo }: { loggedIn: boolean; promo: boolean }) {
  const ru = useLocale() === "ru";
  const path = usePathname().replace(/^\/ru(?=\/|$)/, "") || "/"; // /ru/... ham bir xil
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  useEffect(() => {
    let frame = 0;
    lastY.current = window.scrollY;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY, dy = y - lastY.current;
        if (Math.abs(dy) < 8) return;
        setHidden(dy > 0 && y > 80);
        lastY.current = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, []);
  useEffect(() => { setHidden(false); }, [path]);
  if (HIDDEN_ON.some((re) => re.test(path))) return null;

  const items = [
    { href: "/", label: ru ? "Главная" : "Asosiy", icon: ICONS.home, active: path === "/" },
    { href: "/markazlar", label: ru ? "Центры" : "Markazlar", icon: ICONS.building, active: path.startsWith("/markazlar") },
    null,
    { href: loggedIn ? "/kabinet/sevimlilar" : "/sevimlilar", label: ru ? "Избранное" : "Sevimlilar", icon: ICONS.heart, active: path === "/kabinet/sevimlilar" || path === "/sevimlilar" },
    { href: loggedIn ? "/kabinet" : "/kirish", label: ru ? "Профиль" : "Profil", icon: ICONS.user, active: path.startsWith("/kabinet") && path !== "/kabinet/sevimlilar" },
  ];
  return (
    <>
      <div aria-hidden="true" className="h-16 md:hidden" />
      <nav aria-label={ru ? "Нижнее меню" : "Pastki menyu"}
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur transition-transform duration-300 md:hidden ${hidden ? "translate-y-full" : "translate-y-0"}`}>
        <ul className="mx-auto grid h-16 max-w-md grid-cols-5 items-stretch">
          {items.map((it, i) => it ? (
            <li key={it.href}>
              <Link href={it.href} aria-current={it.active ? "page" : undefined} className={`relative flex h-full flex-col items-center justify-center gap-0.5 text-[11px] ${it.active ? "font-semibold text-brand" : "text-slate-600"}`}>
                {it.active && <span aria-hidden="true" className="absolute top-0 h-0.5 w-8 rounded-full bg-brand" />}
                <Icon d={it.icon} active={it.active} />{it.label}
              </Link>
            </li>
          ) : (
            <li key={i} className="flex items-center justify-center">
              <NewListingButton loggedIn={loggedIn} promo={promo} className="-mt-5 flex flex-col items-center gap-0.5 text-[11px] font-semibold text-accent disabled:opacity-60">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-white shadow-lg ring-4 ring-white">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 stroke-white" fill="none" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                </span>
                {ru ? "Подать" : "E’lon berish"}
              </NewListingButton>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
