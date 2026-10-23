import type { SQLiteDatabase } from "expo-sqlite";

import {
  completeLoadout,
  genderOfLoadout,
} from "@/features/pixel/default-loadout";
import { getPixelItem } from "@/features/pixel/layer-assets";
import {
  loadPixelPersistedState,
  PIXEL_INVENTORY_GRANT_VERSION,
  savePixelPersistedState,
} from "@/features/pixel/pixel-persistence";
import { PIXEL_LAYER_Z_INDEX, type PixelLayerId } from "@/features/pixel/types";
import {
  fetchHabitLogsPage,
  fetchRestoreSnapshot,
  type RestoreHabitLog,
  type RestoreSnapshot,
} from "@/lib/api/restore";
import {
  APP_THEME_CATALOG,
  claimGoalBonusSlot,
  DAILY_SUMMARY_GOAL_KEYS,
  DAY_COMPLETE_BONUS_KEY,
  DEFAULT_THEME_ID,
  getAppDayKey,
  getDailyGoals,
  getDailySummary,
  getDayBoundary,
  HABIT_LOG_SOURCES,
  HABIT_LOG_TYPES,
  nowIso,
  XP_PER_HABIT_LOG,
} from "@/lib/db";
import { getPixelLevel } from "@/lib/xp-progress";

/**
 * Server → device restore. Server rows are already-synced facts, so nothing
 * here enqueues ops or awards local XP. Local edits still waiting in the
 * outbox win over the server copy (they are about to upload).
 */

const HABIT_PAGE_SIZE = 500;

/** goal_bonus_awarded.xpEventId for bonuses the server already counted. */
const RESTORED_BONUS_EVENT_ID = "restored";

export type RestoreProgress = {
  restoredLogs: number;
  totalLogs: number;
};

export type RestoreResult = {
  restoredLogs: number;
};

type RestoreStateRow = {
  habitCursor: string | null;
  completedAt: string | null;
};

const HABIT_TYPES = new Set<string>(HABIT_LOG_TYPES);
const HABIT_SOURCES = new Set<string>(HABIT_LOG_SOURCES);
const LAYER_IDS = Object.keys(PIXEL_LAYER_Z_INDEX) as PixelLayerId[];

async function getRestoreState(
  db: SQLiteDatabase,
  userId: string,
): Promise<RestoreStateRow | null> {
  return db.getFirstAsync<RestoreStateRow>(
    `SELECT habitCursor, completedAt FROM restore_state WHERE userId = ?`,
    userId,
  );
}

async function saveRestoreState(
  db: SQLiteDatabase,
  userId: string,
  fields: { habitCursor: string | null; completedAt: string | null },
): Promise<void> {
  await db.runAsync(
    `INSERT INTO restore_state (userId, habitCursor, completedAt, updatedAt)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(userId) DO UPDATE SET
       habitCursor = excluded.habitCursor,
       completedAt = excluded.completedAt,
       updatedAt = excluded.updatedAt`,
    userId,
    fields.habitCursor,
    fields.completedAt,
    nowIso(),
  );
}

/**
 * True when this account still needs a restore on this device. Installs that
 * already have habit logs predate restore (the device is the source), so they
 * are marked done instead of being overwritten.
 */
export async function needsRestore(
  db: SQLiteDatabase,
  userId: string,
): Promise<boolean> {
  const state = await getRestoreState(db, userId);
  if (state?.completedAt) return false;
  if (state == null) {
    const row = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM habit_logs`,
    );
    if ((row?.n ?? 0) > 0) {
      await saveRestoreState(db, userId, {
        habitCursor: null,
        completedAt: nowIso(),
      });
      return false;
    }
  }
  return true;
}

async function hasPendingOp(
  db: SQLiteDatabase,
  type: string,
  entityId?: string,
): Promise<boolean> {
  const row = entityId
    ? await db.getFirstAsync<{ ok: number }>(
        `SELECT 1 AS ok FROM pending_server_ops
         WHERE type = ? AND status IN ('pending', 'failed')
           AND json_extract(payload_json, '$.id') = ?
         LIMIT 1`,
        type,
        entityId,
      )
    : await db.getFirstAsync<{ ok: number }>(
        `SELECT 1 AS ok FROM pending_server_ops
         WHERE type = ? AND status IN ('pending', 'failed')
         LIMIT 1`,
        type,
      );
  return row != null;
}

async function applySnapshotRows(
  db: SQLiteDatabase,
  snapshot: RestoreSnapshot,
): Promise<void> {
  const goals = snapshot.dailyGoals;
  if (goals && !(await hasPendingOp(db, "daily_goals"))) {
    await db.runAsync(
      `UPDATE daily_goals SET
        foodKcal = ?, waterAmount = ?, waterUnit = ?, trainMinutes = ?,
        sleepHours = ?, steps = ?, activeKcal = ?, weightGoal = ?,
        weightUnit = ?, updatedAt = ?
       WHERE id = 1`,
      goals.foodKcal,
      goals.waterAmount,
      goals.waterUnit,
      goals.trainMinutes,
      goals.sleepHours,
      goals.steps,
      goals.activeKcal,
      goals.weightGoal,
      goals.weightUnit,
      goals.updatedAt,
    );
  }

  // Day boundary edits enqueue as "prefs" too, so one check covers both rows.
  // The time zone stays the device's: the server keeps its 'UTC' seed until
  // the user edits prefs, and this device's clock is what buckets new logs.
  const prefs = snapshot.prefs;
  if (prefs && !(await hasPendingOp(db, "prefs"))) {
    await db.runAsync(
      `UPDATE app_prefs SET
        unitSystem = ?, selectedThemeId = ?, notifAccountability = ?,
        notifNews = ?, updatedAt = ?
       WHERE id = 1`,
      prefs.unitSystem,
      prefs.selectedThemeId,
      prefs.notifAccountability ? 1 : 0,
      prefs.notifNews ? 1 : 0,
      prefs.updatedAt,
    );
    await db.runAsync(
      `UPDATE app_day_boundary
       SET dayStartsAtMinutes = ?, updatedAt = ?
       WHERE id = 1`,
      prefs.dayStartsAtMinutes,
      prefs.updatedAt,
    );
  }

  const profile = snapshot.profile;
  if (profile && !(await hasPendingOp(db, "profile"))) {
    await db.runAsync(
      `UPDATE app_profile SET
        displayName = ?, bio = ?, homeGymId = ?, homeGymName = ?,
        profileVisible = ?, instagram = ?, tiktok = ?, youtube = ?,
        updatedAt = ?
       WHERE id = 1`,
      profile.displayName,
      profile.bio,
      profile.homeGymId,
      profile.homeGymName,
      profile.profileVisible ? 1 : 0,
      profile.instagram,
      profile.tiktok,
      profile.youtube,
      profile.updatedAt,
    );
  }

  for (const meal of snapshot.savedMeals) {
    if (await hasPendingOp(db, "saved_meal", meal.id)) continue;
    await db.runAsync(
      `INSERT INTO saved_meals (
        id, name, vendor, portionSize, kcal, proteinG, carbsG, fatG,
        mealType, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, vendor = excluded.vendor,
        portionSize = excluded.portionSize, kcal = excluded.kcal,
        proteinG = excluded.proteinG, carbsG = excluded.carbsG,
        fatG = excluded.fatG, mealType = excluded.mealType,
        createdAt = excluded.createdAt, updatedAt = excluded.updatedAt`,
      meal.id,
      meal.name,
      meal.vendor,
      meal.portionSize,
      meal.kcal,
      meal.proteinG,
      meal.carbsG,
      meal.fatG,
      meal.mealType,
      meal.createdAt,
      meal.updatedAt,
    );
  }
}

/**
 * Insert server habit logs; ids are shared with the device, so re-runs are
 * no-ops. Day keys are re-derived with this device's boundary (the server's
 * may be UTC-based), matching what insertHabitLog would have stored.
 */
async function insertHabitLogs(
  db: SQLiteDatabase,
  logs: RestoreHabitLog[],
): Promise<number> {
  const boundary = await getDayBoundary(db);
  let inserted = 0;
  for (const log of logs) {
    // Skip anything the local CHECK constraints would reject mid-transaction.
    if (!HABIT_TYPES.has(log.type) || !HABIT_SOURCES.has(log.source)) continue;
    const result = await db.runAsync(
      `INSERT OR IGNORE INTO habit_logs (
        id, type, timestamp, createdAt, source, notes, dayKey, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      log.id,
      log.type,
      log.timestamp,
      log.createdAt,
      log.source,
      log.notes,
      getAppDayKey(new Date(log.timestamp), boundary),
      JSON.stringify(log.payload ?? {}),
    );
    inserted += result.changes;
  }
  return inserted;
}

/**
 * Server XP already includes goal bonuses for restored days; claim those
 * slots so logging more on a restored day does not pay them out again.
 */
async function claimRestoredGoalBonuses(db: SQLiteDatabase): Promise<void> {
  const goals = await getDailyGoals(db);
  const options = { waterUnit: goals.waterUnit, weightUnit: goals.weightUnit };
  const days = await db.getAllAsync<{ dayKey: string }>(
    `SELECT DISTINCT dayKey FROM habit_logs`,
  );
  for (const { dayKey } of days) {
    const summary = await getDailySummary(db, dayKey, options, goals);
    for (const goalKey of summary.goalsMet) {
      await claimGoalBonusSlot(db, dayKey, goalKey, RESTORED_BONUS_EVENT_ID);
    }
    if (summary.goalsMet.length === DAILY_SUMMARY_GOAL_KEYS.length) {
      await claimGoalBonusSlot(
        db,
        dayKey,
        DAY_COMPLETE_BONUS_KEY,
        RESTORED_BONUS_EVENT_ID,
      );
    }
  }
}

/** Server XP is truth; add base XP for local logs that have not uploaded yet. */
async function applyServerXp(
  db: SQLiteDatabase,
  snapshot: RestoreSnapshot,
): Promise<number | null> {
  if (!snapshot.xp) return null;
  const pending = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM pending_server_ops
     WHERE type = 'habit_log' AND status IN ('pending', 'failed')`,
  );
  const lifetimeXp =
    snapshot.xp.lifetimeXp + (pending?.n ?? 0) * XP_PER_HABIT_LOG;
  const level = getPixelLevel(lifetimeXp);
  await db.runAsync(
    `UPDATE xp_state SET lifetimeXp = ?, level = ?, updatedAt = ? WHERE id = 1`,
    lifetimeXp,
    level,
    nowIso(),
  );
  return level;
}

/** Keep unlocked themes, and make sure the restored selection is usable. */
async function reconcileThemes(
  db: SQLiteDatabase,
  level: number,
): Promise<void> {
  const row = await db.getFirstAsync<{
    selectedThemeId: string;
    unlockedThemeIdsJson: string;
  }>(`SELECT selectedThemeId, unlockedThemeIdsJson FROM app_prefs WHERE id = 1`);
  if (!row) return;

  let unlocked: string[] = [];
  try {
    const parsed: unknown = JSON.parse(row.unlockedThemeIdsJson);
    if (Array.isArray(parsed)) {
      unlocked = parsed.filter((id): id is string => typeof id === "string");
    }
  } catch {
    unlocked = [];
  }

  const selected = APP_THEME_CATALOG.find((t) => t.id === row.selectedThemeId);
  const selectedEligible = selected != null && selected.unlockLevel <= level;
  const nextUnlocked = Array.from(
    new Set([
      DEFAULT_THEME_ID,
      ...unlocked,
      ...(selectedEligible ? [row.selectedThemeId] : []),
    ]),
  );
  const nextSelected = nextUnlocked.includes(row.selectedThemeId)
    ? row.selectedThemeId
    : DEFAULT_THEME_ID;

  await db.runAsync(
    `UPDATE app_prefs SET selectedThemeId = ?, unlockedThemeIdsJson = ? WHERE id = 1`,
    nextSelected,
    JSON.stringify(nextUnlocked),
  );
}

/** Equip the server loadout; equipped items join the device inventory. */
async function applyServerLoadout(
  db: SQLiteDatabase,
  snapshot: RestoreSnapshot,
): Promise<void> {
  if (!snapshot.loadout || (await hasPendingOp(db, "loadout"))) return;

  const state = await loadPixelPersistedState();
  const loadout = { ...state.loadout };
  const inventory = new Set(state.inventory);
  for (const layerId of LAYER_IDS) {
    const itemId = snapshot.loadout.equipped[layerId];
    if (!itemId) continue;
    if (getPixelItem(itemId)?.layer !== layerId) continue;
    loadout[layerId] = itemId;
    inventory.add(itemId);
  }

  // A look on the current art says which body it wears: no gender prompt.
  const gender = genderOfLoadout(loadout) ?? state.gender;
  await savePixelPersistedState({
    loadout: completeLoadout(loadout),
    inventory: [...inventory],
    inventoryGrantVersion: PIXEL_INVENTORY_GRANT_VERSION,
    gender,
  });
}

/**
 * Pull the account's server data onto this device. Resumes from the saved
 * habit cursor; `fromScratch` re-walks every page (manual "Restore from cloud").
 */
export async function restoreFromServer(
  db: SQLiteDatabase,
  options: {
    accessToken: string;
    userId: string;
    fromScratch?: boolean;
    onProgress?: (progress: RestoreProgress) => void;
  },
): Promise<RestoreResult> {
  const { accessToken, userId, onProgress } = options;
  const state = options.fromScratch ? null : await getRestoreState(db, userId);
  let cursor = state?.habitCursor ?? null;
  // Record the attempt first: if it fails and the user logs offline, the next
  // launch still sees an unfinished restore instead of "device has data".
  await saveRestoreState(db, userId, { habitCursor: cursor, completedAt: null });

  const snapshot = await fetchRestoreSnapshot(accessToken);
  let restoredLogs = 0;

  await db.withTransactionAsync(async () => {
    await applySnapshotRows(db, snapshot);
  });

  const totalLogs = snapshot.habitLogCount;
  onProgress?.({ restoredLogs, totalLogs });

  for (;;) {
    const page = await fetchHabitLogsPage(accessToken, {
      after: cursor,
      limit: HABIT_PAGE_SIZE,
    });
    const nextCursor = page.nextCursor;
    await db.withTransactionAsync(async () => {
      restoredLogs += await insertHabitLogs(db, page.logs);
      await saveRestoreState(db, userId, {
        habitCursor: nextCursor ?? cursor,
        completedAt: null,
      });
    });
    onProgress?.({ restoredLogs, totalLogs });
    if (!nextCursor) break;
    cursor = nextCursor;
  }

  // File-backed, outside SQLite; the provider reloads it on the next data epoch.
  await applyServerLoadout(db, snapshot);

  await db.withTransactionAsync(async () => {
    // Derived cache; summaries rebuild lazily from the restored logs.
    await db.runAsync(`DELETE FROM daily_summary`);
    await claimRestoredGoalBonuses(db);
    const level = await applyServerXp(db, snapshot);
    const xpRow = await db.getFirstAsync<{ level: number }>(
      `SELECT level FROM xp_state WHERE id = 1`,
    );
    await reconcileThemes(db, level ?? xpRow?.level ?? 0);
    await saveRestoreState(db, userId, {
      habitCursor: null,
      completedAt: nowIso(),
    });
  });

  return { restoredLogs };
}
