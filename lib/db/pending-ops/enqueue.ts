import type { SQLiteDatabase } from "expo-sqlite";

import { newLocalRecord, nowIso } from "../ids";
import { sanitizePendingOpPayload } from "./sanitize";
import { trustForOpType } from "./trust";
import {
  PENDING_OP_SCHEMA_VERSION,
  PENDING_SERVER_OP_TYPES,
  type EnqueueOpOptions,
  type PendingServerOp,
  type PendingServerOpStatus,
  type PendingServerOpType,
} from "./types";

const enqueueListeners = new Set<() => void>();

export function subscribePendingOpEnqueue(listener: () => void): () => void {
  enqueueListeners.add(listener);
  return () => {
    enqueueListeners.delete(listener);
  };
}

function notifyPendingOpEnqueue(): void {
  for (const listener of enqueueListeners) {
    listener();
  }
}

export type DrainableOpCounts = {
  pending: number;
  failed: number;
};

/** Rows still waiting to drain (pending + failed retries). */
export async function countDrainableOps(
  db: SQLiteDatabase,
): Promise<DrainableOpCounts> {
  const rows = await db.getAllAsync<{ status: string; n: number }>(
    `SELECT status, COUNT(*) AS n
     FROM pending_server_ops
     WHERE status IN ('pending', 'failed')
     GROUP BY status`,
  );
  const counts: DrainableOpCounts = { pending: 0, failed: 0 };
  for (const row of rows) {
    const n = Number(row.n) || 0;
    if (row.status === "pending") counts.pending = n;
    if (row.status === "failed") counts.failed = n;
  }
  return counts;
}

type PendingServerOpRow = {
  id: string;
  type: string;
  payload_json: string;
  createdAt: string;
  status: string;
  clientClockAt: string | null;
  schemaVersion: number | null;
  trust: string;
};

function mapRow(row: PendingServerOpRow): PendingServerOp {
  return {
    id: row.id,
    type: row.type as PendingServerOpType,
    payload_json: row.payload_json,
    createdAt: row.createdAt,
    status: row.status as PendingServerOpStatus,
    clientClockAt: row.clientClockAt,
    schemaVersion: row.schemaVersion,
    trust: row.trust as PendingServerOp["trust"],
  };
}

function assertPendingOpType(type: string): asserts type is PendingServerOpType {
  if (
    !(PENDING_SERVER_OP_TYPES as readonly string[]).includes(type)
  ) {
    throw new Error(`enqueueOp: unsupported op type "${type}"`);
  }
}

/**
 * Append-only enqueue. Payload is frozen at insert time (no silent edits).
 * `id` is the idempotency key — reuse the same row on retry; never re-enqueue.
 */
export async function enqueueOp(
  db: SQLiteDatabase,
  type: PendingServerOpType,
  payload: Record<string, unknown>,
  options?: EnqueueOpOptions,
): Promise<PendingServerOp> {
  assertPendingOpType(type);

  const { id, createdAt } = newLocalRecord();
  const opId = options?.id ?? id;
  const clientClockAt = options?.clientClockAt ?? nowIso();
  const schemaVersion = options?.schemaVersion ?? PENDING_OP_SCHEMA_VERSION;
  const trust = trustForOpType(type);
  const payload_json = JSON.stringify(sanitizePendingOpPayload(payload));

  await db.runAsync(
    `INSERT INTO pending_server_ops (
      id, type, payload_json, createdAt, status, clientClockAt, schemaVersion, trust
    ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
    opId,
    type,
    payload_json,
    createdAt,
    clientClockAt,
    schemaVersion,
    trust,
  );

  notifyPendingOpEnqueue();

  return {
    id: opId,
    type,
    payload_json,
    createdAt,
    status: "pending",
    clientClockAt,
    schemaVersion,
    trust,
  };
}

/**
 * Restore: note that a row came from the server, so the outbox backfill does
 * not upload it again. Stored as an already-synced op (never drained).
 */
export async function recordRestoredOp(
  db: SQLiteDatabase,
  type: PendingServerOpType,
  id: string,
  payload: Record<string, unknown>,
): Promise<void> {
  assertPendingOpType(type);
  const createdAt = nowIso();
  await db.runAsync(
    `INSERT OR IGNORE INTO pending_server_ops (
      id, type, payload_json, createdAt, status, clientClockAt, schemaVersion, trust
    ) VALUES (?, ?, ?, ?, 'synced', NULL, ?, ?)`,
    id,
    type,
    JSON.stringify(payload),
    createdAt,
    PENDING_OP_SCHEMA_VERSION,
    trustForOpType(type),
  );
}

/** Mark failed for debug / retry. Does not change payload. Never promotes to synced. */
export async function markOpFailed(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  const result = await db.runAsync(
    `UPDATE pending_server_ops
     SET status = 'failed'
     WHERE id = ? AND status IN ('pending', 'failed')`,
    id,
  );
  if (result.changes === 0) {
    throw new Error(
      `markOpFailed: op ${id} missing or already synced (refusing overwrite)`,
    );
  }
  notifyPendingOpEnqueue();
}

/**
 * Only path to `synced`. Requires a non-empty server ACK id — never auto-force
 * without an idempotent server acknowledgment.
 */
export async function acknowledgeOpSynced(
  db: SQLiteDatabase,
  id: string,
  serverAck: { ackId: string },
): Promise<void> {
  const ackId = serverAck.ackId.trim();
  if (!ackId) {
    throw new Error(
      "acknowledgeOpSynced: serverAck.ackId is required (no force-synced without ACK)",
    );
  }

  const result = await db.runAsync(
    `UPDATE pending_server_ops
     SET status = 'synced'
     WHERE id = ? AND status IN ('pending', 'failed')`,
    id,
  );
  if (result.changes === 0) {
    throw new Error(
      `acknowledgeOpSynced: op ${id} missing or already synced (ack=${ackId})`,
    );
  }
  notifyPendingOpEnqueue();
}

/**
 * Terminal validation rejection from the server. Payload is frozen; do not retry.
 */
export async function acknowledgeOpRejected(
  db: SQLiteDatabase,
  id: string,
  serverAck: { ackId: string; reason?: string },
): Promise<void> {
  const ackId = serverAck.ackId.trim();
  if (!ackId) {
    throw new Error("acknowledgeOpRejected: serverAck.ackId is required");
  }

  const result = await db.runAsync(
    `UPDATE pending_server_ops
     SET status = 'rejected'
     WHERE id = ? AND status IN ('pending', 'failed')`,
    id,
  );
  if (result.changes === 0) {
    throw new Error(
      `acknowledgeOpRejected: op ${id} missing or already terminal (ack=${ackId})`,
    );
  }
  notifyPendingOpEnqueue();
}

/**
 * Ops still waiting to drain, oldest first. `excludeIds` skips ops the server
 * asked to hold (see the drain's deferred set) so they can't block newer ones.
 */
export async function listDrainableOps(
  db: SQLiteDatabase,
  limit = 50,
  excludeIds: readonly string[] = [],
): Promise<PendingServerOp[]> {
  const exclude =
    excludeIds.length > 0
      ? `AND id NOT IN (${excludeIds.map(() => "?").join(", ")})`
      : "";
  const rows = await db.getAllAsync<PendingServerOpRow>(
    `SELECT id, type, payload_json, createdAt, status, clientClockAt, schemaVersion, trust
     FROM pending_server_ops
     WHERE status IN ('pending', 'failed') ${exclude}
     ORDER BY createdAt ASC
     LIMIT ?`,
    ...excludeIds,
    limit,
  );
  return rows.map(mapRow);
}

export async function getPendingOp(
  db: SQLiteDatabase,
  id: string,
): Promise<PendingServerOp | null> {
  const row = await db.getFirstAsync<PendingServerOpRow>(
    `SELECT id, type, payload_json, createdAt, status, clientClockAt, schemaVersion, trust
     FROM pending_server_ops
     WHERE id = ?`,
    id,
  );
  return row == null ? null : mapRow(row);
}

export type InventoryUnlockRecord = {
  itemId: string;
  unlockedAt: string;
  /** Player level when the item was unlocked, if the client recorded it. */
  clientLevel: number | null;
};

/**
 * Item unlocks this device has recorded, earliest per item. Synced ops stay in
 * the table, so this doubles as the local unlock history (lost on wipe).
 */
export async function listInventoryUnlocks(
  db: SQLiteDatabase,
): Promise<InventoryUnlockRecord[]> {
  const rows = await db.getAllAsync<{ payload_json: string; createdAt: string }>(
    `SELECT payload_json, createdAt
     FROM pending_server_ops
     WHERE type = 'inventory_unlock' AND status != 'rejected'
     ORDER BY createdAt ASC`,
  );
  const byItem = new Map<string, InventoryUnlockRecord>();
  for (const row of rows) {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(row.payload_json) as Record<string, unknown>;
    } catch {
      continue;
    }
    const itemId = payload.itemId;
    if (typeof itemId !== "string" || byItem.has(itemId)) continue;
    byItem.set(itemId, {
      itemId,
      unlockedAt:
        typeof payload.unlockedAt === "string" ? payload.unlockedAt : row.createdAt,
      clientLevel:
        typeof payload.clientLevel === "number" ? payload.clientLevel : null,
    });
  }
  return [...byItem.values()];
}
