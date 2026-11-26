import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { getT } from "@/lib/i18n";
import { pageAlternates } from "@/lib/seo";
import { promoEnabled } from "@/lib/launch-mode";
export async function generateMetadata() { const { t, locale } = await getT(); return { title: t("priv.title"), description: t("priv.title") + " — OfisTop: " + (locale === "ru" ? "платформа аренды коммерческой недвижимости." : "tijorat joylari ijarasi platformasi."), alternates: await pageAlternates("/maxfiylik") }; }
export const dynamic = "force-dynamic";
export default async function Page() {
  const { t, locale } = await getT();
  // Hisoblagichlar haqida faqat ular haqiqatan ulangan bo'lsa yoziladi (soxta ma'lumot bo'lmasin).
  const analytics = !!(process.env.NEXT_PUBLIC_GA_ID?.trim() || process.env.NEXT_PUBLIC_YM_ID?.trim());
  return (
    <LegalPage title={t("priv.title")}>
      <h2 className="font-semibold mt-2">{t("priv.h1")}</h2>
      <ul className="list-disc ml-5 space-y-1">
        {(["priv.1", "priv.2", "priv.3", "priv.4", "priv.5", "priv.6"] as const).map((k) => <li key={k}>{k === "priv.1" && promoEnabled() ? (locale === "ru" ? "В период запуска кабинет создаётся без подтверждения телефона. Сохраняется случайный идентификатор; контактный телефон вы указываете в объявлении." : "Reklama davrida kabinet telefonni tasdiqlamasdan ochiladi. Tasodifiy hisob identifikatori saqlanadi; aloqa telefonini e’londa o‘zingiz kiritasiz.") : t(k)}</li>)}
      </ul>
      <h2 className="font-semibold mt-2">{t("priv.h2")}</h2>
      <p>{t("priv.public")}</p>
      <h2 className="font-semibold mt-2">{t("priv.h3")}</h2>
      <p>{t("priv.images")}</p>
      <h2 className="font-semibold mt-2">{t("priv.h5")}</h2>
      <p>{t("priv.geo")}</p>
      <h2 className="font-semibold mt-2">{t("priv.h6")}</h2>
      <p>{t("priv.external")}</p>
      {analytics && <>
        <h2 className="font-semibold mt-2">{t("priv.h7")}</h2>
        <p>{t("priv.analytics")}</p>
      </>}
      <h2 className="font-semibold mt-2">{t("priv.h8")}</h2>
      <p>{t("priv.delete")} <Link href="/hisobni-ochirish" className="text-brand underline">{t("del.title")}</Link></p>
      <h2 className="font-semibold mt-2">{t("priv.h9")}</h2>
      <p>{t("priv.retention")}</p>
      <h2 className="font-semibold mt-2">{t("priv.h10")}</h2>
      <p>{t("priv.children")}</p>
      <h2 className="font-semibold mt-2">{t("priv.h4")}</h2>
      <p>{t("priv.requests")}</p>
    </LegalPage>
  );
}
