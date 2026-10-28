import LoginForm from "@/components/LoginForm";
import { authMethods } from "@/lib/auth-methods";
import { getT } from "@/lib/i18n";
export async function generateMetadata() { const { t } = await getT(); return { title: t("login.meta"), robots: { index: false } }; }
export const dynamic = "force-dynamic";
export default async function Page() {
  return <div className="min-h-[75vh] bg-white px-2 py-8 sm:bg-slate-50 sm:px-4 sm:py-14"><LoginForm methods={authMethods()} /></div>;
}
