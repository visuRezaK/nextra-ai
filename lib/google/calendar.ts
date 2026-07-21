// Creates a Google Calendar event with an auto-generated Google Meet link for
// the booking form. Uses raw REST calls (OAuth2 refresh-token grant, then the
// Calendar v3 REST API) instead of the `googleapis` SDK — same "no SDK
// dependency" convention as lib/chatbot/notify.ts's Resend calls.
//
// Requires GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN to be
// set (obtained once via scripts/google-oauth-setup.mjs). Best-effort: never
// throws, so a Calendar/Google outage must never break lead capture.

const TIME_ZONE = "America/Toronto";

export interface MeetEventParams {
  summary: string;
  description?: string | null;
  /** Local wall-clock time, no offset, e.g. "2026-07-25T14:00:00". Interpreted in TIME_ZONE. */
  startDateTime: string;
  endDateTime: string;
  attendeeEmail: string;
}

export type CreateMeetResult =
  | { ok: true; meetLink: string; eventLink: string }
  | { ok: false; error: string };

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    console.error("Google token refresh failed:", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export async function createMeetEvent(params: MeetEventParams): Promise<CreateMeetResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { ok: false, error: "اتصال Google Calendar تنظیم نشده است (GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN)." };
  }

  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        summary: params.summary,
        description: params.description || undefined,
        start: { dateTime: params.startDateTime, timeZone: TIME_ZONE },
        end: { dateTime: params.endDateTime, timeZone: TIME_ZONE },
        attendees: [{ email: params.attendeeEmail }],
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("createMeetEvent: Calendar API error", res.status, detail);
      return { ok: false, error: `خطای Calendar API (${res.status})` };
    }

    const data = (await res.json()) as { hangoutLink?: string; htmlLink?: string };
    if (!data.hangoutLink) {
      return { ok: false, error: "رویداد ساخته شد ولی لینک Meet برنگشت." };
    }
    return { ok: true, meetLink: data.hangoutLink, eventLink: data.htmlLink ?? "" };
  } catch (err) {
    console.error("createMeetEvent failed:", err);
    return { ok: false, error: "اتصال به Google Calendar ناموفق بود." };
  }
}
