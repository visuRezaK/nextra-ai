import type { Metadata } from "next";
import { Inter, Vazirmatn } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { isLocale, locales, localeDirection, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { ChatWidget } from "@/components/chat/chat-widget";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const vazir = Vazirmatn({
  subsets: ["arabic"],
  variable: "--font-vazir",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);

  return {
    metadataBase: new URL(siteUrl),
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: { fa: "/fa", en: "/en" },
    },
    openGraph: {
      type: "website",
      siteName: dict.brand.name,
      title: dict.meta.title,
      description: dict.meta.description,
      url: `/${locale}`,
      locale: locale === "fa" ? "fa_IR" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: dict.meta.title,
      description: dict.meta.description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dir = localeDirection[locale as Locale];
  const dict = await getDictionary(locale as Locale);

  return (
    <html lang={locale} dir={dir} className={`${inter.variable} ${vazir.variable}`}>
      <body className="bg-background text-foreground antialiased">
        {children}
        <ScrollToTop />
        <ChatWidget locale={locale as Locale} dict={dict.chat} />
      </body>
    </html>
  );
}
