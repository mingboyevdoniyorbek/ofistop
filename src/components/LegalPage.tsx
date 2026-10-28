import { getT } from "@/lib/i18n";
export default async function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  const { t } = await getT();
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 space-y-3 leading-relaxed">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p role="note" className="rounded border border-amber-400 bg-amber-50 p-3 text-sm">{t("legal.note")}</p>
      {children}
    </article>
  );
}
