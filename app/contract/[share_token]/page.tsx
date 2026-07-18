import { notFound } from "next/navigation";
import { Logo } from "@/components/icons";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { ContractMarkdown } from "@/components/contract-markdown";
import { CONTACT } from "@/app/card/contact";
import { PrintButton, AcceptForm } from "./contract-public-client";

export const dynamic = "force-dynamic";

type PublicContract = {
  id: string;
  contract_no: string | null;
  title: string;
  body_md: string;
  status: string;
  viewed_at: string | null;
  accepted_at: string | null;
  accepted_by_name: string | null;
};

function faDateLong(iso: string): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-gregory-nu-latn", {
    dateStyle: "long",
    timeZone: "America/Toronto",
  }).format(new Date(iso));
}

export default async function PublicContractPage({
  params,
}: {
  params: Promise<{ share_token: string }>;
}) {
  const { share_token } = await params;
  const supabase = getAdminClient();

  const { data } = await supabase
    .from("contracts")
    .select("id, contract_no, title, body_md, status, viewed_at, accepted_at, accepted_by_name")
    .eq("share_token", share_token)
    .maybeSingle();
  const contract = data as unknown as PublicContract | null;

  // Draft (no token) and canceled contracts aren't reachable to the client.
  if (!contract || contract.status === "draft" || contract.status === "canceled") notFound();

  // Stamp the client's first open — sent → viewed.
  if (contract.status === "sent" && !contract.viewed_at) {
    await supabase
      .from("contracts")
      .update({ status: "viewed", viewed_at: new Date().toISOString() })
      .eq("id", contract.id);
  }

  const accepted = Boolean(contract.accepted_at);

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      {/* Brand header */}
      <header className="mb-6 flex items-center justify-between border-b border-border pb-4">
        <div dir="ltr" className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <div className="leading-tight">
            <p className="text-sm font-bold">Nextra AI</p>
            <p className="text-[10px] font-semibold tracking-widest text-accent">CONSULTING</p>
          </div>
        </div>
        <div className="contract-actions">
          <PrintButton />
        </div>
      </header>

      {accepted ? (
        <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700">
          ✓ این قرارداد در {faDateLong(contract.accepted_at!)} توسط{" "}
          <span className="font-medium">{contract.accepted_by_name}</span> تأیید شده است.
        </div>
      ) : null}

      {/* Contract body */}
      <article className="card-surface p-6 sm:p-8">
        <ContractMarkdown source={contract.body_md} />
      </article>

      {/* Accept box (hidden once accepted / in print) */}
      {!accepted ? (
        <section className="contract-actions card-surface mt-6 p-6">
          <h2 className="mb-3 font-semibold">تأیید و امضای آنلاین</h2>
          <AcceptForm token={share_token} />
        </section>
      ) : null}

      <footer className="mt-8 text-center text-xs text-muted">
        {CONTACT.org} · {CONTACT.phoneDisplay} · <span dir="ltr">{CONTACT.email}</span>
      </footer>

      {/* Print: drop the action bars + surface chrome, keep the document clean. */}
      <style>{`
        @media print {
          @page { margin: 16mm; }
          html, body { background: #fff; }
          .contract-actions { display: none !important; }
          .card-surface { border: none !important; box-shadow: none !important; padding: 0 !important; background: transparent !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </main>
  );
}
