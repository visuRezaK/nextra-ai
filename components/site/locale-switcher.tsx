"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, localeLabels, isLocale, type Locale } from "@/lib/i18n/config";

function GlobeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

export function LocaleSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname();
  const other = locales.find((l) => l !== current) ?? current;

  function pathFor(locale: Locale) {
    const segments = pathname.split("/");
    if (segments[1] && isLocale(segments[1])) {
      segments[1] = locale;
    } else {
      segments.splice(1, 0, locale);
    }
    return segments.join("/") || `/${locale}`;
  }

  return (
    <Link
      href={pathFor(other)}
      aria-label={`Switch to ${localeLabels[other]}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:border-accent/60 hover:text-foreground"
    >
      <GlobeIcon />
      {localeLabels[other]}
    </Link>
  );
}
