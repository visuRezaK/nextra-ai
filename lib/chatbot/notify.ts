// Best-effort lead notification. Emails the site owner whenever a new lead is
// captured — by the chatbot's captureLead tool or the booking form. Uses Resend's
// REST API (free tier, no SDK dependency, works on Vercel free/Hobby).
//
// It is a no-op unless both RESEND_API_KEY and LEAD_NOTIFY_EMAIL are set, and it
// never throws: a failed notification must never break lead capture itself.
//
// (The site's existing Google connection only holds the `calendar.events` scope,
// so it can't send mail — hence Resend rather than Gmail.)

export interface LeadNotification {
  name: string;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  source: string; // 'chatbot' | 'web'
}

// Best-effort owner alert when a chat user asks for a human operator.
export async function notifyHandoff(params: {
  channel: string;
  sessionId: string;
  reason?: string | null;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_NOTIFY_EMAIL;
  if (!apiKey || !to) return;

  const from = process.env.LEAD_NOTIFY_FROM ?? "Nextra AI Consulting <onboarding@resend.dev>";
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const channelLabel =
    params.channel === "telegram" ? "تلگرام" : params.channel === "widget" ? "ویجت" : "وب";

  const body = [
    `کاربری در گفتگوی ${channelLabel} درخواست صحبت با اپراتور انسانی دارد.`,
    params.reason ? `موضوع: ${params.reason}` : null,
    site ? `مشاهده گفتگو: ${site}/admin/conversations/${params.sessionId}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: `🙋 درخواست اپراتور انسانی (${channelLabel})`,
        text: body,
      }),
    });
    if (!res.ok) {
      console.error("notifyHandoff: Resend error", res.status, await res.text());
    }
  } catch (err) {
    console.error("notifyHandoff failed:", err);
  }
}

export async function notifyLead(lead: LeadNotification): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_NOTIFY_EMAIL;
  if (!apiKey || !to) return; // not configured -> silently skip

  const from = process.env.LEAD_NOTIFY_FROM ?? "Nextra AI Consulting <onboarding@resend.dev>";
  const sourceLabel =
    lead.source === "chatbot" ? "چت‌بات" : lead.source === "voice" ? "دستیار صوتی" : "سایت";

  const body = [
    `نام: ${lead.name}`,
    lead.email ? `ایمیل: ${lead.email}` : null,
    lead.phone ? `تلفن: ${lead.phone}` : null,
    lead.message ? `توضیح: ${lead.message}` : null,
    `منبع: ${sourceLabel}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: `لید جدید از ${sourceLabel}: ${lead.name}`,
        text: body,
      }),
    });

    if (!res.ok) {
      console.error("notifyLead: Resend error", res.status, await res.text());
    }
  } catch (err) {
    console.error("notifyLead failed:", err);
  }
}
