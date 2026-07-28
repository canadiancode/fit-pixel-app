import { useCallback, useEffect, useRef } from "react";

const DEFAULT_DELAY_MS = 400;
const DEFAULT_INTERVAL_MS = 70;

type UseHoldToRepeatOptions = {
  /** When true, press-in is ignored and any active repeat stops. */
  disabled?: boolean;
  /** Wait before continuous repeats begin (after the initial fire). */
  delayMs?: number;
  /** Interval between repeats while held. */
  intervalMs?: number;
};

/**
 * Press-and-hold: fires `action` once on press-in, then repeats after a short delay
 * until press-out. Pass the returned handlers to a Pressable (`onPressIn` / `onPressOut`).
 * Do not also wire `onPress` — that would double-fire on tap.
 */
export function useHoldToRepeat(
  action: () => void,
  options: UseHoldToRepeatOptions = {},
): {
  onPressIn: () => void;
  onPressOut: () => void;
} {
  const {
    disabled = false,
    delayMs = DEFAULT_DELAY_MS,
    intervalMs = DEFAULT_INTERVAL_MS,
  } = options;

  const actionRef = useRef(action);
  actionRef.current = action;

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (delayTimerRef.current != null) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (intervalTimerRef.current != null) {
      clearInterval(intervalTimerRef.current);
      intervalTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clear(), [clear]);

  useEffect(() => {
    if (disabled) {
      clear();
    }
  }, [disabled, clear]);

  const onPressIn = useCallback(() => {
    if (disabledRef.current) return;
    clear();
    actionRef.current();
    delayTimerRef.current = setTimeout(() => {
      intervalTimerRef.current = setInterval(() => {
        if (disabledRef.current) {
          clear();
          return;
        }
        actionRef.current();
      }, intervalMs);
    }, delayMs);
  }, [clear, delayMs, intervalMs]);

  return { onPressIn, onPressOut: clear };
}
