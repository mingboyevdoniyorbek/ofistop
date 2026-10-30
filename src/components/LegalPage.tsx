import { getT } from "@/lib/i18n";
import { siteInfo } from "@/lib/site-info";
import SiteContacts from "./SiteContacts";
export default async function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  const { locale } = await getT(); const ru = locale === "ru";
  const s = siteInfo();
  const operator = [s.company, s.inn && `${ru ? "ИНН" : "STIR"}: ${s.inn}`, s.address].filter(Boolean);
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 space-y-3 leading-relaxed">
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
      {(operator.length > 0 || s.phone || s.email || s.telegram) && (
        <section className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <h2 className="mb-1 font-semibold">{ru ? "Оператор платформы и контакты" : "Platforma operatori va aloqa"}</h2>
          {operator.length > 0 && <p>{operator.join(" · ")}</p>}
          <SiteContacts className="mt-1 text-brand" />
        </section>
      )}
    </article>
  );
}
