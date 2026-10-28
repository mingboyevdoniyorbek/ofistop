import LoginForm from "@/components/LoginForm";
import { authMethods } from "@/lib/auth-methods";
import { getT } from "@/lib/i18n";
export async function generateMetadata() { const { t } = await getT(); return { title: t("login.meta"), robots: { index: false } }; }
export const dynamic = "force-dynamic";
export default async function Page() {
  const { t } = await getT();
  return <div className="mx-auto max-w-sm px-4 py-10"><h1 className="text-xl font-bold mb-4">{t("login.title")}</h1><LoginForm methods={authMethods()} /></div>;
}
