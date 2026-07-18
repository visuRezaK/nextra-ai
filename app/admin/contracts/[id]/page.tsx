import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, Badge, En, faDate, faCad } from "@/components/admin/ui";
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONES,
  isContractStatus,
} from "@/lib/admin/contracts";
import { CONTACT } from "@/app/card/contact";
import { ContractMarkdown } from "@/components/contract-markdown";
import { EditContractForm, CopyLinkButton, RewriteButton } from "./contract-client";
import {
  sendContractAction,
  reopenContractAction,
  cancelContractAction,
  deleteContractAction,
} from "../actions";

export const dynamic = "force-dynamic";

type ContractRow = {
  id: string;
  contract_no: string | null;
  title: string;
  body_md: string;
  amount_cad: number | string | null;
  start_date: string | null;
  duration_label: string | null;
  status: string;
  share_token: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  accepted_by_name: string | null;
  created_at: string;
  people: { id: string; full_name: string } | null;
  deals: { id: string; title: string } | null;
};

const SITE = process.env.NEXT_PUBLIC_SITE_URL || CONTACT.site;

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { role } = await requireRole(["operator", "viewer"]);
  const { id } = await params;
  const supabase = getAdminClient();
  const canEdit = role !== "viewer";

  const { data } = await supabase
    .from("contracts")
    .select(
      "id, contract_no, title, body_md, amount_cad, start_date, duration_label, status, share_token, sent_at, viewed_at, accepted_at, accepted_by_name, created_at, people(id, full_name), deals(id, title)",
    )
    .eq("id", id)
    .maybeSingle();
  const contract = data as unknown as ContractRow | null;
  if (!contract) notFound();

  const status = isContractStatus(contract.status) ? contract.status : "draft";
  const shareUrl = contract.share_token ? `${SITE}/contract/${contract.share_token}` : null;
  const editable = canEdit && status !== "accepted" && status !== "canceled";

  return (
    <>
      <PageTitle
        title={contract.title}
        en="Contract"
        subtitle={`${contract.contract_no ?? "—"} · ${faCad(contract.amount_cad)} · ثبت ${faDate(contract.created_at)}`}
      />

      <Link href="/admin/contracts" className="mb-4 inline-block text-sm text-accent hover:underline">
        ← بازگشت به فهرست قراردادها
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Badge tone={CONTRACT_STATUS_TONES[status]}>{CONTRACT_STATUS_LABELS[status]}</Badge>
        {contract.people ? (
          <Link href={`/admin/people/${contract.people.id}`} className="text-sm text-accent hover:underline">
            {contract.people.full_name}
          </Link>
        ) : null}
        {contract.deals ? (
          <Link href={`/admin/deals/${contract.deals.id}`} className="text-sm text-muted hover:text-accent">
            {contract.deals.title}
          </Link>
        ) : null}
      </div>

      {contract.accepted_at ? (
        <div className="card-surface mb-6 border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          ✓ توسط <span className="font-medium">{contract.accepted_by_name}</span> در{" "}
          {faDate(contract.accepted_at)} تأیید شد.
        </div>
      ) : null}

      {/* Status controls + share link */}
      {canEdit ? (
        <section className="card-surface mb-6 flex flex-col gap-3 p-5">
          <h2 className="font-semibold">
            وضعیت و اشتراک‌گذاری
            <En>Status & Sharing</En>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {status === "draft" ? (
              <form action={sendContractAction}>
                <input type="hidden" name="contract_id" value={contract.id} />
                <button
                  type="submit"
                  className="rounded-lg bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-hover"
                >
                  ارسال برای کارفرما (Send)
                </button>
              </form>
            ) : null}

            {shareUrl ? (
              <>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:border-accent/60"
                >
                  مشاهدهٔ صفحهٔ عمومی (Open)
                </a>
                <CopyLinkButton url={shareUrl} />
                <a
                  href={`mailto:?subject=${encodeURIComponent(contract.title)}&body=${encodeURIComponent(shareUrl)}`}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:border-accent/60"
                >
                  ارسال با ایمیل (Email)
                </a>
              </>
            ) : null}

            {status !== "draft" && status !== "accepted" ? (
              <form action={reopenContractAction}>
                <input type="hidden" name="contract_id" value={contract.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:border-accent/60"
                >
                  بازگشت به پیش‌نویس (Reopen)
                </button>
              </form>
            ) : null}

            {status !== "canceled" && status !== "accepted" ? (
              <form action={cancelContractAction}>
                <input type="hidden" name="contract_id" value={contract.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-500/5"
                >
                  لغو (Cancel)
                </button>
              </form>
            ) : null}
          </div>
          {shareUrl ? (
            <p dir="ltr" className="rounded-lg bg-surface-2 px-3 py-2 text-start text-xs text-muted">
              {shareUrl}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Editor (when editable) */}
      {editable ? (
        <section className="card-surface mb-6 p-5">
          <h2 className="mb-4 font-semibold">
            ویرایش قرارداد
            <En>Edit</En>
          </h2>
          <EditContractForm
            contractId={contract.id}
            title={contract.title}
            amount={Number(contract.amount_cad ?? 0)}
            startDate={contract.start_date ?? ""}
            durationLabel={contract.duration_label ?? ""}
            bodyMd={contract.body_md}
          />
          <div className="mt-4 border-t border-border pt-4">
            <RewriteButton contractId={contract.id} />
          </div>
        </section>
      ) : null}

      {/* Preview */}
      <section className="card-surface p-6">
        <h2 className="mb-4 font-semibold">
          پیش‌نمایش
          <En>Preview</En>
        </h2>
        <ContractMarkdown source={contract.body_md} />
      </section>

      {canEdit ? (
        <form action={deleteContractAction} className="mt-6">
          <input type="hidden" name="contract_id" value={contract.id} />
          <button
            type="submit"
            className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-500/5"
          >
            حذف قرارداد (Delete)
          </button>
        </form>
      ) : null}
    </>
  );
}
