/**
 * App-day boundary preferences (singleton).
 *
 * SECURITY/INTEGRITY (known local exploit — do not “fix” client-side):
 * Changing `dayStartsAtMinutes`, `timeZone`, or the device clock can re-bucket
 * events into a different day key and re-open daily goal bonuses / XP that were
 * already claimed for the previous key. Treat local day keys as convenience only.
 * A future server must derive authoritative day keys from trusted event timestamps
 * (and its own day-boundary rules), never from a client-supplied “today” alone.
 */

/** Minutes after local midnight when the app day begins (0 = midnight). */
export const DEFAULT_DAY_STARTS_AT_MINUTES = 0;

/** Inclusive range: 0 .. 1439 (23:59). */
export const DAY_STARTS_AT_MINUTES_MIN = 0;
export const DAY_STARTS_AT_MINUTES_MAX = 1439;

export type DayBoundary = {
  /** Minutes from midnight in `timeZone` when the app day starts. */
  dayStartsAtMinutes: number;
  /** IANA time zone id used for day-key calendar math (e.g. America/Los_Angeles). */
  timeZone: string;
  updatedAt: string;
};

export type DayBoundaryUpdate = {
  dayStartsAtMinutes?: number;
  timeZone?: string;
};
