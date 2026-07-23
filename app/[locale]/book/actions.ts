"use server";

import { createClient } from "@supabase/supabase-js";
import { notifyLead } from "@/lib/chatbot/notify";
import { createMeetEvent } from "@/lib/google/calendar";
import { TORONTO_TZ } from "@/lib/timezone";

export type ContactState = { success: boolean; error?: string } | undefined;

const torontoDisplay = new Intl.DateTimeFormat("en-CA", {
  timeZone: TORONTO_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export async function submitContactAction(
  prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const visitorTz = String(formData.get("visitorTz") ?? "").trim();
  // The <select> value is the slot's real UTC instant (ISO string) — computed
  // client-side from Toronto business hours, see lib/timezone.ts.
  const time = String(formData.get("time") ?? "").trim();
  const locale = String(formData.get("locale") ?? "fa");

  const startInstant = new Date(time);
  const validTime = !Number.isNaN(startInstant.getTime());

  if (!name || !email || !validTime) {
    return {
      success: false,
      error:
        locale === "fa"
          ? "نام، ایمیل و زمان جلسه الزامی است."
          : "Name, email, and a meeting time are required.",
    };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: inserted, error } = await supabase
    .from("contacts")
    .insert({
      name,
      email,
      phone: phone || null,
      message: message || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Contact insert error:", error);
    return {
      success: false,
      error: locale === "fa" ? "خطایی رخ داد. دوباره امتحان کن." : "Something went wrong. Please try again.",
    };
  }

  const endInstant = new Date(startInstant.getTime() + 30 * 60000);
  let meetingTime = `${torontoDisplay.format(startInstant)} (Toronto)`;
  if (visitorTz && visitorTz !== TORONTO_TZ) {
    try {
      const visitorDisplay = new Intl.DateTimeFormat("en-CA", {
        timeZone: visitorTz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      });
      meetingTime += ` — ${visitorDisplay.format(startInstant)} (${visitorTz})`;
    } catch {
      // Unknown/invalid IANA zone from the client — ignore, Toronto time still shown.
    }
  }

  // A clear, always-present description (rather than leaving it empty when
  // the customer skips the message field) gives spam filters more legitimate
  // business content to weigh against a bare, templated-looking invite.
  const description = [
    `جلسه مشاوره رایگان هوش مصنوعی با Nextra AI برای ${name}.`,
    message ? `توضیح مشتری: ${message}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Best-effort: creates the Meet event and emails the lead the invite
  // directly (sendUpdates: "all"). Never blocks the form response.
  const meetResult = await createMeetEvent({
    summary: `مشاوره Nextra AI: ${name}`,
    description,
    startDateTime: startInstant.toISOString(),
    endDateTime: endInstant.toISOString(),
    attendeeEmail: email,
  });

  if (meetResult.ok && inserted?.id) {
    const { error: noteError } = await supabase.from("lead_notes").insert({
      contact_id: inserted.id,
      kind: "meeting",
      body: `جلسه Google Meet برای ${meetingTime} رزرو شد.\n${meetResult.meetLink}`,
    });
    if (noteError) console.error("lead_notes insert error:", noteError);
  } else if (!meetResult.ok) {
    console.error("createMeetEvent failed:", meetResult.error);
  }

  // Best-effort owner notification (never blocks the form response).
  await notifyLead({
    name,
    email,
    phone,
    message,
    source: "web",
    meetingTime,
    meetLink: meetResult.ok ? meetResult.meetLink : null,
  });

  return { success: true };
}
