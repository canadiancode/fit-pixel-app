import * as Haptics from "expo-haptics";
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
import { usePixelLoadout } from "@/features/pixel/pixel-loadout-context";
import { useXpState } from "@/features/xp/xp-state-context";
import {
  claimWeightXpAward,
  convertWeightValue,
  getHabitLog,
  getTodayDayKey,
  getWeightJourney,
  hasWeightXpAward,
  listWeightEntries,
  logWeight,
  updateWeightJourney,
  XP_WEIGH_IN_BASE,
  XP_WEIGH_IN_STREAK_MAX_BONUS,
  XP_WEIGH_IN_STREAK_STEP,
  XP_WEIGHT_GOAL_REACHED,
  XP_WEIGHT_MILESTONE,
  type WeightEntry,
  type WeightJourney,
} from "@/lib/db";

import { fetchHealthWeightSamples } from "./health-weight-samples";
import {
  cancelWeighInReminder,
  scheduleWeighInReminder,
} from "./weigh-in-reminder";
import {
  computeJourney,
  computeTrend,
  computeWeighInStatus,
  type TrendPoint,
  type WeighInStatus,
  type WeightJourneyProgress,
} from "./weight-journey-math";

/** First Apple Health sync looks back this far. */
const HEALTH_FIRST_SYNC_DAYS = 120;
/** Wait for the weigh-in celebration before the notification prompt. */
const REMINDER_PROMPT_DELAY_MS = 3_500;
/** Later syncs overlap a little in case samples arrive late. */
const HEALTH_SYNC_OVERLAP_MS = 2 * 24 * 60 * 60 * 1000;

export type WeightCelebration = {
  id: number;
  kind: "weigh_in" | "milestone" | "goal";
  xp: number;
  streak: number;
  /** Items unlocked by milestones in this update. */
  unlocked: string[];
};

type WeightJourneyContextValue = {
  isHydrated: boolean;
  /** App day key for today ("" until hydrated). */
  todayKey: string;
  settings: WeightJourney;
  entries: readonly WeightEntry[];
  /** Null until there is a start weight and at least one reading. */
  journey: WeightJourneyProgress | null;
  weighIn: WeighInStatus;
  trend: readonly TrendPoint[];
  /** Latest Apple Health reading, in the goal unit. */
  latestHealthWeight: number | null;
  celebration: WeightCelebration | null;
  dismissCelebration: () => void;
  logWeighIn: (value: number) => Promise<void>;
  setWeighInWeekday: (weekday: number) => Promise<void>;
  setReminderEnabled: (enabled: boolean) => Promise<boolean>;
  setHideNumbers: (hide: boolean) => Promise<void>;
  /** Start a new journey from the latest weight. */
  restartJourney: () => Promise<void>;
  syncHealth: () => Promise<void>;
};

const WeightJourneyContext = createContext<WeightJourneyContextValue | null>(
  null,
);

const DEFAULT_SETTINGS: WeightJourney = {
  startWeight: null,
  startUnit: null,
  startDayKey: null,
  weighInWeekday: 1,
  reminderEnabled: true,
  reminderNotificationId: null,
  hideNumbers: false,
  lastHealthSyncAt: null,
  updatedAt: "",
};

export function weighInXpForStreak(streak: number): number {
  const bonus = Math.min(
    XP_WEIGH_IN_STREAK_MAX_BONUS,
    Math.max(0, streak - 1) * XP_WEIGH_IN_STREAK_STEP,
  );
  return XP_WEIGH_IN_BASE + bonus;
}

export function WeightJourneyProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { goals } = useDailyGoals();
  const { addWeight, refreshTotals, totals } = useHabitProgress();
  const { refreshXp } = useXpState();
  const { grantItem } = usePixelLoadout();
  const unit = goals.weightUnit;

  const [isHydrated, setIsHydrated] = useState(false);
  const [settings, setSettings] = useState<WeightJourney>(DEFAULT_SETTINGS);
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [todayKey, setTodayKey] = useState("");
  const [celebration, setCelebration] = useState<WeightCelebration | null>(
    null,
  );
  const celebrationIdRef = useRef(1);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const syncingRef = useRef(false);

  const startInUnit = useCallback(
    (journey: WeightJourney): number | null =>
      journey.startWeight == null || journey.startUnit == null
        ? null
        : convertWeightValue(journey.startWeight, journey.startUnit, unit),
    [unit],
  );

  /**
   * Reload readings and pin the journey start. With `award` (only after a new
   * weight is logged), also award this week's weigh-in and newly reached
   * milestones, once each — changing the target alone never pays out.
   */
  const reconcile = useCallback(
    async (options: { award: boolean }) => {
      const [loaded, today] = await Promise.all([
        listWeightEntries(db, unit),
        getTodayDayKey(db),
      ]);
      let journeySettings = await getWeightJourney(db);
      const first = loaded[0];
      if (journeySettings.startWeight == null && first != null) {
        journeySettings = await updateWeightJourney(db, {
          startWeight: first.value,
          startUnit: unit,
          startDayKey: first.dayKey,
        });
      }

      const status = computeWeighInStatus(
        loaded,
        journeySettings.weighInWeekday,
        today,
      );
      let xp = 0;
      let kind: WeightCelebration["kind"] | null = null;
      const unlocked: string[] = [];

      if (options.award && status.doneThisWeek) {
        const event = await claimWeightXpAward(db, {
          awardKey: `weight:weigh_in:${status.weekKey}`,
          amount: weighInXpForStreak(status.streak),
          reason: "weigh_in",
          dayKey: today,
        });
        if (event != null) {
          xp += event.amount;
          kind = "weigh_in";
        }
      }

      const start = startInUnit(journeySettings);
      const latest = loaded.at(-1);
      if (start != null && latest != null) {
        const journey = computeJourney({
          start,
          current: latest.value,
          target: goals.weightGoal,
          unit,
        });
        for (const milestone of journey.milestones) {
          if (!milestone.reached) continue;
          if (!options.award) {
            // Restore rewards for milestones already paid (e.g. after a
            // reinstall); never pays XP without a new weigh-in.
            if (milestone.reward != null && (await hasWeightXpAward(db, milestone.awardKey))) {
              await grantItem(milestone.reward.itemId, "weight_milestone");
            }
            continue;
          }
          const event = await claimWeightXpAward(db, {
            awardKey: milestone.awardKey,
            amount: milestone.isGoal
              ? XP_WEIGHT_GOAL_REACHED
              : XP_WEIGHT_MILESTONE,
            reason: "weight_milestone",
            dayKey: today,
          });
          if (event == null) continue;
          xp += event.amount;
          kind = milestone.isGoal ? "goal" : kind === "goal" ? kind : "milestone";
          if (
            milestone.reward != null &&
            (await grantItem(milestone.reward.itemId, "weight_milestone"))
          ) {
            unlocked.push(milestone.reward.label);
          }
        }
      }

      setEntries(loaded);
      setTodayKey(today);
      setSettings(journeySettings);
      if (xp > 0) await refreshXp();
      if (kind != null) {
        if (kind !== "weigh_in") {
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
        }
        setCelebration({
          id: celebrationIdRef.current++,
          kind,
          xp,
          streak: status.streak,
          unlocked,
        });
      }
    },
    [db, unit, goals.weightGoal, startInUnit, grantItem, refreshXp],
  );

  const reconcileRef = useRef(reconcile);
  reconcileRef.current = reconcile;

  const syncHealth = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const current = await getWeightJourney(db);
      const since =
        current.lastHealthSyncAt != null
          ? new Date(
              new Date(current.lastHealthSyncAt).getTime() -
                HEALTH_SYNC_OVERLAP_MS,
            )
          : new Date(Date.now() - HEALTH_FIRST_SYNC_DAYS * 86_400_000);
      const samples = await fetchHealthWeightSamples(since, unit);
      let imported = 0;
      for (const sample of samples) {
        if ((await getHabitLog(db, sample.uuid)) != null) continue;
        try {
          await logWeight(db, {
            value: Math.round(sample.value * 10) / 10,
            unit,
            timestamp: sample.startDate.toISOString(),
            source: "healthkit",
            id: sample.uuid,
            skipXp: true,
          });
          imported++;
        } catch {
          // Out-of-range or malformed reading — skip it.
        }
      }
      await updateWeightJourney(db, { lastHealthSyncAt: new Date().toISOString() });
      if (imported > 0) {
        await refreshTotals();
        await reconcileRef.current({ award: true });
      }
    } finally {
      syncingRef.current = false;
    }
  }, [db, unit, refreshTotals]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await reconcileRef.current({ award: false });
      if (!cancelled) setIsHydrated(true);
      await syncHealth();
    })();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void syncHealth();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [syncHealth]);

  // Other writers (restore, edits) change the latest weight: refresh readings.
  useEffect(() => {
    if (!isHydrated) return;
    void reconcileRef.current({ award: false });
  }, [isHydrated, totals.weight]);

  const ensureReminder = useCallback(
    async (journey: WeightJourney): Promise<WeightJourney> => {
      if (!journey.reminderEnabled || journey.reminderNotificationId != null) {
        return journey;
      }
      const id = await scheduleWeighInReminder(journey.weighInWeekday).catch(
        () => null,
      );
      if (id == null) return journey;
      return updateWeightJourney(db, { reminderNotificationId: id });
    },
    [db],
  );

  const logWeighIn = useCallback(
    async (value: number) => {
      await addWeight({ value, unit });
      await reconcile({ award: true });
      // First weigh-in is a good moment to ask for reminder permission — but
      // after the celebration has been seen, not on top of it.
      setTimeout(() => {
        void getWeightJourney(db)
          .then(ensureReminder)
          .then(setSettings);
      }, REMINDER_PROMPT_DELAY_MS);
    },
    [addWeight, unit, reconcile, ensureReminder, db],
  );

  const setWeighInWeekday = useCallback(
    async (weekday: number) => {
      const current = settingsRef.current;
      await cancelWeighInReminder(current.reminderNotificationId);
      let next = await updateWeightJourney(db, {
        weighInWeekday: weekday,
        reminderNotificationId: null,
      });
      if (current.reminderNotificationId != null) {
        next = await ensureReminder(next);
      }
      setSettings(next);
    },
    [db, ensureReminder],
  );

  const setReminderEnabled = useCallback(
    async (enabled: boolean) => {
      const current = settingsRef.current;
      if (!enabled) {
        await cancelWeighInReminder(current.reminderNotificationId);
        setSettings(
          await updateWeightJourney(db, {
            reminderEnabled: false,
            reminderNotificationId: null,
          }),
        );
        return true;
      }
      const next = await ensureReminder(
        await updateWeightJourney(db, { reminderEnabled: true }),
      );
      setSettings(next);
      return next.reminderNotificationId != null;
    },
    [db, ensureReminder],
  );

  const setHideNumbers = useCallback(
    async (hide: boolean) => {
      setSettings(await updateWeightJourney(db, { hideNumbers: hide }));
    },
    [db],
  );

  const restartJourney = useCallback(async () => {
    const latest = entries.at(-1);
    if (latest == null) return;
    setSettings(
      await updateWeightJourney(db, {
        startWeight: latest.value,
        startUnit: unit,
        startDayKey: latest.dayKey,
      }),
    );
  }, [db, entries, unit]);

  const value = useMemo<WeightJourneyContextValue>(() => {
    const start = startInUnit(settings);
    const latest = entries.at(-1);
    const journey =
      start != null && latest != null
        ? computeJourney({
            start,
            current: latest.value,
            target: goals.weightGoal,
            unit,
          })
        : null;
    const latestHealth = [...entries]
      .reverse()
      .find((entry) => entry.source === "healthkit");
    return {
      isHydrated,
      todayKey,
      settings,
      entries,
      journey,
      weighIn: computeWeighInStatus(
        entries,
        settings.weighInWeekday,
        todayKey || latest?.dayKey || "1970-01-01",
      ),
      trend: computeTrend(entries),
      latestHealthWeight: latestHealth?.value ?? null,
      celebration,
      dismissCelebration: () => setCelebration(null),
      logWeighIn,
      setWeighInWeekday,
      setReminderEnabled,
      setHideNumbers,
      restartJourney,
      syncHealth,
    };
  }, [
    isHydrated,
    settings,
    entries,
    todayKey,
    goals.weightGoal,
    unit,
    startInUnit,
    celebration,
    logWeighIn,
    setWeighInWeekday,
    setReminderEnabled,
    setHideNumbers,
    restartJourney,
    syncHealth,
  ]);

  return (
    <WeightJourneyContext.Provider value={value}>
      {children}
    </WeightJourneyContext.Provider>
  );
}

export function useWeightJourney(): WeightJourneyContextValue {
  const ctx = useContext(WeightJourneyContext);
  if (ctx == null) {
    throw new Error("useWeightJourney must be used within WeightJourneyProvider");
  }
  return ctx;
}
