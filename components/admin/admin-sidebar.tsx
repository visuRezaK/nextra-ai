"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/icons";
import { signOutAction } from "@/app/[locale]/auth-actions";
import type { StaffRole } from "@/lib/admin/auth";
import { AdminNav } from "./admin-nav";

// Responsive admin chrome. Desktop (md+): a static sidebar on the right (RTL).
// Mobile: a sticky top bar with a hamburger that opens the sidebar as a
// slide-in drawer, which closes on navigation or backdrop tap.
export function AdminSidebar({ role }: { role: StaffRole }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <Link href="/admin" dir="ltr" className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="text-sm font-semibold tracking-tight">Nextra AI</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="باز کردن منو"
          className="rounded-lg border border-border p-2 text-foreground/70 transition-colors hover:bg-foreground/5"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </header>

      {/* Backdrop (mobile, when open) */}
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      ) : null}

      {/* Sidebar / drawer */}
      <aside
        className={`fixed inset-y-0 end-0 z-50 flex w-64 shrink-0 flex-col overflow-y-auto border-e border-border bg-surface px-4 py-6 transition-transform md:static md:z-auto md:w-56 md:translate-x-0 ${
          open ? "translate-x-0" : "translate-x-full md:translate-x-0"
        }`}
      >
        <div className="mb-8 flex items-center justify-between">
          <Link href="/admin" dir="ltr" className="flex items-center gap-2 px-2">
            <Logo className="h-7 w-7" />
            <span className="text-sm font-semibold tracking-tight">Nextra AI</span>
          </Link>
          {/* Close button (mobile only) */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="بستن منو"
            className="rounded-lg p-1.5 text-foreground/70 hover:bg-foreground/5 md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <AdminNav role={role} onNavigate={close} />

        <div className="mt-auto flex flex-col gap-2 pt-8">
          <Link
            href="/fa"
            onClick={close}
            className="rounded-lg px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            بازگشت به سایت
          </Link>
          <form action={signOutAction}>
            <input type="hidden" name="locale" value="fa" />
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-start text-sm text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              خروج
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
