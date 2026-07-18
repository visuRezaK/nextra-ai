import Link from "next/link";
import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, AdminTable, Badge, faDate } from "@/components/admin/ui";
import { personSourceLabel } from "@/lib/admin/crm";
import { createPersonAction } from "./actions";

export const dynamic = "force-dynamic";

function sanitizeQuery(q: string): string {
  return q.replace(/[,()"]/g, " ").trim();
}

type PersonRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  source: string;
  created_at: string;
  companies: { name: string } | null;
};

const inputClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { role } = await requireRole(["operator", "viewer"]);
  const { q } = await searchParams;
  const supabase = getAdminClient();
  const canEdit = role !== "viewer";

  let query = supabase
    .from("people")
    .select("id, full_name, email, phone, position, source, created_at, companies(name)")
    .order("created_at", { ascending: false })
    .limit(200);
  const term = q ? sanitizeQuery(q) : "";
  if (term) {
    query = query.or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
    );
  }
  const { data } = await query;
  const rows = (data ?? []) as unknown as PersonRow[];

  return (
    <>
      <PageTitle title="مخاطبان" en="Contacts" subtitle="افراد تبدیل‌شده از لیدها و مخاطبان دستی" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="جستجو در نام، ایمیل، تلفن…"
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
            + مخاطب جدید (New contact)
          </summary>
          <form action={createPersonAction} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs text-muted">نام کامل (Full name)</span>
              <input name="full_name" required className={inputClass} />
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs text-muted">شرکت (Company)</span>
              <input name="company_name" className={inputClass} />
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs text-muted">ایمیل (Email)</span>
              <input name="email" type="email" dir="ltr" className={inputClass} />
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs text-muted">تلفن (Phone)</span>
              <input name="phone" dir="ltr" className={inputClass} />
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
        headers={["نام", "شرکت", "ایمیل", "تلفن", "منبع", "تاریخ"]}
        empty={rows.length === 0}
      >
        {rows.map((p) => (
          <tr key={p.id}>
            <td className="px-4 py-3 font-medium">
              <Link href={`/admin/people/${p.id}`} className="text-accent hover:underline">
                {p.full_name}
              </Link>
              {p.position ? <span className="text-muted"> · {p.position}</span> : null}
            </td>
            <td className="px-4 py-3">{p.companies?.name ?? "—"}</td>
            <td className="px-4 py-3" dir="ltr">{p.email ?? "—"}</td>
            <td className="px-4 py-3" dir="ltr">{p.phone ?? "—"}</td>
            <td className="px-4 py-3">
              <Badge tone={p.source === "manual" ? "neutral" : "accent"}>
                {personSourceLabel(p.source)}
              </Badge>
            </td>
            <td className="px-4 py-3 text-muted">{faDate(p.created_at)}</td>
          </tr>
        ))}
      </AdminTable>
    </>
  );
}
