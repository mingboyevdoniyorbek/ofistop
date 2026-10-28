"use client";
import { useState } from "react";
import { useT } from "./I18nProvider";
export default function Gallery({ images, alt, fallback }: { images: { url: string; thumb: string }[]; alt: string; fallback: string }) {
  const t = useT();
  const [i, setI] = useState(0);
  if (!images.length) return <div className="aspect-[16/9] bg-slate-100 grid place-items-center text-slate-500 rounded">{fallback}</div>;
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images[i].url} alt={t("gal.alt", { alt, i: i + 1, n: images.length })} className="aspect-[16/9] w-full rounded bg-slate-100 object-cover" />
      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto" role="group" aria-label={t("gal.aria")}>
          {images.map((im, k) => (
            <button key={im.url} type="button" onClick={() => setI(k)} aria-label={t("gal.thumb", { n: k + 1 })} aria-current={k === i} className={`shrink-0 rounded border-2 ${k === i ? "border-brand" : "border-transparent"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.thumb} alt="" loading="lazy" className="h-14 w-20 rounded object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
