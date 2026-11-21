"use client";
import { useEffect, useId, useState } from "react";

export type SheetOption = { value: string; label: string; icon?: React.ReactNode };

/**
 * Ilovalardagidek tanlov: maydon bosilganda pastdan oyna chiqadi (sarlavha, ikonkali ro'yxat, tanlanganida ✓).
 * Tanlash bilan oyna yopiladi. Forma uchun qiymat yashirin input orqali yuboriladi.
 */
export default function SheetSelect({ name, label, value, onChange, options, placeholder, icon, disabled }: {
  name: string; label: string; value: string; onChange: (v: string) => void; options: SheetOption[]; placeholder?: string; icon?: React.ReactNode; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const cur = options.find((o) => o.value === value);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("keydown", esc, true); return () => document.removeEventListener("keydown", esc, true);
  }, [open]);
  return (
    <div>
      <span id={`${id}-l`} className="mb-1.5 block text-sm font-semibold text-slate-900">{label}</span>
      <button type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-labelledby={`${id}-l`} aria-label={label} disabled={disabled} onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-left text-[15px] transition hover:border-brand disabled:opacity-50">
        {(cur?.icon ?? icon) && <span aria-hidden="true" className="text-slate-500">{cur?.icon ?? icon}</span>}
        <span className={`min-w-0 flex-1 truncate ${cur && cur.value ? "font-medium text-slate-900" : "text-slate-500"}`}>{cur?.label ?? placeholder}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <input type="hidden" name={name} value={value} />
      {open && <div className="fixed inset-0 z-[1400] flex items-end justify-center sm:items-center">
        <button type="button" tabIndex={-1} aria-label="Yopish" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-900/40" />
        <div className="relative max-h-[75vh] w-full max-w-lg overflow-hidden rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl sm:rounded-3xl">
          <span aria-hidden="true" className="mx-auto mt-2.5 block h-1.5 w-10 rounded-full bg-slate-200" />
          <p className="px-5 pb-2 pt-3 text-center text-lg font-bold text-slate-900">{label}</p>
          <ul role="listbox" aria-label={label} className="max-h-[calc(75vh-70px)] overflow-y-auto px-2 pb-3">
            {options.map((o) => { const on = o.value === value; return (
              <li key={o.value || "_all"} role="option" aria-selected={on} tabIndex={0}
                onClick={() => { onChange(o.value); setOpen(false); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(o.value); setOpen(false); } }}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3.5 text-[15px] outline-none hover:bg-slate-50 focus-visible:bg-blue-50 ${on ? "font-semibold text-brand" : "text-slate-800"}`}>
                {o.icon && <span aria-hidden="true" className={on ? "text-brand" : "text-slate-500"}>{o.icon}</span>}
                <span className="flex-1">{o.label}</span>
                {on && <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-accent" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>}
              </li>); })}
          </ul>
        </div>
      </div>}
    </div>
  );
}
