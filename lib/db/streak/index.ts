import type { SQLiteDatabase } from "expo-sqlite";

import { shiftDayKey } from "../daily-summary/day-keys";

/**
 * Daily streak: consecutive app days with at least one logged action.
 * Derived from habit_logs on every read (restore brings logs back, so the
 * streak comes back with them); nothing is stored or synced.
 */
export type DailyStreak = {
  /** Days in the current run. Kept alive through today until it's logged. */
  count: number;
  /** Today already has a log. False with count > 0: the streak is at risk. */
  todayActive: boolean;
  /** Longest run ever. */
  best: number;
};

export const EMPTY_STREAK: DailyStreak = {
  count: 0,
  todayActive: false,
  best: 0,
};

export async function getDailyStreak(
  db: SQLiteDatabase,
  todayDayKey: string,
): Promise<DailyStreak> {
  const rows = await db.getAllAsync<{ dayKey: string }>(
    `SELECT DISTINCT dayKey FROM habit_logs WHERE dayKey <= ? ORDER BY dayKey DESC`,
    todayDayKey,
  );
  return streakFromDayKeys(
    rows.map((row) => row.dayKey),
    todayDayKey,
  );
}

/** `dayKeys`: distinct active days, newest first, none after today. */
export function streakFromDayKeys(
  dayKeys: readonly string[],
  todayDayKey: string,
): DailyStreak {
  if (dayKeys.length === 0) return EMPTY_STREAK;

  const todayActive = dayKeys[0] === todayDayKey;
  let expected = todayActive ? todayDayKey : shiftDayKey(todayDayKey, -1);
  let count = 0;
  for (const key of dayKeys) {
    if (key !== expected) break;
    count += 1;
    expected = shiftDayKey(expected, -1);
  }

  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const key of dayKeys) {
    run = previous != null && shiftDayKey(previous, -1) === key ? run + 1 : 1;
    best = Math.max(best, run);
    previous = key;
  }

  return { count, todayActive, best: Math.max(best, count) };
}
