/** On-device SQLite file name (documents directory). */
export const DATABASE_NAME = "fit-pixel.db";

/**
 * Bump when adding migrations in `migrateDbIfNeeded`.
 * v1 pragmas; v2 pending_server_ops; v3 app_day_boundary; v4 daily_goals.
 */
export const DATABASE_VERSION = 4;
