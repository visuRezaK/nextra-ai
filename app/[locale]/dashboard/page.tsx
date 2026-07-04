import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import { signOutAction } from "@/app/[locale]/auth-actions";

type BookingRow = {
  id: string;
  status: keyof Dict["dashboard"]["statusLabels"];
  scheduled_at: string | null;
  meet_link: string | null;
  amount_cents: number;
  currency: string;
};

type Dict = Awaited<ReturnType<typeof getDictionary>>;

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, status, scheduled_at, meet_link, amount_cents, currency")
    .order("created_at", { ascending: false });

  const name = profile?.full_name || user.email?.split("@")[0] || "";
  const list = (bookings ?? []) as BookingRow[];

  return (
    <main className="bg-grid min-h-screen px-5 py-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-2.5">
            <Logo />
            <span className="text-lg font-extrabold tracking-tight">{dict.brand.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            {profile?.role === "admin" && (
              <ButtonLink href="/admin" variant="secondary" size="md">
                {dict.dashboard.adminPanel}
              </ButtonLink>
            )}
            <ButtonLink href={`/${locale}/reset-password`} variant="ghost" size="md">
              {dict.dashboard.changePassword}
            </ButtonLink>
            <form action={signOutAction}>
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="ghost" size="md">
                {dict.nav.logout}
              </Button>
            </form>
          </div>
        </header>

        <section className="mt-10">
          <h1 className="text-3xl font-extrabold tracking-tight">
            {dict.dashboard.welcome}{name ? `، ${name}` : ""} 👋
          </h1>
          <p className="mt-2 text-muted">{dict.dashboard.subtitle}</p>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{dict.dashboard.myBookings}</h2>
            <ButtonLink href={`/${locale}/book`} size="md">
              {dict.dashboard.bookCta}
            </ButtonLink>
          </div>

          <div className="mt-5">
            {list.length === 0 ? (
              <div className="card-surface px-6 py-12 text-center text-muted">
                {dict.dashboard.noBookings}
              </div>
            ) : (
              <ul className="space-y-3">
                {list.map((b) => (
                  <li
                    key={b.id}
                    className="card-surface flex flex-wrap items-center justify-between gap-3 p-5"
                  >
                    <div>
                      <div className="font-semibold">
                        {b.scheduled_at
                          ? new Date(b.scheduled_at).toLocaleString(
                              locale === "fa" ? "fa-IR" : "en-US",
                            )
                          : "—"}
                      </div>
                      <div className="mt-1 text-sm text-muted">
                        {dict.dashboard.status}: {dict.dashboard.statusLabels[b.status]}
                      </div>
                    </div>
                    {b.meet_link && b.status === "paid" && (
                      <a
                        href={b.meet_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-accent hover:text-accent-hover"
                      >
                        {dict.dashboard.meetLink} ↗
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
