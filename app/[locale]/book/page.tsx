import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { BookForm } from "@/components/site/book-form";
import { IconCheck } from "@/components/icons";

export default async function BookPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  const isRtl = locale === "fa";

  return (
    <main className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
      <Link
        href={`/${locale}`}
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent"
      >
        <svg className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {isRtl ? "بازگشت به خانه" : "Back to home"}
      </Link>
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        {/* Info */}
        <div>
          <span className="text-sm font-semibold uppercase tracking-wider text-accent">
            {dict.featured.tag}
          </span>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
            {dict.booking.title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            {dict.booking.subtitle}
          </p>

          <div className="card-surface mt-8 p-6">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-foreground">{dict.booking.price}</span>
              <span className="text-sm text-muted">/ {dict.booking.duration}</span>
            </div>
            <ul className="mt-5 space-y-3">
              {dict.booking.includes.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm">
                  <IconCheck className="h-4 w-4 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Form */}
        <BookForm dict={dict.booking} locale={locale} />
      </div>
    </main>
  );
}
