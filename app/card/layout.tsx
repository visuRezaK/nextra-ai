import type { Metadata } from "next";
import { Inter, Vazirmatn } from "next/font/google";
import "../globals.css";
import { CONTACT } from "./contact";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const vazir = Vazirmatn({ subsets: ["arabic"], variable: "--font-vazir", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: `${CONTACT.nameFa} — ${CONTACT.titleFa}`,
  description: `کارت ویزیت دیجیتال ${CONTACT.nameFa} (${CONTACT.nameEn}) — ${CONTACT.org}`,
  openGraph: {
    type: "profile",
    title: `${CONTACT.nameFa} — ${CONTACT.titleFa}`,
    description: `کارت ویزیت دیجیتال ${CONTACT.org}`,
    url: "/card",
    locale: "fa_IR",
  },
};

export default function CardLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${inter.variable} ${vazir.variable}`}>
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
