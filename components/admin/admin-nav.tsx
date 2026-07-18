"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { StaffRole } from "@/lib/admin/auth";

// Which roles see which tab. Admin sees everything; this mirrors the server
// gates in each page (the real security boundary is requireRole there).
//
// The nav is grouped: داشبورد | CRM | چت‌بات | تنظیمات. Each item shows its
// English term in parentheses beside the Persian («داشبورد (Dashboard)») on one
// line. CRM tabs are added phase by phase as their pages land, so there are no
// dead links to routes that don't exist yet.
type Tab = { href: string; label: string; en: string; roles: StaffRole[] };
type Group = { title: string | null; en: string | null; tabs: Tab[] };

const ALL_STAFF: StaffRole[] = ["admin", "editor", "operator", "viewer"];
const CRM_READ: StaffRole[] = ["admin", "operator", "viewer"];

const groups: Group[] = [
  {
    title: null,
    en: null,
    tabs: [{ href: "/admin", label: "داشبورد", en: "Dashboard", roles: ALL_STAFF }],
  },
  {
    title: "CRM",
    en: null,
    tabs: [
      { href: "/admin/leads", label: "لیدها", en: "Leads", roles: CRM_READ },
      { href: "/admin/people", label: "مخاطبان", en: "Contacts", roles: CRM_READ },
      { href: "/admin/companies", label: "شرکت‌ها", en: "Companies", roles: CRM_READ },
      { href: "/admin/deals", label: "معاملات", en: "Deals", roles: CRM_READ },
      { href: "/admin/activities", label: "فعالیت‌ها", en: "Activities", roles: CRM_READ },
      { href: "/admin/contracts", label: "قراردادها", en: "Contracts", roles: CRM_READ },
      { href: "/admin/campaigns", label: "کمپین‌ها", en: "Campaigns", roles: CRM_READ },
      { href: "/admin/assistant", label: "دستیار", en: "Assistant", roles: ["admin", "operator"] },
      { href: "/admin/reports", label: "گزارش‌ها", en: "Reports", roles: CRM_READ },
    ],
  },
  {
    title: "چت‌بات",
    en: "Chatbot",
    tabs: [
      { href: "/admin/conversations", label: "گفتگوها", en: "Conversations", roles: CRM_READ },
      { href: "/admin/feedback", label: "بازخورد", en: "Feedback", roles: CRM_READ },
      { href: "/admin/knowledge", label: "پایگاه دانش", en: "Knowledge Base", roles: ["admin", "editor"] },
      { href: "/admin/persona", label: "پرسونا", en: "Persona", roles: ["admin", "editor"] },
      { href: "/admin/playground", label: "پلی‌گراند", en: "Playground", roles: ["admin", "editor"] },
      { href: "/admin/evaluation", label: "ارزیابی", en: "Evaluation", roles: ["admin", "editor"] },
    ],
  },
  {
    title: "تنظیمات",
    en: "Settings",
    tabs: [
      { href: "/admin/model", label: "تنظیمات مدل", en: "Model", roles: ["admin"] },
      { href: "/admin/telegram", label: "تلگرام", en: "Telegram", roles: ["admin"] },
      { href: "/admin/widget", label: "ویجت", en: "Widget", roles: ["admin"] },
      { href: "/admin/users", label: "کاربران و دسترسی", en: "Users & Access", roles: ["admin"] },
    ],
  },
];

export function AdminNav({ role }: { role: StaffRole }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);

  // Which titled group holds the current page — it opens by default so the user
  // never lands on a page whose group is collapsed. On the dashboard (no titled
  // group active) CRM opens by default as the primary workspace.
  const activeTitle =
    groups.find((g) => g.title && g.tabs.some((t) => isActive(t.href)))?.title ?? null;

  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of groups) if (g.title) init[g.title] = g.title === (activeTitle ?? "CRM");
    return init;
  });

  return (
    <nav aria-label="بخش‌های پنل" className="flex flex-col gap-3">
      {groups.map((group, i) => {
        const visible = group.tabs.filter((t) => t.roles.includes(role));
        if (visible.length === 0) return null;

        const items = visible.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive(t.href)
                ? "bg-accent/10 font-medium text-accent"
                : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
            }`}
          >
            {t.label}
            <span dir="ltr" className="text-muted"> ({t.en})</span>
          </Link>
        ));

        // The untitled dashboard group stays flat and always visible.
        if (!group.title) {
          return (
            <div key={`g${i}`} className="flex flex-col gap-1">
              {items}
            </div>
          );
        }

        // Titled groups collapse: the header is a toggle button, and the items
        // nest under it with a start-edge guide line + indent.
        const isOpen = open[group.title];
        return (
          <div key={group.title} className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setOpen((o) => ({ ...o, [group.title!]: !o[group.title!] }))}
              aria-expanded={isOpen}
              className="flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-foreground/70 transition-colors hover:bg-foreground/5"
            >
              <span>
                {group.title}
                {group.en ? <span dir="ltr" className="text-muted"> ({group.en})</span> : null}
              </span>
              <span className={`text-[10px] transition-transform ${isOpen ? "" : "rotate-90"}`}>
                ▼
              </span>
            </button>
            {isOpen ? (
              <div className="ms-3 flex flex-col gap-1 border-s-2 border-border ps-1">{items}</div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
