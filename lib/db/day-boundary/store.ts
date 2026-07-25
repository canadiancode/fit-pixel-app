import type { SQLiteDatabase } from "expo-sqlite";

import { enqueueOp } from "../pending-ops";
import { nowIso } from "../ids";
import { getAppDayKey, getDeviceTimeZone } from "./day-key";
import {
  DAY_STARTS_AT_MINUTES_MAX,
  DAY_STARTS_AT_MINUTES_MIN,
  DEFAULT_DAY_STARTS_AT_MINUTES,
  type DayBoundary,
  type DayBoundaryUpdate,
} from "./types";

type DayBoundaryRow = {
  dayStartsAtMinutes: number;
  timeZone: string;
  updatedAt: string;
};

function mapRow(row: DayBoundaryRow): DayBoundary {
  return {
    dayStartsAtMinutes: row.dayStartsAtMinutes,
    timeZone: row.timeZone,
    updatedAt: row.updatedAt,
  };
}

function assertDayStartsAtMinutes(value: number): number {
  if (
    !Number.isInteger(value) ||
    value < DAY_STARTS_AT_MINUTES_MIN ||
    value > DAY_STARTS_AT_MINUTES_MAX
  ) {
    throw new Error(
      `dayStartsAtMinutes must be an integer ${DAY_STARTS_AT_MINUTES_MIN}..${DAY_STARTS_AT_MINUTES_MAX} (got ${value})`,
    );
  }
  return value;
}

function assertTimeZone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("timeZone must be a non-empty IANA id");
  }
  try {
    // Throws RangeError for unknown zones in modern engines.
    new Intl.DateTimeFormat("en-US", { timeZone: trimmed }).format(new Date());
  } catch {
    throw new Error(`timeZone is not a valid IANA id: "${trimmed}"`);
  }
  return trimmed;
}

async function seedDayBoundaryIfNeeded(
  db: SQLiteDatabase,
): Promise<DayBoundary> {
  const updatedAt = nowIso();
  const timeZone = getDeviceTimeZone();
  await db.runAsync(
    `INSERT OR IGNORE INTO app_day_boundary (id, dayStartsAtMinutes, timeZone, updatedAt)
     VALUES (1, ?, ?, ?)`,
    DEFAULT_DAY_STARTS_AT_MINUTES,
    timeZone,
    updatedAt,
  );

  const row = await db.getFirstAsync<DayBoundaryRow>(
    `SELECT dayStartsAtMinutes, timeZone, updatedAt FROM app_day_boundary WHERE id = 1`,
  );
  if (row == null) {
    throw new Error("app_day_boundary singleton missing after seed");
  }
  return mapRow(row);
}

/** Load the singleton day boundary (seeds midnight + device TZ on first read). */
export async function getDayBoundary(
  db: SQLiteDatabase,
): Promise<DayBoundary> {
  const row = await db.getFirstAsync<DayBoundaryRow>(
    `SELECT dayStartsAtMinutes, timeZone, updatedAt FROM app_day_boundary WHERE id = 1`,
  );
  if (row != null) {
    return mapRow(row);
  }
  return seedDayBoundaryIfNeeded(db);
}

/**
 * Update day boundary prefs. Enqueues a `prefs` fact for later sync.
 *
 * Known local exploit: shifting the boundary or zone can move “today” and
 * re-open daily bonuses — documented on the day-boundary module; server must
 * not trust client day keys alone.
 */
export async function setDayBoundary(
  db: SQLiteDatabase,
  update: DayBoundaryUpdate,
): Promise<DayBoundary> {
  const current = await getDayBoundary(db);

  const dayStartsAtMinutes =
    update.dayStartsAtMinutes === undefined
      ? current.dayStartsAtMinutes
      : assertDayStartsAtMinutes(update.dayStartsAtMinutes);
  const timeZone =
    update.timeZone === undefined
      ? current.timeZone
      : assertTimeZone(update.timeZone);

  if (
    dayStartsAtMinutes === current.dayStartsAtMinutes &&
    timeZone === current.timeZone
  ) {
    return current;
  }

  const updatedAt = nowIso();
  await db.runAsync(
    `UPDATE app_day_boundary
     SET dayStartsAtMinutes = ?, timeZone = ?, updatedAt = ?
     WHERE id = 1`,
    dayStartsAtMinutes,
    timeZone,
    updatedAt,
  );

  const next: DayBoundary = { dayStartsAtMinutes, timeZone, updatedAt };

  await enqueueOp(
    db,
    "prefs",
    {
      dayStartsAtMinutes: next.dayStartsAtMinutes,
      timeZone: next.timeZone,
      updatedAt: next.updatedAt,
    },
    { clientClockAt: updatedAt },
  );

  return next;
}

/**
 * Canonical “today” / daily_summary key. All habit day queries should use this
 * (or `getAppDayKey` with a boundary already loaded) — not ad-hoc date math.
 */
export async function getTodayDayKey(
  db: SQLiteDatabase,
  now: Date = new Date(),
): Promise<string> {
  const boundary = await getDayBoundary(db);
  return getAppDayKey(now, boundary);
}
