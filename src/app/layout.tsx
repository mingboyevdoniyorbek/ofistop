import "./globals.css";
import { publicSiteUrl } from "@/lib/site-url";
import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import NewListingButton from "@/components/NewListingButton";
import MobileMenu from "@/components/MobileMenu";
import BottomNav from "@/components/BottomNav";
import LangSwitch from "@/components/LangSwitch";
import { I18nProvider } from "@/components/I18nProvider";
import { CompareBar } from "@/components/Compare";
import { SearchUpdates } from "@/components/SavedSearch";
import { getT } from "@/lib/i18n";
import { guestAccessEnabled, isGuestPhone } from "@/lib/launch-mode";
import { siteInfo } from "@/lib/site-info";
import { siteJsonLd } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import SiteContacts from "@/components/SiteContacts";
import Analytics from "@/components/Analytics";
import FavSync from "@/components/FavSync";
import NotificationBell from "@/components/NotificationBell";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getT();
  return {
    metadataBase: new URL(publicSiteUrl()),
    openGraph: { siteName: "OfisTop", locale: locale === "ru" ? "ru_RU" : "uz_UZ", type: "website" },
    title: { default: t("site.title"), template: "%s | OfisTop" },
    description: t("site.desc"),
    // Google Search Console / Yandex Webmaster tasdiqlash kodlari (ixtiyoriy).
    verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined, yandex: process.env.YANDEX_VERIFICATION || undefined },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  const { locale, t } = await getT();
  const promo = guestAccessEnabled();
  const guest = !!user && isGuestPhone(user.phone);
  const site = siteInfo();
  const unread = user ? await db().select({ n: sql<number>`count(*)::int` }).from(s.notifications).where(and(eq(s.notifications.userId, user.id), isNull(s.notifications.readAt))).then((r) => r[0].n).catch(() => 0) : 0;
  const loginLabel = promo ? (locale === "ru" ? "Мой кабинет" : "Kabinetim") : t("nav.login");
  return (
    <html lang={locale}>
      <body className="min-h-screen flex flex-col">
        <JsonLd data={siteJsonLd()} />
        <Analytics />
        <I18nProvider locale={locale}>
        <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
          <nav className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-3 md:gap-4 text-sm" aria-label={t("nav.aria")}>
            <Link href="/" className="flex items-center gap-1.5 font-bold text-lg text-brand">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/logo.webp" alt="" width={36} height={36} className="h-9 w-9" />Ofis<span className="-ml-1.5 text-accent">Top</span></Link>
            <Link href="/joylar" className="hidden md:inline hover:underline">{t("nav.search")}</Link>
            <Link href="/markazlar" className="hidden md:inline hover:underline">{t("nav.centers")}</Link>
            <span className="flex-1" />
            <div className="hidden md:flex items-center gap-4">
              {user && <><Link href="/kabinet/sevimlilar" className="hover:underline">{t("nav.favorites")}</Link><Link href="/kabinet" className="hover:underline">{t("nav.cabinet")}</Link></>}
              {!user && <Link href="/sevimlilar" className="hover:underline">{t("nav.favorites")}</Link>}
              <LangSwitch />
            </div>
            <span className="hidden md:inline-flex"><NewListingButton loggedIn={!!user} promo={promo} /></span>
            <span className="hidden md:inline">{user ? (!guest && <LogoutButton />) : <Link href="/kirish" className="hover:underline">{loginLabel}</Link>}</span>
            {user && <NotificationBell initialUnread={unread} />}
            <MobileMenu label={t("nav.menu")}>
              <Link href="/joylar">{t("nav.search")}</Link>
              <Link href="/markazlar">{t("nav.centers")}</Link>
              {user && <><Link href="/kabinet">{t("nav.cabinet")}</Link><Link href="/kabinet/sevimlilar">{t("nav.favorites")}</Link><Link href="/kabinet/bildirishnomalar">{t("nav.notifications")}</Link></>}
              {!user && <Link href="/sevimlilar">{t("nav.favorites")}</Link>}
              <div className="flex items-center justify-between border-t border-slate-100 px-3 pt-2 mt-1"><LangSwitch />{user ? (!guest && <LogoutButton />) : <Link href="/kirish" className="text-brand hover:underline">{loginLabel}</Link>}</div>
            </MobileMenu>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <CompareBar/>
        {user && <SearchUpdates/>}
        {user && <FavSync />}
        <footer className="border-t border-slate-200 bg-slate-50 text-sm text-slate-600">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-3">
            <div>
              <Link href="/" className="flex items-center gap-1.5 text-lg font-bold text-brand">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/logo.webp" alt="" width={32} height={32} className="h-8 w-8" />Ofis<span className="-ml-1.5 text-accent">Top</span></Link>
              <p className="mt-2 text-xs leading-relaxed">{t("footer.tagline")}</p>
            </div>
            <nav aria-label={locale === "ru" ? "Разделы" : "Bo‘limlar"} className="grid grid-cols-2 gap-x-4 gap-y-1.5 content-start">
              <Link href="/joylar" className="hover:underline">{t("nav.search")}</Link>
              <Link href="/markazlar" className="hover:underline">{t("nav.centers")}</Link>
              <Link href="/markazlar/ariza" className="font-semibold text-brand hover:underline">{locale === "ru" ? "Добавить бизнес-центр" : "Biznes markazingizni qo‘shing"}</Link>
              <Link href="/biz-haqimizda" className="hover:underline">{locale === "ru" ? "О нас" : "Biz haqimizda"}</Link>
              <Link href="/qoidalar" className="hover:underline">{t("footer.rules")}</Link>
              <Link href="/maxfiylik" className="hover:underline">{t("footer.privacy")}</Link>
              <Link href="/shartlar" className="hover:underline">{t("footer.terms")}</Link>
            </nav>
            <div>
              {(site.phone || site.email || site.telegram || site.instagram) && <p className="font-semibold text-slate-800">{locale === "ru" ? "Связаться с нами" : "Biz bilan bog‘laning"}</p>}
              <SiteContacts className="mt-1.5 flex-col !gap-y-1.5 text-brand" />
              {site.telegramChannel && <a href={`https://t.me/${site.telegramChannel}`} target="_blank" rel="noopener" className="mt-3 inline-block rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white">{locale === "ru" ? "Новые объявления в Telegram" : "Yangi e’lonlar Telegram’da"}</a>}
            </div>
          </div>
          <p className="border-t border-slate-200 py-4 text-center text-xs">© {new Date().getFullYear()} OfisTop{site.company ? ` · ${site.company}` : ""}</p>
        </footer>
        <BottomNav loggedIn={!!user} promo={promo} />
        </I18nProvider>
      </body>
    </html>
  );
}
