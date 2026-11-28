"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "./I18nProvider";
import { prepareUpload } from "@/lib/prepare-upload";

type Photo = { key: string; url: string | null };

/**
 * Mebel firmasi rasmlari (3 ta): 1) logotip yoki o'z rasmingiz — ro'yxatdagi «ME» o'rnida chiqadi;
 * 2–3) ishlaringiz, do'kon yoki sexdagi mahsulotlardan namunalar — foydalanuvchi ishonchi uchun.
 */
export default function FirmPhotos({ firmId, logo, photos, onChange }: { firmId: string; logo: string | null; photos: Photo[]; onChange?: (v: { logo: string | null; photos: Photo[] }) => void }) {
  const ru = useLocale() === "ru"; const router = useRouter();
  const [state, setState] = useState({ logo, photos });
  const [busy, setBusy] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null), workRef = useRef<HTMLInputElement>(null);
  const update = (v: typeof state) => { setState(v); onChange?.(v); router.refresh(); };

  async function upload(slot: "logo" | "work", file: File | undefined) {
    if (!file) return; setBusy(slot); setErr(null);
    try {
      const fd = new FormData(); fd.set("slot", slot); fd.set("file", await prepareUpload(file));
      const r = await fetch(`/api/furniture/${firmId}/images`, { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? (ru ? "Не удалось загрузить" : "Yuklab bo‘lmadi"));
      const url = `/api/media/${d.key}`;
      update(slot === "logo" ? { ...state, logo: url } : { ...state, photos: [...state.photos, { key: d.key, url }] });
    } catch (e) { setErr(e instanceof Error ? e.message : "Xato"); }
    finally { setBusy(null); if (logoRef.current) logoRef.current.value = ""; if (workRef.current) workRef.current.value = ""; }
  }
  async function remove(body: object, next: typeof state) {
    setBusy("del"); setErr(null);
    const r = await fetch(`/api/furniture/${firmId}/images`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    setBusy(null);
    if (r?.ok) update(next); else setErr(ru ? "Не удалось удалить" : "O‘chirib bo‘lmadi");
  }
  const box = "relative grid aspect-square place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500 transition hover:border-brand";
  const del = "absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-sm text-red-700 shadow";
  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="mb-1 truncate text-xs font-semibold text-slate-700">{ru ? "Логотип / фото" : "Logotip / rasm"}</p>
          {state.logo ? <div className={`${box} border-solid`}><img src={state.logo} alt="" className="h-full w-full object-cover" /><button type="button" aria-label={ru ? "Удалить логотип" : "Logotipni o‘chirish"} disabled={!!busy} onClick={() => remove({ slot: "logo" }, { ...state, logo: null })} className={del}>✕</button></div>
            : <button type="button" disabled={!!busy} onClick={() => logoRef.current?.click()} className={box}>{busy === "logo" ? "…" : <span><span className="block text-2xl text-brand">＋</span>{ru ? "Логотип" : "Logotip"}</span>}</button>}
        </div>
        {[0, 1].map((i) => { const p = state.photos[i]; return (
          <div key={i}>
            <p className="mb-1 truncate text-xs font-semibold text-slate-700">{ru ? `Работа ${i + 1}` : `Ish namunasi ${i + 1}`}</p>
            {p ? <div className={`${box} border-solid`}><img src={p.url ?? ""} alt="" className="h-full w-full object-cover" /><button type="button" aria-label={ru ? "Удалить фото" : "Rasmni o‘chirish"} disabled={!!busy} onClick={() => remove({ key: p.key }, { ...state, photos: state.photos.filter((x) => x.key !== p.key) })} className={del}>✕</button></div>
              : <button type="button" disabled={!!busy || i > state.photos.length} onClick={() => workRef.current?.click()} className={`${box} disabled:opacity-50`}>{busy === "work" && i === state.photos.length ? "…" : <span><span className="block text-2xl text-brand">＋</span>{ru ? "Фото" : "Rasm"}</span>}</button>}
          </div>); })}
      </div>
      <p className="mt-2 text-xs text-slate-500">{ru ? "Примеры: готовая мебель, шоурум, цех. Хорошие фото повышают доверие покупателей." : "Masalan: tayyor mebel, do‘kon yoki sexdagi mahsulotlar. Sifatli rasmlar xaridor ishonchini oshiradi."}</p>
      {err && <p role="alert" className="mt-1 text-sm text-red-700">{err}</p>}
      <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => upload("logo", e.target.files?.[0])} />
      <input ref={workRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => upload("work", e.target.files?.[0])} />
    </div>
  );
}
