"use server";

import { createClient } from "@supabase/supabase-js";
import { notifyLead } from "@/lib/chatbot/notify";
import { createMeetEvent } from "@/lib/google/calendar";

export type ContactState = { success: boolean; error?: string } | undefined;

// <input type="date"> / type="time"> submit bare "YYYY-MM-DD" / "HH:MM" with no
// zone. We hand those straight to the Calendar API as a local wall-clock
// dateTime + timeZone: "America/Toronto" (see lib/google/calendar.ts) so Google
// resolves DST correctly — this helper only does wall-clock minute arithmetic,
// never a real UTC conversion.
function addMinutes(localDateTime: string, minutes: number): string {
  const [datePart, timePart] = localDateTime.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, min] = timePart.split(":").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, h, min + minutes));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:00`;
}

export async function submitContactAction(
  prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const time = String(formData.get("time") ?? "").trim();
  const locale = String(formData.get("locale") ?? "fa");

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const validTime = /^\d{2}:\d{2}$/.test(time);

  if (!name || !email || !validDate || !validTime) {
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

  const startDateTime = `${date}T${time}:00`;
  const endDateTime = addMinutes(startDateTime, 30);
  const meetingTime = `${date} ${time} (Toronto)`;

  // Best-effort: creates the Meet event and emails the lead the invite
  // directly (sendUpdates: "all"). Never blocks the form response.
  const meetResult = await createMeetEvent({
    summary: `مشاوره Nextra AI: ${name}`,
    description: message || undefined,
    startDateTime,
    endDateTime,
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
