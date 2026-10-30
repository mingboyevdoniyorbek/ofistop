"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readGuestFavs, writeGuestFavs } from "@/lib/guest-favs";

/** Kirgandan keyin brauzerdagi (mehmon) sevimlilarni hisobga ko'chiradi. */
export default function FavSync() {
  const router = useRouter();
  useEffect(() => {
    const ids = readGuestFavs(); if (!ids.length) return;
    let cancelled = false;
    (async () => {
      const left: string[] = [];
      for (const listingId of ids.reverse()) { // eng eskisidan: hisobda ham tartib saqlanadi
        const r = await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId }) }).catch(() => null);
        if (!r || (!r.ok && r.status !== 404)) left.push(listingId); // 404: e'lon endi yo'q — tashlab yuboriladi
      }
      if (cancelled) return;
      writeGuestFavs(left.reverse());
      router.refresh();
    })();
    return () => { cancelled = true; };
  }, [router]);
  return null;
}
