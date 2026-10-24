import type { SQLiteDatabase } from "expo-sqlite";

import type {
  TrainingPlan,
  WorkoutSession,
  WorkoutSummary,
} from "@/features/training/types";

import { ensureTrainingSchema } from "../migrations";
import { nowIso } from "../ids";

/**
 * Local training storage: the plan (one JSON document), the in-progress
 * workout and finished sessions. Not synced yet; history lives on this device.
 */

function parse<T>(json: string | null | undefined): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export async function getTrainingPlan(db: SQLiteDatabase): Promise<TrainingPlan | null> {
  await ensureTrainingSchema(db);
  const row = await db.getFirstAsync<{ json: string }>(`SELECT json FROM training_plan WHERE id = 1`);
  const plan = parse<TrainingPlan>(row?.json);
  return plan?.v === 1 ? plan : null;
}

export async function saveTrainingPlan(db: SQLiteDatabase, plan: TrainingPlan): Promise<TrainingPlan> {
  await ensureTrainingSchema(db);
  const next = { ...plan, updatedAt: nowIso() };
  await db.runAsync(
    `INSERT INTO training_plan (id, json, updatedAt) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET json = excluded.json, updatedAt = excluded.updatedAt`,
    JSON.stringify(next),
    next.updatedAt,
  );
  return next;
}

export async function getActiveWorkout(db: SQLiteDatabase): Promise<WorkoutSession | null> {
  await ensureTrainingSchema(db);
  const row = await db.getFirstAsync<{ json: string }>(`SELECT json FROM workout_active WHERE id = 1`);
  return parse<WorkoutSession>(row?.json);
}

export async function saveActiveWorkout(db: SQLiteDatabase, session: WorkoutSession): Promise<void> {
  await ensureTrainingSchema(db);
  await db.runAsync(
    `INSERT INTO workout_active (id, json, updatedAt) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET json = excluded.json, updatedAt = excluded.updatedAt`,
    JSON.stringify(session),
    nowIso(),
  );
}

export async function clearActiveWorkout(db: SQLiteDatabase): Promise<void> {
  await ensureTrainingSchema(db);
  await db.runAsync(`DELETE FROM workout_active WHERE id = 1`);
}

export async function insertWorkoutSession(db: SQLiteDatabase, summary: WorkoutSummary): Promise<void> {
  await ensureTrainingSchema(db);
  const s = summary.session;
  await db.runAsync(
    `INSERT OR REPLACE INTO workout_sessions
      (id, workoutId, workoutName, dayKey, unit, startedAt, finishedAt, durationSec, setsDone, volume, xpEarned, json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    s.id,
    s.workoutId,
    s.workoutName,
    s.dayKey,
    s.unit,
    s.startedAt,
    s.finishedAt ?? nowIso(),
    summary.durationSec,
    summary.setsDone,
    summary.volume,
    s.xpEarned,
    JSON.stringify(s),
  );
}

/** Finished sessions, newest first. */
export async function listWorkoutSessions(
  db: SQLiteDatabase,
  options: { sinceDayKey?: string; limit?: number } = {},
): Promise<WorkoutSession[]> {
  await ensureTrainingSchema(db);
  const rows = options.sinceDayKey
    ? await db.getAllAsync<{ json: string }>(
        `SELECT json FROM workout_sessions WHERE dayKey >= ? ORDER BY finishedAt DESC LIMIT ?`,
        options.sinceDayKey,
        options.limit ?? 200,
      )
    : await db.getAllAsync<{ json: string }>(
        `SELECT json FROM workout_sessions ORDER BY finishedAt DESC LIMIT ?`,
        options.limit ?? 200,
      );
  return rows.map((r) => parse<WorkoutSession>(r.json)).filter((s): s is WorkoutSession => s != null);
}

/** Sets completed today (for the daily cap on set XP). */
export async function countWorkoutSetXpToday(db: SQLiteDatabase, dayKey: string): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM xp_events WHERE reason = 'workout_set' AND dayKey = ?`,
    dayKey,
  );
  return row?.n ?? 0;
}
