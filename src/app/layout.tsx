import "./globals.css";
import { publicSiteUrl } from "@/lib/site-url";
import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import NewListingButton from "@/components/NewListingButton";
import MobileMenu from "@/components/MobileMenu";
import LangSwitch from "@/components/LangSwitch";
import { I18nProvider } from "@/components/I18nProvider";
import { CompareBar } from "@/components/Compare";
import { SearchUpdates } from "@/components/SavedSearch";
import { getT } from "@/lib/i18n";
import { guestAccessEnabled, isGuestPhone } from "@/lib/launch-mode";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getT();
  return {
    metadataBase: new URL(publicSiteUrl()),
    openGraph: { siteName: "OfisTop", locale: locale === "ru" ? "ru_RU" : "uz_UZ", type: "website" },
    title: { default: t("site.title"), template: "%s | OfisTop" },
    description: t("site.desc"),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  const { locale, t } = await getT();
  const promo = guestAccessEnabled();
  const guest = !!user && isGuestPhone(user.phone);
  const loginLabel = promo ? (locale === "ru" ? "Мой кабинет" : "Kabinetim") : t("nav.login");
  return (
    <html lang={locale}>
      <body className="min-h-screen flex flex-col">
        <I18nProvider locale={locale}>
        <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
          <nav className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-3 md:gap-4 text-sm" aria-label={t("nav.aria")}>
            <Link href="/" className="font-bold text-lg text-brand">Ofis<span className="text-accent">Top</span></Link>
            <Link href="/joylar" className="hidden md:inline hover:underline">{t("nav.search")}</Link>
            <Link href="/markazlar" className="hidden md:inline hover:underline">{t("nav.centers")}</Link>
            <span className="flex-1" />
            <div className="hidden md:flex items-center gap-4">
              {user && <><Link href="/kabinet/bildirishnomalar" className="hover:underline">{t("nav.notifications")}</Link><Link href="/kabinet/sevimlilar" className="hover:underline">{t("nav.favorites")}</Link><Link href="/kabinet" className="hover:underline">{t("nav.cabinet")}</Link></>}
              <LangSwitch />
            </div>
            <NewListingButton loggedIn={!!user} promo={promo} />
            <span className="hidden md:inline">{user ? (!guest && <LogoutButton />) : <Link href="/kirish" className="hover:underline">{loginLabel}</Link>}</span>
            <MobileMenu label={t("nav.menu")}>
              <Link href="/joylar">{t("nav.search")}</Link>
              <Link href="/markazlar">{t("nav.centers")}</Link>
              {user && <><Link href="/kabinet">{t("nav.cabinet")}</Link><Link href="/kabinet/sevimlilar">{t("nav.favorites")}</Link><Link href="/kabinet/bildirishnomalar">{t("nav.notifications")}</Link></>}
              <div className="flex items-center justify-between border-t border-slate-100 px-3 pt-2 mt-1"><LangSwitch />{user ? (!guest && <LogoutButton />) : <Link href="/kirish" className="text-brand hover:underline">{loginLabel}</Link>}</div>
            </MobileMenu>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <CompareBar/>
        {user && <SearchUpdates/>}
        <footer className="border-t border-slate-200 text-xs text-slate-500 py-6 text-center">
          <p>{t("footer.tagline")}</p>
          <p className="mt-1 space-x-3"><Link href="/qoidalar" className="underline">{t("footer.rules")}</Link><Link href="/maxfiylik" className="underline">{t("footer.privacy")}</Link><Link href="/shartlar" className="underline">{t("footer.terms")}</Link></p>
        </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
