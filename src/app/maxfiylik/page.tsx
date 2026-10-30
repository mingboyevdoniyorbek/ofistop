import LegalPage from "@/components/LegalPage";
import { getT } from "@/lib/i18n";
import { pageAlternates } from "@/lib/seo";
import { promoEnabled } from "@/lib/launch-mode";
export async function generateMetadata() { const { t, locale } = await getT(); return { title: t("priv.title"), description: t("priv.title") + " — OfisTop: " + (locale === "ru" ? "платформа аренды коммерческой недвижимости." : "tijorat joylari ijarasi platformasi."), alternates: await pageAlternates("/maxfiylik") }; }
export const dynamic = "force-dynamic";
export default async function Page() {
  const { t, locale } = await getT();
  return (
    <LegalPage title={t("priv.title")}>
      <h2 className="font-semibold mt-2">{t("priv.h1")}</h2>
      <ul className="list-disc ml-5 space-y-1">
        {(["priv.1", "priv.2", "priv.3", "priv.4", "priv.5"] as const).map((k) => <li key={k}>{k === "priv.1" && promoEnabled() ? (locale === "ru" ? "В период запуска кабинет создаётся без подтверждения телефона. Сохраняется случайный идентификатор; контактный телефон вы указываете в объявлении." : "Reklama davrida kabinet telefonni tasdiqlamasdan ochiladi. Tasodifiy hisob identifikatori saqlanadi; aloqa telefonini e’londa o‘zingiz kiritasiz.") : t(k)}</li>)}
      </ul>
      <h2 className="font-semibold mt-2">{t("priv.h2")}</h2>
      <p>{t("priv.public")}</p>
      <h2 className="font-semibold mt-2">{t("priv.h3")}</h2>
      <p>{t("priv.images")}</p>
      <h2 className="font-semibold mt-2">{t("priv.h4")}</h2>
      <p>{t("priv.requests")}</p>
    </LegalPage>
  );
}
