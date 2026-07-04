import { requireRole } from "@/lib/admin/auth";
import { PageTitle } from "@/components/admin/ui";
import { EmbedCodeGenerator } from "./widget-client";

export const dynamic = "force-dynamic";

export default async function WidgetPage() {
  await requireRole([]);

  return (
    <>
      <PageTitle
        title="ویجت قابل‌نصب"
        subtitle="کد embed چت‌بات برای قراردادن روی هر وب‌سایت دیگری"
      />

      <section className="card-surface p-5">
        <h2 className="mb-1 font-semibold">تولید کد Embed</h2>
        <p className="mb-4 text-sm text-muted">
          این کد را قبل از تگ <code dir="ltr">&lt;/body&gt;</code> سایت مقصد قرار دهید. دکمه شناور چت
          به صفحه اضافه می‌شود و از همان مغز و پایگاه دانش چت‌بات اصلی استفاده می‌کند.
        </p>
        <EmbedCodeGenerator />
      </section>

      <section className="card-surface mt-6 p-5 text-sm">
        <h2 className="mb-3 font-semibold">نکته‌ها</h2>
        <ul className="list-inside list-disc space-y-2 text-foreground/80">
          <li>
            پیش‌نمایش صفحه چت داخل ویجت:{" "}
            <a
              href="https://nextra-ai-consulting.vercel.app/embed?locale=fa"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
              dir="ltr"
            >
              /embed?locale=fa
            </a>
          </li>
          <li>
            گفتگوهای ویجت با همان کوکی مرورگر کاربر ثبت می‌شوند و در بخش «گفتگوها» همین پنل قابل
            مشاهده‌اند؛ لیدهای گرفته‌شده هم در «لیدها» می‌آیند.
          </li>
          <li>
            میزبان می‌تواند با <code dir="ltr">NextraWidget.open()</code> و{" "}
            <code dir="ltr">NextraWidget.close()</code> ویجت را با جاوااسکریپت باز/بسته کند.
          </li>
        </ul>
      </section>
    </>
  );
}
