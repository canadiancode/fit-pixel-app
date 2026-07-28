import type {
  PendingServerOpTrust,
  PendingServerOpType,
} from "./types";

/** Derived / client-claimed economy — server must not treat as source of truth. */
const UNTRUSTED_CLIENT_TYPES = new Set<PendingServerOpType>([
  "xp_award",
  "inventory_unlock",
]);

/**
 * Facts to enqueue for sync truth. Prefer these over derived XP/unlock ops;
 * XP can be recomputed server-side from habit_log + daily_goals.
 */
export const FACT_PENDING_OP_TYPES = [
  "habit_log",
  "daily_goals",
  "loadout",
  "profile",
  "prefs",
  "saved_meal",
] as const satisfies readonly PendingServerOpType[];

export function trustForOpType(
  type: PendingServerOpType,
): PendingServerOpTrust {
  return UNTRUSTED_CLIENT_TYPES.has(type) ? "untrusted_client" : "fact";
}
