import type { SQLiteDatabase } from "expo-sqlite";

import { DEFAULT_DAILY_GOALS } from "./daily-goals/types";
import { getDeviceTimeZone } from "./day-boundary/day-key";
import { DEFAULT_DAY_STARTS_AT_MINUTES } from "./day-boundary/types";
import { nowIso } from "./ids";
import { DEFAULT_THEME_ID } from "./prefs/theme-catalog";
import { DEFAULT_APP_PREFS } from "./prefs/types";

/**
 * Clear local user data after sign-out. Re-seeds singletons; does not drop the file.
 */
export async function wipeLocalUserData(db: SQLiteDatabase): Promise<void> {
  const seededAt = nowIso();
  await db.execAsync(`
    DELETE FROM habit_logs;
    DELETE FROM pending_server_ops;
    DELETE FROM daily_summary;
    DELETE FROM xp_events;
    DELETE FROM goal_bonus_awarded;
    DELETE FROM saved_meals;
  `);

  await db.runAsync(
    `UPDATE xp_state SET lifetimeXp = 0, level = 0, updatedAt = ? WHERE id = 1`,
    seededAt,
  );
  await db.runAsync(
    `UPDATE daily_goals SET
      foodKcal = ?, waterAmount = ?, waterUnit = ?, trainMinutes = ?,
      sleepHours = ?, steps = ?, activeKcal = ?, weightGoal = ?,
      weightUnit = ?, updatedAt = ?
     WHERE id = 1`,
    DEFAULT_DAILY_GOALS.foodKcal,
    DEFAULT_DAILY_GOALS.waterAmount,
    DEFAULT_DAILY_GOALS.waterUnit,
    DEFAULT_DAILY_GOALS.trainMinutes,
    DEFAULT_DAILY_GOALS.sleepHours,
    DEFAULT_DAILY_GOALS.steps,
    DEFAULT_DAILY_GOALS.activeKcal,
    DEFAULT_DAILY_GOALS.weightGoal,
    DEFAULT_DAILY_GOALS.weightUnit,
    seededAt,
  );
  await db.runAsync(
    `UPDATE app_day_boundary
     SET dayStartsAtMinutes = ?, timeZone = ?, updatedAt = ?
     WHERE id = 1`,
    DEFAULT_DAY_STARTS_AT_MINUTES,
    getDeviceTimeZone(),
    seededAt,
  );
  await db.runAsync(
    `UPDATE app_prefs SET
      unitSystem = ?, selectedThemeId = ?, unlockedThemeIdsJson = ?,
      notifAccountability = 0, notifNews = 0, updatedAt = ?
     WHERE id = 1`,
    DEFAULT_APP_PREFS.unitSystem,
    DEFAULT_THEME_ID,
    JSON.stringify([DEFAULT_THEME_ID]),
    seededAt,
  );
  await db.runAsync(
    `UPDATE app_profile SET
      displayName = '', bio = '', homeGymId = NULL, homeGymName = NULL,
      profileVisible = 0, instagram = NULL, tiktok = NULL, youtube = NULL,
      updatedAt = ?
     WHERE id = 1`,
    seededAt,
  );
}
