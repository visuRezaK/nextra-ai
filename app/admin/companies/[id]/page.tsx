import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, Badge, En, faDate, faCad } from "@/components/admin/ui";
import { stageLabel, stageTone, type PipelineStage } from "@/lib/admin/crm";
import { EditCompanyForm } from "../company-form";

export const dynamic = "force-dynamic";

type CompanyRow = {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  city: string | null;
  size_label: string | null;
  notes: string | null;
  created_at: string;
};

type PersonRow = {
  id: string;
  full_name: string;
  position: string | null;
  email: string | null;
};

type DealRow = {
  id: string;
  title: string;
  amount_cad: number | string | null;
  pipeline_stages: Pick<PipelineStage, "label_fa" | "label_en" | "is_won" | "is_lost"> | null;
};

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { role } = await requireRole(["operator", "viewer"]);
  const { id } = await params;
  const supabase = getAdminClient();
  const canEdit = role !== "viewer";

  const { data: companyData } = await supabase
    .from("companies")
    .select("id, name, industry, website, city, size_label, notes, created_at")
    .eq("id", id)
    .maybeSingle();
  const company = companyData as unknown as CompanyRow | null;
  if (!company) notFound();

  const [peopleRes, dealsRes] = await Promise.all([
    supabase
      .from("people")
      .select("id, full_name, position, email")
      .eq("company_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("deals")
      .select("id, title, amount_cad, pipeline_stages(label_fa, label_en, is_won, is_lost)")
      .eq("company_id", id)
      .order("created_at", { ascending: false }),
  ]);
  const people = (peopleRes.data ?? []) as unknown as PersonRow[];
  const deals = (dealsRes.data ?? []) as unknown as DealRow[];

  return (
    <>
      <PageTitle
        title={company.name}
        en="Company"
        subtitle={[company.industry, company.city].filter(Boolean).join(" · ") || undefined}
      />

      <Link href="/admin/companies" className="mb-4 inline-block text-sm text-accent hover:underline">
        ← بازگشت به فهرست شرکت‌ها
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-1">
          <section className="card-surface p-5">
            <h2 className="mb-3 font-semibold">
              مخاطبان
              <En>Contacts</En>
            </h2>
            {people.length === 0 ? (
              <p className="text-sm text-muted">مخاطبی ثبت نشده است.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {people.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <Link href={`/admin/people/${p.id}`} className="text-accent hover:underline">
                      {p.full_name}
                    </Link>
                    {p.position ? <span className="text-muted">{p.position}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card-surface p-5">
            <h2 className="mb-3 font-semibold">
              معاملات
              <En>Deals</En>
            </h2>
            {deals.length === 0 ? (
              <p className="text-sm text-muted">معامله‌ای ثبت نشده است.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {deals.map((d) => (
                  <li key={d.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{d.title}</span>
                      <span className="text-sm text-muted">{faCad(d.amount_cad)}</span>
                    </div>
                    {d.pipeline_stages ? (
                      <div className="mt-1.5">
                        <Badge tone={stageTone(d.pipeline_stages)}>
                          {stageLabel(d.pipeline_stages)}
                        </Badge>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="lg:col-span-2">
          {canEdit ? (
            <section className="card-surface p-5">
              <h2 className="mb-4 font-semibold">
                ویرایش شرکت
                <En>Edit</En>
              </h2>
              <EditCompanyForm
                companyId={company.id}
                name={company.name}
                industry={company.industry ?? ""}
                website={company.website ?? ""}
                city={company.city ?? ""}
                sizeLabel={company.size_label ?? ""}
                notes={company.notes ?? ""}
              />
            </section>
          ) : (
            <section className="card-surface p-5 text-sm text-muted">
              ثبت‌شده در {faDate(company.created_at)}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
