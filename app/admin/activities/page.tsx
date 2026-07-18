import Link from "next/link";
import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, AdminTable, Badge, faDate } from "@/components/admin/ui";
import {
  activityTypeLabel,
  isActivityType,
  isTaskOverdue,
  isTaskToday,
  LOGGABLE_ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
} from "@/lib/admin/crm";
import { ActivityQuickForm } from "./activity-quick-form";
import { toggleTaskAction } from "../people/actions";

export const dynamic = "force-dynamic";

type ActivityRow = {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  due_at: string | null;
  done_at: string | null;
  created_by: string | null;
  created_at: string;
  people: { id: string; full_name: string } | null;
};

type PersonOption = { id: string; full_name: string };

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const { role } = await requireRole(["operator", "viewer"]);
  const { type, status } = await searchParams;
  const supabase = getAdminClient();
  const canEdit = role !== "viewer";

  // Default view is the actionable list: open tasks, soonest-due first.
  const typeFilter = isActivityType(type) ? type : "task";
  const statusFilter = status === "done" || status === "all" ? status : "open";

  const columns =
    "id, type, title, body, due_at, done_at, created_by, created_at, people(id, full_name)";
  let query = supabase.from("activities").select(columns).limit(300);
  query = query.eq("type", typeFilter);
  if (typeFilter === "task") {
    if (statusFilter === "open") query = query.is("done_at", null);
    else if (statusFilter === "done") query = query.not("done_at", "is", null);
    // Soonest-due first; undated tasks sink to the bottom.
    query = query.order("due_at", { ascending: true, nullsFirst: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const [activitiesRes, peopleRes] = await Promise.all([
    query,
    supabase.from("people").select("id, full_name").order("full_name").limit(500),
  ]);
  const rows = (activitiesRes.data ?? []) as unknown as ActivityRow[];
  const people = (peopleRes.data ?? []) as unknown as PersonOption[];

  const link = (t: string, s: string) => {
    const p = new URLSearchParams();
    if (t !== "task") p.set("type", t);
    if (s !== "open") p.set("status", s);
    return `/admin/activities${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageTitle title="فعالیت‌ها" en="Activities" subtitle="وظایف و تعاملات همهٔ مخاطبان" />

      {canEdit ? (
        <details className="card-surface mb-4 p-4">
          <summary className="cursor-pointer text-sm font-medium">+ فعالیت جدید (New activity)</summary>
          <div className="mt-4">
            <ActivityQuickForm people={people} />
          </div>
        </details>
      ) : null}

      {/* Type filter */}
      <div className="mb-3 flex flex-wrap gap-2">
        {(["task", ...LOGGABLE_ACTIVITY_TYPES.filter((t) => t !== "task")] as const).map((t) => (
          <Link
            key={t}
            href={link(t, statusFilter)}
            className={typeFilter === t ? "" : "opacity-60"}
          >
            <Badge tone={typeFilter === t ? "accent" : "neutral"}>{ACTIVITY_TYPE_LABELS[t]}</Badge>
          </Link>
        ))}
      </div>

      {/* Status filter (tasks only) */}
      {typeFilter === "task" ? (
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          {(
            [
              ["open", "باز (Open)"],
              ["done", "انجام‌شده (Done)"],
              ["all", "همه (All)"],
            ] as const
          ).map(([s, label]) => (
            <Link
              key={s}
              href={link("task", s)}
              className={`rounded-lg px-3 py-1 ${
                statusFilter === s ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      ) : null}

      <AdminTable
        headers={
          typeFilter === "task"
            ? ["نوع", "عنوان", "مخاطب", "سررسید", "ثبت", ""]
            : ["نوع", "عنوان", "مخاطب", "تاریخ"]
        }
        empty={rows.length === 0}
      >
        {rows.map((a) => {
          const overdue = isTaskOverdue(a.due_at, a.done_at);
          const today = isTaskToday(a.due_at, a.done_at);
          return (
            <tr key={a.id} className={overdue ? "bg-red-500/5" : today ? "bg-amber-500/5" : undefined}>
              <td className="px-4 py-3">
                <Badge tone={a.type === "stage_change" ? "neutral" : "accent"}>
                  {activityTypeLabel(a.type)}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <span className="font-medium">{a.title ?? "—"}</span>
                {a.body ? (
                  <span className="block max-w-md truncate text-xs text-muted">{a.body}</span>
                ) : null}
              </td>
              <td className="px-4 py-3">
                {a.people ? (
                  <Link href={`/admin/people/${a.people.id}`} className="text-accent hover:underline">
                    {a.people.full_name}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              {typeFilter === "task" ? (
                <>
                  <td className="px-4 py-3">
                    {a.due_at ? (
                      a.done_at ? (
                        <span className="text-muted">{faDate(a.due_at)}</span>
                      ) : (
                        <Badge tone={overdue ? "danger" : today ? "warn" : "neutral"}>
                          {faDate(a.due_at)}
                        </Badge>
                      )
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {a.done_at ? `انجام: ${faDate(a.done_at)}` : faDate(a.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <form action={toggleTaskAction}>
                        <input type="hidden" name="activity_id" value={a.id} />
                        <input type="hidden" name="person_id" value={a.people?.id ?? ""} />
                        <input type="hidden" name="done" value={a.done_at ? "0" : "1"} />
                        <button type="submit" className="text-accent hover:underline">
                          {a.done_at ? "بازگشایی" : "✓ انجام شد"}
                        </button>
                      </form>
                    ) : null}
                  </td>
                </>
              ) : (
                <td className="px-4 py-3 text-muted">{faDate(a.created_at)}</td>
              )}
            </tr>
          );
        })}
      </AdminTable>
    </>
  );
}
