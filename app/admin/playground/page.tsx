import { requireRole } from "@/lib/admin/auth";
import { PageTitle } from "@/components/admin/ui";
import { PlaygroundClient } from "./playground-client";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function PlaygroundPage() {
  await requireRole(["editor"]);

  return (
    <>
      <PageTitle
        title="پلی‌گراند"
        subtitle="تست پاسخ‌ها با همان پایپ‌لاین RAG واقعی — بدون اثر روی گفتگوها، حافظه و لیدها"
      />
      <PlaygroundClient />
    </>
  );
}
