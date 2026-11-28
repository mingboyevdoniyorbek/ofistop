import Link from "next/link";
import { getT } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { isGuestPhone } from "@/lib/launch-mode";
import CabinetNav from "@/components/CabinetNav";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { managedCenterIds } from "@/lib/guard";

export async function generateMetadata() { const { t } = await getT(); return { title: t("cab.meta"), robots: { index: false, follow: false } }; }
export default async function KabinetLayout({ children }: { children: React.ReactNode }) {
  const { t, locale } = await getT();
  const user = await getCurrentUser();
  // Mebel firmasi bo'lsa — «Mebel firmam» bo'limi; markazi yo'q mebelchida «Biznes markazlarim» o'rnida chiqadi.
  const [hasFirm, hasCenter] = user ? await Promise.all([
    db().select({ id: s.furnitureFirms.id }).from(s.furnitureFirms).where(eq(s.furnitureFirms.userId, user.id)).limit(1).then((r) => r.length > 0).catch(() => false),
    managedCenterIds(user.id).then((r) => r.length > 0).catch(() => false),
  ]) : [false, false];
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {user && isGuestPhone(user.phone) && <p className="mb-4 rounded-2xl bg-blue-50 p-3 text-sm text-blue-900">{locale === "ru" ? "Ваши объявления и уведомления доступны в этом браузере 30 дней. Не очищайте данные сайта и не используйте режим инкогнито для своих объявлений." : "E’lonlaringiz va bildirishnomalar shu brauzerda 30 kun davomida ochiladi. Sayt ma’lumotlarini tozalamang va o‘z e’lonlaringiz uchun inkognito rejimdan foydalanmang."}</p>}
      <CabinetNav label={t("cab.meta")}
        extra={user && isGuestPhone(user.phone) ? <Link href="/kirish?next=/kabinet" className="inline-flex shrink-0 items-center rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-white">{locale === "ru" ? "Подтвердить аккаунт" : "Hisobni tasdiqlash"}</Link> : null}
        items={[
          { href: "/kabinet", label: t("cab.nav.listings"), icon: "list" },
          ...(hasFirm ? [{ href: "/kabinet/mebel", label: locale === "ru" ? "Мебель" : "Mebel firmam", icon: "sofa" as const }] : []),
          ...(hasCenter || !hasFirm ? [{ href: "/kabinet/markazlar", label: locale === "ru" ? "Мои бизнес-центры" : "Biznes markazlarim", icon: "building" as const }] : []),
          { href: "/kabinet/qidiruvlar", label: locale === "ru" ? "Сохранённые поиски" : "Saqlangan qidiruvlar", icon: "bookmark" },
          { href: "/kabinet/profil", label: t("cab.nav.profile"), icon: "user" },
        ]} />
      {children}
    </div>
  );
}
