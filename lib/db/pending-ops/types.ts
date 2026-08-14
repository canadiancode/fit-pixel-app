/** Payload schema version stamped on each enqueued op (bump when shape changes). */
export const PENDING_OP_SCHEMA_VERSION = 1;

/**
 * Op kinds the drain loop will POST later.
 * Prefer facts for sync truth; derived economy ops are `untrusted_client`.
 */
export const PENDING_SERVER_OP_TYPES = [
  "habit_log",
  "daily_goals",
  "xp_award",
  "inventory_unlock",
  "loadout",
  "profile",
  "prefs",
  "saved_meal",
] as const;

export type PendingServerOpType = (typeof PENDING_SERVER_OP_TYPES)[number];

export const PENDING_SERVER_OP_STATUSES = [
  "pending",
  "synced",
  "failed",
  "rejected",
] as const;

export type PendingServerOpStatus =
  (typeof PENDING_SERVER_OP_STATUSES)[number];

/** Server may trust `fact`; must recompute or reject `untrusted_client`. */
export type PendingServerOpTrust = "fact" | "untrusted_client";

export type PendingServerOp = {
  id: string;
  type: PendingServerOpType;
  payload_json: string;
  createdAt: string;
  status: PendingServerOpStatus;
  clientClockAt: string | null;
  schemaVersion: number | null;
  trust: PendingServerOpTrust;
};

export type EnqueueOpOptions = {
  /**
   * Stable idempotency key. Defaults to a new UUID.
   * Pass an existing entity id when the server should dedupe on that id.
   * Never regenerate this when retrying a failed drain.
   */
  id?: string;
  /** Wall clock when the client created the underlying write (defaults to now). */
  clientClockAt?: string;
  /** Override payload schema version (defaults to PENDING_OP_SCHEMA_VERSION). */
  schemaVersion?: number;
};
