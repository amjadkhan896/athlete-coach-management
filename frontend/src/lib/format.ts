const ACADEMY_TZ = "Asia/Dubai";

const dateTimeFmt = new Intl.DateTimeFormat("en-AE", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ACADEMY_TZ,
});
const dateFmt = new Intl.DateTimeFormat("en-AE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
/** Formats a calendar date ('YYYY-MM-DD') without shifting it by timezone. */
export const formatDate = (day: string | null) => (day ? dateFmt.format(new Date(`${day.slice(0, 10)}T00:00:00Z`)) : "—");

export const today = () => new Date().toISOString().slice(0, 10);

/**
 * Converts a <input type="datetime-local"> value, entered in academy time,
 * to an ISO instant for the API.
 */
export function academyLocalToIso(local: string, timeZone = ACADEMY_TZ): string {
  const asUtc = new Date(`${local}:00Z`);
  const zoned = new Date(asUtc.toLocaleString("en-US", { timeZone }));
  const utc = new Date(asUtc.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(asUtc.getTime() - (zoned.getTime() - utc.getTime())).toISOString();
}

/** ISO instant → value for <input type="datetime-local"> in academy time. */
export function isoToAcademyLocal(iso: string, timeZone = ACADEMY_TZ): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;
