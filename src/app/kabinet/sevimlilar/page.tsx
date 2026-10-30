import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { requireUserPage } from "@/lib/page-auth";
import { effectiveAvailability } from "@/lib/status";
import { labels } from "@/lib/format";
import { getT } from "@/lib/i18n";
import { listingCardsByIds } from "@/lib/search";
import ListingCard from "@/components/ListingCard";

export const dynamic = "force-dynamic";
export default async function Favs() {
  const user = await requireUserPage("/kabinet/sevimlilar");
  const { locale, t } = await getT();
  const rows = await db().select({ l: s.listings }).from(s.favorites).innerJoin(s.listings, eq(s.listings.id, s.favorites.listingId))
    .where(eq(s.favorites.userId, user.id)).orderBy(desc(s.favorites.createdAt));
  const avail = new Map(rows.map(({ l }) => [l.id, effectiveAvailability(l)]));
  const cards = await listingCardsByIds(rows.map(({ l }) => l.id), locale);
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">{t("cab.nav.favorites")} {cards.length > 0 && <span className="text-base font-normal text-slate-500">({cards.length})</span>}</h1>
      {cards.length === 0 ? <p className="rounded border border-dashed border-slate-300 p-6 text-slate-600">{t("cab.favEmpty")} <Link href="/joylar" className="text-brand underline">{t("nav.search")}</Link></p> : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{cards.map((it) => { const av = avail.get(it.id); return (
          <ListingCard key={it.id} it={it} note={av && av !== "available" ? labels(locale).avail[av] : undefined} />); })}</div>)}
    </div>
  );
}
