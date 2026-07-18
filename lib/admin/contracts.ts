// Contract vocabulary + the Nextra consulting template, shared by the contracts
// list, detail page, actions and the public share page. Pure functions — no
// server imports. The status values mirror the contracts_status_check
// constraint (supabase/admin9.sql); keep them in sync.
import { CONTACT } from "@/app/card/contact";

export const CONTRACT_STATUSES = ["draft", "sent", "viewed", "accepted", "canceled"] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: "پیش‌نویس (Draft)",
  sent: "ارسال‌شده (Sent)",
  viewed: "دیده‌شده (Viewed)",
  accepted: "تأییدشده (Accepted)",
  canceled: "لغوشده (Canceled)",
};

export const CONTRACT_STATUS_TONES: Record<
  ContractStatus,
  "neutral" | "accent" | "warn" | "success" | "danger"
> = {
  draft: "neutral",
  sent: "accent",
  viewed: "warn",
  accepted: "success",
  canceled: "danger",
};

export function isContractStatus(v: string | null | undefined): v is ContractStatus {
  return typeof v === "string" && (CONTRACT_STATUSES as readonly string[]).includes(v);
}

// Contract amounts render in Latin digits + CAD, matching faCad. Kept local so
// this module stays free of the server-component ui.tsx.
function cad(n: number): string {
  return new Intl.NumberFormat("fa-IR-u-nu-latn", {
    style: "currency",
    currency: "CAD",
    currencyDisplay: "code",
  }).format(n || 0);
}

function today(): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-gregory-nu-latn", {
    dateStyle: "long",
    timeZone: "America/Toronto",
  }).format(new Date());
}

export type ContractTemplateParams = {
  contractNo: string;
  personName: string;
  companyName: string | null;
  personEmail: string | null;
  personPhone: string | null;
  amountCad: number;
  durationLabel: string;
  startDate: string | null; // YYYY-MM-DD or null
};

// The Nextra AI consulting agreement, built from the real service offering
// (needs assessment → fast build → AI assistant → one-month support), not the
// arkan template. Markdown, editable afterward in the admin editor.
export function buildContractMarkdown(p: ContractTemplateParams): string {
  const clientLine = p.companyName ? `${p.personName} — ${p.companyName}` : p.personName;
  const clientContact = [p.personEmail && `ایمیل: ${p.personEmail}`, p.personPhone && `تلفن: ${p.personPhone}`]
    .filter(Boolean)
    .join(" · ");
  const start = p.startDate ? p.startDate : "پس از امضای این قرارداد";

  return `# قرارداد مشاورهٔ هوش مصنوعی

شمارهٔ قرارداد: ${p.contractNo}
تاریخ تنظیم: ${today()}

## طرفین قرارداد

**طرف اول (مشاور):** ${CONTACT.nameFa} — ${CONTACT.org}
تلفن: ${CONTACT.phoneDisplay} · ایمیل: ${CONTACT.email}

**طرف دوم (کارفرما):** ${clientLine}
${clientContact || "—"}

## مادهٔ ۱ — موضوع قرارداد

ارائهٔ خدمات مشاوره و پیاده‌سازی هوش مصنوعی توسط طرف اول برای طرف دوم، شامل:

- نیازسنجی و تشخیص دقیق پیش از هر اقدام
- راه‌اندازی وب‌سایت و محصول در کمترین زمان
- دستیار شخصی هوش مصنوعی برای پاسخ‌گویی خودکار به مشتریان
- پشتیبانی بک‌اند و محتوا به مدت یک ماه

## مادهٔ ۲ — مدت قرارداد

مدت اجرا و پشتیبانی: ${p.durationLabel}. تاریخ شروع: ${start}.

## مادهٔ ۳ — مبلغ و شرایط پرداخت

مبلغ کل قرارداد: **${cad(p.amountCad)}**، در سه مرحله پرداخت می‌شود:

- ۴۰٪ هنگام عقد قرارداد
- ۳۰٪ در میانهٔ اجرا و تحویل نسخهٔ اولیه
- ۳۰٪ هنگام تحویل نهایی

## مادهٔ ۴ — تعهدات طرف اول (مشاور)

- اجرای خدمات با کیفیت و در بازهٔ زمانی توافق‌شده
- آموزش و تحویل مستندات لازم برای استفاده
- ارائهٔ پشتیبانی یک‌ماهه پس از تحویل

## مادهٔ ۵ — تعهدات طرف دوم (کارفرما)

- تأمین اطلاعات، دسترسی‌ها و محتوای لازم برای اجرا
- پرداخت به‌موقع مطابق مادهٔ ۳
- تعیین یک نمایندهٔ پاسخ‌گو در طول اجرا

## مادهٔ ۶ — محرمانگی

طرفین متعهد می‌شوند اطلاعات محرمانهٔ یکدیگر را حفظ کرده و بدون اجازهٔ کتبی در اختیار شخص ثالث قرار ندهند.

## مادهٔ ۷ — مالکیت

پس از تسویهٔ کامل مبلغ قرارداد، مالکیت محصول نهایی به طرف دوم منتقل می‌شود. ابزارها و کتابخانه‌های شخص ثالث تابع مجوز خودشان باقی می‌مانند.

## مادهٔ ۸ — فسخ قرارداد

هر یک از طرفین با اطلاع کتبی هفت‌روزه می‌تواند قرارداد را فسخ کند. در این صورت هزینهٔ کارِ انجام‌شده تا آن تاریخ محاسبه و تسویه خواهد شد.

## مادهٔ ۹ — حل اختلاف

هرگونه اختلاف ابتدا از راه مذاکرهٔ دوستانه حل می‌شود؛ در غیر این صورت مطابق قوانین جاری حل‌وفصل خواهد شد.

## مادهٔ ۱۰ — امضا و تأیید

با تأیید آنلاین این قرارداد از طریق درج نام، طرف دوم موافقت خود را با تمام مفاد بالا اعلام می‌کند و این تأیید حکم امضا دارد.`;
}
