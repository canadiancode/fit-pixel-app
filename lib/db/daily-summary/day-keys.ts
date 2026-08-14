function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function parseDayKey(dayKey: string): {
  year: number;
  month: number;
  day: number;
} {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (match == null) {
    throw new Error(`Invalid dayKey: ${dayKey}`);
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function utcNoonFromDayKey(dayKey: string): Date {
  const { year, month, day } = parseDayKey(dayKey);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function formatDayKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Shift a YYYY-MM-DD dayKey by whole calendar days (UTC date arithmetic). */
export function shiftDayKey(dayKey: string, deltaDays: number): string {
  const { year, month, day } = parseDayKey(dayKey);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return formatDayKey(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

/**
 * Inclusive window of `count` dayKeys ending at `endDayKey` (oldest → newest).
 * Used for rolling weekly charts.
 */
export function listDayKeysEndingAt(endDayKey: string, count: number): string[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`count must be a positive integer (got ${count})`);
  }
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    keys.push(shiftDayKey(endDayKey, -i));
  }
  return keys;
}

/** Inclusive YYYY-MM-DD keys from `startDayKey` through `endDayKey` (oldest → newest). */
export function listDayKeysInclusive(
  startDayKey: string,
  endDayKey: string,
): string[] {
  if (startDayKey > endDayKey) {
    return [];
  }
  const keys: string[] = [];
  let key = startDayKey;
  while (key <= endDayKey) {
    keys.push(key);
    key = shiftDayKey(key, 1);
  }
  return keys;
}

/** Short weekday label for a calendar dayKey ("Mon", "Tue", …). */
export function weekdayShortLabelForDayKey(dayKey: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
    utcNoonFromDayKey(dayKey),
  );
}

/** Compact month/day label for a dayKey ("8/13"). */
export function monthDayLabelForDayKey(dayKey: string): string {
  const { month, day } = parseDayKey(dayKey);
  return `${month}/${day}`;
}

/**
 * Monday of the week containing `dayKey` (UTC date arithmetic).
 * Weeks run Monday–Sunday so they line up with the 7-day hub chart.
 */
export function weekStartDayKey(dayKey: string): string {
  const dow = utcNoonFromDayKey(dayKey).getUTCDay();
  const daysFromMonday = (dow + 6) % 7;
  return shiftDayKey(dayKey, -daysFromMonday);
}

export function shiftWeekStartDayKey(
  weekStart: string,
  deltaWeeks: number,
): string {
  return shiftDayKey(weekStart, deltaWeeks * 7);
}

export function lastDayKeyOfWeek(weekStart: string): string {
  return shiftDayKey(weekStart, 6);
}

/** Inclusive window of Monday week-starts ending at the week that contains `endDayKey`. */
export function listWeekStartKeysEndingAt(
  endDayKey: string,
  count: number,
): string[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`count must be a positive integer (got ${count})`);
  }
  const endWeekStart = weekStartDayKey(endDayKey);
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    keys.push(shiftWeekStartDayKey(endWeekStart, -i));
  }
  return keys;
}

/** Month abbreviation for a YYYY-MM key ("Jan", …). */
export function monthShortLabelForMonthKey(monthKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (match == null) {
    throw new Error(`Invalid monthKey: ${monthKey}`);
  }
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1, 12));
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

/** YYYY-MM for a dayKey. */
export function monthKeyFromDayKey(dayKey: string): string {
  return dayKey.slice(0, 7);
}

/** Shift a YYYY-MM month key by whole months. */
export function shiftMonthKey(monthKey: string, deltaMonths: number): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (match == null) {
    throw new Error(`Invalid monthKey: ${monthKey}`);
  }
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1 + deltaMonths, 1),
  );
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
}

export function listMonthKeysEndingAt(
  endMonthKey: string,
  count: number,
): string[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`count must be a positive integer (got ${count})`);
  }
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    keys.push(shiftMonthKey(endMonthKey, -i));
  }
  return keys;
}

export function lastDayKeyOfMonth(monthKey: string): string {
  const nextMonth = shiftMonthKey(monthKey, 1);
  return shiftDayKey(`${nextMonth}-01`, -1);
}

export function yearFromDayKey(dayKey: string): number {
  return parseDayKey(dayKey).year;
}

export function firstDayKeyOfYear(year: number): string {
  if (!Number.isInteger(year)) {
    throw new Error(`year must be an integer (got ${year})`);
  }
  return `${year}-01-01`;
}

export function lastDayKeyOfYear(year: number): string {
  if (!Number.isInteger(year)) {
    throw new Error(`year must be an integer (got ${year})`);
  }
  return `${year}-12-31`;
}

export function listYearKeysEndingAt(endYear: number, count: number): number[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`count must be a positive integer (got ${count})`);
  }
  if (!Number.isInteger(endYear)) {
    throw new Error(`endYear must be an integer (got ${endYear})`);
  }
  const keys: number[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    keys.push(endYear - i);
  }
  return keys;
}

export function listYearKeysFromTo(
  startYear: number,
  endYear: number,
): number[] {
  if (!Number.isInteger(startYear) || !Number.isInteger(endYear)) {
    throw new Error("years must be integers");
  }
  if (startYear > endYear) {
    return [endYear];
  }
  const keys: number[] = [];
  for (let year = startYear; year <= endYear; year += 1) {
    keys.push(year);
  }
  return keys;
}
