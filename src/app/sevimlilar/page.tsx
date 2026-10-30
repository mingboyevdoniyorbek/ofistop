import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { listingCardsByIds } from "@/lib/search";
import { isUuid, MAX_GUEST_FAVS } from "@/lib/guest-favs";
import ListingCard from "@/components/ListingCard";
import GuestFavsLoader from "@/components/GuestFavsLoader";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };
/** Kirmagan foydalanuvchi sevimlilari: ID'lar brauzerdan URL'ga olinadi va server kartalarni chizadi. */
export default async function GuestFavs({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  if (await getCurrentUser().catch(() => null)) redirect("/kabinet/sevimlilar");
  const { locale, t } = await getT(); const ru = locale === "ru";
  const raw = (await searchParams).ids;
  const ids = (raw ?? "").split(",").filter(isUuid).slice(0, MAX_GUEST_FAVS);
  const cards = await listingCardsByIds(ids, locale);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <GuestFavsLoader current={raw ?? null} />
      <h1 className="mb-1 text-xl font-bold">{t("nav.favorites")} {cards.length > 0 && <span className="text-base font-normal text-slate-500">({cards.length})</span>}</h1>
      <p className="mb-4 text-sm text-slate-600">{ru ? "Избранное хранится в этом браузере. " : "Sevimlilar shu brauzerda saqlanadi. "}<Link href="/kirish?next=/kabinet/sevimlilar" className="text-brand underline">{ru ? "Войдите, чтобы сохранить их в аккаунте" : "Hisobga saqlash uchun kiring"}</Link></p>
      {cards.length === 0 ? <p className="rounded border border-dashed border-slate-300 p-6 text-slate-600">{t("cab.favEmpty")} <Link href="/joylar" className="text-brand underline">{t("nav.search")}</Link></p>
        : <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{cards.map((it) => <ListingCard key={it.id} it={it} />)}</div>}
    </div>
  );
}
