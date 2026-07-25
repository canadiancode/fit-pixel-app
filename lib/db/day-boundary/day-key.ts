import {
  DEFAULT_DAY_STARTS_AT_MINUTES,
  type DayBoundary,
} from "./types";

/**
 * Device IANA zone from Intl (fallback UTC). Used to seed and as a default
 * when reading before the singleton row exists.
 */
export function getDeviceTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof zone === "string" && zone.length > 0) {
      return zone;
    }
  } catch {
    // Intl / timeZone unavailable
  }
  return "UTC";
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * YYYY-MM-DD for `date` as calendar date in `timeZone`.
 * Uses Intl so day keys follow the stored zone, not whatever the runtime
 * happens to use for `Date#getDate()` alone.
 */
export function formatDayKeyInTimeZone(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);

    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Invalid timeZone or Intl failure — fall through to UTC components.
  }

  const year = date.getUTCFullYear();
  const month = pad2(date.getUTCMonth() + 1);
  const day = pad2(date.getUTCDate());
  return `${year}-${month}-${day}`;
}

/**
 * Local calendar day key (YYYY-MM-DD) for habit summaries and goal windows.
 *
 * `dayStartsAtMinutes` shifts the boundary (e.g. 240 = 4:00 in `timeZone`):
 * times before that cutoff belong to the previous app day.
 *
 * Prefer `getAppDayKey` / `getTodayDayKey` so all call sites share one boundary.
 */
export function getLocalDayKey(
  date: Date,
  dayStartsAtMinutes: number = DEFAULT_DAY_STARTS_AT_MINUTES,
  timeZone: string = getDeviceTimeZone(),
): string {
  const shifted = new Date(date.getTime() - dayStartsAtMinutes * 60_000);
  return formatDayKeyInTimeZone(shifted, timeZone);
}

/** Day key for an instant using a loaded `DayBoundary` (single source of truth). */
export function getAppDayKey(date: Date, boundary: DayBoundary): string {
  return getLocalDayKey(
    date,
    boundary.dayStartsAtMinutes,
    boundary.timeZone,
  );
}
