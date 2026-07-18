import type { Metadata } from "next";
import { Inter, Vazirmatn } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const vazir = Vazirmatn({ subsets: ["arabic"], variable: "--font-vazir", display: "swap" });

export const metadata: Metadata = {
  title: "قرارداد — Nextra AI Consulting",
  robots: { index: false, follow: false }, // shared contracts must not be indexed
};

export default function ContractLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${inter.variable} ${vazir.variable}`}>
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
