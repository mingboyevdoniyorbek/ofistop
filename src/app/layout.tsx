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
import HeaderNav, { NavIcon } from "@/components/HeaderNav";
import SiteContacts from "@/components/SiteContacts";
import Analytics from "@/components/Analytics";
import VisitTracker from "@/components/VisitTracker";
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
    applicationName: "OfisTop",
    keywords: locale === "ru"
      ? ["OfisTop", "аренда офиса Ташкент", "аренда офиса", "бизнес-центр Ташкент", "коммерческая недвижимость Ташкент", "аренда магазина", "аренда склада", "коворкинг Ташкент", "продажа здания", "офис без посредников"]
      : ["OfisTop", "ofistop.uz", "ofis ijarasi", "Toshkentda ofis ijarasi", "ofis ijaraga", "biznes markaz", "tijorat joyi ijarasi", "do‘kon ijarasi", "ombor ijarasi", "kovorking Toshkent", "bino sotiladi", "egasidan ofis"],
    // Google Search Console / Yandex Webmaster tasdiqlash kodlari (ixtiyoriy).
    verification: { google: verificationCode(process.env.GOOGLE_SITE_VERIFICATION), yandex: verificationCode(process.env.YANDEX_VERIFICATION) },
  };
}

/** Kod o'rniga butun `<meta name=".." content="KOD" />` tegi qo'yilgan bo'lsa ham faqat KOD olinadi. */
function verificationCode(raw?: string) {
  const v = raw?.trim(); if (!v) return undefined;
  return v.match(/content=["']([^"']+)["']/i)?.[1]?.trim() || v.replace(/^["']|["']$/g, "");
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
        <VisitTracker />
        <I18nProvider locale={locale}>
        <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
          <nav className="mx-auto max-w-6xl px-4 h-16 flex items-center gap-3 text-sm" aria-label={t("nav.aria")}>
            <Link href="/" className="mr-2 flex shrink-0 items-center gap-1.5 font-bold text-lg text-brand">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/logo.webp" alt="" width={36} height={36} className="h-9 w-9" />Ofis<span className="-ml-1.5 text-accent">Top</span></Link>
            <div className="flex items-center gap-0.5">
              <HeaderNav items={[
                { href: "/joylar", label: t("nav.search"), icon: "search", also: ["/ijara"] },
                { href: "/markazlar", label: t("nav.centers"), icon: "building" },
                { href: "/mebel", label: locale === "ru" ? "Мебель" : "Mebel", icon: "sofa", from: "lg" },
                { href: "/xizmat", label: locale === "ru" ? "Сдадим за вас" : "Biz ijaraga beramiz", icon: "key", from: "xl" },
              ]} />
            </div>
            <span className="flex-1" />
            <div className="hidden md:flex items-center gap-0.5">
              <HeaderNav items={user
                ? [{ href: "/kabinet/sevimlilar", label: t("nav.favorites"), icon: "heart", iconOnly: true }, { href: "/kabinet", label: t("nav.cabinet"), icon: "user", iconOnly: true }]
                : [{ href: "/sevimlilar", label: t("nav.favorites"), icon: "heart", iconOnly: true }]} />
              <span className="ml-2"><LangSwitch /></span>
            </div>
            <span className="hidden md:inline-flex"><NewListingButton loggedIn={!!user} promo={promo} /></span>
            <span className="hidden md:inline">{user ? (!guest && <LogoutButton />) : <Link href="/kirish" className="hover:underline">{loginLabel}</Link>}</span>
            {user && <NotificationBell initialUnread={unread} />}
            <MobileMenu label={t("nav.menu")}>
              <Link href="/joylar"><NavIcon name="search" />{t("nav.search")}</Link>
              <Link href="/markazlar"><NavIcon name="building" />{t("nav.centers")}</Link>
              <Link href="/xizmat"><NavIcon name="key" />{locale === "ru" ? "Сдадим ваше помещение за вас" : "Joyingizni biz ijaraga beramiz"}</Link>
              <Link href="/mebel"><NavIcon name="sofa" />{locale === "ru" ? "Офисная мебель" : "Ofis mebellari"}</Link>
              {user && <><Link href="/kabinet"><NavIcon name="user" />{t("nav.cabinet")}</Link><Link href="/kabinet/sevimlilar"><NavIcon name="heart" />{t("nav.favorites")}</Link><Link href="/kabinet/bildirishnomalar"><NavIcon name="bell" />{t("nav.notifications")}</Link></>}
              {!user && <Link href="/sevimlilar"><NavIcon name="heart" />{t("nav.favorites")}</Link>}
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
            <nav aria-label={locale === "ru" ? "Разделы" : "Bo‘limlar"} className="grid grid-cols-2 gap-x-4 content-start [&>a]:py-1.5">
              <Link href="/joylar" className="hover:underline">{t("nav.search")}</Link>
              <Link href="/markazlar" className="hover:underline">{t("nav.centers")}</Link>
              <Link href="/xizmat" className="font-semibold text-brand hover:underline">{locale === "ru" ? "Сдадим помещение за вас" : "Joyingizni biz ijaraga beramiz"}</Link>
              <Link href="/mebel" className="hover:underline">{locale === "ru" ? "Офисная мебель" : "Ofis mebellari"}</Link>
              <Link href="/mebel/ariza" className="hover:underline">{locale === "ru" ? "Добавить мебельную компанию" : "Mebel firmasini qo‘shish"}</Link>
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
