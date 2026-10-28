import { notFound } from "next/navigation";
import { asc, eq, inArray, or } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { requireUserPage } from "@/lib/page-auth";
import { isUuid, listingAmenities, managedCenterIds } from "@/lib/guard";
import { canEditListing } from "@/lib/status";
import { toForm } from "@/lib/listing-input";
import { listImages } from "@/lib/listing-images";
import ListingWizard from "@/components/ListingWizard";
import { getT } from "@/lib/i18n";
import { promoEnabled } from "@/lib/launch-mode";

export const dynamic = "force-dynamic";
export async function generateMetadata() { const { t } = await getT(); return { title: t("wiz.meta"), robots: { index: false, follow: false } }; }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage(`/kabinet/elon/${id}`);
  if (!isUuid(id)) notFound();
  const { locale } = await getT(); const ru = locale === "ru";
  const d = db();
  const [l] = await d.select().from(s.listings).where(eq(s.listings.id, id)).limit(1);
  const managed = await managedCenterIds(user.id);
  if (!l || !canEditListing(user, l, managed, l.centerId)) notFound();
  const [regions, districts, amenities, centers] = await Promise.all([
    d.select().from(s.regions).orderBy(asc(s.regions.id)), d.select().from(s.districts).orderBy(asc(s.districts.nameUz)), d.select().from(s.amenities),
    user.role === "admin" ? d.select({id:s.businessCenters.id,name:s.businessCenters.name}).from(s.businessCenters) : managed.length || l.centerId ? d.select({ id: s.businessCenters.id, name: s.businessCenters.name }).from(s.businessCenters).where(inArray(s.businessCenters.id, [...new Set([...managed, ...(l.centerId ? [l.centerId] : [])])])) : Promise.resolve([]),
  ]);
  return (
    <ListingWizard promo={promoEnabled()} updatedAt={l.updatedAt.toISOString()} id={l.id} slug={l.slug} initial={toForm(l, await listingAmenities(l.id))} images={await listImages(l.id)} moderation={l.moderationStatus} rejectionReason={l.rejectionReason} archived={l.availabilityStatus === "archived"}
      regions={regions.map((r) => ({ id: r.id, name: ru ? r.nameRu : r.nameUz }))} districts={districts.map((x) => ({ id: x.id, regionId: x.regionId, name: ru ? x.nameRu : x.nameUz })).sort((a, b) => a.name.localeCompare(b.name, locale))}
      amenities={amenities.map((a) => ({ code: a.code, name: ru ? a.nameRu : a.nameUz }))} centers={centers} />
  );
}
