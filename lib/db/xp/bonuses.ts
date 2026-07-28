import type { SQLiteDatabase } from "expo-sqlite";

import {
  DAILY_SUMMARY_GOAL_KEYS,
  getDailySummary,
  type DailySummaryGoalKey,
  type DailySummaryTotalsOptions,
} from "../daily-summary";
import { newLocalRecord } from "../ids";
import {
  DAY_COMPLETE_BONUS_KEY,
  XP_DAY_COMPLETE,
  XP_PER_GOAL_MET,
} from "./amounts";
import { applyXpAward, claimGoalBonusSlot } from "./store";
import type { XpEvent } from "./types";

export type GoalBonusAwardResult = {
  events: XpEvent[];
  newlyMet: DailySummaryGoalKey[];
  dayComplete: boolean;
};

/**
 * After a habit write: award unmet→met goal bonuses (once per dayKey/goalKey)
 * and optional day-complete bonus when all daily goals are met.
 *
 * Uses daily_summary recompute (facts) + goal_bonus_awarded uniqueness.
 * Known local exploit: clock / dayStartsAt shifts can re-open bonuses.
 *
 * Call from UI/provider layer — not from habit-log/store (avoids import cycles).
 */
export async function maybeAwardGoalBonusesForDay(
  db: SQLiteDatabase,
  dayKey: string,
  options: DailySummaryTotalsOptions,
): Promise<GoalBonusAwardResult> {
  const summary = await getDailySummary(db, dayKey, options);
  const events: XpEvent[] = [];
  const newlyMet: DailySummaryGoalKey[] = [];

  for (const goalKey of summary.goalsMet) {
    const record = newLocalRecord();
    const claimed = await claimGoalBonusSlot(
      db,
      dayKey,
      goalKey,
      record.id,
      record.createdAt,
    );
    if (!claimed) continue;

    const event = await applyXpAward(db, {
      id: record.id,
      createdAt: record.createdAt,
      amount: XP_PER_GOAL_MET,
      reason: "goal_met",
      relatedEntityId: `${dayKey}:${goalKey}`,
      dayKey,
    });
    newlyMet.push(goalKey);
    events.push(event);
  }

  let dayComplete = false;
  const allMet =
    summary.goalsMet.length === DAILY_SUMMARY_GOAL_KEYS.length &&
    DAILY_SUMMARY_GOAL_KEYS.every((key) => summary.goalsMet.includes(key));

  if (allMet) {
    const record = newLocalRecord();
    const claimed = await claimGoalBonusSlot(
      db,
      dayKey,
      DAY_COMPLETE_BONUS_KEY,
      record.id,
      record.createdAt,
    );
    if (claimed) {
      const event = await applyXpAward(db, {
        id: record.id,
        createdAt: record.createdAt,
        amount: XP_DAY_COMPLETE,
        reason: "day_complete",
        relatedEntityId: dayKey,
        dayKey,
      });
      dayComplete = true;
      events.push(event);
    }
  }

  return { events, newlyMet, dayComplete };
}
