import type { SQLiteDatabase } from "expo-sqlite";

import type { WeightUnit } from "../daily-goals/types";
import { convertWeightValue } from "../habit-log/units";
import type { HabitLogSource } from "../habit-log/types";
import { newLocalRecord, nowIso } from "../ids";
import { ensureWeightJourneySchema } from "../migrations";
import { enqueueOp } from "../pending-ops/enqueue";
import { applyXpAward } from "../xp/store";
import type { XpEvent } from "../xp/types";
import type { XpEventReason } from "../xp/amounts";

/**
 * Long-term weight settings (singleton). Local only: weight is a journey,
 * not a daily goal, so none of this syncs as goals.
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
  return next;
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

type WeightXpAwardPayload = {
  awardKey: string;
  reason: Extract<XpEventReason, "weigh_in" | "weight_milestone">;
  amount: number;
  dayKey: string;
};

/**
 * Award weigh-in / milestone XP at most once per `awardKey`. Returns null when
 * the key was already claimed. enqueueUnsyncedWeightXpAwards sends it later.
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

/**
 * Queue every weight award not yet sent as an xp_award op, keyed by its XP
 * event id. Weight XP can't be worked out on the server (the journey settings
 * stay on this device), so claim_my_weight_xp() records and bounds it there.
 *
 * Call only once the server is known to score weight XP (GET /v1/me/xp
 * answered): an older server acks xp_award as ignored, which would mark the
 * award sent and lose it. Returns how many were queued.
 */
export async function enqueueUnsyncedWeightXpAwards(
  db: SQLiteDatabase,
): Promise<number> {
  await ensureWeightJourneySchema(db);
  const rows = await db.getAllAsync<{
    awardKey: string;
    xpEventId: string;
    amount: number;
    reason: string;
    dayKey: string | null;
  }>(
    `SELECT w.awardKey, w.xpEventId, e.amount, e.reason, e.dayKey
     FROM weight_xp_awards w
     JOIN xp_events e ON e.id = w.xpEventId
     WHERE e.reason IN ('weigh_in', 'weight_milestone')
       AND e.dayKey IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pending_server_ops o WHERE o.id = w.xpEventId)`,
  );
  for (const row of rows) {
    const payload: WeightXpAwardPayload = {
      awardKey: row.awardKey,
      reason: row.reason as WeightXpAwardPayload["reason"],
      amount: row.amount,
      dayKey: row.dayKey as string,
    };
    await enqueueOp(db, "xp_award", payload, { id: row.xpEventId });
  }
  return rows.length;
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
