"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "./I18nProvider";

const ICONS: Record<string, string> = {
  telegram: "M21.9 4.3 18.6 20c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1L18 6.6c.4-.4-.1-.6-.6-.2L5.8 13.6.9 12.1c-1.1-.3-1.1-1.1.2-1.6l19.2-7.4c.9-.3 1.7.2 1.6 1.2z",
  whatsapp: "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.6 14.1c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1a17 17 0 0 1-1.7-.6 13.4 13.4 0 0 1-5.2-4.6c-.4-.5-1.3-1.7-1.3-3.3S6.3 6.6 6.6 6.3c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3z",
  facebook: "M14 8h3V4h-3c-2.8 0-4.5 1.7-4.5 4.6V11H7v4h2.5v8h4v-8h3l.5-4h-3.5V8.8c0-.5.3-.8.5-.8z",
  x: "M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z",
  link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1m2 7a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
  more: "M18 8a3 3 0 1 0-2.8-4M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4",
};
const Svg = ({ d, fill = true }: { d: string; fill?: boolean }) => <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" {...(fill ? { fill: "currentColor" } : { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const })}><path d={d} /></svg>;

/**
 * E'lon yoki markazni ulashish: Telegram, WhatsApp, Facebook, X, havolani nusxalash va
 * telefonning o'z "Ulashish" oynasi (Instagram, SMS va boshqa ilovalar uchun).
 */
export default function ShareButton({ path, title, text, variant = "pill" }: { path: string; title: string; text?: string; variant?: "pill" | "icon" }) {
  const ru = useLocale() === "ru";
  const [open, setOpen] = useState(false); const [copied, setCopied] = useState(false); const [native, setNative] = useState(false);
  const box = useRef<HTMLDivElement>(null); const sheet = useRef<HTMLDivElement>(null);
  const [mobile, setMobile] = useState(false);
  useEffect(() => { setNative(typeof navigator !== "undefined" && typeof navigator.share === "function"); setMobile(matchMedia("(max-width: 639px)").matches); }, []);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => { if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node) && !sheet.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("click", close); document.addEventListener("keydown", close);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", close); };
  }, [open]);

  const url = () => `${typeof location === "undefined" ? "" : location.origin}${path}`;
  const message = [title, text].filter(Boolean).join(" — ");
  const enc = encodeURIComponent;
  const links = [
    { key: "telegram", label: "Telegram", color: "bg-sky-500", href: () => `https://t.me/share/url?url=${enc(url())}&text=${enc(message)}` },
    { key: "whatsapp", label: "WhatsApp", color: "bg-green-500", href: () => `https://wa.me/?text=${enc(`${message}\n${url()}`)}` },
    { key: "facebook", label: "Facebook", color: "bg-blue-600", href: () => `https://www.facebook.com/sharer/sharer.php?u=${enc(url())}` },
    { key: "x", label: "X (Twitter)", color: "bg-slate-900", href: () => `https://twitter.com/intent/tweet?url=${enc(url())}&text=${enc(message)}` },
  ];
  async function copy() {
    try { await navigator.clipboard.writeText(url()); } catch {
      const t = document.createElement("textarea"); t.value = url(); document.body.append(t); t.select(); document.execCommand("copy"); t.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }
  async function shareNative() { try { await navigator.share({ title, text: message, url: url() }); setOpen(false); } catch { /* foydalanuvchi bekor qildi */ } }

  const label = ru ? "Поделиться" : "Ulashish";
  // Oyna doim <body>ga chiqariladi: karta (overflow-hidden) yoki pastki menyu uni kesmasin/yopmasin.
  // Telefonda — pastdan chiqadigan oyna; kompyuterda — tugma yonida, ekran chegarasidan chiqmaydigan joyda.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  function place() {
    const r = btn.current?.getBoundingClientRect(); if (!r) return;
    const W = 288, H = 260, m = 8;
    const left = Math.min(Math.max(m, r.right - W), innerWidth - W - m);
    const below = r.bottom + m + H <= innerHeight;
    setPos({ top: below ? r.bottom + m : Math.max(m, r.top - H - m), left });
  }
  useEffect(() => {
    if (!open || mobile) return;
    place();
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { passive: true }); window.addEventListener("resize", close);
    return () => { window.removeEventListener("scroll", close); window.removeEventListener("resize", close); };
  }, [open, mobile]);
  // Faqat oyna ochilganda quriladi (serverda location yo'q).
  const panel = () => <>
    <p className="mb-3 font-semibold">{label}</p>
    <div className="grid grid-cols-4 gap-2 text-center text-xs">
      {links.map((l) => <a key={l.key} href={l.href()} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="flex flex-col items-center gap-1">
        <span className={`grid h-12 w-12 place-items-center rounded-full text-white ${l.color}`}><Svg d={ICONS[l.key]} /></span>{l.label}</a>)}
    </div>
    <div className="mt-3 grid gap-2">
      <button type="button" onClick={copy} className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium">
        <Svg d={ICONS.link} fill={false} />{copied ? (ru ? "Ссылка скопирована ✓" : "Havola nusxalandi ✓") : (ru ? "Скопировать ссылку" : "Havolani nusxalash")}</button>
      {native && <button type="button" onClick={shareNative} className="rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white">{ru ? "Другие приложения (Instagram, SMS…)" : "Boshqa ilovalar (Instagram, SMS…)"}</button>}
    </div>
  </>;
  return (
    <div ref={box} className="relative inline-block">
      <button ref={btn} type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={label} title={label} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
        className={variant === "icon" ? "grid h-9 w-9 place-items-center rounded-full bg-white/95 text-slate-700 shadow-sm ring-1 ring-slate-200" : "inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-brand"}>
        <Svg d={ICONS.more} fill={false} />{variant === "pill" && label}
      </button>
      {open && createPortal(mobile ? <>
        <div aria-hidden="true" className="fixed inset-0 z-[1250] bg-black/30" />
        <div ref={sheet} role="dialog" aria-label={label} onClick={(e) => e.stopPropagation()} className="fixed inset-x-3 bottom-3 z-[1300] rounded-2xl bg-white p-4 shadow-2xl">{panel()}</div>
      </> : pos && <div ref={sheet} role="dialog" aria-label={label} onClick={(e) => e.stopPropagation()} style={{ top: pos.top, left: pos.left }}
          className="fixed z-[1300] w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">{panel()}</div>, document.body)}
    </div>
  );
}
