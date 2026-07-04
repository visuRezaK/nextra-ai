import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, Badge, fa, faDate } from "@/components/admin/ui";
import { OperatorReply } from "./operator-reply";
import { resolveHandoffAction } from "./actions";

export const dynamic = "force-dynamic";

const CHANNEL_LABELS: Record<string, string> = {
  web: "وب",
  widget: "ویجت",
  telegram: "تلگرام",
};

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["operator", "viewer"]);
  const { id } = await params;
  const supabase = getAdminClient();

  // Handoff columns exist only after admin3.sql; fall back so the page never breaks.
  let handoff: { requested: string | null; resolved: string | null } = {
    requested: null,
    resolved: null,
  };
  let { data: session } = await supabase
    .from("chat_sessions")
    .select("id, channel, external_id, created_at, last_seen, handoff_requested_at, handoff_resolved_at")
    .eq("id", id)
    .maybeSingle();
  if (session) {
    handoff = {
      requested: session.handoff_requested_at ?? null,
      resolved: session.handoff_resolved_at ?? null,
    };
  } else {
    ({ data: session } = await supabase
      .from("chat_sessions")
      .select("id, channel, external_id, created_at, last_seen")
      .eq("id", id)
      .maybeSingle());
  }

  if (!session) notFound();
  const handoffOpen = Boolean(handoff.requested) && !handoff.resolved;

  const [messagesRes, memoryRes, leadsRes] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("id, role, content, created_at, model, tokens_in, tokens_out")
      .eq("session_id", id)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: true })
      .limit(500),
    supabase.from("chat_memory").select("summary, updated_at").eq("session_id", id).maybeSingle(),
    supabase
      .from("contacts")
      .select("id, name, email, phone, created_at")
      .eq("session_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const messages = messagesRes.data ?? [];
  const memory = memoryRes.data;
  const leads = leadsRes.data ?? [];

  return (
    <>
      <PageTitle
        title="جزئیات گفتگو"
        subtitle={`${CHANNEL_LABELS[session.channel] ?? session.channel} · شروع ${faDate(session.created_at)} · آخرین بازدید ${faDate(session.last_seen)}`}
      />

      <Link href="/admin/conversations" className="mb-4 inline-block text-sm text-accent hover:underline">
        ← بازگشت به فهرست گفتگوها
      </Link>

      {handoffOpen ? (
        <div className="card-surface mb-6 border-amber-400/40 bg-amber-500/5 p-5">
          <h2 className="mb-2 flex items-center gap-2 font-semibold">
            🙋 در انتظار اپراتور انسانی
            <span className="text-xs font-normal text-muted">
              درخواست: {faDate(handoff.requested!)}
            </span>
          </h2>
          <p className="mb-4 text-sm text-muted">
            {session.channel === "telegram"
              ? "می‌توانید از همین‌جا مستقیم در تلگرام کاربر پاسخ بدهید."
              : "این گفتگو از وب است و ارسال مستقیم ندارد — از اطلاعات تماس لید (در همین صفحه) پیگیری کنید."}
          </p>
          <form action={resolveHandoffAction}>
            <input type="hidden" name="session_id" value={session.id} />
            <button
              type="submit"
              className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:border-accent/60"
            >
              ✓ رسیدگی شد (بستن درخواست)
            </button>
          </form>
        </div>
      ) : null}

      {leads.length > 0 ? (
        <div className="card-surface mb-6 border-accent/30 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            لید ثبت‌شده <Badge tone="accent">{fa(leads.length)}</Badge>
          </h2>
          <ul className="divide-y divide-border text-sm">
            {leads.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="font-medium">{l.name}</span>
                {l.email ? <span dir="ltr" className="text-muted">{l.email}</span> : null}
                {l.phone ? <span dir="ltr" className="text-muted">{l.phone}</span> : null}
                <span className="ms-auto text-xs text-muted">{faDate(l.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {memory?.summary ? (
        <div className="card-surface mb-6 p-5">
          <h2 className="mb-2 font-semibold">خلاصهٔ حافظه</h2>
          <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/80">{memory.summary}</p>
          <p className="mt-2 text-xs text-muted">به‌روزرسانی: {faDate(memory.updated_at)}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {messages.length === 0 ? (
          <p className="card-surface p-6 text-center text-sm text-muted">پیامی ثبت نشده است.</p>
        ) : null}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 ${
              m.role === "user"
                ? "self-start border border-accent/20 bg-accent/10"
                : "card-surface self-end"
            }`}
          >
            <p className="whitespace-pre-wrap">{m.content}</p>
            <p className="mt-1.5 flex items-center gap-2 text-xs text-muted">
              <span>
                {m.role === "user" ? "کاربر" : m.model === "operator" ? "👤 اپراتور" : "دستیار"}
              </span>
              <span>·</span>
              <span>{faDate(m.created_at)}</span>
              {m.model && m.model !== "operator" ? (
                <>
                  <span>·</span>
                  <span dir="ltr">{m.model}</span>
                  {m.tokens_in != null || m.tokens_out != null ? (
                    <span dir="ltr">
                      ({fa(m.tokens_in ?? 0)}→{fa(m.tokens_out ?? 0)})
                    </span>
                  ) : null}
                </>
              ) : null}
            </p>
          </div>
        ))}
      </div>

      {session.channel === "telegram" ? (
        <div className="card-surface mt-6 p-5">
          <h2 className="mb-3 font-semibold">پاسخ اپراتور</h2>
          <OperatorReply sessionId={session.id} />
        </div>
      ) : null}
    </>
  );
}
