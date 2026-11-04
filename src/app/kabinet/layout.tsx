import Link from "next/link";
import { getT } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { isGuestPhone } from "@/lib/launch-mode";
import CabinetNav from "@/components/CabinetNav";

export async function generateMetadata() { const { t } = await getT(); return { title: t("cab.meta"), robots: { index: false, follow: false } }; }
export default async function KabinetLayout({ children }: { children: React.ReactNode }) {
  const { t, locale } = await getT();
  const user = await getCurrentUser();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {user && isGuestPhone(user.phone) && <p className="mb-4 rounded bg-blue-50 p-3 text-sm text-blue-900">{locale === "ru" ? "Ваши объявления и уведомления доступны в этом браузере 30 дней. Не очищайте данные сайта и не используйте режим инкогнито для своих объявлений." : "E’lonlaringiz va bildirishnomalar shu brauzerda 30 kun davomida ochiladi. Sayt ma’lumotlarini tozalamang va o‘z e’lonlaringiz uchun inkognito rejimdan foydalanmang."}</p>}
      <CabinetNav label={t("cab.meta")}>
        {user && isGuestPhone(user.phone) && <Link href="/kirish?next=/kabinet" className="font-semibold text-brand underline">{locale === "ru" ? "Подтвердить аккаунт" : "Hisobni tasdiqlash"}</Link>}
        <Link href="/kabinet" className="hover:underline">{t("cab.nav.listings")}</Link>
        <Link href="/kabinet/markazlar" className="hover:underline">{locale === "ru" ? "Мои бизнес-центры" : "Biznes markazlarim"}</Link>
        <Link href="/kabinet/qidiruvlar" className="hover:underline">{locale === "ru" ? "Сохранённые поиски" : "Saqlangan qidiruvlar"}</Link>
        <Link href="/kabinet/profil" className="hover:underline">{t("cab.nav.profile")}</Link>
      </CabinetNav>
      {children}
    </div>
  );
}
