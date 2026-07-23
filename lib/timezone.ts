// Timezone conversion helpers for the booking form. Business hours are a
// fixed wall-clock window in Toronto time; visitors book in whatever IANA
// zone their browser reports, so we need to convert between the two without
// a library (Toronto's DST transition is at 2am, well outside business
// hours, so a single offset lookup is always exact here).

export const TORONTO_TZ = "America/Toronto";

function getOffsetMinutes(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(instant).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (asUtc - instant.getTime()) / 60000;
}

/** Wall-clock "YYYY-MM-DD" + "HH:MM" meant for `timeZone` -> the real UTC instant. */
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0);
  const offset = getOffsetMinutes(new Date(guess), timeZone);
  return new Date(guess - offset * 60000);
}

export function torontoTimeToUtc(dateStr: string, timeStr: string): Date {
  return zonedTimeToUtc(dateStr, timeStr, TORONTO_TZ);
}

/** Formats a UTC instant as "HH:MM" (optionally "HH:MM (YYYY-MM-DD)" when the
 * local calendar day differs from `referenceDate`) in the given IANA zone. */
export function formatInZone(instant: Date, timeZone: string, referenceDate: string): string {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || undefined,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(instant).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  const localDate = `${parts.year}-${parts.month}-${parts.day}`;
  const label = `${parts.hour}:${parts.minute}`;
  return localDate === referenceDate ? label : `${label} (${localDate})`;
}
