// Code-driven campaign segments. Each segment is a small query that returns up
// to MAX_RECIPIENTS people who have an email, with a bit of per-recipient
// context for (later) AI drafting. Kept in one module so the "segment builder"
// pattern is easy to read and extend. Server-only (queries the DB), but pure of
// next/* imports — the client is passed in.
import type { getAdminClient } from "@/lib/chatbot/supabase-admin";

type Supabase = ReturnType<typeof getAdminClient>;

export const MAX_RECIPIENTS = 20;

export type SegmentKey = "lost_leads" | "stale_leads" | "lost_deals" | "won_customers";

export const SEGMENTS: { key: SegmentKey; label_fa: string; label_en: string; hint: string }[] = [
  { key: "lost_leads", label_fa: "لیدهای ازدست‌رفته", label_en: "Lost leads", hint: "لیدهایی که «از دست رفت» شده‌اند" },
  { key: "stale_leads", label_fa: "لیدهای پیگیری‌نشدهٔ ۷+ روز", label_en: "Stale leads", hint: "لیدهای باز بدون پیگیری، قدیمی‌تر از ۷ روز" },
  { key: "lost_deals", label_fa: "معاملات باخته", label_en: "Lost deals", hint: "مخاطبان معاملات باخته‌شده" },
  { key: "won_customers", label_fa: "مشتریان برنده", label_en: "Won customers", hint: "مخاطبان معاملات برنده‌شده" },
];

export function isSegmentKey(v: string | null | undefined): v is SegmentKey {
  return typeof v === "string" && SEGMENTS.some((s) => s.key === v);
}

export function segmentLabel(key: string): string {
  const s = SEGMENTS.find((x) => x.key === key);
  return s ? `${s.label_fa} (${s.label_en})` : key;
}

export type Recipient = {
  name: string;
  email: string;
  personId: string | null;
  leadId: string | null;
  context: Record<string, unknown>;
};

const hasEmail = (e: string | null | undefined): e is string => Boolean(e && e.includes("@"));

// Resolve a segment to its recipients (deduped by email, capped). Returns [] for
// an unknown key.
export async function resolveSegment(supabase: Supabase, key: string): Promise<Recipient[]> {
  const out: Recipient[] = [];
  const seen = new Set<string>();
  const push = (r: Recipient) => {
    const e = r.email.toLowerCase();
    if (seen.has(e) || out.length >= MAX_RECIPIENTS) return;
    seen.add(e);
    out.push(r);
  };

  if (key === "lost_leads") {
    const { data } = await supabase
      .from("contacts")
      .select("id, name, email, message")
      .eq("status", "lost")
      .not("email", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);
    for (const c of (data ?? []) as { id: string; name: string; email: string | null; message: string | null }[]) {
      if (hasEmail(c.email)) push({ name: c.name, email: c.email, personId: null, leadId: c.id, context: { challenge: c.message } });
    }
  } else if (key === "stale_leads") {
    const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data } = await supabase
      .from("contacts")
      .select("id, name, email, status, next_follow_up_at, created_at")
      .in("status", ["new", "contacted", "qualified", "proposal"])
      .is("next_follow_up_at", null)
      .lt("created_at", cutoff)
      .not("email", "is", null)
      .order("created_at", { ascending: true })
      .limit(100);
    for (const c of (data ?? []) as { id: string; name: string; email: string | null; status: string }[]) {
      if (hasEmail(c.email)) push({ name: c.name, email: c.email, personId: null, leadId: c.id, context: { stage: c.status } });
    }
  } else if (key === "lost_deals" || key === "won_customers") {
    const status = key === "lost_deals" ? "lost" : "won";
    const { data } = await supabase
      .from("deals")
      .select("id, title, status, people(id, full_name, email)")
      .eq("status", status)
      .order("updated_at", { ascending: false })
      .limit(100);
    for (const d of (data ?? []) as unknown as {
      id: string;
      title: string;
      people: { id: string; full_name: string; email: string | null } | null;
    }[]) {
      const p = d.people;
      if (p && hasEmail(p.email)) {
        push({ name: p.full_name, email: p.email, personId: p.id, leadId: null, context: { deal: d.title } });
      }
    }
  }

  return out;
}
