import type { SQLiteDatabase } from "expo-sqlite";

import { DATABASE_VERSION } from "./constants";
import { DEFAULT_DAILY_GOALS } from "./daily-goals/types";
import { getDeviceTimeZone } from "./day-boundary/day-key";
import { DEFAULT_DAY_STARTS_AT_MINUTES } from "./day-boundary/types";
import { nowIso } from "./ids";

/**
 * Idempotent daily_summary cache (v6). Safe on every launch / read path.
 */
export async function ensureDailySummarySchema(
  db: SQLiteDatabase,
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS daily_summary (
      dayKey TEXT PRIMARY KEY NOT NULL,
      foodKcal REAL NOT NULL DEFAULT 0,
      waterAmount REAL NOT NULL DEFAULT 0,
      trainMinutes REAL NOT NULL DEFAULT 0,
      sleepHours REAL NOT NULL DEFAULT 0,
      steps INTEGER NOT NULL DEFAULT 0,
      activeKcal REAL NOT NULL DEFAULT 0,
      weight REAL,
      waterUnit TEXT NOT NULL CHECK (waterUnit IN ('oz', 'ml')),
      weightUnit TEXT NOT NULL CHECK (weightUnit IN ('lb', 'kg')),
      goalsMet_json TEXT NOT NULL DEFAULT '[]',
      updatedAt TEXT NOT NULL
    );
  `);
}

/**
 * Idempotent saved_meals schema (v8). Safe on every launch / read path.
 */
export async function ensureSavedMealsSchema(
  db: SQLiteDatabase,
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS saved_meals (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      vendor TEXT,
      portionSize TEXT,
      kcal REAL NOT NULL,
      proteinG REAL,
      carbsG REAL,
      fatG REAL,
      mealType TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_saved_meals_updated
      ON saved_meals (updatedAt DESC);
  `);
}

/**
 * Idempotent XP schema (v7). Safe to call on every launch — repairs Fast Refresh
 * / onInit-skip cases where user_version is ahead but tables were never created.
 */
export async function ensureXpSchema(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS xp_state (
      id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
      lifetimeXp INTEGER NOT NULL DEFAULT 0 CHECK (lifetimeXp >= 0),
      level INTEGER NOT NULL DEFAULT 0 CHECK (level >= 0),
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS xp_events (
      id TEXT PRIMARY KEY NOT NULL,
      amount INTEGER NOT NULL CHECK (amount > 0),
      reason TEXT NOT NULL CHECK (reason IN (
        'habit_log', 'goal_met', 'day_complete'
      )),
      relatedEntityId TEXT,
      dayKey TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_xp_events_created
      ON xp_events (createdAt);
    CREATE TABLE IF NOT EXISTS goal_bonus_awarded (
      dayKey TEXT NOT NULL,
      goalKey TEXT NOT NULL,
      xpEventId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      PRIMARY KEY (dayKey, goalKey)
    );
  `);
  await db.runAsync(
    `INSERT OR IGNORE INTO xp_state (id, lifetimeXp, level, updatedAt)
     VALUES (1, 0, 0, ?)`,
    nowIso(),
  );
}

/**
 * Idempotent prefs + profile schema (v9). Safe on every launch / read path.
 */
export async function ensurePrefsProfileSchema(
  db: SQLiteDatabase,
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_prefs (
      id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
      unitSystem TEXT NOT NULL CHECK (unitSystem IN ('metric', 'imperial')),
      selectedThemeId TEXT NOT NULL,
      unlockedThemeIdsJson TEXT NOT NULL,
      notifAccountability INTEGER NOT NULL DEFAULT 0
        CHECK (notifAccountability IN (0, 1)),
      notifNews INTEGER NOT NULL DEFAULT 0
        CHECK (notifNews IN (0, 1)),
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_profile (
      id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
      displayName TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      homeGymId TEXT,
      homeGymName TEXT,
      profileVisible INTEGER NOT NULL DEFAULT 1
        CHECK (profileVisible IN (0, 1)),
      instagram TEXT,
      tiktok TEXT,
      youtube TEXT,
      updatedAt TEXT NOT NULL
    );
  `);
  const seededAt = nowIso();
  await db.runAsync(
    `INSERT OR IGNORE INTO app_prefs (
      id, unitSystem, selectedThemeId, unlockedThemeIdsJson,
      notifAccountability, notifNews, updatedAt
    ) VALUES (1, 'imperial', 'blue', ?, 0, 0, ?)`,
    JSON.stringify(["blue"]),
    seededAt,
  );
  await db.runAsync(
    `INSERT OR IGNORE INTO app_profile (
      id, displayName, bio, homeGymId, homeGymName, profileVisible,
      instagram, tiktok, youtube, updatedAt
    ) VALUES (1, '', '', NULL, NULL, 1, NULL, NULL, NULL, ?)`,
    seededAt,
  );
}

/**
 * Versioned schema upgrades via `PRAGMA user_version`.
 * daily_summary is a derived cache only. XP is local UX until server authority.
 */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  let currentVersion = row?.user_version ?? 0;

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

  if (currentVersion === 4) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS habit_logs (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL CHECK (type IN (
          'water', 'food', 'train', 'sleep', 'weight', 'steps', 'active_kcal'
        )),
        timestamp TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('manual', 'healthkit', 'import')),
        notes TEXT,
        dayKey TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_habit_logs_day_type
        ON habit_logs (dayKey, type);
      CREATE INDEX IF NOT EXISTS idx_habit_logs_timestamp
        ON habit_logs (timestamp);
    `);
    currentVersion = 5;
  }

  if (currentVersion === 5) {
    await ensureDailySummarySchema(db);
    currentVersion = 6;
  }

  if (currentVersion === 6) {
    // Local XP prototype — cheatable; do not treat as sync truth.
    await ensureXpSchema(db);
    currentVersion = 7;
  }

  if (currentVersion === 7) {
    await ensureSavedMealsSchema(db);
    currentVersion = 8;
  }

  if (currentVersion === 8) {
    await ensurePrefsProfileSchema(db);
    currentVersion = 9;
  }

  // Always repair derived/XP/saved/prefs tables — Fast Refresh can skip onInit while
  // stamping user_version ahead of CREATE TABLE.
  await ensureDailySummarySchema(db);
  await ensureXpSchema(db);
  await ensureSavedMealsSchema(db);
  await ensurePrefsProfileSchema(db);

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
