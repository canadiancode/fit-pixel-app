/**
 * "A habit was just logged" signal for the streak, kept outside React like
 * progress-celebration.ts so HabitProgressProvider and StreakProvider don't
 * depend on provider order.
 */
const listeners = new Set<() => void>();

export function notifyHabitLogged(): void {
  for (const listener of listeners) listener();
}

export function subscribeHabitLogged(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
