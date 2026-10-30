"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { readGuestFavs } from "@/lib/guest-favs";

/** Brauzerdagi sevimlilar ro'yxatini URL'ga qo'yadi (server shu ID'lar bo'yicha kartalarni chizadi). */
export default function GuestFavsLoader({ current }: { current: string | null }) {
  const router = useRouter(); const path = usePathname();
  useEffect(() => {
    const sync = () => { const ids = readGuestFavs().join(","); if (ids !== (current ?? "")) router.replace(ids ? `${path}?ids=${ids}` : path, { scroll: false }); };
    sync(); window.addEventListener("ofistop-fav", sync);
    return () => window.removeEventListener("ofistop-fav", sync);
  }, [current, path, router]);
  return null;
}
