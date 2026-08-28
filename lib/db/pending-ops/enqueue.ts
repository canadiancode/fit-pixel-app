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

/** Ops still waiting to drain (pending first, then failed for retry). */
export async function listDrainableOps(
  db: SQLiteDatabase,
  limit = 50,
): Promise<PendingServerOp[]> {
  const rows = await db.getAllAsync<PendingServerOpRow>(
    `SELECT id, type, payload_json, createdAt, status, clientClockAt, schemaVersion, trust
     FROM pending_server_ops
     WHERE status IN ('pending', 'failed')
     ORDER BY createdAt ASC
     LIMIT ?`,
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
