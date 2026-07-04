import { Inter, Vazirmatn } from "next/font/google";
import "../globals.css";
import { requireStaff } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/admin-shell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const vazir = Vazirmatn({ subsets: ["arabic"], variable: "--font-vazir", display: "swap" });

export const metadata = {
  title: "پنل مدیریت — Nextra AI",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role } = await requireStaff();

  return (
    <html lang="fa" dir="rtl" className={`${inter.variable} ${vazir.variable}`}>
      <body className="bg-background text-foreground antialiased">
        <AdminShell role={role}>{children}</AdminShell>
      </body>
    </html>
  );
}
