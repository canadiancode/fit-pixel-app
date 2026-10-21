import { getLocalDayKey } from "@/lib/db/day-boundary/day-key";
import {
  listDayKeysEndingAt,
  weekdayShortLabelForDayKey,
} from "@/lib/db/daily-summary/day-keys";

/** Rolling window for the Heart action chart (matches other actions' "Last 7 days"). */
export const RESTING_HEART_RATE_WEEK_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RestingHeartRateSample = {
  at: Date;
  bpm: number;
};

/** One calendar day of resting HR (oldest → newest). `bpm` is null when nothing synced. */
export type RestingHeartRateDay = {
  dayKey: string;
  label: string;
  bpm: number | null;
};

export type RestingHeartRateWeekHookValue = {
  days: readonly RestingHeartRateDay[];
  isLoading: boolean;
};

/** Query start for the platform stores: local midnight, six days before today. */
export function restingHeartRateWeekStart(now: Date = new Date()): Date {
  const start = new Date(now.getTime() - (RESTING_HEART_RATE_WEEK_DAYS - 1) * DAY_MS);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Buckets samples by local calendar day (resting HR is a daily device estimate, so
 * the app's day-start offset does not apply) and averages any duplicates.
 */
export function buildRestingHeartRateWeek(
  samples: readonly RestingHeartRateSample[],
  now: Date = new Date(),
): RestingHeartRateDay[] {
  const dayKeys = listDayKeysEndingAt(
    getLocalDayKey(now, 0),
    RESTING_HEART_RATE_WEEK_DAYS,
  );
  const sums = new Map<string, { total: number; count: number }>();

  for (const s of samples) {
    if (!Number.isFinite(s.bpm) || s.bpm <= 0) continue;
    if (!Number.isFinite(s.at.getTime())) continue;
    const key = getLocalDayKey(s.at, 0);
    const prev = sums.get(key) ?? { total: 0, count: 0 };
    sums.set(key, { total: prev.total + s.bpm, count: prev.count + 1 });
  }

  return dayKeys.map((dayKey) => {
    const agg = sums.get(dayKey);
    return {
      dayKey,
      label: weekdayShortLabelForDayKey(dayKey),
      bpm: agg ? Math.round(agg.total / agg.count) : null,
    };
  });
}

/** Mean of days with a reading, rounded; null when the week is empty. */
export function restingHeartRateWeekAverage(
  days: readonly RestingHeartRateDay[],
): number | null {
  const values = days.flatMap((d) => (d.bpm == null ? [] : [d.bpm]));
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

export function emptyRestingHeartRateWeek(): RestingHeartRateDay[] {
  return buildRestingHeartRateWeek([]);
}
