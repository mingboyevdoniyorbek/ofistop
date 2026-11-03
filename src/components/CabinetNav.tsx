"use client";
import { usePathname } from "next/navigation";

/** Kabinet menyusi. E'lon berish/tahrirlash sahifasida yashiriladi — foydalanuvchi faqat formaga e'tibor beradi. */
export default function CabinetNav({ children, label }: { children: React.ReactNode; label: string }) {
  const path = usePathname() ?? "";
  if (/^\/(ru\/)?kabinet\/elon\//.test(path)) return null;
  return <nav aria-label={label} className="mb-5 flex flex-wrap gap-4 border-b border-slate-200 pb-2 text-sm">{children}</nav>;
}
