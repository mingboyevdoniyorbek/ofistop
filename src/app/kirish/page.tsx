import LoginForm from "@/components/LoginForm";
import { authMethods } from "@/lib/auth-methods";
import { getT } from "@/lib/i18n";
export async function generateMetadata() { const { t } = await getT(); return { title: t("login.meta"), description: t("login.meta") + " — OfisTop", robots: { index: false } }; }
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ xato?: string }> }) {
  const ru = (await getT()).locale === "ru";
  const expired = (await searchParams).xato === "telegram";
  return <div className="min-h-[75vh] bg-white px-2 py-8 sm:bg-slate-50 sm:px-4 sm:py-14">
    {expired && <p role="alert" className="mx-auto mb-4 max-w-md rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-900">{ru ? "Ссылка из Telegram устарела или уже использована. Войдите ещё раз." : "Telegram’dagi havola eskirgan yoki ishlatilgan. Qaytadan kiring."}</p>}
    <LoginForm methods={authMethods()} /></div>;
}
