/**
 * Local XP amounts (v1 — dumb & explicit).
 *
 * SECURITY: Local XP / level / day bonuses are cheatable until a server
 * recomputes from habit_log + goals facts. Do not enqueue xp_award as sync truth.
 */

/** Awarded once per successful habit_log insert. */
export const XP_PER_HABIT_LOG = 10;

/** Awarded once per (dayKey, goalKey) when a daily goal flips unmet → met. */
export const XP_PER_GOAL_MET = 50;

/** Awarded once per dayKey when all daily goalsMet are true. */
export const XP_DAY_COMPLETE = 100;

export const XP_EVENT_REASONS = [
  "habit_log",
  "goal_met",
  "day_complete",
] as const;

export type XpEventReason = (typeof XP_EVENT_REASONS)[number];

/** Uniqueness sentinel in goal_bonus_awarded for the all-goals day bonus. */
export const DAY_COMPLETE_BONUS_KEY = "__day_complete__";
