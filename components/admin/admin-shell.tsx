import type { StaffRole } from "@/lib/admin/auth";
import { AdminSidebar } from "./admin-sidebar";

export function AdminShell({
  role,
  children,
}: {
  role: StaffRole;
  children: React.ReactNode;
}) {
  // Block layout on mobile (top bar stacks above main); flex row on md+ where
  // the sidebar sits in-flow on the right (dir=rtl). See AdminSidebar.
  return (
    <div className="min-h-dvh md:flex">
      <AdminSidebar role={role} />
      <main className="bg-grid min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
