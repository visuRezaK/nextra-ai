import Link from "next/link";
import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, AdminTable, Badge, fa, faDate } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const CHANNEL_LABELS: Record<string, string> = {
  web: "وب",
  widget: "ویجت",
  telegram: "تلگرام",
};

interface SessionRow {
  id: string;
  channel: string;
  external_id: string;
  created_at: string;
  last_seen: string;
  handoff_requested_at?: string | null;
  handoff_resolved_at?: string | null;
  chat_messages: { count: number }[] | null;
}

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string; handoff?: string }>;
}) {
  await requireRole(["operator", "viewer"]);
  const { channel, handoff } = await searchParams;
  const supabase = getAdminClient();

  const buildQuery = (withHandoff: boolean) => {
    let q = supabase
      .from("chat_sessions")
      .select(
        withHandoff
          ? "id, channel, external_id, created_at, last_seen, handoff_requested_at, handoff_resolved_at, chat_messages(count)"
          : "id, channel, external_id, created_at, last_seen, chat_messages(count)",
      )
      .order("last_seen", { ascending: false })
      .limit(100);
    if (channel === "web" || channel === "widget" || channel === "telegram") {
      q = q.eq("channel", channel);
    }
    if (withHandoff && handoff === "1") {
      q = q.not("handoff_requested_at", "is", null).is("handoff_resolved_at", null);
    }
    return q;
  };

  // Fall back to the pre-admin3.sql column set so the page never breaks.
  let { data } = await buildQuery(true);
  if (!data) ({ data } = await buildQuery(false));
  const rows = (data ?? []) as unknown as SessionRow[];

  return (
    <>
      <PageTitle title="گفتگوها" subtitle="مکالمات چت‌بات در همه کانال‌ها" />

      <form method="get" className="mb-4 flex items-center gap-2">
        <select
          name="channel"
          defaultValue={channel ?? ""}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        >
          <option value="">همه کانال‌ها</option>
          <option value="web">وب</option>
          <option value="widget">ویجت</option>
          <option value="telegram">تلگرام</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="handoff" value="1" defaultChecked={handoff === "1"} />
          فقط در انتظار اپراتور 🙋
        </label>
        <button
          type="submit"
          className="rounded-lg bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-hover"
        >
          اعمال فیلتر
        </button>
      </form>

      <AdminTable
        headers={["کانال", "شناسه", "تعداد پیام‌ها", "شروع", "آخرین بازدید", ""]}
        empty={rows.length === 0}
      >
        {rows.map((s) => {
          const messageCount = s.chat_messages?.[0]?.count ?? 0;
          const waiting = Boolean(s.handoff_requested_at) && !s.handoff_resolved_at;
          return (
            <tr key={s.id}>
              <td className="px-4 py-3">
                <span className="flex items-center gap-1.5">
                  <Badge tone={s.channel === "telegram" ? "success" : "accent"}>
                    {CHANNEL_LABELS[s.channel] ?? s.channel}
                  </Badge>
                  {waiting ? <Badge tone="accent">🙋 اپراتور</Badge> : null}
                </span>
              </td>
              <td className="max-w-40 truncate px-4 py-3 text-muted" dir="ltr">
                {s.external_id}
              </td>
              <td className="px-4 py-3">{fa(messageCount)}</td>
              <td className="px-4 py-3 text-muted">{faDate(s.created_at)}</td>
              <td className="px-4 py-3 text-muted">{faDate(s.last_seen)}</td>
              <td className="px-4 py-3">
                <Link href={`/admin/conversations/${s.id}`} className="text-accent hover:underline">
                  مشاهده
                </Link>
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </>
  );
}
