import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role Supabase client for server-only chatbot work (KB writes, message
// persistence, lead capture, memory). Bypasses RLS — never import from client code.
// Mirrors the pattern in app/[locale]/book/actions.ts.
let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  return cached;
}
