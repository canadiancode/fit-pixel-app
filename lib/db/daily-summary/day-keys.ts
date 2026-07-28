function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Shift a YYYY-MM-DD dayKey by whole calendar days (UTC date arithmetic). */
export function shiftDayKey(dayKey: string, deltaDays: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (match == null) {
    throw new Error(`Invalid dayKey: ${dayKey}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
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

/** Short weekday label for a calendar dayKey ("Mon", "Tue", …). */
export function weekdayShortLabelForDayKey(dayKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (match == null) {
    throw new Error(`Invalid dayKey: ${dayKey}`);
  }
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12),
  );
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
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
