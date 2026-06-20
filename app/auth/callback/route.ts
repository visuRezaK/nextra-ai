import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { defaultLocale } from "@/lib/i18n/config";

// Handles the OAuth / email-confirmation code exchange.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? `/${defaultLocale}/dashboard`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/${defaultLocale}/login?error=auth`);
}
