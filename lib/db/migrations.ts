import type { SQLiteDatabase } from "expo-sqlite";

import { DATABASE_VERSION } from "./constants";
import { DEFAULT_DAILY_GOALS } from "./daily-goals/types";
import { getDeviceTimeZone } from "./day-boundary/day-key";
import { DEFAULT_DAY_STARTS_AT_MINUTES } from "./day-boundary/types";
import { nowIso } from "./ids";

/**
 * Versioned schema upgrades via `PRAGMA user_version`.
 * Domain tables (habit logs, XP) land in later phases.
 */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  let currentVersion = row?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
    `);
    currentVersion = 1;
  }

  if (currentVersion === 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pending_server_ops (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'synced', 'failed')),
        clientClockAt TEXT,
        schemaVersion INTEGER,
        trust TEXT NOT NULL CHECK (trust IN ('fact', 'untrusted_client'))
      );
      CREATE INDEX IF NOT EXISTS idx_pending_server_ops_status_created
        ON pending_server_ops (status, createdAt);
    `);
    currentVersion = 2;
  }

  if (currentVersion === 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS app_day_boundary (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        dayStartsAtMinutes INTEGER NOT NULL DEFAULT 0
          CHECK (dayStartsAtMinutes >= 0 AND dayStartsAtMinutes < 1440),
        timeZone TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
    await db.runAsync(
      `INSERT OR IGNORE INTO app_day_boundary (id, dayStartsAtMinutes, timeZone, updatedAt)
       VALUES (1, ?, ?, ?)`,
      DEFAULT_DAY_STARTS_AT_MINUTES,
      getDeviceTimeZone(),
      nowIso(),
    );
    currentVersion = 3;
  }

  if (currentVersion === 3) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS daily_goals (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        foodKcal REAL NOT NULL CHECK (foodKcal > 0),
        waterAmount REAL NOT NULL CHECK (waterAmount > 0),
        waterUnit TEXT NOT NULL CHECK (waterUnit IN ('oz', 'ml')),
        trainMinutes REAL NOT NULL CHECK (trainMinutes > 0),
        sleepHours REAL NOT NULL CHECK (sleepHours > 0),
        steps INTEGER NOT NULL CHECK (steps > 0),
        activeKcal REAL NOT NULL CHECK (activeKcal > 0),
        weightGoal REAL NOT NULL CHECK (weightGoal > 0),
        weightUnit TEXT NOT NULL CHECK (weightUnit IN ('lb', 'kg')),
        updatedAt TEXT NOT NULL
      );
    `);
    const seededAt = nowIso();
    await db.runAsync(
      `INSERT OR IGNORE INTO daily_goals (
        id, foodKcal, waterAmount, waterUnit, trainMinutes, sleepHours,
        steps, activeKcal, weightGoal, weightUnit, updatedAt
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    currentVersion = 4;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
