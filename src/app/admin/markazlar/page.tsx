import { asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { requireStaffPage } from "@/lib/staff";
import { getT } from "@/lib/i18n";
import CenterEditor from "@/components/CenterEditor";
import { mediaUrl } from "@/lib/storage";
import AdminForm from "@/components/AdminForm";
import AdminAction from "@/components/AdminAction";
import CenterReviewPanel from "@/components/CenterReviewPanel";
import { searchKey } from "@/lib/text";

export default async function Centers({ searchParams }: { searchParams: Promise<{ q?: string; holat?: string; page?: string }> }) {
  await requireStaffPage(true);
  const { locale, t } = await getT(); const nm = (x: { nameUz: string; nameRu: string }) => (locale === "ru" ? x.nameRu : x.nameUz);
  const d = db();
  const regions = await d.select().from(s.regions).orderBy(asc(s.regions.nameUz));
  const districts = await d.select().from(s.districts).orderBy(asc(s.districts.nameUz));
  const centers = await d.select({ c: s.businessCenters, region: locale === "ru" ? s.regions.nameRu : s.regions.nameUz }).from(s.businessCenters).leftJoin(s.regions, eq(s.regions.id, s.businessCenters.regionId)).orderBy(asc(s.businessCenters.name));
  const members = await d.select({ centerId: s.businessCenterMemberships.centerId, userId: s.businessCenterMemberships.userId, phone: s.users.phone, name: s.profiles.displayName })
    .from(s.businessCenterMemberships).innerJoin(s.users, eq(s.users.id, s.businessCenterMemberships.userId)).leftJoin(s.profiles, eq(s.profiles.userId, s.users.id));
  const amenities = await db().select().from(s.amenities);
  const images = await db().select().from(s.businessCenterImages).orderBy(s.businessCenterImages.position);
  const ru = locale === "ru";
  const fieldLabels: Record<string, string> = { name: ru ? "Название" : "Nomi", tagline: ru ? "Слоган" : "Qisqa shior", description: ru ? "Описание" : "Tavsif", address: ru ? "Адрес" : "Manzil",
    regionId: ru ? "Регион (ID)" : "Hudud (ID)", districtId: ru ? "Район (ID)" : "Tuman (ID)", lat: "Lat", lng: "Lng", contactPhone: ru ? "Телефон" : "Telefon", telegramUsername: "Telegram",
    amenities: ru ? "Удобства" : "Qulayliklar", workingHours: ru ? "Часы работы" : "Ish vaqti", website: ru ? "Сайт" : "Sayt" };
  const roomCounts = new Map((await d.select({ c: s.listings.centerId, n: sql<number>`count(*)::int` }).from(s.listings).where(isNotNull(s.listings.centerId)).groupBy(s.listings.centerId)).map((r) => [r.c!, r.n]));
  // Qidiruv va filtr: nom/manzil bo'yicha; "kutilmoqda" — faqat vakil o'zgarishlari tasdiq kutayotganlar.
  const needsReview = (c: { id: string; pendingChanges: unknown }) => !!c.pendingChanges || images.some((i) => i.centerId === c.id && i.pending);
  const sp = await searchParams, q = (sp.q ?? "").trim(), onlyPending = sp.holat === "kutilmoqda";
  // Tekshiruv kutayotgan markazlar ro'yxat boshida; sahifada 20 tadan.
  centers.sort((a, b) => Number(needsReview(b.c)) - Number(needsReview(a.c)));
  const shownCenters = centers.filter(({ c }) => (!q || searchKey(`${c.name} ${c.address}`).includes(searchKey(q))) && (!onlyPending || needsReview(c)));
  const PER = 20, pages = Math.max(1, Math.ceil(shownCenters.length / PER)), page = Math.min(pages, Math.max(1, Number(sp.page) || 1));
  const pageCenters = shownCenters.slice((page - 1) * PER, page * PER);
  const pageHref = (n: number) => `/admin/markazlar?${new URLSearchParams({ ...(q ? { q } : {}), ...(onlyPending ? { holat: "kutilmoqda" } : {}), page: String(n) })}`;
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t("adm.nav.centers")}</h1>
      <section className="rounded border border-slate-200 p-4"><h2 className="mb-3 font-semibold">{t("adm.c.new")}</h2>
        <AdminForm url="/api/admin/centers" submit={t("adm.c.create")} fields={[
          { name: "name", label: t("adm.c.name"), required: true }, { name: "address", label: t("adm.c.address"), required: true },
          { name: "regionId", label: t("adm.c.region"), type: "select", required: true, options: regions.map((r) => ({ value: r.id, label: nm(r) })) },
          { name: "districtId", label: t("adm.c.district"), type: "select", options: districts.map((x) => ({ value: x.id, label: `${nm(x)} (${nm(regions.find((r) => r.id === x.regionId)!)})` })) },
          { name: "contactPhone", label: t("adm.c.phone"), placeholder: "+998 ..." }, { name: "telegramUsername", label: t("adm.c.telegram") },
          { name: "description", label: t("adm.c.desc"), type: "textarea" }]} /></section>
      <form className="flex flex-wrap items-center gap-2" role="search"><input name="q" defaultValue={q} placeholder={ru ? "Название или адрес" : "Nomi yoki manzili"} aria-label={ru ? "Поиск центра" : "Markaz qidirish"} className="rounded border border-slate-300 px-3 py-1.5 text-sm" />
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="holat" value="kutilmoqda" defaultChecked={onlyPending} /> {ru ? "Только ожидающие проверки" : "Faqat tasdiq kutayotganlar"}</label>
        <button className="rounded border border-slate-300 px-3 py-1.5 text-sm">{ru ? "Найти" : "Qidirish"}</button><span className="text-sm text-slate-500">{shownCenters.length} / {centers.length}</span></form>
      <ul className="space-y-3">{pageCenters.map(({ c, region }) => { const ms = members.filter((m) => m.centerId === c.id); return (
        <li key={c.id} className="rounded border border-slate-200 p-3 text-sm">
          <p className="font-medium">{c.name} {c.isDemo && <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-800">DEMO</span>}</p>
          <p className="text-slate-600">{region} · {c.address}</p>
          <CenterReviewPanel c={c} ru={locale === "ru"} labels={fieldLabels} rooms={roomCounts.get(c.id) ?? 0} />
          <CenterEditor center={c} regions={regions.map(r=>({id:r.id,name:nm(r)}))} districts={districts.map(r=>({id:r.id,regionId:r.regionId,name:nm(r)}))} amenities={amenities.map(a=>({code:a.code,name:locale === "ru"?a.nameRu:a.nameUz}))} images={images.filter(i=>i.centerId===c.id).map(i=>({id:i.id,url:mediaUrl(i.storageKey),pending:i.pending}))}/>
          <p className="mt-2 text-slate-500">{t("adm.c.reps")}</p>
          <ul className="mb-2">{ms.length === 0 && <li className="text-slate-400">{t("adm.c.none")}</li>}{ms.map((m) => <li key={m.userId} className="flex items-center gap-2 py-0.5">{m.name} · {m.phone}<AdminAction url={`/api/admin/centers/${c.id}/members`} body={{ action: "remove", userId: m.userId }} label={t("adm.c.remove")} tone="danger" confirm={t("adm.c.confirmRemove")} /></li>)}</ul>
          <AdminForm url={`/api/admin/centers/${c.id}/members`} extra={{ action: "add" }} submit={t("adm.c.attach")} fields={[
            { name:"phone",label:locale === "ru" ? "Телефон или Gmail аккаунта" : "Hisobning telefon raqami yoki Gmail manzili",placeholder:"+998 ... / name@gmail.com", required:true }
          ]} />
        </li>); })}</ul>
      {pages > 1 && <nav className="flex flex-wrap items-center gap-2 text-sm" aria-label={ru ? "Страницы" : "Sahifalar"}>
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => <a key={n} href={pageHref(n)} aria-current={n === page ? "page" : undefined} className={`rounded border px-3 py-1 ${n === page ? "border-brand bg-brand text-white" : "border-slate-300"}`}>{n}</a>)}
      </nav>}
    </div>
  );
}
