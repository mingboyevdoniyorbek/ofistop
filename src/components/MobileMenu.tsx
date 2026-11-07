"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** Mobil header menyusi (<details>: JS'siz ham ochiladi). Sahifa almashganda yopiladi. */
export default function MobileMenu({ label, children }: { label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const path = usePathname();
  useEffect(() => { if (ref.current) ref.current.open = false; }, [path]);
  useEffect(() => {
    const close = (e: MouseEvent | KeyboardEvent) => {
      const d = ref.current; if (!d?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !d.contains(e.target as Node)) { d.open = false; if (e instanceof KeyboardEvent) d.querySelector("summary")?.focus(); }
    };
    document.addEventListener("click", close); document.addEventListener("keydown", close);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", close); };
  }, []);
  return (
    <details ref={ref} className="relative md:hidden">
      <summary aria-label={label} className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-slate-200 text-lg [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true">☰</span>
      </summary>
      <div className="absolute right-0 top-full z-30 mt-2 flex w-64 flex-col gap-0.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl [&>a]:flex [&>a]:items-center [&>a]:gap-3 [&>a]:rounded-xl [&>a]:px-3 [&>a]:py-2.5 [&>a]:text-slate-700 [&>a:hover]:bg-slate-50 [&>a>svg]:text-brand">{children}</div>
    </details>
  );
}
