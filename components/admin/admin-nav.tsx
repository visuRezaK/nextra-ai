"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin", label: "داشبورد" },
  { href: "/admin/leads", label: "لیدها" },
  { href: "/admin/conversations", label: "گفتگوها" },
  { href: "/admin/knowledge", label: "پایگاه دانش" },
  { href: "/admin/persona", label: "پرسونا" },
  { href: "/admin/model", label: "تنظیمات مدل" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="بخش‌های پنل" className="flex flex-col gap-1">
      {tabs.map((t) => {
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
