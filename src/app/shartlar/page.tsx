import LegalPage from "@/components/LegalPage";
import { getT } from "@/lib/i18n";
export async function generateMetadata() { const { t } = await getT(); return { title: t("terms.title") }; }
export const dynamic = "force-dynamic";
export default async function Page() {
  const { t } = await getT();
  return (
    <LegalPage title={t("terms.title")}>
      <ul className="list-disc ml-5 space-y-1.5">
        {(["terms.1", "terms.2", "terms.3", "terms.4", "terms.5"] as const).map((k) => <li key={k}>{t(k)}</li>)}
      </ul>
    </LegalPage>
  );
}
