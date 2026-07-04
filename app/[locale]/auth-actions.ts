"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";

export type AuthState = { error?: string; confirm?: boolean } | undefined;

function safeLocale(value: FormDataEntryValue | null): Locale {
  const v = typeof value === "string" ? value : "";
  return isLocale(v) ? v : defaultLocale;
}

async function getOrigin() {
  const h = await headers();
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    `https://${h.get("host") ?? "localhost:3000"}`
  );
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = safeLocale(formData.get("locale"));
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("name") ?? "").trim();

  if (!email || !password) return { error: "missing" };

  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback?next=/${locale}/dashboard`,
    },
  });

  if (error) return { error: error.message };

  // When email confirmation is enabled, there is no active session yet.
  if (!data.session) return { confirm: true };

  redirect(`/${locale}/dashboard`);
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = safeLocale(formData.get("locale"));
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "missing" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };
  redirect(`/${locale}/dashboard`);
}

export async function googleAction(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get("locale"));
  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=/${locale}/dashboard`,
    },
  });

  if (error || !data.url) redirect(`/${locale}/login?error=google`);
  redirect(data.url);
}

export async function forgotPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const locale = safeLocale(formData.get("locale"));
  const email = String(formData.get("email") ?? "").trim();

  if (!email) return { error: "missing" };

  const supabase = await createClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/${locale}/reset-password`,
  });

  // Log but don't surface errors — never reveal whether the email exists.
  if (error) console.error("forgotPasswordAction error:", error.message);
  return { confirm: true };
}

export async function resetPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const locale = safeLocale(formData.get("locale"));
  const password = String(formData.get("password") ?? "");

  if (password.length < 6) return { error: "missing" };

  const supabase = await createClient();

  // The recovery link went through /auth/callback, which exchanged the code
  // for a session. No session here means the link was expired or reused.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "expired" };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect(`/${locale}/dashboard`);
}

export async function signOutAction(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get("locale"));
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}
