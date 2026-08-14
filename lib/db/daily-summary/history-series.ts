import type { SQLiteDatabase } from "expo-sqlite";

import { getTodayDayKey } from "../day-boundary/store";
import type { WaterUnit, WeightUnit } from "../daily-goals/types";
import type { ActiveKcalHabitPayload, FoodHabitPayload, HabitLogType, SleepHabitPayload, StepsHabitPayload, TrainHabitPayload, WaterHabitPayload, WeightHabitPayload } from "../habit-log/types";
import { convertWaterAmount, convertWeightValue } from "../habit-log/units";
import {
  firstDayKeyOfYear,
  lastDayKeyOfMonth,
  lastDayKeyOfWeek,
  lastDayKeyOfYear,
  listDayKeysEndingAt,
  listDayKeysInclusive,
  listMonthKeysEndingAt,
  listWeekStartKeysEndingAt,
  listYearKeysEndingAt,
  listYearKeysFromTo,
  monthDayLabelForDayKey,
  monthKeyFromDayKey,
  monthShortLabelForMonthKey,
  weekdayShortLabelForDayKey,
  yearFromDayKey,
} from "./day-keys";

export type FoodHistorySeries = {
  labels: string[];
  kcal: number[];
  proteinG: number[];
  carbsG: number[];
  fatG: number[];
};

export type FoodKcalHistorySeries = {
  labels: string[];
  values: number[];
};

export type WaterHistorySeries = {
  labels: string[];
  values: number[];
};

export type FoodKcalHistorySpec =
  | { grain: "day"; dayCount: number }
  | { grain: "week"; weekCount: number }
  | { grain: "month"; monthCount: number }
  | { grain: "year"; yearCount: number }
  | { grain: "year"; fromDayKey: string };

type HabitLogRow = {
  dayKey: string;
  payload_json: string;
};

type FoodDayTotals = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

const EMPTY_TOTALS: FoodDayTotals = {
  kcal: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
};

function parseFiniteNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return value;
}

function parseFoodMacros(payload_json: string): FoodDayTotals {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload_json);
  } catch {
    return EMPTY_TOTALS;
  }
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return EMPTY_TOTALS;
  }
  const payload = parsed as FoodHabitPayload;
  return {
    kcal: parseFiniteNumber(payload.kcal),
    proteinG: parseFiniteNumber(payload.proteinG),
    carbsG: parseFiniteNumber(payload.carbsG),
    fatG: parseFiniteNumber(payload.fatG),
  };
}

function addTotals(a: FoodDayTotals, b: FoodDayTotals): FoodDayTotals {
  return {
    kcal: a.kcal + b.kcal,
    proteinG: a.proteinG + b.proteinG,
    carbsG: a.carbsG + b.carbsG,
    fatG: a.fatG + b.fatG,
  };
}

async function loadFoodMacrosByDay(
  db: SQLiteDatabase,
  startDayKey: string,
  endDayKey: string,
): Promise<Map<string, FoodDayTotals>> {
  const rows = await db.getAllAsync<HabitLogRow>(
    `SELECT dayKey, payload_json
     FROM habit_logs
     WHERE type = 'food' AND dayKey >= ? AND dayKey <= ?
     ORDER BY dayKey ASC`,
    startDayKey,
    endDayKey,
  );
  const byDay = new Map<string, FoodDayTotals>();
  for (const row of rows) {
    const parsed = parseFoodMacros(row.payload_json);
    const existing = byDay.get(row.dayKey) ?? EMPTY_TOTALS;
    byDay.set(row.dayKey, addTotals(existing, parsed));
  }
  return byDay;
}

function meanDailyTotals(
  startDayKey: string,
  endDayKey: string,
  macrosByDay: Map<string, FoodDayTotals>,
): FoodDayTotals {
  const keys = listDayKeysInclusive(startDayKey, endDayKey);
  if (keys.length === 0) {
    return EMPTY_TOTALS;
  }
  let sum = EMPTY_TOTALS;
  for (const key of keys) {
    sum = addTotals(sum, macrosByDay.get(key) ?? EMPTY_TOTALS);
  }
  return {
    kcal: Math.round(sum.kcal / keys.length),
    proteinG: Math.round(sum.proteinG / keys.length),
    carbsG: Math.round(sum.carbsG / keys.length),
    fatG: Math.round(sum.fatG / keys.length),
  };
}

function capEnd(dayKey: string, endDayKey: string): string {
  return dayKey > endDayKey ? endDayKey : dayKey;
}

type HistoryLookbackBucket = {
  label: string;
  startDayKey: string;
  endDayKey: string;
  /** When true, Y is mean daily over the range. When false, Y is that day's total. */
  useMean: boolean;
};

function listHistoryLookbackBuckets(
  spec: FoodKcalHistorySpec,
  endDayKey: string,
): HistoryLookbackBucket[] {
  if (spec.grain === "day") {
    const dayKeys = listDayKeysEndingAt(endDayKey, spec.dayCount);
    const labels =
      spec.dayCount === 7
        ? dayKeys.map((key) => weekdayShortLabelForDayKey(key))
        : dayKeys.map((key) => monthDayLabelForDayKey(key));
    return dayKeys.map((key, index) => ({
      label: labels[index] ?? key,
      startDayKey: key,
      endDayKey: key,
      useMean: false,
    }));
  }

  if (spec.grain === "week") {
    const weekStarts = listWeekStartKeysEndingAt(endDayKey, spec.weekCount);
    return weekStarts.map((weekStart) => ({
      label: monthDayLabelForDayKey(weekStart),
      startDayKey: weekStart,
      endDayKey: capEnd(lastDayKeyOfWeek(weekStart), endDayKey),
      useMean: true,
    }));
  }

  if (spec.grain === "month") {
    const monthKeys = listMonthKeysEndingAt(
      monthKeyFromDayKey(endDayKey),
      spec.monthCount,
    );
    return monthKeys.map((monthKey) => {
      const monthStart = `${monthKey}-01`;
      return {
        label: monthShortLabelForMonthKey(monthKey),
        startDayKey: monthStart,
        endDayKey: capEnd(lastDayKeyOfMonth(monthKey), endDayKey),
        useMean: true,
      };
    });
  }

  const endYear = yearFromDayKey(endDayKey);
  if ("fromDayKey" in spec) {
    const fromDayKey = spec.fromDayKey;
    const years = listYearKeysFromTo(yearFromDayKey(fromDayKey), endYear);
    return years.map((year) => {
      let start = firstDayKeyOfYear(year);
      if (fromDayKey > start) {
        start = fromDayKey;
      }
      return {
        label: String(year),
        startDayKey: start,
        endDayKey: capEnd(lastDayKeyOfYear(year), endDayKey),
        useMean: true,
      };
    });
  }

  const years = listYearKeysEndingAt(endYear, spec.yearCount);
  return years.map((year) => ({
    label: String(year),
    startDayKey: firstDayKeyOfYear(year),
    endDayKey: capEnd(lastDayKeyOfYear(year), endDayKey),
    useMean: true,
  }));
}

function emptySeries(): FoodHistorySeries {
  return { labels: [], kcal: [], proteinG: [], carbsG: [], fatG: [] };
}

function seriesFromTotals(
  labels: string[],
  totals: FoodDayTotals[],
): FoodHistorySeries {
  return {
    labels,
    kcal: totals.map((item) => item.kcal),
    proteinG: totals.map((item) => item.proteinG),
    carbsG: totals.map((item) => item.carbsG),
    fatG: totals.map((item) => item.fatG),
  };
}

async function getEarliestHabitDayKey(
  db: SQLiteDatabase,
  type: HabitLogType,
): Promise<string | null> {
  const row = await db.getFirstAsync<{ minDayKey: string | null }>(
    `SELECT MIN(dayKey) AS minDayKey FROM habit_logs WHERE type = ?`,
    type,
  );
  const key = row?.minDayKey;
  if (key == null || key === "") {
    return null;
  }
  return key;
}

export async function getEarliestFoodDayKey(
  db: SQLiteDatabase,
): Promise<string | null> {
  return getEarliestHabitDayKey(db, "food");
}

export async function getEarliestWaterDayKey(
  db: SQLiteDatabase,
): Promise<string | null> {
  return getEarliestHabitDayKey(db, "water");
}

export async function getEarliestTrainDayKey(
  db: SQLiteDatabase,
): Promise<string | null> {
  return getEarliestHabitDayKey(db, "train");
}

export async function getEarliestSleepDayKey(
  db: SQLiteDatabase,
): Promise<string | null> {
  return getEarliestHabitDayKey(db, "sleep");
}

export async function getEarliestStepsDayKey(
  db: SQLiteDatabase,
): Promise<string | null> {
  return getEarliestHabitDayKey(db, "steps");
}

export async function getEarliestActiveKcalDayKey(
  db: SQLiteDatabase,
): Promise<string | null> {
  return getEarliestHabitDayKey(db, "active_kcal");
}

export async function getEarliestWeightDayKey(
  db: SQLiteDatabase,
): Promise<string | null> {
  return getEarliestHabitDayKey(db, "weight");
}

function bucketFoodTotals(
  bucket: HistoryLookbackBucket,
  macrosByDay: Map<string, FoodDayTotals>,
): FoodDayTotals {
  if (bucket.startDayKey > bucket.endDayKey) {
    return EMPTY_TOTALS;
  }
  if (bucket.useMean) {
    return meanDailyTotals(bucket.startDayKey, bucket.endDayKey, macrosByDay);
  }
  return macrosByDay.get(bucket.startDayKey) ?? EMPTY_TOTALS;
}

/**
 * Food history series for lookbacks. Y is daily totals for day grain,
 * mean daily values including empty days for week/month/year.
 */
export async function getFoodHistorySeries(
  db: SQLiteDatabase,
  spec: FoodKcalHistorySpec,
  now: Date = new Date(),
): Promise<FoodHistorySeries> {
  const endDayKey = await getTodayDayKey(db, now);
  const buckets = listHistoryLookbackBuckets(spec, endDayKey);
  if (buckets.length === 0) {
    return emptySeries();
  }
  const rangeStart = buckets[0]?.startDayKey ?? endDayKey;
  const macrosByDay = await loadFoodMacrosByDay(db, rangeStart, endDayKey);
  return seriesFromTotals(
    buckets.map((bucket) => bucket.label),
    buckets.map((bucket) => bucketFoodTotals(bucket, macrosByDay)),
  );
}

/**
 * Food energy series for history lookbacks. Y is daily kcal (totals for day grain,
 * mean daily kcal including empty days for week/month/year).
 */
export async function getFoodKcalHistorySeries(
  db: SQLiteDatabase,
  spec: FoodKcalHistorySpec,
  now: Date = new Date(),
): Promise<FoodKcalHistorySeries> {
  const series = await getFoodHistorySeries(db, spec, now);
  return { labels: series.labels, values: series.kcal };
}

async function loadNumericHabitByDay(
  db: SQLiteDatabase,
  type: HabitLogType,
  startDayKey: string,
  endDayKey: string,
  parseAmount: (payload_json: string) => number,
): Promise<Map<string, number>> {
  const rows = await db.getAllAsync<HabitLogRow>(
    `SELECT dayKey, payload_json
     FROM habit_logs
     WHERE type = ? AND dayKey >= ? AND dayKey <= ?
     ORDER BY dayKey ASC`,
    type,
    startDayKey,
    endDayKey,
  );
  const byDay = new Map<string, number>();
  for (const row of rows) {
    byDay.set(
      row.dayKey,
      (byDay.get(row.dayKey) ?? 0) + parseAmount(row.payload_json),
    );
  }
  return byDay;
}

function meanDailyValue(
  startDayKey: string,
  endDayKey: string,
  byDay: Map<string, number>,
): number {
  const keys = listDayKeysInclusive(startDayKey, endDayKey);
  if (keys.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const key of keys) {
    sum += byDay.get(key) ?? 0;
  }
  return Math.round(sum / keys.length);
}

function bucketNumericValue(
  bucket: HistoryLookbackBucket,
  byDay: Map<string, number>,
): number {
  if (bucket.startDayKey > bucket.endDayKey) {
    return 0;
  }
  if (bucket.useMean) {
    return meanDailyValue(bucket.startDayKey, bucket.endDayKey, byDay);
  }
  return byDay.get(bucket.startDayKey) ?? 0;
}

async function getNumericHabitHistorySeries(
  db: SQLiteDatabase,
  spec: FoodKcalHistorySpec,
  type: HabitLogType,
  parseAmount: (payload_json: string) => number,
  now: Date,
): Promise<WaterHistorySeries> {
  const endDayKey = await getTodayDayKey(db, now);
  const buckets = listHistoryLookbackBuckets(spec, endDayKey);
  if (buckets.length === 0) {
    return { labels: [], values: [] };
  }
  const rangeStart = buckets[0]?.startDayKey ?? endDayKey;
  const amountByDay = await loadNumericHabitByDay(
    db,
    type,
    rangeStart,
    endDayKey,
    parseAmount,
  );
  return {
    labels: buckets.map((bucket) => bucket.label),
    values: buckets.map((bucket) => bucketNumericValue(bucket, amountByDay)),
  };
}

function parseWaterAmountInUnit(
  payload_json: string,
  toUnit: WaterUnit,
): number {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload_json);
  } catch {
    return 0;
  }
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return 0;
  }
  const payload = parsed as WaterHabitPayload;
  const amount = parseFiniteNumber(payload.amount);
  const unit = payload.unit;
  if (unit !== "oz" && unit !== "ml") {
    return 0;
  }
  return convertWaterAmount(amount, unit, toUnit);
}

/**
 * Water history series for lookbacks. Y is daily amount in `waterUnit`
 * (totals for day grain, mean daily including empty days for week/month/year).
 */
export async function getWaterHistorySeries(
  db: SQLiteDatabase,
  spec: FoodKcalHistorySpec,
  waterUnit: WaterUnit,
  now: Date = new Date(),
): Promise<WaterHistorySeries> {
  return getNumericHabitHistorySeries(
    db,
    spec,
    "water",
    (payload_json) => parseWaterAmountInUnit(payload_json, waterUnit),
    now,
  );
}

function parseTrainMinutes(payload_json: string): number {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload_json);
  } catch {
    return 0;
  }
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return 0;
  }
  return parseFiniteNumber((parsed as TrainHabitPayload).durationMin);
}

export type TrainHistorySeries = WaterHistorySeries;

/**
 * Train history series for lookbacks. Y is daily minutes
 * (totals for day grain, mean daily including empty days for week/month/year).
 */
export async function getTrainHistorySeries(
  db: SQLiteDatabase,
  spec: FoodKcalHistorySpec,
  now: Date = new Date(),
): Promise<TrainHistorySeries> {
  return getNumericHabitHistorySeries(db, spec, "train", parseTrainMinutes, now);
}

function parseSleepHours(payload_json: string): number {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload_json);
  } catch {
    return 0;
  }
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return 0;
  }
  return parseFiniteNumber((parsed as SleepHabitPayload).durationHours);
}

export type SleepHistorySeries = WaterHistorySeries;

/**
 * Sleep history series for lookbacks. Y is daily hours
 * (totals for day grain, mean daily including empty days for week/month/year).
 */
export async function getSleepHistorySeries(
  db: SQLiteDatabase,
  spec: FoodKcalHistorySpec,
  now: Date = new Date(),
): Promise<SleepHistorySeries> {
  return getNumericHabitHistorySeries(db, spec, "sleep", parseSleepHours, now);
}

function parseSteps(payload_json: string): number {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload_json);
  } catch {
    return 0;
  }
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return 0;
  }
  return parseFiniteNumber((parsed as StepsHabitPayload).steps);
}

export type StepsHistorySeries = WaterHistorySeries;

/**
 * Steps history series for lookbacks. Y is daily step count
 * (totals for day grain, mean daily including empty days for week/month/year).
 */
export async function getStepsHistorySeries(
  db: SQLiteDatabase,
  spec: FoodKcalHistorySpec,
  now: Date = new Date(),
): Promise<StepsHistorySeries> {
  return getNumericHabitHistorySeries(db, spec, "steps", parseSteps, now);
}

function parseActiveKcal(payload_json: string): number {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload_json);
  } catch {
    return 0;
  }
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return 0;
  }
  return parseFiniteNumber((parsed as ActiveKcalHabitPayload).kcal);
}

export type ActiveKcalHistorySeries = WaterHistorySeries;

/**
 * Active calorie history series for lookbacks. Y is daily kcal burned
 * (totals for day grain, mean daily including empty days for week/month/year).
 */
export async function getActiveKcalHistorySeries(
  db: SQLiteDatabase,
  spec: FoodKcalHistorySpec,
  now: Date = new Date(),
): Promise<ActiveKcalHistorySeries> {
  return getNumericHabitHistorySeries(
    db,
    spec,
    "active_kcal",
    parseActiveKcal,
    now,
  );
}

type WeightLogPoint = {
  dayKey: string;
  timestamp: string;
  createdAt: string;
  value: number;
};

function parseWeightLog(
  row: {
    dayKey: string;
    timestamp: string;
    createdAt: string;
    payload_json: string;
  },
  toUnit: WeightUnit,
): WeightLogPoint | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.payload_json);
  } catch {
    return null;
  }
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const payload = parsed as WeightHabitPayload;
  if (
    typeof payload.value !== "number" ||
    !Number.isFinite(payload.value) ||
    (payload.unit !== "lb" && payload.unit !== "kg")
  ) {
    return null;
  }
  return {
    dayKey: row.dayKey,
    timestamp: row.timestamp,
    createdAt: row.createdAt,
    value: convertWeightValue(payload.value, payload.unit, toUnit),
  };
}

function isNewerWeightLog(next: WeightLogPoint, prev: WeightLogPoint): boolean {
  return (
    next.timestamp > prev.timestamp ||
    (next.timestamp === prev.timestamp && next.createdAt > prev.createdAt)
  );
}

async function loadWeightLogs(
  db: SQLiteDatabase,
  startDayKey: string,
  endDayKey: string,
  toUnit: WeightUnit,
): Promise<WeightLogPoint[]> {
  const rows = await db.getAllAsync<{
    dayKey: string;
    timestamp: string;
    createdAt: string;
    payload_json: string;
  }>(
    `SELECT dayKey, timestamp, createdAt, payload_json
     FROM habit_logs
     WHERE type = 'weight' AND dayKey >= ? AND dayKey <= ?
     ORDER BY timestamp ASC, createdAt ASC`,
    startDayKey,
    endDayKey,
  );
  const logs: WeightLogPoint[] = [];
  for (const row of rows) {
    const parsed = parseWeightLog(row, toUnit);
    if (parsed != null) {
      logs.push(parsed);
    }
  }
  return logs;
}

function latestWeightInBucket(
  logs: readonly WeightLogPoint[],
  startDayKey: string,
  endDayKey: string,
): number {
  if (startDayKey > endDayKey) {
    return 0;
  }
  let latest: WeightLogPoint | null = null;
  for (const log of logs) {
    if (log.dayKey < startDayKey || log.dayKey > endDayKey) {
      continue;
    }
    if (latest == null || isNewerWeightLog(log, latest)) {
      latest = log;
    }
  }
  return latest?.value ?? 0;
}

export type WeightHistorySeries = WaterHistorySeries;

/**
 * Weight history series for lookbacks. Y is the latest log in each bucket
 * (converted to `weightUnit`); 0 if none were logged in that range.
 */
export async function getWeightHistorySeries(
  db: SQLiteDatabase,
  spec: FoodKcalHistorySpec,
  weightUnit: WeightUnit,
  now: Date = new Date(),
): Promise<WeightHistorySeries> {
  const endDayKey = await getTodayDayKey(db, now);
  const buckets = listHistoryLookbackBuckets(spec, endDayKey);
  if (buckets.length === 0) {
    return { labels: [], values: [] };
  }
  const rangeStart = buckets[0]?.startDayKey ?? endDayKey;
  const logs = await loadWeightLogs(db, rangeStart, endDayKey, weightUnit);
  return {
    labels: buckets.map((bucket) => bucket.label),
    values: buckets.map((bucket) =>
      latestWeightInBucket(logs, bucket.startDayKey, bucket.endDayKey),
    ),
  };
}

