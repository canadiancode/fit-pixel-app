import type { SQLiteDatabase } from "expo-sqlite";

import { getDailyGoals } from "../daily-goals/store";
import type { DailyGoals } from "../daily-goals/types";
import { getTodayDayKey } from "../day-boundary/store";
import { listHabitLogsForDay } from "../habit-log/store";
import {
  aggregateHabitLogs,
  type HabitDayTotals,
} from "../habit-log/totals";
import type { WeightHabitPayload } from "../habit-log/types";
import { convertWeightValue } from "../habit-log/units";
import { nowIso } from "../ids";
import {
  getCachedDailySummary,
  invalidateDailySummary,
  upsertCachedDailySummary,
} from "./cache";
import {
  listDayKeysEndingAt,
  listMonthKeysEndingAt,
  monthKeyFromDayKey,
  monthShortLabelForMonthKey,
  shiftMonthKey,
  weekdayShortLabelForDayKey,
} from "./day-keys";
import { computeGoalsMet } from "./goals-met";
import type { DailySummary, DailySummaryTotalsOptions } from "./types";

export { invalidateDailySummary };

function totalsToSummary(
  dayKey: string,
  totals: HabitDayTotals,
  options: DailySummaryTotalsOptions,
  goals: DailyGoals,
  updatedAt: string,
): DailySummary {
  return {
    dayKey,
    foodKcal: totals.foodKcal,
    waterAmount: totals.waterAmount,
    trainMinutes: totals.trainMinutes,
    sleepHours: totals.sleepHours,
    steps: totals.steps,
    activeKcal: totals.activeKcal,
    weight: totals.weight ?? null,
    waterUnit: options.waterUnit,
    weightUnit: options.weightUnit,
    goalsMet: computeGoalsMet(totals, goals),
    updatedAt,
  };
}

function cacheMatchesOptions(
  cached: DailySummary,
  options: DailySummaryTotalsOptions,
): boolean {
  return (
    cached.waterUnit === options.waterUnit &&
    cached.weightUnit === options.weightUnit
  );
}

/**
 * Lazy compute + cache (strategy B).
 * SECURITY: derived only — callers must never enqueueOp this row.
 */
export async function getDailySummary(
  db: SQLiteDatabase,
  dayKey: string,
  options: DailySummaryTotalsOptions,
  goals?: DailyGoals,
): Promise<DailySummary> {
  const resolvedGoals = goals ?? (await getDailyGoals(db));
  const cached = await getCachedDailySummary(db, dayKey);
  if (cached != null && cacheMatchesOptions(cached, options)) {
    // Recompute goalsMet against current goals without re-aggregating logs.
    const totals: HabitDayTotals = {
      foodKcal: cached.foodKcal,
      waterAmount: cached.waterAmount,
      trainMinutes: cached.trainMinutes,
      sleepHours: cached.sleepHours,
      steps: cached.steps,
      activeKcal: cached.activeKcal,
      ...(cached.weight != null ? { weight: cached.weight } : {}),
    };
    const goalsMet = computeGoalsMet(totals, resolvedGoals);
    if (
      goalsMet.length === cached.goalsMet.length &&
      goalsMet.every((key, i) => key === cached.goalsMet[i])
    ) {
      return cached;
    }
    const refreshed: DailySummary = {
      ...cached,
      goalsMet,
      updatedAt: nowIso(),
    };
    await upsertCachedDailySummary(db, refreshed);
    return refreshed;
  }

  return recomputeDailySummary(db, dayKey, options, resolvedGoals);
}

/** Force re-aggregate from habit_logs and upsert cache. */
export async function recomputeDailySummary(
  db: SQLiteDatabase,
  dayKey: string,
  options: DailySummaryTotalsOptions,
  goals?: DailyGoals,
): Promise<DailySummary> {
  const resolvedGoals = goals ?? (await getDailyGoals(db));
  const logs = await listHabitLogsForDay(db, dayKey);
  const totals = aggregateHabitLogs(logs, options);
  const summary = totalsToSummary(
    dayKey,
    totals,
    options,
    resolvedGoals,
    nowIso(),
  );
  await upsertCachedDailySummary(db, summary);
  return summary;
}

export async function getTodayDailySummary(
  db: SQLiteDatabase,
  options: DailySummaryTotalsOptions,
  now: Date = new Date(),
): Promise<DailySummary> {
  const dayKey = await getTodayDayKey(db, now);
  return getDailySummary(db, dayKey, options);
}

export async function listDailySummariesForDayKeys(
  db: SQLiteDatabase,
  dayKeys: string[],
  options: DailySummaryTotalsOptions,
  goals?: DailyGoals,
): Promise<DailySummary[]> {
  const resolvedGoals = goals ?? (await getDailyGoals(db));
  const out: DailySummary[] = [];
  for (const dayKey of dayKeys) {
    out.push(await getDailySummary(db, dayKey, options, resolvedGoals));
  }
  return out;
}

export type WeeklyMetricSeries = {
  dayKeys: string[];
  labels: string[];
  values: number[];
};

export type HabitSummaryMetric =
  | "foodKcal"
  | "waterAmount"
  | "trainMinutes"
  | "sleepHours"
  | "steps"
  | "activeKcal";

/**
 * Rolling last-N app days for weekly/history charts (oldest → newest).
 */
export async function getWeeklyMetricSeries(
  db: SQLiteDatabase,
  metric: HabitSummaryMetric,
  options: DailySummaryTotalsOptions,
  dayCount: number = 7,
  now: Date = new Date(),
): Promise<WeeklyMetricSeries> {
  const endDayKey = await getTodayDayKey(db, now);
  const dayKeys = listDayKeysEndingAt(endDayKey, dayCount);
  const summaries = await listDailySummariesForDayKeys(db, dayKeys, options);
  return {
    dayKeys,
    labels: dayKeys.map((key) => weekdayShortLabelForDayKey(key)),
    values: summaries.map((summary) => summary[metric]),
  };
}

export type MonthlyWeightSeries = {
  monthKeys: string[];
  labels: string[];
  /** Latest weight in each month (goal unit); 0 if none logged that month. */
  values: number[];
};

/**
 * Latest weight log per calendar month for the last `monthCount` months.
 * Reads habit_logs directly (not daily_summary) so sparse months stay accurate.
 */
export async function getMonthlyWeightSeries(
  db: SQLiteDatabase,
  weightUnit: DailySummaryTotalsOptions["weightUnit"],
  monthCount: number = 7,
  now: Date = new Date(),
): Promise<MonthlyWeightSeries> {
  const endDayKey = await getTodayDayKey(db, now);
  const endMonthKey = monthKeyFromDayKey(endDayKey);
  const monthKeys = listMonthKeysEndingAt(endMonthKey, monthCount);
  const startDayKey = `${monthKeys[0]}-01`;
  const endExclusive = `${shiftMonthKey(endMonthKey, 1)}-01`;

  type WeightRow = {
    dayKey: string;
    timestamp: string;
    createdAt: string;
    payload_json: string;
  };

  const rows = await db.getAllAsync<WeightRow>(
    `SELECT dayKey, timestamp, createdAt, payload_json
     FROM habit_logs
     WHERE type = 'weight' AND dayKey >= ? AND dayKey < ?
     ORDER BY timestamp ASC, createdAt ASC`,
    startDayKey,
    endExclusive,
  );

  const latestByMonth = new Map<
    string,
    { value: number; timestamp: string; createdAt: string }
  >();

  for (const row of rows) {
    let payload: WeightHabitPayload;
    try {
      payload = JSON.parse(row.payload_json) as WeightHabitPayload;
    } catch {
      continue;
    }
    if (
      typeof payload.value !== "number" ||
      (payload.unit !== "lb" && payload.unit !== "kg")
    ) {
      continue;
    }
    const monthKey = monthKeyFromDayKey(row.dayKey);
    const value = convertWeightValue(payload.value, payload.unit, weightUnit);
    const prev = latestByMonth.get(monthKey);
    const isNewer =
      prev == null ||
      row.timestamp > prev.timestamp ||
      (row.timestamp === prev.timestamp && row.createdAt > prev.createdAt);
    if (isNewer) {
      latestByMonth.set(monthKey, {
        value,
        timestamp: row.timestamp,
        createdAt: row.createdAt,
      });
    }
  }

  return {
    monthKeys,
    labels: monthKeys.map((key) => monthShortLabelForMonthKey(key)),
    values: monthKeys.map((key) => latestByMonth.get(key)?.value ?? 0),
  };
}
