// Normalized-CRM vocabulary, shared by the deals board, the person profile, the
// activities view, the convert flow and the reports. Pure constants/predicates —
// no server imports, so client components can import it too. Same style as
// lib/admin/leads.ts. The pipeline STAGES themselves are config rows in
// public.pipeline_stages (supabase/admin8.sql), so their labels come from the DB
// (see PipelineStage below), not from a hardcoded map here — only the fallback
// tone and the derived deal status live in code.

// ---------- deal status (derived from the stage's flags) ----------
export const DEAL_STATUSES = ["open", "won", "lost"] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  open: "باز (Open)",
  won: "برنده (Won)",
  lost: "باخته (Lost)",
};

export const DEAL_STATUS_TONES: Record<DealStatus, "neutral" | "success" | "danger"> = {
  open: "neutral",
  won: "success",
  lost: "danger",
};

export function isDealStatus(v: string | null | undefined): v is DealStatus {
  return typeof v === "string" && (DEAL_STATUSES as readonly string[]).includes(v);
}

// A deal's status follows the stage it's in: a stage flagged is_won closes it
// won, is_lost closes it lost, anything else keeps it open. Derived from code
// (not a DB trigger), the same convention as admin7's won_at.
export function dealStatusFromStage(stage: {
  is_won: boolean;
  is_lost: boolean;
}): DealStatus {
  if (stage.is_won) return "won";
  if (stage.is_lost) return "lost";
  return "open";
}

// A config row from public.pipeline_stages.
export type PipelineStage = {
  key: string;
  label_fa: string;
  label_en: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
};

// «جلسه مشاوره (Consultation)» from a stage row — for a cell or <option>.
export function stageLabel(stage: Pick<PipelineStage, "label_fa" | "label_en">): string {
  return `${stage.label_fa} (${stage.label_en})`;
}

// Board column tone: won green, lost red, everything in between neutral/accent.
export function stageTone(
  stage: Pick<PipelineStage, "is_won" | "is_lost">,
): "neutral" | "accent" | "success" | "danger" {
  if (stage.is_won) return "success";
  if (stage.is_lost) return "danger";
  return "accent";
}

// ---------- activity types ----------
export const ACTIVITY_TYPES = ["call", "meeting", "note", "task", "stage_change"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  call: "تماس (Call)",
  meeting: "جلسه (Meeting)",
  note: "یادداشت (Note)",
  task: "وظیفه (Task)",
  stage_change: "تغییر مرحله (Stage change)",
};

// 'stage_change' is written by moveDealAction, never picked by a human.
export const LOGGABLE_ACTIVITY_TYPES = ["call", "meeting", "note", "task"] as const;

export function isActivityType(v: string | null | undefined): v is ActivityType {
  return typeof v === "string" && (ACTIVITY_TYPES as readonly string[]).includes(v);
}

export function activityTypeLabel(type: string): string {
  return isActivityType(type) ? ACTIVITY_TYPE_LABELS[type] : type;
}

// A task is overdue once its due date has passed and it isn't done. «Today» is a
// separate softer signal (golden) handled at the call site.
export function isTaskOverdue(dueAt: string | null | undefined, doneAt: string | null | undefined): boolean {
  if (!dueAt || doneAt) return false;
  return new Date(dueAt).getTime() < Date.now();
}

export function isTaskToday(dueAt: string | null | undefined, doneAt: string | null | undefined): boolean {
  if (!dueAt || doneAt) return false;
  const due = new Date(dueAt);
  const now = new Date();
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

// Whole days a deal has sat in its current stage — shown on each board card.
export function daysInStage(stageEnteredAt: string | null | undefined): number {
  if (!stageEnteredAt) return 0;
  const ms = Date.now() - new Date(stageEnteredAt).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

// The people/deal source vocabulary matches the lead source (a person carries
// the channel its originating lead came in on).
export const PERSON_SOURCE_LABELS: Record<string, string> = {
  web: "فرم سایت",
  chatbot: "چت‌بات",
  voice: "دستیار صوتی",
  manual: "دستی",
};

export function personSourceLabel(source: string): string {
  return PERSON_SOURCE_LABELS[source] ?? source;
}
