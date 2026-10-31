import type { SQLiteDatabase } from "expo-sqlite";

import type {
  TrainingPlan,
  WorkoutSession,
  WorkoutSummary,
} from "@/features/training/types";

import { ensureTrainingSchema } from "../migrations";
import { nowIso } from "../ids";
import { enqueueOp, recordRestoredOp } from "../pending-ops";

/**
 * Local training storage: the plan (one JSON document), the in-progress
 * workout and finished sessions. The plan and finished sessions sync as
 * `training_plan` / `workout_session` ops; the server scores set XP from the
 * sessions. The in-progress workout stays on this device.
 */

/** Bounds the server enforces (TRAINING_LIMITS); payloads are clamped to them so an op is never rejected. */
export const TRAINING_SYNC_LIMITS = {
  idMax: 64,
  nameMax: 80,
  exercisesMax: 30,
  setsMax: 20,
  weightMax: 2_000,
  repsMax: 3_600,
  restSecMax: 900,
  planWorkoutsMax: 14,
} as const;

const L = TRAINING_SYNC_LIMITS;
const clampInt = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.round(Number.isFinite(n) ? n : lo)));
const clip = (text: string, max: number, fallback: string) => text.trim().slice(0, max) || fallback;

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

/** Wire payload for a finished workout (server types/sync.ts workoutSessionPayloadSchema). */
export function workoutSessionToSyncPayload(session: WorkoutSession, finishedAt: string): Record<string, unknown> {
  const startedAt = session.startedAt;
  // A workout left open for more than a day still syncs: the server allows 24 h.
  const latest = Date.parse(startedAt) + 24 * 3_600_000;
  const finished = Date.parse(finishedAt) > latest ? new Date(latest).toISOString() : finishedAt;
  return {
    id: session.id,
    workoutId: clip(session.workoutId, L.idMax, "workout"),
    workoutName: clip(session.workoutName, L.nameMax, "Workout"),
    unit: session.unit,
    startedAt,
    finishedAt: finished,
    exercises: session.exercises.slice(0, L.exercisesMax).map((e) => ({
      key: clip(e.key, L.idMax, "k"),
      exerciseId: clip(e.exerciseId, L.idMax, "unknown"),
      repsMin: clampInt(e.repsMin, 0, L.repsMax),
      repsMax: clampInt(e.repsMax, 0, L.repsMax),
      restSec: clampInt(e.restSec, 0, L.restSecMax),
      sets: e.sets.slice(0, L.setsMax).map((s) => ({
        weight: Math.max(0, Math.min(L.weightMax, Number.isFinite(s.weight) ? s.weight : 0)),
        reps: clampInt(s.reps, 0, L.repsMax),
        done: s.done === true,
        completedAt: s.completedAt,
      })),
    })),
  };
}

/** Store a finished workout and queue it for sync (the server scores its set XP). */
export async function saveFinishedWorkout(db: SQLiteDatabase, summary: WorkoutSummary): Promise<void> {
  await insertWorkoutSession(db, summary);
  const finishedAt = summary.session.finishedAt ?? nowIso();
  await enqueueOp(db, "workout_session", workoutSessionToSyncPayload(summary.session, finishedAt), {
    clientClockAt: finishedAt,
  });
}

/**
 * Queue the plan for sync. The server keeps whichever copy has the newest updatedAt.
 * Skipped unless it is still the stored plan: a newer edit queues itself, and
 * after sign-out wipes the table nothing of the old account is queued.
 */
export async function enqueueTrainingPlan(db: SQLiteDatabase, plan: TrainingPlan): Promise<void> {
  await ensureTrainingSchema(db);
  const stored = await db.getFirstAsync<{ updatedAt: string }>(`SELECT updatedAt FROM training_plan WHERE id = 1`);
  if (stored?.updatedAt !== plan.updatedAt) return;
  const workouts = plan.workouts.slice(0, L.planWorkoutsMax).map((w) => ({
    ...w,
    id: clip(w.id, L.idMax, "w"),
    name: clip(w.name, L.nameMax, "Workout"),
    focus: w.focus.trim().slice(0, L.nameMax),
    exercises: w.exercises.slice(0, L.exercisesMax).map((e) => ({
      ...e,
      sets: clampInt(e.sets, 1, L.setsMax),
      repsMin: clampInt(e.repsMin, 0, L.repsMax),
      repsMax: clampInt(e.repsMax, 0, L.repsMax),
      restSec: clampInt(e.restSec, 0, L.restSecMax),
    })),
  }));
  await enqueueOp(
    db,
    "training_plan",
    { plan: { ...plan, name: clip(plan.name, L.nameMax, "My plan"), workouts }, updatedAt: plan.updatedAt },
    { clientClockAt: plan.updatedAt },
  );
}

/** Restore: the server's plan, unless this device has a newer one (or one waiting to upload). */
export async function applyRestoredTrainingPlan(
  db: SQLiteDatabase,
  restored: { plan: Record<string, unknown>; updatedAt: string },
): Promise<boolean> {
  await ensureTrainingSchema(db);
  const plan = restored.plan as Partial<TrainingPlan>;
  if (plan.v !== 1 || !Array.isArray(plan.workouts)) return false;
  const pending = await db.getFirstAsync<{ ok: number }>(
    `SELECT 1 AS ok FROM pending_server_ops
     WHERE type = 'training_plan' AND status IN ('pending', 'failed') LIMIT 1`,
  );
  if (pending) return false;
  const local = await db.getFirstAsync<{ updatedAt: string }>(`SELECT updatedAt FROM training_plan WHERE id = 1`);
  if (local && Date.parse(local.updatedAt) >= Date.parse(restored.updatedAt)) return false;
  const next = { ...(plan as TrainingPlan), updatedAt: restored.updatedAt };
  await db.runAsync(
    `INSERT INTO training_plan (id, json, updatedAt) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET json = excluded.json, updatedAt = excluded.updatedAt`,
    JSON.stringify(next),
    next.updatedAt,
  );
  await recordRestoredOp(db, "training_plan", `restored-plan:${next.updatedAt}`, {
    updatedAt: next.updatedAt,
  });
  return true;
}

export type RestoredWorkoutSession = {
  id: string;
  workoutId: string;
  workoutName: string;
  unit: "lb" | "kg";
  startedAt: string;
  finishedAt: string;
  dayKey: string;
  setsDone: number;
  exercises: unknown[];
};

/** Restore: finished workouts from the server. Rows already on this device are kept. */
export async function insertRestoredWorkoutSessions(
  db: SQLiteDatabase,
  sessions: RestoredWorkoutSession[],
): Promise<number> {
  await ensureTrainingSchema(db);
  let inserted = 0;
  for (const r of sessions) {
    const session: WorkoutSession = {
      id: r.id,
      workoutId: r.workoutId,
      workoutName: r.workoutName,
      dayKey: r.dayKey,
      unit: r.unit === "kg" ? "kg" : "lb",
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      exercises: r.exercises as WorkoutSession["exercises"],
      current: 0,
      // Display only; the server's capped total is already in the restored XP.
      xpEarned: 0,
    };
    const volume = session.exercises.reduce(
      (v, e) => v + (Array.isArray(e.sets) ? e.sets.filter((s) => s.done).reduce((a, s) => a + s.weight * s.reps, 0) : 0),
      0,
    );
    const result = await db.runAsync(
      `INSERT OR IGNORE INTO workout_sessions
        (id, workoutId, workoutName, dayKey, unit, startedAt, finishedAt, durationSec, setsDone, volume, xpEarned, json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      session.id,
      session.workoutId,
      session.workoutName,
      session.dayKey,
      session.unit,
      session.startedAt,
      r.finishedAt,
      Math.max(0, Math.round((Date.parse(r.finishedAt) - Date.parse(r.startedAt)) / 1000)),
      Math.max(0, r.setsDone),
      Math.round(volume),
      0,
      JSON.stringify(session),
    );
    // Op ids aren't session ids, so the marker is keyed for the backfill's
    // payload lookup; a re-run of the restore reuses the same marker.
    await recordRestoredOp(db, "workout_session", `restored:${r.id}`, { id: r.id });
    inserted += result.changes;
  }
  return inserted;
}

/**
 * Queue what never reached the outbox: workouts finished on builds before
 * workout sync, and a plan last saved before plan sync. Restored sessions
 * carry a synced marker op. Returns how many ops were queued.
 */
export async function enqueueUnqueuedTraining(db: SQLiteDatabase): Promise<number> {
  await ensureTrainingSchema(db);
  let queued = 0;
  const rows = await db.getAllAsync<{ json: string; finishedAt: string }>(
    `SELECT w.json, w.finishedAt FROM workout_sessions w
     WHERE NOT EXISTS (
       SELECT 1 FROM pending_server_ops o
       WHERE o.type = 'workout_session' AND json_extract(o.payload_json, '$.id') = w.id
     )
     ORDER BY w.finishedAt ASC`,
  );
  for (const row of rows) {
    let session: WorkoutSession;
    try {
      session = JSON.parse(row.json) as WorkoutSession;
    } catch {
      continue;
    }
    if (typeof session?.id !== "string" || typeof session.startedAt !== "string") continue;
    await enqueueOp(db, "workout_session", workoutSessionToSyncPayload(session, row.finishedAt), {
      clientClockAt: row.finishedAt,
    });
    queued += 1;
  }

  const plan = await getTrainingPlan(db);
  if (plan != null) {
    const queuedPlan = await db.getFirstAsync<{ ok: number }>(
      `SELECT 1 AS ok FROM pending_server_ops
       WHERE type = 'training_plan' AND json_extract(payload_json, '$.updatedAt') = ?
       LIMIT 1`,
      plan.updatedAt,
    );
    if (queuedPlan == null) {
      await enqueueTrainingPlan(db, plan);
      queued += 1;
    }
  }
  return queued;
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

/** Workout XP awards on a day (for the daily caps on set and finish XP). */
export async function countWorkoutXpEvents(
  db: SQLiteDatabase,
  reason: "workout_set" | "workout_complete",
  dayKey: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM xp_events WHERE reason = ? AND dayKey = ?`,
    reason,
    dayKey,
  );
  return row?.n ?? 0;
}
