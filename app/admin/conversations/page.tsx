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

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  await requireRole(["operator", "viewer"]);
  const { channel } = await searchParams;
  const supabase = getAdminClient();

  let query = supabase
    .from("chat_sessions")
    .select("id, channel, external_id, created_at, last_seen, chat_messages(count)")
    .order("last_seen", { ascending: false })
    .limit(100);

  if (channel === "web" || channel === "widget" || channel === "telegram") {
    query = query.eq("channel", channel);
  }

  const { data } = await query;
  const rows = data ?? [];

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
          const messageCount =
            (s.chat_messages as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
          return (
            <tr key={s.id}>
              <td className="px-4 py-3">
                <Badge tone={s.channel === "telegram" ? "success" : "accent"}>
                  {CHANNEL_LABELS[s.channel] ?? s.channel}
                </Badge>
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
