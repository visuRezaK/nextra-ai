import Link from "next/link";
import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, AdminTable, Badge, faDate } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

// Escape PostgREST .or() special characters in the user's search term.
function sanitizeQuery(q: string): string {
  return q.replace(/[,()"]/g, " ").trim();
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; q?: string }>;
}) {
  await requireRole(["operator", "viewer"]);
  const { source, q } = await searchParams;
  const supabase = getAdminClient();

  let query = supabase
    .from("contacts")
    .select("id, name, email, phone, message, source, session_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (source === "web" || source === "chatbot" || source === "voice")
    query = query.eq("source", source);
  const term = q ? sanitizeQuery(q) : "";
  if (term) {
    query = query.or(
      `name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
    );
  }

  const { data: leads } = await query;
  const rows = leads ?? [];

  const exportParams = new URLSearchParams();
  if (source) exportParams.set("source", source);
  if (q) exportParams.set("q", q);
  const exportHref = `/admin/leads/export${exportParams.size ? `?${exportParams}` : ""}`;

  return (
    <>
      <PageTitle title="لیدها" subtitle="سرنخ‌های فرم سایت و چت‌بات" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="جستجو در نام، ایمیل، تلفن…"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <select
            name="source"
            defaultValue={source ?? ""}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">همه منابع</option>
            <option value="web">فرم سایت</option>
            <option value="chatbot">چت‌بات</option>
            <option value="voice">دستیار صوتی</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-hover"
          >
            اعمال فیلتر
          </button>
        </form>
        <a
          href={exportHref}
          className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:border-accent/60"
        >
          خروجی CSV
        </a>
      </div>

      <AdminTable
        headers={["نام", "ایمیل", "تلفن", "پیام", "منبع", "تاریخ", "گفتگو"]}
        empty={rows.length === 0}
      >
        {rows.map((l) => (
          <tr key={l.id}>
            <td className="px-4 py-3 font-medium">{l.name}</td>
            <td className="px-4 py-3" dir="ltr">{l.email ?? "—"}</td>
            <td className="px-4 py-3" dir="ltr">{l.phone ?? "—"}</td>
            <td className="max-w-xs px-4 py-3 text-muted">
              <span className="line-clamp-2">{l.message ?? "—"}</span>
            </td>
            <td className="px-4 py-3">
              <Badge tone={l.source === "web" ? "neutral" : "accent"}>
                {l.source === "chatbot"
                  ? "چت‌بات"
                  : l.source === "voice"
                    ? "دستیار صوتی"
                    : "فرم سایت"}
              </Badge>
            </td>
            <td className="px-4 py-3 text-muted">{faDate(l.created_at)}</td>
            <td className="px-4 py-3">
              {l.session_id ? (
                <Link
                  href={`/admin/conversations/${l.session_id}`}
                  className="text-accent hover:underline"
                >
                  مشاهده گفتگو
                </Link>
              ) : (
                "—"
              )}
            </td>
          </tr>
        ))}
      </AdminTable>
    </>
  );
}
