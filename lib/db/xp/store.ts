import type { SQLiteDatabase } from "expo-sqlite";

import { getPixelLevel } from "@/lib/xp-progress";

import { newLocalRecord, nowIso } from "../ids";
import { ensureXpSchema } from "../migrations";
import {
  XP_EVENT_REASONS,
  type XpEventReason,
} from "./amounts";
import type { AwardXpInput, XpEvent, XpState } from "./types";

type XpStateRow = {
  lifetimeXp: number;
  level: number;
  updatedAt: string;
};

type XpEventRow = {
  id: string;
  amount: number;
  reason: string;
  relatedEntityId: string | null;
  dayKey: string | null;
  createdAt: string;
};

function assertPositiveAmount(amount: number): number {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`XP amount must be a positive integer (got ${amount})`);
  }
  return amount;
}

function assertReason(reason: string): XpEventReason {
  if (!(XP_EVENT_REASONS as readonly string[]).includes(reason)) {
    throw new Error(`Unknown XP reason: ${reason}`);
  }
  return reason as XpEventReason;
}

async function seedXpStateIfNeeded(db: SQLiteDatabase): Promise<XpState> {
  await ensureXpSchema(db);
  const row = await db.getFirstAsync<XpStateRow>(
    `SELECT lifetimeXp, level, updatedAt FROM xp_state WHERE id = 1`,
  );
  if (row == null) {
    throw new Error("xp_state singleton missing after seed");
  }
  return {
    lifetimeXp: row.lifetimeXp,
    level: row.level,
    updatedAt: row.updatedAt,
  };
}

/** Load singleton XP state (creates schema + seeds 0/0 if needed). */
export async function getXpState(db: SQLiteDatabase): Promise<XpState> {
  try {
    const row = await db.getFirstAsync<XpStateRow>(
      `SELECT lifetimeXp, level, updatedAt FROM xp_state WHERE id = 1`,
    );
    if (row != null) {
      return {
        lifetimeXp: row.lifetimeXp,
        level: row.level,
        updatedAt: row.updatedAt,
      };
    }
  } catch {
    // Table may be missing if onInit migration was skipped (Fast Refresh).
  }
  return seedXpStateIfNeeded(db);
}

/**
 * Append xp_event + bump xp_state. Caller owns the transaction if needed.
 *
 * SECURITY: local-only UX prototype — cheatable; server must recompute from facts.
 * SECURITY: does not enqueueOp("xp_award"); habit_log facts remain sync truth.
 * SECURITY: does not touch inventory / unlocks (Phase 5 owns those checks).
 */
export async function applyXpAward(
  db: SQLiteDatabase,
  input: AwardXpInput,
): Promise<XpEvent> {
  const amount = assertPositiveAmount(input.amount);
  const reason = assertReason(input.reason);
  const record = input.id
    ? { id: input.id, createdAt: input.createdAt ?? nowIso() }
    : newLocalRecord();
  const relatedEntityId = input.relatedEntityId ?? null;
  const dayKey = input.dayKey ?? null;

  const event: XpEvent = {
    id: record.id,
    amount,
    reason,
    relatedEntityId,
    dayKey,
    createdAt: record.createdAt,
  };

  await ensureXpSchema(db);

  const current = await getXpState(db);
  const lifetimeXp = current.lifetimeXp + amount;
  const level = getPixelLevel(lifetimeXp);
  const updatedAt = nowIso();

  await db.runAsync(
    `INSERT INTO xp_events (id, amount, reason, relatedEntityId, dayKey, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    event.id,
    event.amount,
    event.reason,
    event.relatedEntityId,
    event.dayKey,
    event.createdAt,
  );

  await db.runAsync(
    `UPDATE xp_state
     SET lifetimeXp = ?, level = ?, updatedAt = ?
     WHERE id = 1`,
    lifetimeXp,
    level,
    updatedAt,
  );

  return event;
}

/**
 * Single entry point for local XP awards (transactional).
 */
export async function awardXp(
  db: SQLiteDatabase,
  input: AwardXpInput,
): Promise<XpEvent> {
  let event!: XpEvent;
  await db.withTransactionAsync(async () => {
    event = await applyXpAward(db, input);
  });
  return event;
}

/** Whether a goal / day-complete bonus was already granted for this dayKey. */
export async function hasGoalBonusBeenAwarded(
  db: SQLiteDatabase,
  dayKey: string,
  goalKey: string,
): Promise<boolean> {
  const row = await db.getFirstAsync<{ ok: number }>(
    `SELECT 1 AS ok FROM goal_bonus_awarded WHERE dayKey = ? AND goalKey = ?`,
    dayKey,
    goalKey,
  );
  return row != null;
}

/**
 * Claim a (dayKey, goalKey) bonus slot. Returns false if already claimed.
 * Call before applyXpAward so uniqueness gates the award.
 */
export async function claimGoalBonusSlot(
  db: SQLiteDatabase,
  dayKey: string,
  goalKey: string,
  xpEventId: string,
  createdAt: string = nowIso(),
): Promise<boolean> {
  const result = await db.runAsync(
    `INSERT OR IGNORE INTO goal_bonus_awarded (dayKey, goalKey, xpEventId, createdAt)
     VALUES (?, ?, ?, ?)`,
    dayKey,
    goalKey,
    xpEventId,
    createdAt,
  );
  return result.changes > 0;
}

/** Debug / tests: recent events, newest first. */
export async function listRecentXpEvents(
  db: SQLiteDatabase,
  limit: number = 50,
): Promise<XpEvent[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`limit must be a positive integer (got ${limit})`);
  }
  const rows = await db.getAllAsync<XpEventRow>(
    `SELECT id, amount, reason, relatedEntityId, dayKey, createdAt
     FROM xp_events
     ORDER BY createdAt DESC
     LIMIT ?`,
    limit,
  );
  return rows.map((row) => ({
    id: row.id,
    amount: row.amount,
    reason: assertReason(row.reason),
    relatedEntityId: row.relatedEntityId,
    dayKey: row.dayKey,
    createdAt: row.createdAt,
  }));
}
