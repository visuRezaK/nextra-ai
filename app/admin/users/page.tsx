import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, AdminTable, Badge, faDate } from "@/components/admin/ui";
import { RoleSelect } from "./role-select";

export const dynamic = "force-dynamic";

const ROLE_TONES: Record<string, "accent" | "success" | "neutral"> = {
  admin: "accent",
  editor: "success",
  operator: "success",
  viewer: "neutral",
  user: "neutral",
};

export default async function UsersPage() {
  const { user: me } = await requireRole([]);
  const supabase = getAdminClient();

  const [profilesRes, auditRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .order("created_at", { ascending: true })
      .limit(200),
    supabase
      .from("audit_log")
      .select("id, actor_email, action, target, meta, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const profiles = profilesRes.data ?? [];
  const audit = auditRes.data ?? [];

  return (
    <>
      <PageTitle
        title="کاربران و دسترسی"
        subtitle="نقش هر کاربر ثبت‌نامی + تاریخچه اقدامات پنل"
      />

      <section>
        <h2 className="mb-3 font-semibold">کاربران</h2>
        <AdminTable
          headers={["نام", "ایمیل", "نقش فعلی", "تاریخ ثبت‌نام", "تغییر نقش"]}
          empty={profiles.length === 0}
        >
          {profiles.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3 font-medium">
                {p.full_name ?? "—"}
                {p.id === me.id ? <span className="ms-2 text-xs text-muted">(شما)</span> : null}
              </td>
              <td className="px-4 py-3" dir="ltr">{p.email ?? "—"}</td>
              <td className="px-4 py-3">
                <Badge tone={ROLE_TONES[p.role] ?? "neutral"}>{p.role}</Badge>
              </td>
              <td className="px-4 py-3 text-muted">{faDate(p.created_at)}</td>
              <td className="px-4 py-3">
                <RoleSelect id={p.id} role={p.role} isSelf={p.id === me.id} />
              </td>
            </tr>
          ))}
        </AdminTable>
        <p className="mt-2 text-xs text-muted">
          ادمین: همه‌چیز · ویرایشگر: پایگاه دانش، پرسونا، پلی‌گراند · اپراتور: لیدها، گفتگوها،
          بازخورد · فقط‌خواندنی: مشاهده بخش‌های اصلی
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold">تاریخچه اقدامات (Audit)</h2>
        <AdminTable
          headers={["زمان", "کاربر", "اقدام", "هدف"]}
          empty={audit.length === 0}
        >
          {audit.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-3 text-muted">{faDate(a.created_at)}</td>
              <td className="px-4 py-3" dir="ltr">{a.actor_email ?? "—"}</td>
              <td className="px-4 py-3">
                <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs" dir="ltr">
                  {a.action}
                </code>
              </td>
              <td className="max-w-xs truncate px-4 py-3 text-muted" dir="ltr">
                {a.target ?? "—"}
              </td>
            </tr>
          ))}
        </AdminTable>
      </section>
    </>
  );
}
