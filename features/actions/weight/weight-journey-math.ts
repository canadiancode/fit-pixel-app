import type { WeightEntry, WeightUnit } from "@/lib/db";

/**
 * Pure weight-journey math: direction, milestones, weekly streaks and the
 * rolling-average trend. Weight is a long-term journey, so progress runs from
 * the start weight to the target rather than resetting each day.
 */

export type JourneyDirection = "lose" | "gain" | "maintain";

/** Pixel items earned on the journey; removed from the level shop. */
export const WEIGHT_MILESTONE_REWARD_ITEMS = [
  { itemId: "def-item-left-green-potion", label: "Green Potion" },
  { itemId: "def-item-left-think-purple-bottle", label: "Purple Bottle" },
] as const;
export const WEIGHT_GOAL_REWARD_ITEM = {
  itemId: "def-item-right-gold-black-king-bag",
  label: "Gold Black King Bag",
} as const;
export const WEIGHT_REWARD_ITEM_IDS: ReadonlySet<string> = new Set([
  ...WEIGHT_MILESTONE_REWARD_ITEMS.map((reward) => reward.itemId),
  WEIGHT_GOAL_REWARD_ITEM.itemId,
]);

export type WeightMilestone = {
  /** 1-based position along the journey. */
  index: number;
  /** Weight at which this milestone is reached. */
  threshold: number;
  isGoal: boolean;
  reached: boolean;
  /** 0–1 position on the start → target bar. */
  position: number;
  reward: { itemId: string; label: string } | null;
  /** Once-only XP / unlock key (stable across journey restarts). */
  awardKey: string;
};

export type WeightJourneyProgress = {
  direction: JourneyDirection;
  start: number;
  current: number;
  target: number;
  /** 0–1 along the start → target bar. */
  progress: number;
  /** Distance left to the target (0 once reached). */
  remaining: number;
  /** Maintain only: within the healthy band around the target. */
  inRange: boolean;
  milestones: WeightMilestone[];
  nextMilestone: WeightMilestone | null;
  goalReached: boolean;
};

export function milestoneStep(unit: WeightUnit): number {
  return unit === "kg" ? 2 : 5;
}

/** Maintain: within this distance of the target counts as on track. */
export function maintainBand(unit: WeightUnit): number {
  return unit === "kg" ? 1 : 2;
}

export function roundWeight(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatWeight(value: number): string {
  const rounded = roundWeight(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function computeJourney(input: {
  start: number;
  current: number;
  target: number;
  unit: WeightUnit;
}): WeightJourneyProgress {
  const { start, current, target, unit } = input;
  const step = milestoneStep(unit);
  const band = maintainBand(unit);
  const total = target - start;

  if (Math.abs(total) < step) {
    const distance = Math.abs(current - target);
    const inRange = distance <= band;
    return {
      direction: "maintain",
      start,
      current,
      target,
      progress: inRange ? 1 : Math.max(0, 1 - (distance - band) / (step * 2)),
      remaining: inRange ? 0 : roundWeight(distance - band),
      inRange,
      milestones: [],
      nextMilestone: null,
      goalReached: inRange,
    };
  }

  const direction: JourneyDirection = total < 0 ? "lose" : "gain";
  const sign = direction === "lose" ? -1 : 1;
  const towardTarget = (current - start) * sign;
  const progress = Math.min(1, Math.max(0, towardTarget / Math.abs(total)));
  const isPast = (threshold: number) =>
    direction === "lose" ? current <= threshold : current >= threshold;

  const thresholds: number[] = [];
  for (let n = 1; ; n++) {
    const threshold = start + sign * step * n;
    // Skip a stub milestone that would sit right next to the goal.
    if ((target - threshold) * sign < step * 0.3) break;
    thresholds.push(threshold);
  }

  const milestones: WeightMilestone[] = thresholds.map((threshold, i) => ({
    index: i + 1,
    threshold: roundWeight(threshold),
    isGoal: false,
    reached: isPast(threshold),
    position: Math.abs(threshold - start) / Math.abs(total),
    reward: WEIGHT_MILESTONE_REWARD_ITEMS[i] ?? null,
    awardKey: `weight:milestone:${direction}:${unit}:${roundWeight(threshold)}`,
  }));
  milestones.push({
    index: milestones.length + 1,
    threshold: roundWeight(target),
    isGoal: true,
    reached: isPast(target),
    position: 1,
    reward: WEIGHT_GOAL_REWARD_ITEM,
    // One goal reward per journey start, so nudging the target can't re-pay it.
    awardKey: `weight:goal:${direction}:${unit}:start-${roundWeight(start)}`,
  });

  const goalReached = isPast(target);
  return {
    direction,
    start,
    current,
    target,
    progress,
    remaining: goalReached ? 0 : roundWeight(Math.abs(target - current)),
    inRange: false,
    milestones,
    nextMilestone: milestones.find((m) => !m.reached) ?? null,
    goalReached,
  };
}

/* ---- Weeks and streaks ---- */

function dayKeyToUtcDate(dayKey: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

function utcDateToDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function shiftDays(dayKey: string, days: number): string {
  const date = dayKeyToUtcDate(dayKey);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateToDayKey(date);
}

/** Day key of the weigh-in week containing `dayKey` (weeks start on `weekday`). */
export function weekStartKey(dayKey: string, weekday: number): string {
  const offset = (dayKeyToUtcDate(dayKey).getUTCDay() - weekday + 7) % 7;
  return shiftDays(dayKey, -offset);
}

export type WeighInStatus = {
  /** Consecutive weigh-in weeks, counting this week once it's done. */
  streak: number;
  doneThisWeek: boolean;
  /** Today is the chosen weigh-in weekday. */
  isWeighInDay: boolean;
  weekKey: string;
  /** Day key of the next weigh-in day (today when it's weigh-in day). */
  nextWeighInDayKey: string;
  /** Days since the most recent weigh-in, or null if never. */
  daysSinceLast: number | null;
};

export function computeWeighInStatus(
  entries: readonly WeightEntry[],
  weekday: number,
  todayKey: string,
): WeighInStatus {
  const weeks = new Set(entries.map((e) => weekStartKey(e.dayKey, weekday)));
  const weekKey = weekStartKey(todayKey, weekday);
  const doneThisWeek = weeks.has(weekKey);

  // An unfinished current week doesn't break the streak yet.
  let cursor = doneThisWeek ? weekKey : shiftDays(weekKey, -7);
  let streak = 0;
  while (weeks.has(cursor)) {
    streak++;
    cursor = shiftDays(cursor, -7);
  }

  const todayWeekday = dayKeyToUtcDate(todayKey).getUTCDay();
  const daysUntil = (weekday - todayWeekday + 7) % 7;
  const nextWeighInDayKey = shiftDays(
    todayKey,
    doneThisWeek && daysUntil === 0 ? 7 : daysUntil,
  );

  const last = entries.at(-1);
  const daysSinceLast =
    last == null
      ? null
      : Math.round(
          (dayKeyToUtcDate(todayKey).getTime() -
            dayKeyToUtcDate(last.dayKey).getTime()) /
            86_400_000,
        );

  return {
    streak,
    doneThisWeek,
    isWeighInDay: weekKey === todayKey,
    weekKey,
    nextWeighInDayKey,
    daysSinceLast,
  };
}

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function weekdayLabelForDayKey(dayKey: string): string {
  return WEEKDAY_LABELS[dayKeyToUtcDate(dayKey).getUTCDay()];
}

/* ---- Trend ---- */

export type TrendPoint = {
  dayKey: string;
  /** Latest reading that day. */
  value: number;
  /** Rolling average of readings in the 7 days ending that day. */
  average: number;
};

/** One point per day with a reading, with a 7-day rolling average. */
export function computeTrend(entries: readonly WeightEntry[]): TrendPoint[] {
  const byDay = new Map<string, number>();
  for (const entry of entries) byDay.set(entry.dayKey, entry.value);
  const days = [...byDay.keys()].sort();

  return days.map((dayKey) => {
    const windowStart = shiftDays(dayKey, -6);
    const window = days.filter((d) => d >= windowStart && d <= dayKey);
    const average =
      window.reduce((sum, d) => sum + (byDay.get(d) ?? 0), 0) / window.length;
    return { dayKey, value: byDay.get(dayKey) ?? 0, average };
  });
}
