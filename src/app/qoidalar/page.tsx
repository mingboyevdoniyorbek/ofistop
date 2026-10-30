import LegalPage from "@/components/LegalPage";
import { getT } from "@/lib/i18n";
import { pageAlternates } from "@/lib/seo";
export async function generateMetadata() { const { t, locale } = await getT(); return { title: t("rules.title"), description: t("rules.title") + " — OfisTop: " + (locale === "ru" ? "платформа аренды коммерческой недвижимости." : "tijorat joylari ijarasi platformasi."), alternates: await pageAlternates("/qoidalar") }; }
export const dynamic = "force-dynamic";
export default async function Page() {
  const { t } = await getT();
  return (
    <LegalPage title={t("rules.title")}>
      <ul className="list-disc ml-5 space-y-1.5">
        {(["rules.1", "rules.2", "rules.3", "rules.4", "rules.5", "rules.6", "rules.7", "rules.8"] as const).map((k) => <li key={k}>{t(k)}</li>)}
      </ul>
    </LegalPage>
  );
}
