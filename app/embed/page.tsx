import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { EmbedClient } from "./embed-client";

export default async function EmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const { locale: raw } = await searchParams;
  const locale: Locale = raw && isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);

  return (
    <main className="flex h-dvh flex-col p-3">
      <EmbedClient locale={locale} dict={dict.chat} />
    </main>
  );
}
