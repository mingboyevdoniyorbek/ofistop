"use client";
import { useEffect } from "react";
/** Keep list position when returning from a listing, including hard navigation. */
export default function SearchRestore() {
  useEffect(() => {
    const key = `ofistop-scroll:${location.pathname}${location.search}`;
    let timer: ReturnType<typeof setTimeout>;
    const save = () => { try { sessionStorage.setItem(key, String(window.scrollY)); } catch {} };
    const scroll = () => { clearTimeout(timer); timer = setTimeout(save, 150); };
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navigation?.type === "back_forward") { try { const y = Number(sessionStorage.getItem(key)); if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y)); } catch {} }
    window.addEventListener("scroll", scroll, { passive: true }); window.addEventListener("pagehide", save);
    return () => { clearTimeout(timer); save(); window.removeEventListener("scroll", scroll); window.removeEventListener("pagehide", save); };
  }, []);
  return null;
}
