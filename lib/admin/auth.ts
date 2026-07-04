import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Staff roles and what they may access. 'user' is a normal site visitor and
// never enters the panel.
//   admin    — everything
//   editor   — content: knowledge base + persona (plus read-only core pages)
//   operator — leads / conversations / feedback
//   viewer   — read-only core pages
export const STAFF_ROLES = ["admin", "editor", "operator", "viewer"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export interface StaffUser {
  user: User;
  role: StaffRole;
}

// Returns the logged-in user + role when the role is one of the staff roles.
// Uses the anon SSR client: the "viewable by owner" RLS policy on profiles
// lets a user read their own role. Any error means no access (fail closed).
export async function getStaffUser(): Promise<StaffUser | null> {
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

  if (error) return null;
  const role = data?.role;
  if (!(STAFF_ROLES as readonly string[]).includes(role)) return null;
  return { user, role: role as StaffRole };
}

// Kept for the CSV route and any admin-only checks that must not redirect.
export async function getAdminUser(): Promise<User | null> {
  const staff = await getStaffUser();
  return staff?.role === "admin" ? staff.user : null;
}

// Gate for panel pages and server actions. `allowed` lists the roles that may
// enter; admin is always allowed. Every entry point (layout, page, action)
// must call this before touching the service-role client.
export async function requireRole(allowed: StaffRole[]): Promise<StaffUser> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/fa/login");

  const staff = await getStaffUser();
  if (!staff) redirect("/fa");
  if (staff.role !== "admin" && !allowed.includes(staff.role)) redirect("/admin");
  return staff;
}

// Admin-only gate (model settings, telegram, widget, users, ...).
export async function requireAdmin(): Promise<User> {
  const staff = await requireRole([]);
  return staff.user;
}

// Any staff member may enter the panel shell + dashboard.
export async function requireStaff(): Promise<StaffUser> {
  return requireRole([...STAFF_ROLES]);
}
