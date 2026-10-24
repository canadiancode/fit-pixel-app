import { useSQLiteContext } from "expo-sqlite";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

import { useDailyGoals } from "@/features/actions/daily-goals-context";
import { useHabitProgress } from "@/features/actions/habit-progress-context";
import { useXpState } from "@/features/xp/xp-state-context";
import { getTodayDayKey } from "@/lib/db/day-boundary/store";
import {
  clearActiveWorkout,
  countWorkoutXpEvents,
  enqueueTrainingPlan,
  getActiveWorkout,
  getTrainingPlan,
  listWorkoutSessions,
  saveActiveWorkout,
  saveFinishedWorkout,
  saveTrainingPlan,
} from "@/lib/db/training";
import {
  awardXp,
  revokeXpForEntity,
  XP_PER_WORKOUT_SET,
  XP_WORKOUT_COMPLETE,
  XP_WORKOUT_COMPLETES_PER_DAY,
  XP_WORKOUT_SETS_PER_DAY,
} from "@/lib/db/xp";

import { startSession, summarize, type Unit } from "./session";
import type { TrainingPlan, WorkoutSession, WorkoutSummary } from "./types";

/** Plan edits come in bursts (steppers, hold-to-repeat); sync the plan once they settle. */
const PLAN_SYNC_DELAY_MS = 2_000;

type TrainingContextValue = {
  isLoaded: boolean;
  plan: TrainingPlan | null;
  /** The workout in progress, if any (survives app restarts). */
  active: WorkoutSession | null;
  /** Finished sessions, newest first (last ~90 days). */
  history: WorkoutSession[];
  /** The summary of the workout just finished, for the finish screen. */
  lastSummary: WorkoutSummary | null;
  unit: Unit;
  savePlan: (plan: TrainingPlan) => Promise<void>;
  /** Edit the latest plan. Safe for rapid taps and hold-to-repeat, unlike savePlan({...plan}). */
  updatePlan: (fn: (plan: TrainingPlan) => TrainingPlan) => Promise<void>;
  startWorkout: (workoutId: string) => Promise<WorkoutSession | null>;
  /** Edit the active workout (weights, reps, current exercise), building on the latest edit. */
  updateActive: (fn: (session: WorkoutSession) => WorkoutSession) => void;
  /** Mark a set done; returns the XP it earned (0 once over the daily cap). */
  completeSet: (exerciseIndex: number, setIndex: number) => Promise<number>;
  finishWorkout: () => Promise<WorkoutSummary | null>;
  /** Throw the workout away, taking back its set XP (it never reaches the server). */
  discardWorkout: () => Promise<void>;
};

const TrainingContext = createContext<TrainingContextValue | null>(null);

export function TrainingProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { goals } = useDailyGoals();
  const { addTrain } = useHabitProgress();
  const { refreshXp } = useXpState();
  const unit: Unit = goals.weightUnit === "kg" ? "kg" : "lb";

  const [isLoaded, setIsLoaded] = useState(false);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [active, setActive] = useState<WorkoutSession | null>(null);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [lastSummary, setLastSummary] = useState<WorkoutSummary | null>(null);
  const activeRef = useRef<WorkoutSession | null>(null);
  activeRef.current = active;
  // The newest plan, ahead of React state, so back-to-back edits build on each other.
  const planRef = useRef<TrainingPlan | null>(null);
  const planWrites = useRef<Promise<void>>(Promise.resolve());
  // The saved plan still waiting to be queued for sync, and its timer.
  const planToSync = useRef<TrainingPlan | null>(null);
  const planSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadHistory = useCallback(async () => {
    const since = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
    setHistory(await listWorkoutSessions(db, { sinceDayKey: since }));
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [p, a] = await Promise.all([getTrainingPlan(db), getActiveWorkout(db)]);
        if (cancelled) return;
        planRef.current = p;
        setPlan(p);
        setActive(a);
        await loadHistory();
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, loadHistory]);

  const flushPlanSync = useCallback(() => {
    if (planSyncTimer.current) clearTimeout(planSyncTimer.current);
    planSyncTimer.current = null;
    const pending = planToSync.current;
    planToSync.current = null;
    if (!pending) return;
    // Behind any queued write, so the op carries the newest saved plan.
    planWrites.current = planWrites.current
      .then(() => enqueueTrainingPlan(db, pending))
      .catch(() => undefined);
  }, [db]);

  // Queue the last edit before the app is suspended, and when the provider goes away.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") flushPlanSync();
    });
    return () => {
      sub.remove();
      flushPlanSync();
    };
  }, [flushPlanSync]);

  const savePlan = useCallback(
    (next: TrainingPlan) => {
      planRef.current = next;
      setPlan(next);
      // Queue writes so an older plan never lands after a newer one.
      const write = planWrites.current.then(async () => {
        planToSync.current = await saveTrainingPlan(db, next);
        if (planSyncTimer.current) clearTimeout(planSyncTimer.current);
        planSyncTimer.current = setTimeout(flushPlanSync, PLAN_SYNC_DELAY_MS);
      });
      planWrites.current = write.catch(() => undefined);
      return write;
    },
    [db, flushPlanSync],
  );

  const updatePlan = useCallback(
    async (fn: (plan: TrainingPlan) => TrainingPlan) => {
      if (planRef.current) await savePlan(fn(planRef.current));
    },
    [savePlan],
  );

  const startWorkout = useCallback(
    async (workoutId: string) => {
      if (activeRef.current) return activeRef.current;
      const workout = plan?.workouts.find((w) => w.id === workoutId);
      if (!workout) return null;
      const dayKey = await getTodayDayKey(db);
      const session = startSession(workout, history, unit, dayKey);
      await saveActiveWorkout(db, session);
      setActive(session);
      return session;
    },
    [db, history, plan, unit],
  );

  const updateActive = useCallback(
    (fn: (session: WorkoutSession) => WorkoutSession) => {
      const current = activeRef.current;
      if (!current) return;
      const next = fn(current);
      activeRef.current = next;
      setActive(next);
      void saveActiveWorkout(db, next);
    },
    [db],
  );

  const completeSet = useCallback(
    async (exerciseIndex: number, setIndex: number) => {
      const current = activeRef.current;
      const set = current?.exercises[exerciseIndex]?.sets[setIndex];
      if (!current || !set || set.done) return 0;

      // The server buckets a workout by the day it started; cap on that day too.
      const dayKey = current.dayKey;
      const underCap = (await countWorkoutXpEvents(db, "workout_set", dayKey)) < XP_WORKOUT_SETS_PER_DAY;
      const xp = underCap ? XP_PER_WORKOUT_SET : 0;

      const next: WorkoutSession = {
        ...current,
        xpEarned: current.xpEarned + xp,
        exercises: current.exercises.map((e, ei) =>
          ei !== exerciseIndex
            ? e
            : { ...e, sets: e.sets.map((s, si) => (si === setIndex ? { ...s, done: true, completedAt: new Date().toISOString() } : s)) },
        ),
      };
      activeRef.current = next;
      setActive(next);
      await saveActiveWorkout(db, next);
      if (xp > 0) {
        await awardXp(db, { amount: xp, reason: "workout_set", relatedEntityId: current.id, dayKey });
        await refreshXp();
      }
      return xp;
    },
    [db, refreshXp],
  );

  const finishWorkout = useCallback(async () => {
    const current = activeRef.current;
    if (!current) return null;
    const summary = summarize(current, history);
    const finishesToday = await countWorkoutXpEvents(db, "workout_complete", current.dayKey);
    if (summary.setsDone > 0 && finishesToday < XP_WORKOUT_COMPLETES_PER_DAY) {
      await awardXp(db, { amount: XP_WORKOUT_COMPLETE, reason: "workout_complete", relatedEntityId: current.id, dayKey: current.dayKey });
      summary.session.xpEarned += XP_WORKOUT_COMPLETE;
    }
    // Synced: the server scores the same set and finish XP from it.
    await saveFinishedWorkout(db, summary);
    await clearActiveWorkout(db);
    setActive(null);
    setLastSummary(summary);
    await loadHistory();
    // Feeds the existing Train goal (and its habit-log XP, which the server counts too).
    const minutes = Math.round(summary.durationSec / 60);
    if (summary.setsDone > 0 && minutes > 0) {
      await addTrain({ durationMin: Math.min(minutes, 240), trainType: current.workoutName });
    }
    await refreshXp();
    return summary;
  }, [addTrain, db, history, loadHistory, refreshXp]);

  const discardWorkout = useCallback(async () => {
    const current = activeRef.current;
    await clearActiveWorkout(db);
    activeRef.current = null;
    setActive(null);
    if (current && current.xpEarned > 0) {
      await revokeXpForEntity(db, "workout_set", current.id);
      await refreshXp();
    }
  }, [db, refreshXp]);

  const value = useMemo<TrainingContextValue>(
    () => ({
      isLoaded,
      plan,
      active,
      history,
      lastSummary,
      unit,
      savePlan,
      updatePlan,
      startWorkout,
      updateActive,
      completeSet,
      finishWorkout,
      discardWorkout,
    }),
    [isLoaded, plan, active, history, lastSummary, unit, savePlan, updatePlan, startWorkout, updateActive, completeSet, finishWorkout, discardWorkout],
  );

  return <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>;
}

export function useTraining(): TrainingContextValue {
  const ctx = useContext(TrainingContext);
  if (ctx == null) {
    throw new Error("useTraining must be used within TrainingProvider");
  }
  return ctx;
}
