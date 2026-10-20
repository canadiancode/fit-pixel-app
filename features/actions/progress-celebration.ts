import * as Haptics from "expo-haptics";
import type { View } from "react-native";

import { getActionRowAccentColor, type ActionRouteId } from "./data";

/**
 * Plain event bus for "the user just made progress" feedback, kept outside
 * React so the habit context, add buttons, bars and the token layer can talk
 * without provider ordering constraints.
 *
 * Flow: an add button logs a habit → HabitProgressProvider calls
 * `emitProgress(route)` before it refreshes totals → bars that cover that
 * route tween from their old totals once the flying token lands.
 */

/** A per-action bar, or the overall "Today's progress" header bar. */
export type ProgressScope = ActionRouteId | "today";

export type ProgressEvent = {
  id: number;
  route: ActionRouteId;
  /** Epoch ms when bars should start filling (when the token lands). */
  startAt: number;
};

/** Played by a bar when its totals tween: glint + glow, gold on goal hit. */
export type ProgressPulse = {
  id: number;
  gold: boolean;
};

export type WindowRect = { x: number; y: number; width: number; height: number };

export type ProgressTokenLaunch = {
  id: number;
  label: string;
  color: string;
  from: WindowRect;
  to: WindowRect;
};

/** Flight time of the "+12oz" token from the button into its bar. */
export const PROGRESS_TOKEN_FLIGHT_MS = 520;
/** Button squash-and-pop length; screens that navigate away wait this long. */
export const PROGRESS_BUTTON_POP_MS = 300;

let nextEventId = 1;
const eventListeners = new Set<(event: ProgressEvent) => void>();

export function emitProgress(route: ActionRouteId): void {
  const event: ProgressEvent = {
    id: nextEventId++,
    route,
    startAt: Date.now() + PROGRESS_TOKEN_FLIGHT_MS - 80,
  };
  for (const listener of eventListeners) listener(event);
}

export function subscribeProgress(
  listener: (event: ProgressEvent) => void,
): () => void {
  eventListeners.add(listener);
  return () => {
    eventListeners.delete(listener);
  };
}

export function scopeCoversRoute(
  scope: ProgressScope,
  route: ActionRouteId,
): boolean {
  return scope === "today" || scope === route;
}

/* ---- Bar targets the token flies into ---- */

type TargetEntry = { scope: ProgressScope; ref: { current: View | null } };
const targets: TargetEntry[] = [];

/** Registers a mounted, visible bar; the latest registration per scope wins. */
export function registerProgressTarget(
  scope: ProgressScope,
  ref: { current: View | null },
): () => void {
  const entry: TargetEntry = { scope, ref };
  targets.push(entry);
  return () => {
    const index = targets.indexOf(entry);
    if (index >= 0) targets.splice(index, 1);
  };
}

function findTarget(scope: ProgressScope): View | null {
  for (let i = targets.length - 1; i >= 0; i--) {
    const entry = targets[i];
    if (entry.scope === scope && entry.ref.current != null) {
      return entry.ref.current;
    }
  }
  return null;
}

export function measureInWindowAsync(view: View): Promise<WindowRect | null> {
  return new Promise((resolve) => {
    view.measureInWindow((x, y, width, height) => {
      resolve(width > 0 || height > 0 ? { x, y, width, height } : null);
    });
  });
}

/* ---- Flying token ---- */

let nextTokenId = 1;
const tokenListeners = new Set<(launch: ProgressTokenLaunch) => void>();

export function subscribeProgressTokens(
  listener: (launch: ProgressTokenLaunch) => void,
): () => void {
  tokenListeners.add(listener);
  return () => {
    tokenListeners.delete(listener);
  };
}

/**
 * Flies `label` from the pressed button into the route's bar when it is on
 * screen, else into the Today's progress header bar.
 */
export async function launchProgressToken(input: {
  route: ActionRouteId;
  label: string;
  from: WindowRect;
}): Promise<void> {
  if (tokenListeners.size === 0) return;
  const target = findTarget(input.route) ?? findTarget("today");
  if (target == null) return;
  const to = await measureInWindowAsync(target);
  if (to == null) return;
  const launch: ProgressTokenLaunch = {
    id: nextTokenId++,
    label: input.label,
    color: getActionRowAccentColor(input.route),
    from: input.from,
    to,
  };
  for (const listener of tokenListeners) listener(launch);
}

/* ---- Haptics ---- */

export function playProgressAddHaptic(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

let lastGoalHapticEventId = 0;

/** Success buzz once per event, even when several bars cross 100% together. */
export function playGoalReachedHaptic(eventId: number): void {
  if (eventId <= lastGoalHapticEventId) return;
  lastGoalHapticEventId = eventId;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
