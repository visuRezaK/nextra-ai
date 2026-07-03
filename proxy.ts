import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, locales } from "@/lib/i18n/config";
import { updateSession } from "@/lib/supabase/proxy";

function getLocale(request: NextRequest): string {
  const accept = request.headers.get("accept-language") ?? "";
  // Prefer Persian for fa-* visitors, otherwise default.
  if (accept.toLowerCase().includes("fa")) return "fa";
  if (accept.toLowerCase().includes("en")) return "en";
  return defaultLocale;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin panel lives outside the locale tree (fa-only). Refresh the session
  // but skip locale redirection.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const response = NextResponse.next({ request });
    return updateSession(request, response);
  }

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (!hasLocale) {
    const locale = getLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // Locale is present — refresh the Supabase session and continue.
  const response = NextResponse.next({ request });
  return updateSession(request, response);
}

export const config = {
  // Skip Next internals, API routes, auth callback, embed iframe page, and files with an extension.
  // Note: /admin IS matched on purpose — its branch above refreshes the session without locale redirects.
  matcher: ["/((?!_next|api|auth|embed|.*\\..*).*)"],
};
