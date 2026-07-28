import type { SQLiteDatabase } from "expo-sqlite";

import {
  getDailyGoals,
  setDailyGoals,
  type WaterUnit,
  type WeightUnit,
} from "../daily-goals";
import { getDayBoundary, setDayBoundary } from "../day-boundary";
import { convertWaterAmount, convertWeightValue } from "../habit-log/units";
import { nowIso } from "../ids";
import { enqueueOp } from "../pending-ops";
import { getXpState } from "../xp";
import { PREFS_LIMITS } from "./limits";
import {
  DEFAULT_THEME_ID,
  getThemeDefinition,
  isAppThemeId,
  type AppThemeId,
} from "./theme-catalog";
import {
  DEFAULT_APP_PREFS,
  UNIT_SYSTEMS,
  type AppPrefs,
  type AppPrefsUpdate,
  type UnitSystem,
} from "./types";

type PrefsRow = {
  unitSystem: string;
  selectedThemeId: string;
  unlockedThemeIdsJson: string;
  notifAccountability: number;
  notifNews: number;
  updatedAt: string;
};

function assertUnitSystem(value: string): UnitSystem {
  if (!(UNIT_SYSTEMS as readonly string[]).includes(value)) {
    throw new Error(`unitSystem must be one of ${UNIT_SYSTEMS.join(", ")}`);
  }
  return value as UnitSystem;
}

function assertThemeId(value: string): AppThemeId {
  if (!isAppThemeId(value)) {
    throw new Error(`selectedThemeId is not a known theme: "${value}"`);
  }
  return value;
}

function parseUnlockedThemeIds(json: string): AppThemeId[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [DEFAULT_THEME_ID];
  }
  if (!Array.isArray(parsed)) {
    return [DEFAULT_THEME_ID];
  }
  const ids: AppThemeId[] = [];
  for (const item of parsed) {
    if (typeof item === "string" && isAppThemeId(item) && !ids.includes(item)) {
      ids.push(item);
    }
  }
  if (!ids.includes(DEFAULT_THEME_ID)) {
    ids.unshift(DEFAULT_THEME_ID);
  }
  return ids.slice(0, PREFS_LIMITS.unlockedThemeIdsMax);
}

function assertUnlockedThemeIds(
  ids: readonly AppThemeId[],
): AppThemeId[] {
  if (ids.length > PREFS_LIMITS.unlockedThemeIdsMax) {
    throw new Error(
      `unlockedThemeIds must have at most ${PREFS_LIMITS.unlockedThemeIdsMax} entries`,
    );
  }
  const out: AppThemeId[] = [];
  for (const id of ids) {
    assertThemeId(id);
    if (!out.includes(id)) {
      out.push(id);
    }
  }
  if (!out.includes(DEFAULT_THEME_ID)) {
    out.unshift(DEFAULT_THEME_ID);
  }
  return out;
}

function unitsForSystem(system: UnitSystem): {
  waterUnit: WaterUnit;
  weightUnit: WeightUnit;
} {
  if (system === "metric") {
    return { waterUnit: "ml", weightUnit: "kg" };
  }
  return { waterUnit: "oz", weightUnit: "lb" };
}

function prefsEqual(a: AppPrefs, b: AppPrefs): boolean {
  return (
    a.unitSystem === b.unitSystem &&
    a.selectedThemeId === b.selectedThemeId &&
    a.notifAccountability === b.notifAccountability &&
    a.notifNews === b.notifNews &&
    a.dayStartsAtMinutes === b.dayStartsAtMinutes &&
    a.timeZone === b.timeZone &&
    a.unlockedThemeIds.length === b.unlockedThemeIds.length &&
    a.unlockedThemeIds.every((id, i) => id === b.unlockedThemeIds[i])
  );
}

function prefsPayload(prefs: AppPrefs): Record<string, unknown> {
  return {
    unitSystem: prefs.unitSystem,
    selectedThemeId: prefs.selectedThemeId,
    unlockedThemeIds: [...prefs.unlockedThemeIds],
    notifAccountability: prefs.notifAccountability,
    notifNews: prefs.notifNews,
    dayStartsAtMinutes: prefs.dayStartsAtMinutes,
    timeZone: prefs.timeZone,
    updatedAt: prefs.updatedAt,
  };
}

async function seedPrefsIfNeeded(db: SQLiteDatabase): Promise<PrefsRow> {
  const updatedAt = nowIso();
  await db.runAsync(
    `INSERT OR IGNORE INTO app_prefs (
      id, unitSystem, selectedThemeId, unlockedThemeIdsJson,
      notifAccountability, notifNews, updatedAt
    ) VALUES (1, ?, ?, ?, ?, ?, ?)`,
    DEFAULT_APP_PREFS.unitSystem,
    DEFAULT_APP_PREFS.selectedThemeId,
    JSON.stringify(DEFAULT_APP_PREFS.unlockedThemeIds),
    DEFAULT_APP_PREFS.notifAccountability ? 1 : 0,
    DEFAULT_APP_PREFS.notifNews ? 1 : 0,
    updatedAt,
  );

  const row = await db.getFirstAsync<PrefsRow>(
    `SELECT unitSystem, selectedThemeId, unlockedThemeIdsJson,
            notifAccountability, notifNews, updatedAt
     FROM app_prefs WHERE id = 1`,
  );
  if (row == null) {
    throw new Error("app_prefs singleton missing after seed");
  }
  return row;
}

async function readPrefsRow(db: SQLiteDatabase): Promise<PrefsRow> {
  const row = await db.getFirstAsync<PrefsRow>(
    `SELECT unitSystem, selectedThemeId, unlockedThemeIdsJson,
            notifAccountability, notifNews, updatedAt
     FROM app_prefs WHERE id = 1`,
  );
  if (row != null) {
    return row;
  }
  return seedPrefsIfNeeded(db);
}

/**
 * Load consolidated prefs (app_prefs + day boundary).
 * Theme entitlement is local UX only — cheatable until server authority.
 */
export async function getPrefs(db: SQLiteDatabase): Promise<AppPrefs> {
  const [row, boundary] = await Promise.all([
    readPrefsRow(db),
    getDayBoundary(db),
  ]);

  const unlockedThemeIds = parseUnlockedThemeIds(row.unlockedThemeIdsJson);
  let selectedThemeId = assertThemeId(row.selectedThemeId);
  if (!unlockedThemeIds.includes(selectedThemeId)) {
    selectedThemeId = DEFAULT_THEME_ID;
  }

  return {
    unitSystem: assertUnitSystem(row.unitSystem),
    selectedThemeId,
    unlockedThemeIds,
    notifAccountability: row.notifAccountability === 1,
    notifNews: row.notifNews === 1,
    dayStartsAtMinutes: boundary.dayStartsAtMinutes,
    timeZone: boundary.timeZone,
    updatedAt: row.updatedAt,
  };
}

/**
 * Partial prefs update. Owns the consolidated `prefs` fact (includes day
 * boundary fields). Calls `setDayBoundary(..., { skipEnqueue: true })` so we
 * do not double-enqueue.
 *
 * On unitSystem change, also syncs daily_goals water/weight units (converting
 * amounts once) so Actions targets stay consistent.
 */
export async function setPrefs(
  db: SQLiteDatabase,
  update: AppPrefsUpdate,
): Promise<AppPrefs> {
  const current = await getPrefs(db);

  const unitSystem =
    update.unitSystem === undefined
      ? current.unitSystem
      : assertUnitSystem(update.unitSystem);

  const unlockedThemeIds =
    update.unlockedThemeIds === undefined
      ? [...current.unlockedThemeIds]
      : assertUnlockedThemeIds(update.unlockedThemeIds);

  let selectedThemeId =
    update.selectedThemeId === undefined
      ? current.selectedThemeId
      : assertThemeId(update.selectedThemeId);

  if (!unlockedThemeIds.includes(selectedThemeId)) {
    throw new Error(
      `selectedThemeId "${selectedThemeId}" is not unlocked (owned-only)`,
    );
  }

  const notifAccountability =
    update.notifAccountability ?? current.notifAccountability;
  const notifNews = update.notifNews ?? current.notifNews;

  const dayStartsAtMinutes =
    update.dayStartsAtMinutes ?? current.dayStartsAtMinutes;
  const timeZone = update.timeZone ?? current.timeZone;

  const candidate: AppPrefs = {
    unitSystem,
    selectedThemeId,
    unlockedThemeIds,
    notifAccountability,
    notifNews,
    dayStartsAtMinutes,
    timeZone,
    updatedAt: current.updatedAt,
  };

  if (prefsEqual(candidate, current)) {
    return current;
  }

  const updatedAt = nowIso();

  await db.runAsync(
    `UPDATE app_prefs SET
      unitSystem = ?, selectedThemeId = ?, unlockedThemeIdsJson = ?,
      notifAccountability = ?, notifNews = ?, updatedAt = ?
     WHERE id = 1`,
    unitSystem,
    selectedThemeId,
    JSON.stringify(unlockedThemeIds),
    notifAccountability ? 1 : 0,
    notifNews ? 1 : 0,
    updatedAt,
  );

  const boundary = await setDayBoundary(
    db,
    { dayStartsAtMinutes, timeZone },
    { skipEnqueue: true },
  );

  if (unitSystem !== current.unitSystem) {
    const { waterUnit, weightUnit } = unitsForSystem(unitSystem);
    const goals = await getDailyGoals(db);
    const waterAmount = Math.round(
      convertWaterAmount(goals.waterAmount, goals.waterUnit, waterUnit) * 10,
    ) / 10;
    const weightGoal = Math.round(
      convertWeightValue(goals.weightGoal, goals.weightUnit, weightUnit) * 10,
    ) / 10;
    await setDailyGoals(db, {
      waterUnit,
      waterAmount,
      weightUnit,
      weightGoal,
    });
  }

  const next: AppPrefs = {
    unitSystem,
    selectedThemeId,
    unlockedThemeIds,
    notifAccountability,
    notifNews,
    dayStartsAtMinutes: boundary.dayStartsAtMinutes,
    timeZone: boundary.timeZone,
    updatedAt,
  };

  await enqueueOp(db, "prefs", prefsPayload(next), {
    clientClockAt: updatedAt,
  });

  return next;
}

/**
 * Unlock a theme if the local XP level meets the catalog gate, and select it.
 * SECURITY: honor-system / cheatable — server must re-validate entitlement.
 */
export async function unlockTheme(
  db: SQLiteDatabase,
  themeId: string,
): Promise<AppPrefs> {
  const id = assertThemeId(themeId);
  const def = getThemeDefinition(id);
  if (def == null) {
    throw new Error(`Unknown theme: ${themeId}`);
  }

  const current = await getPrefs(db);
  if (current.unlockedThemeIds.includes(id)) {
    if (current.selectedThemeId === id) {
      return current;
    }
    return setPrefs(db, { selectedThemeId: id });
  }

  const xp = await getXpState(db);
  if (xp.level < def.unlockLevel) {
    throw new Error(
      `Theme "${id}" requires level ${def.unlockLevel} (have ${xp.level})`,
    );
  }

  return setPrefs(db, {
    unlockedThemeIds: [...current.unlockedThemeIds, id],
    selectedThemeId: id,
  });
}
