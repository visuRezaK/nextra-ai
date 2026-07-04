import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Logo } from "@/components/icons";
import { ForgotPasswordForm } from "@/components/site/auth-form";

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <main className="bg-grid flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <Link href={`/${locale}`} className="mb-8 flex items-center gap-2.5">
        <Logo />
        <span className="text-lg font-extrabold tracking-tight">{dict.brand.name}</span>
      </Link>
      <ForgotPasswordForm locale={locale} dict={dict.auth} />
    </main>
  );
}
