import Link from "next/link";
import { Logo } from "@/components/icons";
import { signOutAction } from "@/app/[locale]/auth-actions";
import { AdminNav } from "./admin-nav";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      {/* Sidebar — dir=rtl puts it on the right automatically. */}
      <aside className="flex w-56 shrink-0 flex-col border-e border-border bg-surface px-4 py-6">
        <Link href="/admin" dir="ltr" className="mb-8 flex items-center gap-2 px-2">
          <Logo className="h-7 w-7" />
          <span className="text-sm font-semibold tracking-tight">Nextra AI</span>
        </Link>

        <AdminNav />

        <div className="mt-auto flex flex-col gap-2 pt-8">
          <Link
            href="/fa"
            className="rounded-lg px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            بازگشت به سایت
          </Link>
          <form action={signOutAction}>
            <input type="hidden" name="locale" value="fa" />
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-start text-sm text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              خروج
            </button>
          </form>
        </div>
      </aside>

      <main className="bg-grid min-w-0 flex-1 px-6 py-8 md:px-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
