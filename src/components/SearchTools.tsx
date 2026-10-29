"use client";
import { useState } from "react";
import Link from "next/link";
import { useLocale } from "./I18nProvider";
import { SaveSearch } from "./SavedSearch";
import { labels } from "@/lib/format";
export default function SearchTools({ query, regions, districts, amenities = [] }: { query: string; regions: {id:number;name:string}[]; districts:{id:number;name:string}[]; amenities?:{code:string;name:string}[] }) {
  const locale = useLocale(), ru = locale === "ru", L = labels(locale), params = new URLSearchParams(query);
  const [error, setError] = useState("");
  const [radius, setRadius] = useState(params.get("radius") ?? "1000");
  const names: Record<string, string> = { q: ru ? "Поиск" : "Qidiruv", region: ru ? "Регион" : "Hudud", district: ru ? "Район" : "Tuman", category: ru ? "Тип" : "Turi", priceMin: ru ? "От" : "Narxdan", priceMax: ru ? "До" : "Narxgacha", areaMin: ru ? "Площадь от" : "Maydondan", areaMax: ru ? "Площадь до" : "Maydongacha", furnished: ru ? "Мебель" : "Mebel", poster: ru ? "Автор" : "Beruvchi", commission: ru ? "Без комиссии" : "Komissiyasiz", availableBy: ru ? "Дата" : "Sana", amenities: ru ? "Удобства" : "Qulaylik", bbox: ru ? "Область карты" : "Xarita hududi", lat: ru ? "Рядом" : "Yaqin atrof" };
  Object.assign(names,{floor:ru ? "Этаж" : "Qavat",center:ru ? "Бизнес-центр" : "Biznes markaz"});
  function display(key: string, value: string) {
    if (key === "amenities") return value.split(",").map(v => amenities.find(a=>a.code===v)?.name ?? v).join(", ");
    if (key === "region") return regions.find(r=>String(r.id)===value)?.name ?? value;
    if (key === "district") return districts.find(r=>String(r.id)===value)?.name ?? value;
    if (key === "category") return L.category[value] ?? value;
    if (key === "poster") return L.poster[value] ?? value;
    if (key === "furnished") return value === "1" ? (ru ? "есть" : "bor") : (ru ? "нет" : "yo‘q");
    if (key.startsWith("price")) return `${value} ${params.get("currency") || "UZS"}`;
    return value;
  }
  function without(key: string, value: string) { const u = new URLSearchParams(query); if (key === "amenities") { const others = u.getAll(key).filter(v => v !== value); u.delete(key); others.forEach(v => u.append(key, v)); } else u.delete(key); if (key === "region") u.delete("district"); if (key === "lat") { u.delete("lng"); u.delete("radius"); } u.delete("page"); return `/joylar?${u}`; }
  return <div className="mb-4 space-y-3"><div className="flex flex-wrap gap-2">{[...params].filter(([k,v]) => names[k] && v).map(([k, v], i) => <Link key={`${k}-${i}`} href={without(k, v)} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs text-brand" aria-label={`${ru ? "Убрать" : "Olib tashlash"}: ${names[k]}`}>{names[k]}{!["bbox","lat","commission","center"].includes(k) && `: ${display(k,v)}`} ×</Link>)}</div>
    <div className="flex flex-wrap items-start gap-2"><SaveSearch query={query}/><div className="flex gap-1"><select value={radius} onChange={e=>setRadius(e.target.value)} aria-label={ru ? "Радиус поиска" : "Qidirish masofasi"} className="rounded-full border px-2 py-2 text-sm"><option value="1000">1 km</option><option value="3000">3 km</option><option value="5000">5 km</option></select><button className="rounded-full border bg-white px-4 py-2 text-sm" onClick={() => { setError(""); if (!navigator.geolocation) { setError(ru ? "Геолокация недоступна" : "Joylashuv aniqlanmadi"); return; } navigator.geolocation.getCurrentPosition(p => { const u = new URLSearchParams(query); u.set("lat", String(p.coords.latitude)); u.set("lng", String(p.coords.longitude)); u.set("radius", radius); u.delete("bbox"); u.delete("page"); location.assign(`/joylar?${u}`); }, () => setError(ru ? "Разрешите геолокацию или выберите район." : "Joylashuvga ruxsat bering yoki tumanni tanlang."), { timeout: 10000, maximumAge: 60000 }); }}>⌖ {ru ? "Рядом со мной" : "Menga yaqin"}</button></div></div>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
