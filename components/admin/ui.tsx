// Small shared building blocks for the admin panel (server components).
// The UI text is Persian, but every number renders in LATIN digits: the panel
// is read by its owner alongside Supabase, Vercel and spreadsheets, which all
// speak Latin. `-u-nu-latn` keeps the fa-IR grouping and RTL marks and swaps
// only the numerals — so «fa» here means the panel's locale, not the digits.
// (The public /[locale] site keeps Persian digits; this is admin-only.)

export function fa(n: number): string {
  return n.toLocaleString("fa-IR-u-nu-latn");
}

// «38%» — Latin sign, after the number. The Persian «٪۳۸» form puts the sign
// first, which reads wrong next to Latin digits.
export function faPct(n: number): string {
  return `${fa(n)}%`;
}

// Deal amounts are Canadian dollars. `currencyDisplay: "code"` renders
// «CAD 5,000.00» — a bare «$» would be ambiguous with USD. Zero renders as «—»
// rather than «CAD 0»: an unpriced lead is unknown, not free.
// numeric(12,2) can arrive from PostgREST as a string, so coerce first.
export function faCad(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? Number(n) : n;
  if (!v || !Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("fa-IR-u-nu-latn", {
    style: "currency",
    currency: "CAD",
    currencyDisplay: "code",
  }).format(v);
}

// Gregorian (میلادی) calendar in Toronto local time, with Latin digits to match
// the rest of the panel. `-u-ca-gregory` forces the Gregorian calendar (plain
// "fa-IR" defaults to the Persian/Jalali calendar), `-u-nu-latn` the numerals;
// timeZone anchors it to Toronto instead of the server's UTC.
export function faDate(iso: string): string {
  return new Date(iso).toLocaleString("fa-IR-u-ca-gregory-nu-latn", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Toronto",
  });
}

// The English term beside a Persian heading — «مسیر فروش Sales Pipeline».
// dir="ltr" keeps the Latin text from being reordered by the RTL page.
export function En({ children }: { children: string }) {
  return (
    <span dir="ltr" className="ms-2 text-xs font-normal tracking-wide text-muted">
      {children}
    </span>
  );
}

export function PageTitle({
  title,
  en,
  subtitle,
}: {
  title: string;
  en?: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-8">
      <h1 className="text-2xl font-bold">
        {title}
        {en ? <En>{en}</En> : null}
      </h1>
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
    </header>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "success" | "warn" | "danger";
}) {
  const tones = {
    neutral: "bg-surface-2 text-foreground/70 border-border",
    accent: "bg-accent/10 text-accent border-accent/20",
    success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    warn: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    danger: "bg-red-500/10 text-red-600 border-red-500/20",
  } as const;
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function AdminTable({
  headers,
  children,
  empty,
}: {
  headers: string[];
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="card-surface overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-start">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-start font-medium text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
      {empty ? <p className="px-4 py-8 text-center text-sm text-muted">موردی یافت نشد.</p> : null}
    </div>
  );
}
