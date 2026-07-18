import { requireRole } from "@/lib/admin/auth";
import { PageTitle } from "@/components/admin/ui";
import { aiEnabled } from "@/lib/admin/ai";
import { AssistantChat } from "./assistant-client";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  await requireRole(["operator"]);
  const enabled = aiEnabled();

  return (
    <>
      <PageTitle title="دستیار" en="Assistant" subtitle="پرسش‌وپاسخ بر پایهٔ دادهٔ واقعی CRM" />
      {enabled ? (
        <AssistantChat />
      ) : (
        <p className="card-surface p-6 text-center text-sm text-muted">
          دستیار هوش مصنوعی فعال نیست — <span dir="ltr">GOOGLE_GENERATIVE_AI_API_KEY</span> را در
          محیط تنظیم کنید.
        </p>
      )}
    </>
  );
}
