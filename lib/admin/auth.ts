import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Returns the logged-in user only when their profile role is 'admin'.
// Uses the anon SSR client: the "viewable by owner" RLS policy on profiles
// lets a user read their own role, so no service key is needed here.
// Any error means no access (fail closed).
export async function getAdminUser(): Promise<User | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || data?.role !== "admin") return null;
  return user;
}

// Gate for admin pages, layouts and server actions. Every admin entry point
// must call this before touching the service-role client — layouts alone are
// not a security boundary.
export async function requireAdmin(): Promise<User> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/fa/login");

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || data?.role !== "admin") redirect("/fa");
  return user;
}
