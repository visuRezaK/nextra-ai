import { Inter, Vazirmatn } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const vazir = Vazirmatn({ subsets: ["arabic"], variable: "--font-vazir", display: "swap" });

export const metadata = { robots: { index: false, follow: false } };

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${inter.variable} ${vazir.variable}`}>
      <body className="bg-background text-foreground antialiased overflow-hidden h-dvh">
        {children}
      </body>
    </html>
  );
}
