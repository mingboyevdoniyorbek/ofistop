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
    <section className="mx-auto max-w-6xl px-4 pt-6" aria-labelledby="recent-h">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="recent-h" className="text-lg font-semibold">{ru ? "Недавно просмотренные объявления" : "Oxirgi ko‘rilgan e’lonlar"}</h2>
        <button type="button" onClick={clear} className="text-sm text-slate-500 hover:underline">{ru ? "Очистить" : "Tozalash"}</button>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 no-scrollbar overflow-x-auto scroll-px-4 px-4 pb-2">
        {items.map((it) => (
          <Link key={it.id} href={it.href} className="group flex w-[calc((100vw-2.75rem)/2)] max-w-[270px] shrink-0 snap-start flex-col">
            <div className="overflow-hidden rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_14px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5">
              <ListingPhoto thumb={it.thumb} full={it.full} alt={it.title} sizes="220px" fit="cover" className="aspect-square transition-transform duration-300 group-hover:scale-[1.03]" />
            </div>
            <div className="mt-2 space-y-0.5 px-0.5">
              <p className="truncate text-[15px] font-extrabold tracking-tight text-slate-900">{it.price}</p>
              <h3 className="line-clamp-1 text-sm font-medium text-slate-800">{it.title}</h3>
              {(it.place || it.area) && <p className="line-clamp-1 text-xs text-slate-500">{[it.place, it.area].filter(Boolean).join(" · ")}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
