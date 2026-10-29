"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "./I18nProvider";
const key = "ofistop-compare";
function read(): string[] { try { const v = JSON.parse(localStorage.getItem(key) ?? "[]"); return Array.isArray(v) ? [...new Set(v.filter(x => typeof x === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(x)))].slice(0, 3) : []; } catch { return []; } }
function write(ids: string[]) { try { localStorage.setItem(key, JSON.stringify(ids)); } catch {} window.dispatchEvent(new Event(key)); }
function useCompare() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => { const sync = () => setIds(read()); sync(); window.addEventListener(key, sync); window.addEventListener("storage", sync); return () => { window.removeEventListener(key, sync); window.removeEventListener("storage", sync); }; }, []);
  return ids;
}
export function CompareButton({ id, onComparePage = false }: { id: string; onComparePage?: boolean }) {
  const ids = useCompare(), ru = useLocale() === "ru", active = onComparePage || ids.includes(id), router = useRouter();
  const [message, setMessage] = useState("");
  return <div><button type="button" aria-pressed={active} className={`rounded-full border px-3 py-1.5 text-xs ${active ? "border-brand bg-blue-50 text-brand" : "border-slate-200 text-slate-600"}`} onClick={() => {
    const current = read(); setMessage("");
    if (onComparePage) { const remaining = (new URLSearchParams(location.search).get("ids") ?? "").split(",").filter(x=>x!==id); write(remaining); router.replace(`/taqqoslash?ids=${remaining.join(",")}`,{scroll:false}); return; }
    if (current.includes(id)) write(current.filter(x => x !== id));
    else if (current.length < 3) write([...current, id]);
    else setMessage(ru ? "Можно сравнить до 3 помещений. Уберите одно." : "3 tagacha joyni solishtirish mumkin. Bittasini olib tashlang.");
  }}>{active ? "✓ " : "⇄ "}{ru ? "Сравнить" : "Taqqoslash"}</button>{message && <p role="status" className="mt-1 text-xs text-amber-800">{message}</p>}</div>;
}
export function CompareBar() {
  const ids = useCompare(), ru = useLocale() === "ru";
  const path = usePathname();
  if (!ids.length || ["/kabinet","/admin","/kirish"].some(prefix=>path.startsWith(prefix))) return null;
  return <div className="fixed bottom-20 left-1/2 z-[1100] flex max-w-[94vw] -translate-x-1/2 items-center gap-3 rounded-full bg-brand px-5 py-3 text-sm text-white shadow-xl md:bottom-5">
    <Link href={`/taqqoslash?ids=${ids.join(",")}`} className="whitespace-nowrap font-semibold">⇄ {ru ? "Сравнить" : "Taqqoslash"} ({ids.length}/3)</Link><button aria-label={ru ? "Очистить сравнение" : "Taqqoslashni tozalash"} onClick={() => write([])}>✕</button>
  </div>;
}
