import LegalPage from "@/components/LegalPage";
import { getT } from "@/lib/i18n";
export async function generateMetadata() { const { t } = await getT(); return { title: t("rules.title") }; }
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
