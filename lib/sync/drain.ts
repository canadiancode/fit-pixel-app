import type { SQLiteDatabase } from "expo-sqlite";

import { FitPixelApiError } from "@/lib/api/client";
import { postSyncOps, type SyncOpWire } from "@/lib/api/sync";
import {
  acknowledgeOpRejected,
  acknowledgeOpSynced,
  listDrainableOps,
  markOpFailed,
  PENDING_OP_SCHEMA_VERSION,
  type PendingServerOp,
} from "@/lib/db";
import { setLastDrainError } from "@/lib/sync/drain-status";

function parsePayload(json: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (parsed != null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

function toWire(op: PendingServerOp): SyncOpWire | null {
  const payload = parsePayload(op.payload_json);
  if (!payload) return null;
  return {
    id: op.id,
    type: op.type,
    payload,
    clientClockAt: op.clientClockAt,
    schemaVersion: op.schemaVersion ?? PENDING_OP_SCHEMA_VERSION,
    trust: op.trust,
  };
}

function drainErrorMessage(err: unknown): string {
  if (err instanceof FitPixelApiError) {
    return err.message;
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return "Could not reach Fit Pixel API.";
}

/**
 * Drain pending/failed outbox rows to POST /v1/sync.
 * No-ops without a user JWT.
 */
export async function drainPendingServerOps(
  db: SQLiteDatabase,
  accessToken: string | null | undefined,
): Promise<void> {
  const token = accessToken?.trim() ?? "";
  if (!token) return;

  const rows = await listDrainableOps(db, 50);
  if (rows.length === 0) return;

  const ops: SyncOpWire[] = [];
  const skippedInvalid: string[] = [];
  for (const row of rows) {
    const wire = toWire(row);
    if (!wire) {
      skippedInvalid.push(row.id);
      continue;
    }
    ops.push(wire);
  }

  for (const id of skippedInvalid) {
    try {
      await acknowledgeOpRejected(db, id, {
        ackId: id,
        reason: "invalid_payload_json",
      });
    } catch {
      // Already terminal.
    }
  }

  if (ops.length === 0) return;

  try {
    const response = await postSyncOps(token, ops);
    const acks = Array.isArray(response.acks) ? response.acks : [];
    const byId = new Map(acks.map((ack) => [ack.id, ack]));

    for (const op of ops) {
      const ack = byId.get(op.id);
      if (ack == null) {
        await markOpFailed(db, op.id);
        continue;
      }
      if (ack.status === "synced") {
        await acknowledgeOpSynced(db, op.id, { ackId: ack.id });
        continue;
      }
      await acknowledgeOpRejected(db, op.id, {
        ackId: ack.id,
        reason: ack.reason,
      });
    }
    setLastDrainError(null);
  } catch (err) {
    setLastDrainError(drainErrorMessage(err));
    for (const op of ops) {
      try {
        await markOpFailed(db, op.id);
      } catch {
        // Already terminal.
      }
    }
  }
}
