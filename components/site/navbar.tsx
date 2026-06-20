"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { LocaleSwitcher } from "./locale-switcher";
import type { Locale } from "@/lib/i18n/config";

type NavDict = {
  services: string;
  why: string;
  about: string;
  faq: string;
  book: string;
  login: string;
  dashboard: string;
};

export function Navbar({
  locale,
  brand,
  nav,
  isAuthed = false,
}: {
  locale: Locale;
  brand: string;
  nav: NavDict;
  isAuthed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const base = `/${locale}`;

  const links = [
    { href: `${base}#services`, label: nav.services },
    { href: `${base}#why`, label: nav.why },
    { href: `${base}#about`, label: nav.about },
    { href: `${base}#faq`, label: nav.faq },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link href={base} className="flex items-center gap-2.5">
          <Logo />
          <span className="flex flex-col leading-none">
            <span className="text-lg font-extrabold tracking-tight">{brand}</span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">
              Consulting
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <LocaleSwitcher current={locale} />
          <Link
            href={isAuthed ? `${base}/dashboard` : `${base}/login`}
            className="text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            {isAuthed ? nav.dashboard : nav.login}
          </Link>
          <ButtonLink href={`${base}/book`} size="md">
            {nav.book}
          </ButtonLink>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border md:hidden"
          aria-label="Menu"
        >
          <span className="relative block h-4 w-5">
            <span
              className={`absolute left-0 block h-0.5 w-5 bg-foreground transition-all ${
                open ? "top-2 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 top-2 block h-0.5 w-5 bg-foreground transition-all ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 block h-0.5 w-5 bg-foreground transition-all ${
                open ? "top-2 -rotate-45" : "top-4"
              }`}
            />
          </span>
        </button>
      </nav>

      {open && (
        <div className="border-t border-border/60 bg-background px-5 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-muted hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <div className="flex items-center justify-between pt-2">
              <LocaleSwitcher current={locale} />
              <Link
                href={isAuthed ? `${base}/dashboard` : `${base}/login`}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-muted hover:text-foreground"
              >
                {isAuthed ? nav.dashboard : nav.login}
              </Link>
            </div>
            <ButtonLink href={`${base}/book`} size="lg" className="w-full" onClick={() => setOpen(false)}>
              {nav.book}
            </ButtonLink>
          </div>
        </div>
      )}
    </header>
  );
}
