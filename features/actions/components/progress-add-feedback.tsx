import { useCallback, useMemo, type ReactNode } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { PopFlashView, usePopFlash, type PopFlash } from "@/components/pop-flash";

import type { ActionRouteId } from "../data";
import {
  launchProgressToken,
  measureInWindowAsync,
  playProgressAddHaptic,
} from "../progress-celebration";

export type ProgressAddFeedback = Omit<PopFlash, "play"> & {
  /** Call after the add succeeded: haptic, pop + flash, and the flying token. */
  celebrate: (input: { route: ActionRouteId; label: string }) => void;
};

/** Feedback for a button that adds to today's progress. Pair with `ProgressAddFeedbackView`. */
export function useProgressAddFeedback(): ProgressAddFeedback {
  const popFlash = usePopFlash();
  const reduceMotion = useReducedMotion();
  const { ref, scale, flash, play } = popFlash;

  const celebrate = useCallback(
    ({ route, label }: { route: ActionRouteId; label: string }) => {
      playProgressAddHaptic();
      play();
      if (reduceMotion) return;
      const view = ref.current;
      if (view == null) return;
      void measureInWindowAsync(view).then((from) => {
        if (from != null) void launchProgressToken({ route, label, from });
      });
    },
    [play, ref, reduceMotion],
  );

  return useMemo(
    () => ({ ref, scale, flash, celebrate }),
    [ref, scale, flash, celebrate],
  );
}

/** Wraps a button's visual so it can pop and flash white on a successful add. */
export function ProgressAddFeedbackView({
  feedback,
  style,
  flashRadius = 8,
  children,
}: {
  feedback: ProgressAddFeedback;
  style?: StyleProp<ViewStyle>;
  flashRadius?: number;
  children: ReactNode;
}) {
  return (
    <PopFlashView popFlash={feedback} style={style} flashRadius={flashRadius}>
      {children}
    </PopFlashView>
  );
}
