import { ButtonLink } from "@/components/ui/button";
import { IconAlert, IconArrow, IconCheck, serviceIcons, type ServiceIconName } from "@/components/icons";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

type Props = { dict: Dictionary; locale: Locale };

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
  const base = `/${locale}`;
  return (
    <>
      {/* Screen 1 — video only, no overlay text */}
      <section className="relative h-screen overflow-hidden" style={{ background: "#071020" }}>
        <video
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-contain sm:object-cover"
          src="/hero-bg-new.mp4"
        />
        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce">
          <svg className="h-6 w-6 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* Screen 2 — AI question hook */}
      <section className="bg-grid relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
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
        </div>
        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce">
          <svg className="h-6 w-6 text-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* Screen 3 — brand name + hero content (light) */}
      <section className="bg-grid relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 py-24 text-center">

          {/* Headline */}
          <h1 className="mx-auto max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            {dict.hero.headline}
          </h1>

          {/* Tagline */}
          <h2 className="mx-auto mt-5 max-w-3xl text-2xl font-bold leading-tight tracking-tight text-muted sm:text-3xl">
            {dict.hero.title}{" "}
            <span className="text-gradient">{dict.hero.titleAccent}</span>
          </h2>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            {dict.hero.subtitle}
          </p>

          {/* CTA — booking lives only on the first service; keep secondary nav here */}
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href={`${base}#services`} variant="secondary" size="lg" className="group">
              {dict.hero.ctaSecondary}
              <IconArrow className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
            </ButtonLink>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-4">
            {dict.hero.stats.map((s) => (
              <div key={s.label} className="card-surface px-4 py-5">
                <div className="text-2xl font-black text-accent sm:text-3xl">{s.value}</div>
                <div className="mt-1 text-xs text-muted sm:text-sm">{s.label}</div>
              </div>
            ))}
          </div>
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
