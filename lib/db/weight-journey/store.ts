import type { SQLiteDatabase } from "expo-sqlite";

import type { WeightUnit } from "../daily-goals/types";
import { convertWeightValue } from "../habit-log/units";
import type { HabitLogSource } from "../habit-log/types";
import { newLocalRecord, nowIso } from "../ids";
import { ensureWeightJourneySchema } from "../migrations";
import { enqueueOp, recordRestoredOp } from "../pending-ops";
import { applyXpAward } from "../xp/store";
import type { XpEvent } from "../xp/types";
import type { XpEventReason } from "../xp/amounts";

/**
 * Long-term weight settings (singleton). Weight is a journey, not a daily
 * goal, so it syncs as its own `weight_journey` op (never as goals). The
 * reminder notification id and last Health sync stay on this device.
 */
export type WeightJourney = {
  /** Weight the current journey started from (in `startUnit`). */
  startWeight: number | null;
  startUnit: WeightUnit | null;
  startDayKey: string | null;
  /** 0 = Sunday … 6 = Saturday. Weeks for streaks start on this day. */
  weighInWeekday: number;
  reminderEnabled: boolean;
  reminderNotificationId: string | null;
  /** Show trends and milestones instead of weight numbers on overviews. */
  hideNumbers: boolean;
  lastHealthSyncAt: string | null;
  updatedAt: string;
};

export type WeightJourneyUpdate = Partial<Omit<WeightJourney, "updatedAt">>;

/** The fields that back up to the account (see `weight_journey` sync). */
type SyncedWeightJourney = Pick<
  WeightJourney,
  | "startWeight"
  | "startUnit"
  | "startDayKey"
  | "weighInWeekday"
  | "reminderEnabled"
  | "hideNumbers"
>;

function syncedFields(journey: WeightJourney): SyncedWeightJourney {
  return {
    startWeight: journey.startWeight,
    startUnit: journey.startUnit,
    startDayKey: journey.startDayKey,
    weighInWeekday: journey.weighInWeekday,
    reminderEnabled: journey.reminderEnabled,
    hideNumbers: journey.hideNumbers,
  };
}

function syncedFieldsChanged(a: WeightJourney, b: WeightJourney): boolean {
  const x = syncedFields(a);
  const y = syncedFields(b);
  return (Object.keys(x) as (keyof SyncedWeightJourney)[]).some(
    (key) => x[key] !== y[key],
  );
}

type WeightJourneyRow = {
  startWeight: number | null;
  startUnit: string | null;
  startDayKey: string | null;
  weighInWeekday: number;
  reminderEnabled: number;
  reminderNotificationId: string | null;
  hideNumbers: number;
  lastHealthSyncAt: string | null;
  updatedAt: string;
};

function rowToJourney(row: WeightJourneyRow): WeightJourney {
  return {
    startWeight: row.startWeight,
    startUnit:
      row.startUnit === "lb" || row.startUnit === "kg" ? row.startUnit : null,
    startDayKey: row.startDayKey,
    weighInWeekday: row.weighInWeekday,
    reminderEnabled: row.reminderEnabled === 1,
    reminderNotificationId: row.reminderNotificationId,
    hideNumbers: row.hideNumbers === 1,
    lastHealthSyncAt: row.lastHealthSyncAt,
    updatedAt: row.updatedAt,
  };
}

const SELECT_JOURNEY = `SELECT startWeight, startUnit, startDayKey, weighInWeekday,
  reminderEnabled, reminderNotificationId, hideNumbers, lastHealthSyncAt, updatedAt
  FROM weight_journey WHERE id = 1`;

export async function getWeightJourney(
  db: SQLiteDatabase,
): Promise<WeightJourney> {
  let row = await db
    .getFirstAsync<WeightJourneyRow>(SELECT_JOURNEY)
    .catch(() => null);
  if (row == null) {
    await ensureWeightJourneySchema(db);
    row = await db.getFirstAsync<WeightJourneyRow>(SELECT_JOURNEY);
  }
  if (row == null) throw new Error("weight_journey singleton missing");
  return rowToJourney(row);
}

export async function updateWeightJourney(
  db: SQLiteDatabase,
  update: WeightJourneyUpdate,
): Promise<WeightJourney> {
  const current = await getWeightJourney(db);
  const next: WeightJourney = { ...current, ...update, updatedAt: nowIso() };
  if (
    !Number.isInteger(next.weighInWeekday) ||
    next.weighInWeekday < 0 ||
    next.weighInWeekday > 6
  ) {
    throw new Error("weighInWeekday must be 0–6");
  }
  await db.runAsync(
    `UPDATE weight_journey SET startWeight = ?, startUnit = ?, startDayKey = ?,
      weighInWeekday = ?, reminderEnabled = ?, reminderNotificationId = ?,
      hideNumbers = ?, lastHealthSyncAt = ?, updatedAt = ?
     WHERE id = 1`,
    next.startWeight,
    next.startUnit,
    next.startDayKey,
    next.weighInWeekday,
    next.reminderEnabled ? 1 : 0,
    next.reminderNotificationId,
    next.hideNumbers ? 1 : 0,
    next.lastHealthSyncAt,
    next.updatedAt,
  );
  // Health sync stamps and reminder ids change often and stay local; only a
  // change the account should keep is uploaded.
  if (syncedFieldsChanged(current, next)) {
    await enqueueOp(
      db,
      "weight_journey",
      { ...syncedFields(next), updatedAt: next.updatedAt },
      { clientClockAt: next.updatedAt },
    );
  }
  return next;
}

/**
 * Queue the journey once if it has never been uploaded (set on a build before
 * weight journey sync). Returns true when an op was queued.
 */
export async function enqueueUnqueuedWeightJourney(
  db: SQLiteDatabase,
): Promise<boolean> {
  const journey = await getWeightJourney(db);
  if (journey.startWeight == null) return false;
  const any = await db.getFirstAsync<{ ok: number }>(
    `SELECT 1 AS ok FROM pending_server_ops WHERE type = 'weight_journey' LIMIT 1`,
  );
  if (any != null) return false;
  await enqueueOp(
    db,
    "weight_journey",
    { ...syncedFields(journey), updatedAt: journey.updatedAt },
    { clientClockAt: journey.updatedAt },
  );
  return true;
}

/**
 * Restore: take the account's journey settings as they are. Server rows are
 * already-synced facts, so nothing is enqueued.
 */
export async function applyRestoredWeightJourney(
  db: SQLiteDatabase,
  journey: SyncedWeightJourney & { updatedAt: string },
): Promise<void> {
  await getWeightJourney(db);
  const weekday =
    Number.isInteger(journey.weighInWeekday) &&
    journey.weighInWeekday >= 0 &&
    journey.weighInWeekday <= 6
      ? journey.weighInWeekday
      : 1;
  const hasStart = journey.startWeight != null && journey.startUnit != null;
  await db.runAsync(
    `UPDATE weight_journey SET startWeight = ?, startUnit = ?, startDayKey = ?,
      weighInWeekday = ?, reminderEnabled = ?, hideNumbers = ?, updatedAt = ?
     WHERE id = 1`,
    hasStart ? journey.startWeight : null,
    hasStart ? journey.startUnit : null,
    journey.startDayKey,
    weekday,
    journey.reminderEnabled ? 1 : 0,
    journey.hideNumbers ? 1 : 0,
    journey.updatedAt,
  );
  await recordRestoredOp(db, "weight_journey", `restored-journey:${journey.updatedAt}`, {
    updatedAt: journey.updatedAt,
  });
}

/**
 * Restore: mark weight awards the account already earned on another install
 * as paid, so the next weigh-in doesn't pay them again. Never awards XP.
 */
export async function markWeightAwardsRestored(
  db: SQLiteDatabase,
  awardKeys: readonly string[],
): Promise<void> {
  const createdAt = nowIso();
  for (const awardKey of awardKeys) {
    await db.runAsync(
      `INSERT OR IGNORE INTO weight_xp_awards (awardKey, xpEventId, createdAt)
       VALUES (?, 'restored', ?)`,
      awardKey,
      createdAt,
    );
  }
}

/** One weight reading, converted to the requested unit. */
export type WeightEntry = {
  id: string;
  dayKey: string;
  timestamp: string;
  value: number;
  source: HabitLogSource;
};

/** All weight logs, oldest first, converted to `unit`. */
export async function listWeightEntries(
  db: SQLiteDatabase,
  unit: WeightUnit,
): Promise<WeightEntry[]> {
  const rows = await db.getAllAsync<{
    id: string;
    dayKey: string;
    timestamp: string;
    source: string;
    payload_json: string;
  }>(
    `SELECT id, dayKey, timestamp, source, payload_json
     FROM habit_logs WHERE type = 'weight'
     ORDER BY timestamp ASC, createdAt ASC`,
  );
  const entries: WeightEntry[] = [];
  for (const row of rows) {
    let payload: unknown;
    try {
      payload = JSON.parse(row.payload_json);
    } catch {
      continue;
    }
    if (payload == null || typeof payload !== "object") continue;
    const { value, unit: from } = payload as { value?: unknown; unit?: unknown };
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    if (from !== "lb" && from !== "kg") continue;
    entries.push({
      id: row.id,
      dayKey: row.dayKey,
      timestamp: row.timestamp,
      value: convertWeightValue(value, from, unit),
      source: row.source as HabitLogSource,
    });
  }
  return entries;
}

/**
 * Award weigh-in / milestone XP at most once per `awardKey`.
 * Returns null when the key was already claimed.
 *
 * SECURITY: local XP prototype — cheatable, like the daily goal bonuses.
 */
export async function claimWeightXpAward(
  db: SQLiteDatabase,
  input: {
    awardKey: string;
    amount: number;
    reason: Extract<XpEventReason, "weigh_in" | "weight_milestone">;
    dayKey: string;
  },
): Promise<XpEvent | null> {
  const record = newLocalRecord();
  const result = await db.runAsync(
    `INSERT OR IGNORE INTO weight_xp_awards (awardKey, xpEventId, createdAt)
     VALUES (?, ?, ?)`,
    input.awardKey,
    record.id,
    record.createdAt,
  );
  if (result.changes === 0) return null;
  return applyXpAward(db, {
    id: record.id,
    createdAt: record.createdAt,
    amount: input.amount,
    reason: input.reason,
    relatedEntityId: input.awardKey,
    dayKey: input.dayKey,
  });
}

export async function hasWeightXpAward(
  db: SQLiteDatabase,
  awardKey: string,
): Promise<boolean> {
  const row = await db.getFirstAsync<{ awardKey: string }>(
    `SELECT awardKey FROM weight_xp_awards WHERE awardKey = ?`,
    awardKey,
  );
  return row != null;
}
