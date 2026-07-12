import Link from "next/link";
import { Logo } from "@/components/icons";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

export function Footer({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const base = `/${locale}`;
  const year = new Date().getFullYear();

  // One wave period is 720 units; 4 periods = 2880 so translateX(-50%) tiles seamlessly.
  const wavePath =
    "M0,50 C120,20 240,20 360,50 C480,80 600,80 720,50 " +
    "C840,20 960,20 1080,50 C1200,80 1320,80 1440,50 " +
    "C1560,20 1680,20 1800,50 C1920,80 2040,80 2160,50 " +
    "C2280,20 2400,20 2520,50 C2640,80 2760,80 2880,50 " +
    "L2880,100 L0,100 Z";

  return (
    <footer className="relative">
      {/* Animated wave divider (drifting in two layers at different speeds) */}
      <div aria-hidden="true" className="relative -mb-px h-12 w-full overflow-hidden sm:h-16">
        <svg
          className="wave-track wave-track--back absolute bottom-0 left-0 h-full w-[200%]"
          viewBox="0 0 2880 100"
          preserveAspectRatio="none"
        >
          <path d={wavePath} fill="rgba(14, 165, 233, 0.12)" transform="translate(-180 -8)" />
          <path d={wavePath} fill="rgba(14, 165, 233, 0.12)" transform="translate(2700 -8)" />
        </svg>
        <svg
          className="wave-track absolute bottom-0 left-0 h-full w-[200%]"
          viewBox="0 0 2880 100"
          preserveAspectRatio="none"
        >
          <path d={wavePath} fill="var(--surface)" />
        </svg>
      </div>

      <div className="bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col items-center">
          <Link href={base} aria-label={dict.brand.name} className="flex flex-col items-center leading-none" dir="ltr">
            <span className="flex items-center gap-0">
              <Logo className="h-[22px] w-[22px]" />
              <span className="text-lg font-extrabold tracking-tight">
                {dict.brand.name.replace(/\s*Consulting$/i, "").replace(/^N/, "")}
              </span>
            </span>
            <span className="mt-1 ml-[0.28em] text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">
              Consulting
            </span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted">{dict.footer.tagline}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-foreground">{dict.footer.links}</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <Link href={`${base}#services`} className="hover:text-foreground">
                {dict.nav.services}
              </Link>
            </li>
            <li>
              <Link href={`${base}#why`} className="hover:text-foreground">
                {dict.nav.why}
              </Link>
            </li>
            <li>
              <Link href={`${base}#about`} className="hover:text-foreground">
                {dict.nav.about}
              </Link>
            </li>
            <li>
              <Link href={`${base}/book`} className="hover:text-foreground">
                {dict.nav.book}
              </Link>
            </li>
            <li>
              <Link href="/card" className="hover:text-foreground">
                {dict.footer.card}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-foreground">{dict.footer.contact}</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <a
                href="https://instagram.com/reza.katanchi"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                {dict.footer.instagram} · <span dir="ltr">@reza.katanchi</span>
              </a>
            </li>
            <li>
              <a
                href="mailto:rezakatanchi7@gmail.com"
                className="hover:text-foreground"
              >
                {dict.footer.email} · rezakatanchi7@gmail.com
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-5 text-center text-xs text-muted">
          © {year} {dict.brand.name} — {dict.footer.rights}
        </div>
      </div>
      </div>
    </footer>
  );
}
