"use server";

import { createClient } from "@supabase/supabase-js";

export type ContactState = { success: boolean; error?: string } | undefined;

export async function submitContactAction(
  prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const locale = String(formData.get("locale") ?? "fa");

  if (!name || !email) {
    return {
      success: false,
      error: locale === "fa" ? "نام و ایمیل الزامی است." : "Name and email are required.",
    };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase.from("contacts").insert({
    name,
    email,
    phone: phone || null,
    message: message || null,
  });

  if (error) {
    console.error("Contact insert error:", error);
    return {
      success: false,
      error: locale === "fa" ? "خطایی رخ داد. دوباره امتحان کن." : "Something went wrong. Please try again.",
    };
  }

  return { success: true };
}
