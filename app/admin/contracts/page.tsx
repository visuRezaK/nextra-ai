import Link from "next/link";
import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, AdminTable, Badge, faDate, faCad } from "@/components/admin/ui";
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONES,
  isContractStatus,
} from "@/lib/admin/contracts";
import { createContractAction } from "./actions";

export const dynamic = "force-dynamic";

type ContractRow = {
  id: string;
  contract_no: string | null;
  title: string;
  amount_cad: number | string | null;
  status: string;
  created_at: string;
  people: { full_name: string } | null;
};

type DealOption = { id: string; title: string };

export default async function ContractsPage() {
  const { role } = await requireRole(["operator", "viewer"]);
  const supabase = getAdminClient();
  const canEdit = role !== "viewer";

  const [contractsRes, dealsRes] = await Promise.all([
    supabase
      .from("contracts")
      .select("id, contract_no, title, amount_cad, status, created_at, people(full_name)")
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.from("deals").select("id, title").order("updated_at", { ascending: false }).limit(500),
  ]);

  // contracts is missing before admin9.sql → data null → show the hint.
  if (!contractsRes.data) {
    return (
      <>
        <PageTitle title="قراردادها" en="Contracts" subtitle="ساخت و پیگیری قراردادهای مشاوره" />
        <p className="card-surface p-6 text-center text-sm text-muted">
          برای فعال‌سازی قراردادها، فایل <span dir="ltr">supabase/admin9.sql</span> را در Supabase
          اجرا کنید.
        </p>
      </>
    );
  }

  const rows = contractsRes.data as unknown as ContractRow[];
  const deals = (dealsRes.data ?? []) as unknown as DealOption[];

  return (
    <>
      <PageTitle title="قراردادها" en="Contracts" subtitle="ساخت و پیگیری قراردادهای مشاوره" />

      {canEdit && deals.length > 0 ? (
        <details className="card-surface mb-4 p-4">
          <summary className="cursor-pointer text-sm font-medium">
            + قرارداد جدید از معامله (New contract from a deal)
          </summary>
          <form action={createContractAction} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs text-muted">معامله (Deal)</span>
              <select
                name="deal_id"
                required
                defaultValue=""
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="" disabled>
                  — انتخاب معامله —
                </option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-hover"
            >
              ساخت پیش‌نویس (Create draft)
            </button>
          </form>
        </details>
      ) : null}

      <AdminTable
        headers={["شماره", "عنوان", "مخاطب", "مبلغ", "وضعیت", "تاریخ"]}
        empty={rows.length === 0}
      >
        {rows.map((c) => {
          const status = isContractStatus(c.status) ? c.status : "draft";
          return (
            <tr key={c.id}>
              <td className="px-4 py-3" dir="ltr">
                <Link href={`/admin/contracts/${c.id}`} className="text-accent hover:underline">
                  {c.contract_no ?? "—"}
                </Link>
              </td>
              <td className="px-4 py-3 font-medium">{c.title}</td>
              <td className="px-4 py-3">{c.people?.full_name ?? "—"}</td>
              <td className="px-4 py-3">{faCad(c.amount_cad)}</td>
              <td className="px-4 py-3">
                <Badge tone={CONTRACT_STATUS_TONES[status]}>{CONTRACT_STATUS_LABELS[status]}</Badge>
              </td>
              <td className="px-4 py-3 text-muted">{faDate(c.created_at)}</td>
            </tr>
          );
        })}
      </AdminTable>
    </>
  );
}
