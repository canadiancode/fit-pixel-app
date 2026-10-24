/**
 * Local XP amounts (v1 — dumb & explicit).
 *
 * SECURITY: Local XP / level / day bonuses are cheatable until a server
 * recomputes from habit_log + goals facts. Do not enqueue xp_award as sync truth.
 */

/** Awarded per habit_log insert, up to the daily cap below. */
export const XP_PER_HABIT_LOG = 10;

/**
 * Logs per action type per day that earn XP (3 waters = 30 XP; the 4th
 * earns none), so splitting one drink into many logs doesn't farm XP.
 * Mirrored by recompute_my_xp() on the server.
 */
export const XP_HABIT_LOGS_PER_TYPE_PER_DAY = 3;

/** Awarded once per (dayKey, goalKey) when a daily goal flips unmet → met. */
export const XP_PER_GOAL_MET = 50;

/** Awarded once per dayKey when all daily goalsMet are true. */
export const XP_DAY_COMPLETE = 100;

/** Weekly weigh-in: base XP, plus a streak bonus per consecutive week. */
export const XP_WEIGH_IN_BASE = 30;
export const XP_WEIGH_IN_STREAK_STEP = 10;
export const XP_WEIGH_IN_STREAK_MAX_BONUS = 50;

/** Each weight-journey milestone (every 5 lb / 2 kg toward the target). */
export const XP_WEIGHT_MILESTONE = 100;
/** Reaching the target weight itself. */
export const XP_WEIGHT_GOAL_REACHED = 250;

export const XP_EVENT_REASONS = [
  "habit_log",
  "goal_met",
  "day_complete",
  "weigh_in",
  "weight_milestone",
] as const;

export type XpEventReason = (typeof XP_EVENT_REASONS)[number];

/** Uniqueness sentinel in goal_bonus_awarded for the all-goals day bonus. */
export const DAY_COMPLETE_BONUS_KEY = "__day_complete__";
