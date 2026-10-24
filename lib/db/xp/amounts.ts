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

/** Weekly weigh-in: base XP, plus a streak bonus per consecutive week. */
export const XP_WEIGH_IN_BASE = 30;
export const XP_WEIGH_IN_STREAK_STEP = 10;
export const XP_WEIGH_IN_STREAK_MAX_BONUS = 50;

/** Each weight-journey milestone (every 5 lb / 2 kg toward the target). */
export const XP_WEIGHT_MILESTONE = 100;
/** Reaching the target weight itself. */
export const XP_WEIGHT_GOAL_REACHED = 250;

/** Each completed set in workout mode, up to XP_WORKOUT_SETS_PER_DAY a day. */
export const XP_PER_WORKOUT_SET = 5;
export const XP_WORKOUT_SETS_PER_DAY = 40;
/** Finishing a workout with at least one completed set. */
export const XP_WORKOUT_COMPLETE = 25;

export const XP_EVENT_REASONS = [
  "habit_log",
  "goal_met",
  "day_complete",
  "weigh_in",
  "weight_milestone",
  "workout_set",
  "workout_complete",
] as const;

export type XpEventReason = (typeof XP_EVENT_REASONS)[number];

/** Uniqueness sentinel in goal_bonus_awarded for the all-goals day bonus. */
export const DAY_COMPLETE_BONUS_KEY = "__day_complete__";
