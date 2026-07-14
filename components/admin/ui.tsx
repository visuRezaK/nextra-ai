// Small shared building blocks for the admin panel (server components).
// Persian-only UI: numbers are formatted with fa-IR digits at the call site
// via the fa() helper below.

export function fa(n: number): string {
  return n.toLocaleString("fa-IR");
}

// Gregorian (میلادی) calendar in Toronto local time, with Persian digits to
// match the rest of the panel. `-u-ca-gregory` forces the Gregorian calendar
// (plain "fa-IR" defaults to the Persian/Jalali calendar); timeZone anchors it
// to Toronto instead of the server's UTC.
export function faDate(iso: string): string {
  return new Date(iso).toLocaleString("fa-IR-u-ca-gregory", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Toronto",
  });
}

export function PageTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-8">
      <h1 className="text-2xl font-bold">{title}</h1>
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
  tone?: "neutral" | "accent" | "success";
}) {
  const tones = {
    neutral: "bg-surface-2 text-foreground/70 border-border",
    accent: "bg-accent/10 text-accent border-accent/20",
    success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
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
