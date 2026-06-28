import { ButtonLink } from "@/components/ui/button";
import { IconAlert, IconCheck, serviceIcons, type ServiceIconName } from "@/components/icons";
import { ImageRing } from "@/components/ui/ai-image-generator-hero";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

type Props = { dict: Dictionary; locale: Locale };

// AI-themed imagery for the rotating hero carousel (Screen 3).
// TODO: replace these Unsplash URLs with owned assets in /public for production.
const HERO_CAROUSEL_IMAGES = [
  { id: "1", src: "https://images.unsplash.com/photo-1684369176170-463e84248b70?auto=format&fit=crop&q=60&w=400", alt: "AI 1", rotation: -15 },
  { id: "2", src: "https://plus.unsplash.com/premium_photo-1677269465314-d5d2247a0b0c?auto=format&fit=crop&q=60&w=400", alt: "AI 2", rotation: -8 },
  { id: "3", src: "https://images.unsplash.com/photo-1524673360092-e07b7ae58845?auto=format&fit=crop&q=60&w=400", alt: "AI 3", rotation: 5 },
  { id: "4", src: "https://plus.unsplash.com/premium_photo-1680610653084-6e4886519caf?auto=format&fit=crop&q=60&w=400", alt: "AI 4", rotation: 12 },
  { id: "5", src: "https://plus.unsplash.com/premium_photo-1680608979589-e9349ed066d5?auto=format&fit=crop&q=60&w=400", alt: "AI 5", rotation: -12 },
  { id: "6", src: "https://images.unsplash.com/photo-1562575214-da9fcf59b907?auto=format&fit=crop&q=60&w=400", alt: "AI 6", rotation: 8 },
  { id: "7", src: "https://plus.unsplash.com/premium_photo-1676637656210-390da73f4951?auto=format&fit=crop&q=60&w=400", alt: "AI 7", rotation: 8 },
  { id: "8", src: "https://images.unsplash.com/photo-1664448003794-2d446c53dcae?auto=format&fit=crop&q=60&w=400", alt: "AI 8", rotation: 8 },
];

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && (
        <span className="text-sm font-semibold uppercase tracking-wider text-accent">{eyebrow}</span>
      )}
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-base leading-relaxed text-muted">{subtitle}</p>}
    </div>
  );
}

export function Problem({ dict }: Props) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <SectionHeading eyebrow={dict.problem.eyebrow} title={dict.problem.title} subtitle={dict.problem.subtitle} />
      <div className="mt-12 grid gap-5 sm:grid-cols-3">
        {dict.problem.items.map((item) => (
          <div key={item.title} className="card-surface flex flex-col gap-4 p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600">
              <IconAlert className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">{item.title}</h3>
            <p className="text-sm leading-relaxed text-muted">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Transform({ dict }: Props) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <SectionHeading eyebrow={dict.transform.eyebrow} title={dict.transform.title} subtitle={dict.transform.subtitle} />
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {/* BEFORE */}
        <div className="rounded-2xl border border-border bg-surface-2/50 p-6 sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted">
            {dict.transform.beforeLabel}
          </span>
          <ul className="mt-5 space-y-4">
            {dict.transform.rows.map((row) => (
              <li key={row.before} className="flex items-start gap-3 text-sm text-muted">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted/50" />
                <span>{row.before}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* AFTER */}
        <div className="glow-accent rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-surface to-background p-6 sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
            {dict.transform.afterLabel}
          </span>
          <ul className="mt-5 space-y-4">
            {dict.transform.rows.map((row) => (
              <li key={row.after} className="flex items-start gap-3 text-sm font-medium">
                <IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span>{row.after}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Hero({ dict, locale }: Props) {
  const sh = dict.splitHero;
  return (
    <>
      {/* Screen 1 — split hero (owner photo + intro + consultation CTA).
          Photo is a placeholder until the owner's image is added. */}
      <section className="bg-grid relative flex min-h-screen items-center overflow-hidden">
        <div className="mx-auto w-full max-w-6xl px-5 py-24">
          <div className="grid items-center gap-10 rounded-[2.5rem] border border-border/60 bg-surface-2/40 p-8 shadow-[0_30px_80px_-40px_rgba(14,165,233,0.35)] sm:p-12 lg:grid-cols-2 lg:gap-14">
            {/* Text column */}
            <div className="text-center lg:text-start">
              <p className="text-base font-bold text-accent sm:text-lg">{sh.team}</p>
              <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-accent sm:text-5xl">
                {sh.headingAccent}
              </h1>
              <h2 className="mt-3 text-2xl font-black leading-tight tracking-tight sm:text-4xl">
                {sh.heading}
              </h2>
              <p className="mt-5 text-lg font-medium text-muted sm:text-xl">{sh.tagline}</p>
              <ul className="mx-auto mt-6 max-w-xl space-y-3 text-start lg:mx-0">
                {sh.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-3 text-sm leading-relaxed text-muted sm:text-base"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex justify-center lg:justify-start">
                <ButtonLink href={`/${locale}/book`} size="lg">
                  {sh.cta}
                </ButtonLink>
              </div>
            </div>
            {/* Image column — placeholder frame until the owner's photo is added */}
            <div className="order-first lg:order-none">
              <div className="relative mx-auto flex aspect-[4/5] w-full max-w-sm items-center justify-center overflow-hidden rounded-3xl border border-dashed border-accent/40 bg-gradient-to-br from-accent/10 via-surface to-background">
                <div className="flex flex-col items-center gap-3 px-6 text-center text-muted">
                  <svg
                    className="h-16 w-16 text-accent/50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 19.5a7.5 7.5 0 0 1 15 0v.75H4.5v-.75Z"
                    />
                  </svg>
                  <span className="text-sm font-medium">{sh.imageLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Screen 2 — AI question hook */}
      <section className="bg-grid relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
          {/* Robot image removed for now — using the rotating image ring instead */}
          <ImageRing images={HERO_CAROUSEL_IMAGES} />
          <h2 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            <span className="[font-family:var(--font-inter)] text-accent">{dict.aiQuestion.eyebrow}</span>
            {" "}
            {dict.aiQuestion.question}
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-xl font-medium leading-relaxed text-muted sm:text-2xl">
            {dict.aiQuestion.answer}
          </p>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted/70">
            {dict.aiQuestion.sub}
          </p>
          <p className="mx-auto mt-10 max-w-2xl rounded-3xl bg-indigo-500/[0.06] px-8 py-7 text-lg font-semibold leading-relaxed text-foreground/90 sm:text-xl">
            {dict.aiQuestion.quote}
          </p>
        </div>
        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce">
          <svg className="h-6 w-6 text-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>
    </>
  );
}

export function Services({ dict }: Props) {
  return (
    <section id="services" className="bg-grid relative scroll-mt-20 overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <SectionHeading
          eyebrow={dict.services.eyebrow}
          title={dict.services.title}
          subtitle={dict.services.subtitle}
        />
        <div className="relative mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* connecting line for the path (single row on lg) */}
          <div
            className="pointer-events-none absolute inset-x-16 top-7 hidden h-px bg-gradient-to-r from-accent/0 via-accent/40 to-accent/0 lg:block"
            aria-hidden="true"
          />
          {dict.services.items.map((item, i) => {
            const Icon = serviceIcons[item.icon as ServiceIconName];
            return (
              <div key={item.title} className="group relative flex flex-col items-center text-center">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                  <Icon className="h-6 w-6" />
                  <span className="absolute -top-2 -end-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-black text-accent-foreground shadow-[0_8px_20px_-8px_rgba(14,165,233,0.7)]">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold">{item.title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function Featured({ dict, locale }: Props) {
  const base = `/${locale}`;
  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <div className="card-surface glow-accent relative overflow-hidden p-8 sm:p-12">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-accent">
              {dict.featured.tag}
            </span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {dict.featured.title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">{dict.featured.desc}</p>
            <ul className="mt-6 space-y-3">
              {dict.featured.points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm">
                  <IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-center rounded-2xl border border-border bg-surface-2 p-8 text-center">
            <div className="flex items-end justify-center gap-1">
              <span className="text-5xl font-black text-foreground">{dict.featured.price}</span>
              <span className="pb-2 text-sm text-muted">{dict.featured.priceUnit}</span>
            </div>
            <ButtonLink href={`${base}/book`} size="lg" className="mt-7 w-full">
              {dict.featured.cta}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Why({ dict }: Props) {
  return (
    <section id="why" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
      <SectionHeading title={dict.why.title} subtitle={dict.why.subtitle} />
      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {dict.why.items.map((item, i) => (
          <div key={item.title} className="card-surface flex gap-4 p-6">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-sm font-bold text-accent">
              {i + 1}
            </div>
            <div>
              <h3 className="text-lg font-bold">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function About({ dict }: Props) {
  return (
    <section id="about" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
      <div className="card-surface grid gap-8 overflow-hidden p-8 sm:p-12 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex aspect-square items-center justify-center rounded-2xl border border-dashed border-border bg-surface-2 text-center">
          <span className="px-6 text-sm text-muted">{dict.about.placeholder}</span>
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-accent">
            {dict.about.title}
          </span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight">{dict.about.subtitle}</h2>
          <p className="mt-5 text-base leading-relaxed text-muted">{dict.about.body}</p>
        </div>
      </div>
    </section>
  );
}

export function Audience({ dict }: Props) {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-6">
      <div className="text-center">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
          {dict.audience.title}
        </h3>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {dict.audience.items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-border bg-surface/50 px-4 py-2 text-sm text-foreground/80"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Faq({ dict }: Props) {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-20">
      <SectionHeading title={dict.faq.title} subtitle={dict.faq.subtitle} />
      <div className="mt-10 space-y-3">
        {dict.faq.items.map((item) => (
          <details
            key={item.q}
            className="card-surface group overflow-hidden px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
              {item.q}
              <span className="text-accent transition-transform duration-200 group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function CtaBand({ dict, locale }: Props) {
  const base = `/${locale}`;
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/10 via-surface to-background p-10 text-center sm:p-16">
        <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
          {dict.ctaBand.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted">{dict.ctaBand.subtitle}</p>
        <ButtonLink href={`${base}/book`} size="lg" className="mt-8">
          {dict.ctaBand.cta}
        </ButtonLink>
      </div>
    </section>
  );
}
