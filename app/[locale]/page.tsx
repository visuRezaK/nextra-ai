import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import {
  Hero,
  Problem,
  Services,
  Featured,
  Transform,
  Why,
  About,
  Audience,
  Faq,
} from "@/components/site/sections";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <Navbar locale={locale} brand={dict.brand.name} nav={dict.nav} isAuthed={!!user} />
      <main>
        <Hero dict={dict} locale={locale} />
        <Problem dict={dict} locale={locale} />
        <Services dict={dict} locale={locale} />
        <Featured dict={dict} locale={locale} />
        <Transform dict={dict} locale={locale} />
        <Audience dict={dict} locale={locale} />
        <Why dict={dict} locale={locale} />
        <About dict={dict} locale={locale} />
        <Faq dict={dict} locale={locale} />
      </main>
      <Footer dict={dict} locale={locale} />
    </>
  );
}
