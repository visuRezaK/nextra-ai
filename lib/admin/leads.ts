// Lead pipeline vocabulary, shared by the leads list, the lead detail page, the
// server actions, the CSV export and the dashboard. Pure constants and
// predicates only — no server imports, so the client forms can use it too.
// The stages themselves live in the contacts_status_check constraint
// (supabase/admin6.sql); keep the two in sync.

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

// Stages a lead can still be worked in. 'won'/'lost' are terminal — an overdue
// follow-up on a closed lead is not something anyone needs to chase.
export const OPEN_LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
] as const;

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "جدید",
  contacted: "تماس گرفته شد",
  qualified: "واجد شرایط",
  proposal: "پیشنهاد ارسال شد",
  won: "قرارداد بسته شد",
  lost: "از دست رفت",
};

// Shown beside the Persian in headings, selects and report rows — the CRM terms
// of art are English, and the values stored in the DB are these words.
export const LEAD_STATUS_LABELS_EN: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

// «جدید (New)» — for a <select> option or a table cell, where a JSX <En> can't go.
export function leadStatusLabel(status: LeadStatus): string {
  return `${LEAD_STATUS_LABELS[status]} (${LEAD_STATUS_LABELS_EN[status]})`;
}

export const LEAD_STATUS_TONES: Record<
  LeadStatus,
  "neutral" | "accent" | "success" | "warn" | "danger"
> = {
  new: "accent",
  contacted: "neutral",
  qualified: "warn",
  proposal: "warn",
  won: "success",
  lost: "danger",
};

export const LEAD_NOTE_KINDS = ["note", "status", "call", "email", "meeting"] as const;
export type LeadNoteKind = (typeof LEAD_NOTE_KINDS)[number];

export const LEAD_NOTE_KIND_LABELS: Record<LeadNoteKind, string> = {
  note: "یادداشت (Note)",
  status: "تغییر وضعیت (Stage change)",
  call: "تماس (Call)",
  email: "ایمیل (Email)",
  meeting: "جلسه (Meeting)",
};

// 'status' is written by updateLeadAction, never picked by a human.
export const LOGGABLE_NOTE_KINDS = ["note", "call", "email", "meeting"] as const;

export const LEAD_SOURCE_LABELS: Record<string, string> = {
  web: "فرم سایت",
  chatbot: "چت‌بات",
  voice: "دستیار صوتی",
};

export function leadSourceLabel(source: string): string {
  return LEAD_SOURCE_LABELS[source] ?? source;
}

export function isLeadStatus(v: string | null | undefined): v is LeadStatus {
  return typeof v === "string" && (LEAD_STATUSES as readonly string[]).includes(v);
}

export function isLeadNoteKind(v: string | null | undefined): v is LeadNoteKind {
  return typeof v === "string" && (LEAD_NOTE_KINDS as readonly string[]).includes(v);
}

// A follow-up is overdue once its date has passed AND the lead is still open.
export function isOverdue(
  nextFollowUpAt: string | null | undefined,
  status: string | null | undefined,
): boolean {
  if (!nextFollowUpAt) return false;
  if (!status || !(OPEN_LEAD_STATUSES as readonly string[]).includes(status)) return false;
  return new Date(nextFollowUpAt).getTime() < Date.now();
}
