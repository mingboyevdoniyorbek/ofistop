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
      <summary aria-label={label} className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded border border-slate-300 text-lg [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true">☰</span>
      </summary>
      <div className="absolute right-0 top-full z-30 mt-2 flex w-60 flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg [&>a]:rounded [&>a]:px-3 [&>a]:py-2 [&>a:hover]:bg-slate-50">{children}</div>
    </details>
  );
}
