import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { requireUserPage } from "@/lib/page-auth";
import { effectiveAvailability } from "@/lib/status";
import { labels, priceLabel } from "@/lib/format";
import { getT } from "@/lib/i18n";
import FavoriteButton from "@/components/FavoriteButton";

export const dynamic = "force-dynamic";
export default async function Favs() {
  const user = await requireUserPage("/kabinet/sevimlilar");
  const { locale, t } = await getT();
  const rows = await db().select({ l: s.listings }).from(s.favorites).innerJoin(s.listings, eq(s.listings.id, s.favorites.listingId)).innerJoin(s.users,eq(s.users.id,s.listings.ownerId))
    .where(and(eq(s.favorites.userId, user.id), eq(s.listings.moderationStatus, "approved"),eq(s.listings.isSuspended,false),eq(s.users.isBlocked,false))).orderBy(desc(s.favorites.createdAt));
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">{t("cab.nav.favorites")}</h1>
      {rows.length === 0 ? <p className="rounded border border-dashed border-slate-300 p-6 text-slate-600">{t("cab.favEmpty")} <Link href="/joylar" className="text-brand underline">{t("nav.search")}</Link></p> : (
        <ul className="space-y-2">{rows.map(({ l }) => { const av = effectiveAvailability(l); return (
          <li key={l.id} className="flex items-center justify-between gap-3 rounded border border-slate-200 p-3">
            <div><Link href={`/joylar/${l.id}-${l.slug}`} className="font-semibold text-brand hover:underline">{l.title}</Link>
              <p className="text-sm text-slate-600">{priceLabel({ amount: l.priceAmountMinor, currency: l.currency, period: l.pricePeriod, basis: l.priceBasis, negotiable: l.priceNegotiable }, locale)}{av !== "available" && <span className="ml-2 rounded bg-amber-100 px-1.5 text-amber-900">{labels(locale).avail[av]}</span>}</p></div>
            <FavoriteButton listingId={l.id} initial loggedIn />
          </li>); })}</ul>)}
    </div>
  );
}
