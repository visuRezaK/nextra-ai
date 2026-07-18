import Link from "next/link";
import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, AdminTable, fa } from "@/components/admin/ui";
import { createCompanyAction } from "./actions";

export const dynamic = "force-dynamic";

function sanitizeQuery(q: string): string {
  return q.replace(/[,()"]/g, " ").trim();
}

type CompanyRow = {
  id: string;
  name: string;
  industry: string | null;
  city: string | null;
  people: { count: number }[];
  deals: { count: number }[];
};

const inputClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { role } = await requireRole(["operator", "viewer"]);
  const { q } = await searchParams;
  const supabase = getAdminClient();
  const canEdit = role !== "viewer";

  let query = supabase
    .from("companies")
    .select("id, name, industry, city, people(count), deals(count)")
    .order("name", { ascending: true })
    .limit(200);
  const term = q ? sanitizeQuery(q) : "";
  if (term) query = query.or(`name.ilike.%${term}%,industry.ilike.%${term}%,city.ilike.%${term}%`);
  const { data } = await query;
  const rows = (data ?? []) as unknown as CompanyRow[];

  return (
    <>
      <PageTitle title="شرکت‌ها" en="Companies" subtitle="سازمان‌های مرتبط با مخاطبان و معاملات" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="جستجو در نام، صنعت، شهر…"
            className={inputClass}
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-hover"
          >
            جستجو
          </button>
        </form>
      </div>

      {canEdit ? (
        <details className="card-surface mb-4 p-4">
          <summary className="cursor-pointer text-sm font-medium">
            + شرکت جدید (New company)
          </summary>
          <form action={createCompanyAction} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs text-muted">نام (Name)</span>
              <input name="name" required className={inputClass} />
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs text-muted">صنعت (Industry)</span>
              <input name="industry" className={inputClass} />
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs text-muted">شهر (City)</span>
              <input name="city" className={inputClass} />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-hover"
            >
              افزودن (Add)
            </button>
          </form>
        </details>
      ) : null}

      <AdminTable
        headers={["نام", "صنعت", "شهر", "مخاطبان", "معاملات"]}
        empty={rows.length === 0}
      >
        {rows.map((c) => (
          <tr key={c.id}>
            <td className="px-4 py-3 font-medium">
              <Link href={`/admin/companies/${c.id}`} className="text-accent hover:underline">
                {c.name}
              </Link>
            </td>
            <td className="px-4 py-3">{c.industry ?? "—"}</td>
            <td className="px-4 py-3">{c.city ?? "—"}</td>
            <td className="px-4 py-3">{fa(c.people?.[0]?.count ?? 0)}</td>
            <td className="px-4 py-3">{fa(c.deals?.[0]?.count ?? 0)}</td>
          </tr>
        ))}
      </AdminTable>
    </>
  );
}
