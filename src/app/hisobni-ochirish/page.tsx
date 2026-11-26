import Link from "next/link";
import { count, eq } from "drizzle-orm";
import LegalPage from "@/components/LegalPage";
import DeleteAccountForm from "@/components/DeleteAccountForm";
import { db, schema as s } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { pageAlternates } from "@/lib/seo";

export async function generateMetadata() {
  const { t, locale } = await getT();
  return {
    title: t("del.title"),
    description: locale === "ru"
      ? "Удалите свой аккаунт OfisTop и связанные данные: что удаляется, что остаётся и в какие сроки."
      : "OfisTop hisobingizni va ma'lumotlaringizni o'chirish: nimalar o'chadi, nimalar qoladi va qancha vaqtda.",
    alternates: await pageAlternates("/hisobni-ochirish"),
  };
}
export const dynamic = "force-dynamic";

export default async function Page() {
  const { t } = await getT();
  const user = await getCurrentUser().catch(() => null);
  // Baza sozlanmagan bo'lsa ham sahifa ochilishi kerak (Google tekshiruvchisi ko'rishi shart).
  const listings = user
    ? await db().select({ n: count() }).from(s.listings).where(eq(s.listings.ownerId, user.id)).then((r) => r[0]?.n ?? 0).catch(() => null)
    : null;

  return (
    <LegalPage title={t("del.title")}>
      <p>{t("del.lead")}</p>

      <h2 className="mt-4 font-semibold">{t("del.whatH")}</h2>
      <ul className="ml-5 list-disc space-y-1">
        {(["del.what.1", "del.what.2", "del.what.3", "del.what.4", "del.what.5"] as const).map((k) => <li key={k}>{t(k)}</li>)}
      </ul>

      <h2 className="mt-4 font-semibold">{t("del.keepH")}</h2>
      <ul className="ml-5 list-disc space-y-1">
        {(["del.keep.1", "del.keep.2"] as const).map((k) => <li key={k}>{t(k)}</li>)}
      </ul>

      <h2 className="mt-4 font-semibold">{t("del.whenH")}</h2>
      <p>{t("del.when")}</p>
      <h2 className="mt-4 font-semibold">{t("del.afterH")}</h2>
      <p>{t("del.after")}</p>

      <div className="mt-6">
        {user ? <>
          {listings !== null && <p className="mb-2 font-medium">{listings > 0 ? t("del.listings", { n: listings }) : t("del.noListings")}</p>}
          <DeleteAccountForm />
        </> : <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="font-semibold">{t("del.loginH")}</h2>
          <p className="mt-1 text-sm">{t("del.login")}</p>
          <Link href="/kirish?next=%2Fhisobni-ochirish" className="mt-3 inline-block rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">{t("del.loginBtn")}</Link>
        </section>}
      </div>

      <h2 className="mt-6 font-semibold">{t("del.helpH")}</h2>
      <p>{t("del.help")}</p>
      <p className="mt-4 text-sm text-slate-600"><Link href="/maxfiylik" className="text-brand underline">{t("priv.title")}</Link></p>
    </LegalPage>
  );
}
