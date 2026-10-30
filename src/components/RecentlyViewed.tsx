"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "./I18nProvider";
import ListingPhoto from "./ListingPhoto";

/** Oxirgi ko'rilgan e'lonlar shu brauzerda saqlanadi (eng ko'pi 10 ta, eng yangisi birinchi). */
const KEY = "ofistop-recent";
const MAX = 10;
export type RecentItem = { id: string; href: string; title: string; price: string; place: string; area: string; thumb: string | null; full: string | null; date: string };

function read(): RecentItem[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => x && typeof x.id === "string" && typeof x.href === "string" && x.href.startsWith("/joylar/")).slice(0, MAX) : [];
  } catch { return []; }
}

/** E'lon sahifasida chaqiriladi: e'lonni ro'yxat boshiga qo'yadi, 10 tadan oshganini oxiridan olib tashlaydi. */
export function TrackView({ item }: { item: RecentItem }) {
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify([item, ...read().filter((x) => x.id !== item.id)].slice(0, MAX))); } catch {}
  }, [item]);
  return null;
}

export default function RecentlyViewed() {
  const ru = useLocale() === "ru";
  const [items, setItems] = useState<RecentItem[]>([]);
  useEffect(() => { setItems(read()); }, []);
  if (!items.length) return null;
  const clear = () => { try { localStorage.removeItem(KEY); } catch {} setItems([]); };
  return (
    <section className="mx-auto max-w-6xl px-4 pb-8" aria-labelledby="recent-h">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="recent-h" className="text-lg font-semibold">{ru ? "Недавно просмотренные объявления" : "Oxirgi ko‘rilgan e’lonlar"}</h2>
        <button type="button" onClick={clear} className="text-sm text-slate-500 hover:underline">{ru ? "Очистить" : "Tozalash"}</button>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:thin]">
        {items.map((it) => (
          <Link key={it.id} href={it.href} className="flex w-[44vw] max-w-[220px] shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-slate-200 bg-white hover:shadow-md">
            <ListingPhoto thumb={it.thumb} full={it.full} alt={it.title} sizes="220px" className="aspect-[4/3]" />
            <div className="space-y-1 p-2.5">
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{it.title}</h3>
              <p className="text-base font-bold text-brand">{it.price}</p>
              {it.place && <p className="line-clamp-2 text-xs text-slate-600">{it.place}</p>}
              {it.date && <p className="text-xs text-slate-500">{it.date}</p>}
              {it.area && <p className="text-xs text-slate-700">{it.area}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
