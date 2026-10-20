import { useIsFocused } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import type { View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { useDailyGoals } from "@/features/actions/daily-goals-context";
import { useHabitProgress } from "@/features/actions/habit-progress-context";

import {
  getActionRowProgressPercent,
  getTodaysProgressPercent,
  type ActionProgressTotals,
  type ActionRouteId,
} from "./data";
import {
  playGoalReachedHaptic,
  registerProgressTarget,
  scopeCoversRoute,
  subscribeProgress,
  type ProgressEvent,
  type ProgressPulse,
  type ProgressScope,
} from "./progress-celebration";
import { useActionProgress } from "./use-action-progress";

/** Chunky count-up: a few visible frames reads as pixel-game, not smooth UI. */
const TWEEN_STEPS = 10;
const TWEEN_STEP_MS = 45;

const TOTAL_KEYS = [
  "foodKcal",
  "waterAmount",
  "trainMinutes",
  "sleepHours",
  "steps",
  "activeKcal",
  "weight",
] as const satisfies readonly (keyof ActionProgressTotals)[];

function totalsEqual(a: ActionProgressTotals, b: ActionProgressTotals) {
  return TOTAL_KEYS.every((key) => a[key] === b[key]);
}

function lerpTotals(
  from: ActionProgressTotals,
  to: ActionProgressTotals,
  t: number,
): ActionProgressTotals {
  const out: ActionProgressTotals = {};
  for (const key of TOTAL_KEYS) {
    const end = to[key];
    if (end === undefined) continue;
    const start = from[key] ?? 0;
    out[key] = start + (end - start) * t;
  }
  return out;
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

/**
 * Today's totals as a bar should show them: they snap to live values, except
 * right after an add for this scope, when they count up from the old values
 * once the flying token lands. While the screen is not focused (e.g. a food
 * search screen covers the food hub) the old values are held so the count-up
 * plays when the user returns.
 */
export function useCelebratedTotals(scope: ProgressScope): {
  totals: ActionProgressTotals;
  pulse: ProgressPulse | null;
} {
  const { goals } = useDailyGoals();
  const { totals: live } = useHabitProgress();
  const isFocused = useIsFocused();
  const reduceMotion = useReducedMotion();

  const [displayed, setDisplayed] = useState(live);
  const [pulse, setPulse] = useState<ProgressPulse | null>(null);
  const displayedRef = useRef(live);
  const pendingRef = useRef<ProgressEvent | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const show = (next: ActionProgressTotals) => {
    displayedRef.current = next;
    setDisplayed(next);
  };

  useEffect(
    () =>
      subscribeProgress((event) => {
        if (scopeCoversRoute(scope, event.route)) pendingRef.current = event;
      }),
    [scope],
  );

  useEffect(() => {
    const from = displayedRef.current;
    if (totalsEqual(from, live)) return;

    const event = pendingRef.current;
    if (event == null) {
      show(live);
      return;
    }
    if (!isFocused) return;
    pendingRef.current = null;

    const percentOf = (totals: ActionProgressTotals) =>
      scope === "today"
        ? getTodaysProgressPercent(goals, totals)
        : getActionRowProgressPercent(scope, goals, totals);
    const gold = percentOf(from) < 100 && percentOf(live) >= 100;

    const start = () => {
      setPulse({ id: event.id, gold });
      if (gold) playGoalReachedHaptic(event.id);
      if (reduceMotion) {
        show(live);
        return;
      }
      for (let step = 1; step <= TWEEN_STEPS; step++) {
        timersRef.current.push(
          setTimeout(() => {
            show(
              step === TWEEN_STEPS
                ? live
                : lerpTotals(from, live, easeOutCubic(step / TWEEN_STEPS)),
            );
          }, step * TWEEN_STEP_MS),
        );
      }
    };

    const delay = Math.max(0, event.startAt - Date.now());
    timersRef.current.push(setTimeout(start, delay));

    return () => {
      // A newer change (another add) restarts from wherever the bar is now.
      for (const timer of timersRef.current) clearTimeout(timer);
      timersRef.current = [];
    };
  }, [live, isFocused, scope, goals, reduceMotion]);

  return { totals: displayed, pulse };
}

/** Registers a bar as the flying token's landing spot while its screen is focused. */
export function useProgressTarget(scope: ProgressScope) {
  const ref = useRef<View>(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) return;
    return registerProgressTarget(scope, ref);
  }, [scope, isFocused]);

  return ref;
}

/** `useActionProgress` for an action's summary card, with add celebrations. */
export function useCelebratedActionProgress(id: ActionRouteId) {
  const { totals, pulse } = useCelebratedTotals(id);
  const progress = useActionProgress(id, totals);
  const barRef = useProgressTarget(id);
  return { ...progress, totals, pulse, barRef };
}
