import Link from "next/link";
import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, AdminTable, Badge, faDate } from "@/components/admin/ui";
import { SEGMENTS, segmentLabel } from "@/lib/admin/segments";
import { createCampaignAction } from "./actions";

export const dynamic = "force-dynamic";

type CampaignRow = {
  id: string;
  name: string;
  segment_key: string;
  status: string;
  created_at: string;
  campaign_emails: { count: number }[];
};

const inputClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

const STATUS_LABEL: Record<string, string> = {
  draft: "پیش‌نویس (Draft)",
  sending: "در حال ارسال (Sending)",
  done: "انجام‌شده (Done)",
};

export default async function CampaignsPage() {
  const { role } = await requireRole(["operator", "viewer"]);
  const supabase = getAdminClient();
  const canEdit = role !== "viewer";

  const { data } = await supabase
    .from("campaigns")
    .select("id, name, segment_key, status, created_at, campaign_emails(count)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (!data) {
    return (
      <>
        <PageTitle title="کمپین‌ها" en="Campaigns" subtitle="ایمیل شخصی‌سازی‌شده با بازبینی انسانی" />
        <p className="card-surface p-6 text-center text-sm text-muted">
          برای فعال‌سازی کمپین‌ها، فایل <span dir="ltr">supabase/admin10.sql</span> را در Supabase
          اجرا کنید.
        </p>
      </>
    );
  }

  const rows = data as unknown as CampaignRow[];

  return (
    <>
      <PageTitle title="کمپین‌ها" en="Campaigns" subtitle="ایمیل شخصی‌سازی‌شده با بازبینی انسانی" />

      {canEdit ? (
        <details className="card-surface mb-4 p-4">
          <summary className="cursor-pointer text-sm font-medium">
            + کمپین جدید (New campaign)
          </summary>
          <form action={createCampaignAction} className="mt-4 flex flex-col gap-3">
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-xs text-muted">نام کمپین (Name)</span>
                <input name="name" required className={inputClass} />
              </label>
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-xs text-muted">مخاطبان (Segment)</span>
                <select name="segment_key" required defaultValue="" className={inputClass}>
                  <option value="" disabled>
                    — انتخاب سگمنت —
                  </option>
                  {SEGMENTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label_fa} ({s.label_en})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">هدف کمپین (Goal) — برای پیش‌نویس ایمیل‌ها</span>
              <textarea
                name="goal"
                rows={2}
                placeholder="مثلاً: دعوت به یک جلسهٔ مشاورهٔ رایگان دربارهٔ اتوماسیون فروش"
                className={`${inputClass} leading-7`}
              />
            </label>
            <div>
              <button
                type="submit"
                className="rounded-lg bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-hover"
              >
                ساخت کمپین (Create)
              </button>
            </div>
          </form>
          <p className="mt-3 text-xs text-muted">سگمنت هنگام ساخت، حداکثر ۲۰ گیرندهٔ دارای ایمیل را ثابت می‌کند.</p>
        </details>
      ) : null}

      <AdminTable headers={["نام", "مخاطبان", "گیرندگان", "وضعیت", "تاریخ"]} empty={rows.length === 0}>
        {rows.map((c) => (
          <tr key={c.id}>
            <td className="px-4 py-3 font-medium">
              <Link href={`/admin/campaigns/${c.id}`} className="text-accent hover:underline">
                {c.name}
              </Link>
            </td>
            <td className="px-4 py-3">{segmentLabel(c.segment_key)}</td>
            <td className="px-4 py-3">{c.campaign_emails?.[0]?.count ?? 0}</td>
            <td className="px-4 py-3">
              <Badge tone={c.status === "done" ? "success" : "neutral"}>
                {STATUS_LABEL[c.status] ?? c.status}
              </Badge>
            </td>
            <td className="px-4 py-3 text-muted">{faDate(c.created_at)}</td>
          </tr>
        ))}
      </AdminTable>
    </>
  );
}
