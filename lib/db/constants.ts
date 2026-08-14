/** On-device SQLite file name (documents directory). */
export const DATABASE_NAME = "fit-pixel.db";

/**
 * Bump when adding migrations in `migrateDbIfNeeded`.
 * v1 pragmas; v2 pending_server_ops; v3 app_day_boundary; v4 daily_goals;
 * v5 habit_logs; v6 daily_summary cache; v7 xp_state / xp_events / goal_bonus_awarded;
 * v8 saved_meals favorites; v9 app_prefs / app_profile; v10 rejected outbox + hidden profile default.
 */
export const DATABASE_VERSION = 10;
