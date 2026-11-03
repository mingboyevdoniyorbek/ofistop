"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Har bir sahifa ochilishini /api/visit'ga yuboradi (admin analitikasi uchun).
 * Brauzerda faqat tasodifiy ID saqlanadi; server uni xeshlaydi. Birinchi sahifada kirish manbasi (referrer/utm) ham yuboriladi.
 */
export default function VisitTracker() {
  const path = usePathname(); const first = useRef(true);
  useEffect(() => {
    if (!path || path.startsWith("/admin")) return;
    let vid = "";
    try { vid = localStorage.getItem("ofistop-vid") ?? ""; if (!vid) { vid = crypto.randomUUID(); localStorage.setItem("ofistop-vid", vid); } }
    catch { vid = ""; } // maxfiy rejim — hisoblanmaydi
    if (!vid) return;
    const utm = first.current ? new URLSearchParams(location.search).get("utm_source") ?? "" : "";
    const body = JSON.stringify({ path, vid, ref: first.current ? document.referrer : "", utm, w: window.innerWidth });
    first.current = false;
    try { if (!navigator.sendBeacon?.("/api/visit", new Blob([body], { type: "application/json" }))) throw 0; }
    catch { fetch("/api/visit", { method: "POST", body, keepalive: true }).catch(() => {}); }
  }, [path]);
  return null;
}
