"use server";

import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";

export type AcceptState = { ok: true } | { ok: false; error: string } | undefined;

// PUBLIC accept — no admin auth. The gate is knowing the unguessable
// share_token; the client types their name and the contract is signed. Only a
// contract in 'sent'/'viewed' can be accepted (not draft/canceled/already-signed).
export async function acceptContractAction(
  _prev: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const token = String(formData.get("share_token") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!token) return { ok: false, error: "لینک نامعتبر است." };
  if (name.length < 2) return { ok: false, error: "لطفاً نام کامل خود را وارد کنید." };

  const supabase = getAdminClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, status")
    .eq("share_token", token)
    .maybeSingle();
  if (!contract) return { ok: false, error: "قرارداد یافت نشد." };
  if (contract.status === "accepted") return { ok: false, error: "این قرارداد قبلاً تأیید شده است." };
  if (contract.status !== "sent" && contract.status !== "viewed") {
    return { ok: false, error: "این قرارداد در دسترس نیست." };
  }

  const { error } = await supabase
    .from("contracts")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by_name: name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contract.id);
  if (error) {
    console.error("acceptContract error:", error);
    return { ok: false, error: "ثبت تأیید ناموفق بود." };
  }

  revalidatePath(`/contract/${token}`);
  revalidatePath(`/admin/contracts/${contract.id}`);
  return { ok: true };
}
