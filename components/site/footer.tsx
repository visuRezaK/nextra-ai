import Link from "next/link";
import { Logo } from "@/components/icons";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

export function Footer({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const base = `/${locale}`;
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Link href={base} className="flex items-center gap-2.5">
            <Logo />
            <span className="flex flex-col leading-none">
              <span className="text-lg font-extrabold">{dict.brand.name}</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">
                Consulting
              </span>
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
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-foreground">{dict.footer.contact}</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <a
                href="https://instagram.com/rezakatanchi"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                {dict.footer.instagram} · @rezakatanchi
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
    </footer>
  );
}
