import { getExercise } from "./exercises";
import { newKey } from "./programs";
import type {
  PersonalRecord,
  PlanWorkout,
  SessionExercise,
  WorkoutSession,
  WorkoutSummary,
} from "./types";

/** Pure workout logic: no storage, no React. */

export type Unit = "lb" | "kg";

/** Weight step for the −/+ buttons and progression. */
export function weightStep(unit: Unit): number {
  return unit === "kg" ? 2.5 : 5;
}

/** The most recent finished sets for an exercise (newest session first). */
export function lastSetsFor(history: WorkoutSession[], exerciseId: string): SessionExercise | null {
  for (const s of history) {
    const ex = s.exercises.find((e) => e.exerciseId === exerciseId && e.sets.some((set) => set.done));
    if (ex) return { ...ex, sets: ex.sets.filter((set) => set.done) };
  }
  return null;
}

/**
 * Suggested weight for today: last time's top weight, plus one step when every
 * set reached the top of the rep range (double progression).
 */
export function suggestWeight(
  last: SessionExercise | null,
  repsMax: number,
  unit: Unit,
): { weight: number; bumped: boolean } {
  if (!last || last.sets.length === 0) return { weight: 0, bumped: false };
  const top = Math.max(...last.sets.map((s) => s.weight));
  const allHitTop = last.sets.every((s) => s.reps >= repsMax);
  return allHitTop && top > 0 ? { weight: top + weightStep(unit), bumped: true } : { weight: top, bumped: false };
}

export function startSession(
  workout: PlanWorkout,
  history: WorkoutSession[],
  unit: Unit,
  dayKey: string,
  now = new Date().toISOString(),
): WorkoutSession {
  return {
    id: newKey("ws"),
    workoutId: workout.id,
    workoutName: workout.name,
    dayKey,
    unit,
    startedAt: now,
    finishedAt: null,
    current: 0,
    xpEarned: 0,
    exercises: workout.exercises.map((p) => {
      const last = lastSetsFor(history, p.exerciseId);
      const { weight } = suggestWeight(last, p.repsMax, unit);
      const bodyweight = getExercise(p.exerciseId)?.load !== "weight";
      return {
        key: p.key,
        exerciseId: p.exerciseId,
        repsMin: p.repsMin,
        repsMax: p.repsMax,
        restSec: p.restSec,
        sets: Array.from({ length: p.sets }, (_, i) => ({
          weight: bodyweight ? 0 : weight,
          reps: last?.sets[i]?.reps && last.sets[i].reps >= p.repsMin ? Math.min(last.sets[i].reps, p.repsMax) : p.repsMax,
          done: false,
          completedAt: null,
        })),
      };
    }),
  };
}

/** "135 × 8" for the same set number last time, or "—". */
export function previousLabel(last: SessionExercise | null, setIndex: number, load: "weight" | "bodyweight" | "time"): string {
  const set = last?.sets[setIndex] ?? last?.sets[last.sets.length - 1];
  if (!set) return "—";
  if (load === "time") return `${set.reps}s`;
  if (load === "bodyweight" && set.weight === 0) return `${set.reps} reps`;
  return `${formatWeight(set.weight)} × ${set.reps}`;
}

export function formatWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : w.toFixed(1);
}

export function setsDone(session: WorkoutSession): number {
  return session.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
}

export function setsTotal(session: WorkoutSession): number {
  return session.exercises.reduce((n, e) => n + e.sets.length, 0);
}

export function volumeOf(session: WorkoutSession): number {
  return session.exercises.reduce(
    (v, e) => v + (getExercise(e.exerciseId)?.load === "time" ? 0 : e.sets.filter((s) => s.done).reduce((a, s) => a + s.weight * s.reps, 0)),
    0,
  );
}

/** Best (heaviest weight, most reps at that weight) per exercise across history. */
function bestsFrom(history: WorkoutSession[]): Map<string, { weight: number; reps: number; maxReps: number }> {
  const bests = new Map<string, { weight: number; reps: number; maxReps: number }>();
  for (const s of history) {
    for (const e of s.exercises) {
      for (const set of e.sets) {
        if (!set.done) continue;
        const b = bests.get(e.exerciseId) ?? { weight: -1, reps: 0, maxReps: 0 };
        if (set.weight > b.weight || (set.weight === b.weight && set.reps > b.reps)) {
          b.weight = set.weight;
          b.reps = set.reps;
        }
        b.maxReps = Math.max(b.maxReps, set.reps);
        bests.set(e.exerciseId, b);
      }
    }
  }
  return bests;
}

/** PRs this session set against all earlier history. First-ever sessions don't count. */
export function findRecords(session: WorkoutSession, history: WorkoutSession[]): PersonalRecord[] {
  const bests = bestsFrom(history.filter((h) => h.id !== session.id));
  const records: PersonalRecord[] = [];
  for (const e of session.exercises) {
    const done = e.sets.filter((s) => s.done);
    const prev = bests.get(e.exerciseId);
    if (done.length === 0 || !prev) continue;
    const load = getExercise(e.exerciseId)?.load ?? "weight";
    if (load === "weight") {
      const top = done.reduce((best, s) => (s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps) ? s : best), done[0]);
      if (top.weight > prev.weight) {
        records.push({ exerciseId: e.exerciseId, kind: "weight", weight: top.weight, reps: top.reps, previous: { weight: prev.weight, reps: prev.reps } });
        continue;
      }
      if (top.weight === prev.weight && top.reps > prev.reps) {
        records.push({ exerciseId: e.exerciseId, kind: "reps", weight: top.weight, reps: top.reps, previous: { weight: prev.weight, reps: prev.reps } });
      }
    } else {
      const most = Math.max(...done.map((s) => s.reps));
      if (most > prev.maxReps) records.push({ exerciseId: e.exerciseId, kind: "reps", weight: 0, reps: most, previous: { weight: 0, reps: prev.maxReps } });
    }
  }
  return records;
}

export function summarize(session: WorkoutSession, history: WorkoutSession[], finishedAt = new Date().toISOString()): WorkoutSummary {
  const finished = { ...session, finishedAt };
  const durationSec = Math.max(0, Math.round((Date.parse(finishedAt) - Date.parse(session.startedAt)) / 1000));
  return {
    session: finished,
    durationSec,
    setsDone: setsDone(finished),
    volume: Math.round(volumeOf(finished)),
    records: findRecords(finished, history),
  };
}

export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(mm).padStart(2, "0")}:${ss}` : `${mm}:${ss}`;
}
