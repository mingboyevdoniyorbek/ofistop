import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { managedCenterIds, isUuid } from "@/lib/guard";
import { requireUserPage } from "@/lib/page-auth";
import { getT } from "@/lib/i18n";
import { mediaUrl } from "@/lib/storage";
import CenterEditor from "@/components/CenterEditor";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, user = await requireUserPage(`/kabinet/markazlar/${id}`), { locale } = await getT(), ru = locale === "ru";
  if (!isUuid(id) || !(await managedCenterIds(user.id)).includes(id)) notFound();
  const [center] = await db().select().from(s.businessCenters).where(eq(s.businessCenters.id, id)); if (!center) notFound();
  const [regions, districts, amenities, images] = await Promise.all([db().select().from(s.regions), db().select().from(s.districts), db().select().from(s.amenities), db().select().from(s.businessCenterImages).where(eq(s.businessCenterImages.centerId, id)).orderBy(s.businessCenterImages.position)]);
  return <div><Link href="/kabinet/markazlar" className="text-brand">← {ru ? "Мои центры" : "Markazlarim"}</Link><h1 className="mt-4 text-2xl font-bold">{center.name}</h1><CenterEditor expanded endpoint={`/api/centers/${id}`} center={center} regions={regions.map(r => ({ id:r.id,name:ru?r.nameRu:r.nameUz }))} districts={districts.map(r => ({id:r.id,regionId:r.regionId,name:ru?r.nameRu:r.nameUz}))} amenities={amenities.map(a => ({code:a.code,name:ru?a.nameRu:a.nameUz}))} images={images.map(i => ({id:i.id,url:mediaUrl(i.storageKey)}))}/></div>;
}
