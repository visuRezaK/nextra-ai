"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { StaffRole } from "@/lib/admin/auth";

// Which roles see which tab. Admin sees everything; this mirrors the server
// gates in each page (the real security boundary is requireRole there).
const tabs: { href: string; label: string; roles: StaffRole[] }[] = [
  { href: "/admin", label: "داشبورد", roles: ["admin", "editor", "operator", "viewer"] },
  { href: "/admin/leads", label: "لیدها", roles: ["admin", "operator", "viewer"] },
  { href: "/admin/conversations", label: "گفتگوها", roles: ["admin", "operator", "viewer"] },
  { href: "/admin/feedback", label: "بازخورد", roles: ["admin", "operator", "viewer"] },
  { href: "/admin/knowledge", label: "پایگاه دانش", roles: ["admin", "editor"] },
  { href: "/admin/persona", label: "پرسونا", roles: ["admin", "editor"] },
  { href: "/admin/playground", label: "پلی‌گراند", roles: ["admin", "editor"] },
  { href: "/admin/model", label: "تنظیمات مدل", roles: ["admin"] },
  { href: "/admin/telegram", label: "تلگرام", roles: ["admin"] },
  { href: "/admin/widget", label: "ویجت", roles: ["admin"] },
  { href: "/admin/users", label: "کاربران و دسترسی", roles: ["admin"] },
];

export function AdminNav({ role }: { role: StaffRole }) {
  const pathname = usePathname();

  return (
    <nav aria-label="بخش‌های پنل" className="flex flex-col gap-1">
      {tabs
        .filter((t) => t.roles.includes(role))
        .map((t) => {
          const active =
            t.href === "/admin"
              ? pathname === "/admin"
              : pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-accent/10 font-medium text-accent"
                  : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
    </nav>
  );
}
