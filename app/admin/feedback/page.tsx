import Link from "next/link";
import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, StatCard, Badge, fa, faDate, faPct } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

// Assistant answers that admit not knowing — candidates for KB additions.
// Matches the honesty rule in the persona («... مطمئن نیستی ...»).
const UNANSWERED_PATTERN = "%مطمئن نیست%";

export default async function FeedbackPage() {
  await requireRole(["operator", "viewer"]);
  const supabase = getAdminClient();

  const [feedbackRes, upRes, downRes, unansweredRes] = await Promise.all([
    supabase
      .from("chat_feedback")
      .select("id, session_id, rating, question, answer, comment, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("chat_feedback")
      .select("*", { count: "exact", head: true })
      .eq("rating", 1),
    supabase
      .from("chat_feedback")
      .select("*", { count: "exact", head: true })
      .eq("rating", -1),
    supabase
      .from("chat_messages")
      .select("id, session_id, content, created_at")
      .eq("role", "assistant")
      .ilike("content", UNANSWERED_PATTERN)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const rows = feedbackRes.data ?? [];
  const up = upRes.count ?? 0;
  const down = downRes.count ?? 0;
  const total = up + down;
  const satisfaction = total > 0 ? Math.round((up / total) * 100) : null;

  // Pair each "I'm not sure" answer with the user question right before it.
  const unanswered = await Promise.all(
    (unansweredRes.data ?? []).map(async (m) => {
      const { data: q } = await supabase
        .from("chat_messages")
        .select("content")
        .eq("session_id", m.session_id)
        .eq("role", "user")
        .lt("created_at", m.created_at)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return { ...m, question: q?.content ?? null };
    }),
  );

  return (
    <>
      <PageTitle
        title="بازخورد"
        subtitle="امتیاز کاربران به پاسخ‌ها و سؤالاتی که چت‌بات جوابی برایشان نداشت"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="👍 مفید" value={fa(up)} />
        <StatCard label="👎 غیرمفید" value={fa(down)} />
        <StatCard
          label="نرخ رضایت"
          value={satisfaction === null ? "—" : faPct(satisfaction)}
        />
        <StatCard label="سؤالات بی‌جواب اخیر" value={fa(unanswered.length)} />
      </div>

      <section className="card-surface mt-6 p-5">
        <h2 className="mb-1 font-semibold">سؤالات بی‌جواب</h2>
        <p className="mb-4 text-sm text-muted">
          پاسخ‌هایی که بات صادقانه گفته «مطمئن نیستم» — بهترین کاندیدها برای افزودن به پایگاه دانش
          (بخش chatbot_faq در fa.json/en.json و سپس بازسازی KB).
        </p>
        {unanswered.length === 0 ? (
          <p className="text-sm text-muted">موردی یافت نشد. 🎉</p>
        ) : (
          <ul className="divide-y divide-border">
            {unanswered.map((m) => (
              <li key={m.id} className="py-3 text-sm">
                <p className="font-medium">{m.question ?? "(سؤال یافت نشد)"}</p>
                <p className="mt-1 line-clamp-2 text-muted">{m.content}</p>
                <p className="mt-1 flex items-center gap-3 text-xs text-muted">
                  <span>{faDate(m.created_at)}</span>
                  <Link
                    href={`/admin/conversations/${m.session_id}`}
                    className="text-accent hover:underline"
                  >
                    مشاهده گفتگو
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-surface mt-6 p-5">
        <h2 className="mb-4 font-semibold">بازخوردهای اخیر</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">
            هنوز بازخوردی ثبت نشده است. (پس از اجرای supabase/admin2.sql، دکمه‌های 👍/👎 زیر پاسخ‌های
            چت‌بات فعال می‌شوند.)
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((f) => (
              <li key={f.id} className="py-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge tone={f.rating === 1 ? "success" : "neutral"}>
                    {f.rating === 1 ? "👍" : "👎"}
                  </Badge>
                  <span className="text-xs text-muted">{faDate(f.created_at)}</span>
                  {f.session_id ? (
                    <Link
                      href={`/admin/conversations/${f.session_id}`}
                      className="text-xs text-accent hover:underline"
                    >
                      مشاهده گفتگو
                    </Link>
                  ) : null}
                </div>
                {f.question ? <p className="mt-2 font-medium">{f.question}</p> : null}
                {f.answer ? <p className="mt-1 line-clamp-2 text-muted">{f.answer}</p> : null}
                {f.comment ? <p className="mt-1 text-foreground/80">💬 {f.comment}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
