/**
 * In-memory last drain outcome for Settings UI.
 * Not persisted — resets on process restart.
 */

const listeners = new Set<() => void>();

let lastError: string | null = null;

export function getLastDrainError(): string | null {
  return lastError;
}

export function setLastDrainError(message: string | null): void {
  lastError = message;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeDrainStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
