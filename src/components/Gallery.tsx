"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useT } from "./I18nProvider";

type Img = { url: string; thumb: string };

/**
 * E'lon galereyasi.
 * - Sahifada: rasm ramkani to'liq egallaydi (chetida bo'sh joy yo'q), barmoq bilan o'ngga-chapga suriladi, "2 / 5" hisoblagich.
 * - Bosilganda: to'liq ekran (qora fon), rasm butunligicha ko'rinadi, surish, strelkalar, klaviatura (← → Esc).
 */
export default function Gallery({ images, alt, fallback }: { images: Img[]; alt: string; fallback: string }) {
  const t = useT(); const ru = useLocale() === "ru";
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const n = images.length;

  const go = useCallback((k: number, el: HTMLDivElement | null, smooth = true) => {
    if (!el) return; const idx = Math.max(0, Math.min(n - 1, k));
    el.scrollTo({ left: idx * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  }, [n]);
  const onScroll = (el: HTMLDivElement) => { const idx = Math.round(el.scrollLeft / Math.max(1, el.clientWidth)); if (idx !== i) setI(idx); };

  if (!n) return <div className="grid aspect-[4/3] place-items-center rounded-2xl bg-slate-100 text-slate-500 sm:aspect-[16/10]">{fallback}</div>;
  const arrow = "absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl text-slate-800 shadow-md transition hover:bg-white sm:grid";
  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-slate-100">
        <div ref={track} onScroll={(e) => onScroll(e.currentTarget)} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto" role="group" aria-roledescription="carousel" aria-label={t("gal.aria")}>
          {images.map((im, k) => (
            <button key={im.url} type="button" onClick={() => { setI(k); setOpen(true); }} aria-label={`${t("gal.alt", { alt, i: k + 1, n })} — ${ru ? "открыть на весь экран" : "to‘liq ekranda ochish"}`}
              className="aspect-[4/3] w-full shrink-0 snap-center sm:aspect-[16/10]">
              <img src={im.url} alt={t("gal.alt", { alt, i: k + 1, n })} loading={k === 0 ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
        {n > 1 && <>
          <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-slate-900/65 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">{i + 1} / {n}</span>
          {i > 0 && <button type="button" onClick={() => go(i - 1, track.current)} aria-label={ru ? "Предыдущее фото" : "Oldingi rasm"} className={`${arrow} left-3`}>‹</button>}
          {i < n - 1 && <button type="button" onClick={() => go(i + 1, track.current)} aria-label={ru ? "Следующее фото" : "Keyingi rasm"} className={`${arrow} right-3`}>›</button>}
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:hidden">{images.map((_, k) => <span key={k} className={`h-1.5 rounded-full bg-white shadow transition-all ${k === i ? "w-4 opacity-100" : "w-1.5 opacity-60"}`} />)}</div>
        </>}
        <span aria-hidden="true" className="pointer-events-none absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-slate-900/55 text-white backdrop-blur-sm">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
        </span>
      </div>
      {n > 1 && (
        <div className="no-scrollbar mt-2 hidden gap-2 overflow-x-auto sm:flex" role="group" aria-label={t("gal.aria")}>
          {images.map((im, k) => (
            <button key={im.url} type="button" onClick={() => go(k, track.current)} aria-label={t("gal.thumb", { n: k + 1 })} aria-current={k === i}
              className={`shrink-0 overflow-hidden rounded-lg ring-2 transition ${k === i ? "ring-brand" : "ring-transparent opacity-75 hover:opacity-100"}`}>
              <img src={im.thumb} alt="" loading="lazy" className="h-14 w-20 object-cover" />
            </button>
          ))}
        </div>
      )}
      {open && <Lightbox images={images} start={i} alt={alt} onClose={(k) => { setOpen(false); go(k, track.current, false); }} />}
    </div>
  );
}

function Lightbox({ images, start, alt, onClose }: { images: Img[]; start: number; alt: string; onClose: (index: number) => void }) {
  const t = useT(); const ru = useLocale() === "ru";
  const [i, setI] = useState(start);
  const box = useRef<HTMLDivElement>(null);
  const idx = useRef(start); idx.current = i;
  const n = images.length;
  const go = useCallback((k: number, smooth = true) => { const el = box.current; if (!el) return; el.scrollTo({ left: Math.max(0, Math.min(n - 1, k)) * el.clientWidth, behavior: smooth ? "smooth" : "auto" }); }, [n]);
  useEffect(() => {
    go(start, false);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(idx.current);
      if (e.key === "ArrowRight") go(idx.current + 1);
      if (e.key === "ArrowLeft") go(idx.current - 1);
    };
    document.addEventListener("keydown", key);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", key); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const btn = "grid h-11 w-11 place-items-center rounded-full bg-white/10 text-2xl text-white backdrop-blur transition hover:bg-white/20";
  return (
    <div role="dialog" aria-modal="true" aria-label={t("gal.aria")} className="fixed inset-0 z-[1300] flex flex-col bg-black">
      <div className="flex items-center justify-between px-3 py-3 text-white">
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">{i + 1} / {n}</span>
        <button type="button" onClick={() => onClose(i)} aria-label={ru ? "Закрыть" : "Yopish"} className={btn}>✕</button>
      </div>
      <div ref={box} onScroll={(e) => { const el = e.currentTarget; const k = Math.round(el.scrollLeft / Math.max(1, el.clientWidth)); if (k !== i) setI(k); }}
        className="no-scrollbar flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto">
        {images.map((im, k) => (
          <div key={im.url} className="grid h-full w-full shrink-0 snap-center place-items-center px-1">
            <img src={im.url} alt={t("gal.alt", { alt, i: k + 1, n })} loading={Math.abs(k - start) <= 1 ? "eager" : "lazy"} className="max-h-full max-w-full select-none object-contain" draggable={false} />
          </div>
        ))}
      </div>
      {n > 1 && <div className="pointer-events-none absolute inset-x-0 top-1/2 hidden -translate-y-1/2 justify-between px-4 sm:flex">
        <button type="button" onClick={() => go(i - 1)} disabled={i === 0} aria-label={ru ? "Предыдущее фото" : "Oldingi rasm"} className={`${btn} pointer-events-auto disabled:opacity-30`}>‹</button>
        <button type="button" onClick={() => go(i + 1)} disabled={i === n - 1} aria-label={ru ? "Следующее фото" : "Keyingi rasm"} className={`${btn} pointer-events-auto disabled:opacity-30`}>›</button>
      </div>}
      {n > 1 && <div className="no-scrollbar flex justify-center gap-2 overflow-x-auto px-3 py-3">
        {images.map((im, k) => <button key={im.url} type="button" onClick={() => go(k)} aria-label={t("gal.thumb", { n: k + 1 })} aria-current={k === i}
          className={`shrink-0 overflow-hidden rounded-md ring-2 ${k === i ? "ring-white" : "ring-transparent opacity-50"}`}><img src={im.thumb} alt="" className="h-12 w-16 object-cover" /></button>)}
      </div>}
    </div>
  );
}
