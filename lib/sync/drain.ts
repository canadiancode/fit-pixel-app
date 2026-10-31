import type { SQLiteDatabase } from "expo-sqlite";

import { FitPixelApiError } from "@/lib/api/client";
import { postSyncOps, type SyncAck, type SyncOpWire } from "@/lib/api/sync";
import {
  acknowledgeOpRejected,
  acknowledgeOpSynced,
  countDrainableOps,
  listDrainableOps,
  markOpFailed,
  PENDING_OP_SCHEMA_VERSION,
  type PendingServerOp,
} from "@/lib/db";
import { setLastDrainError } from "@/lib/sync/drain-status";

/**
 * Ops the server can't take yet (an op type it doesn't know, or a lone op it
 * refused with a 400). They stay in the outbox, still count as unsynced, and
 * are skipped until the next app launch or foreground so they never block
 * newer ops. Nothing here ever drops an op on its own.
 */
const deferredOpIds = new Set<string>();

/** Give held ops another try (foreground, launch). */
export function clearDeferredOps(): void {
  deferredOpIds.clear();
}

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

function isBadRequest(err: unknown): boolean {
  return err instanceof FitPixelApiError && err.status === 400;
}

/** `failed`: the POST did not complete; the caller should back off. */
export type DrainOutcome = "idle" | "sent" | "failed";

async function markFailed(db: SQLiteDatabase, ids: readonly string[]): Promise<void> {
  for (const id of ids) {
    try {
      await markOpFailed(db, id);
    } catch {
      // Already terminal.
    }
  }
}

/**
 * Apply the server's acks. Returns true when every op got a final answer
 * (synced, rejected or held) so the caller can send the next batch at once.
 */
async function applyAcks(
  db: SQLiteDatabase,
  ops: readonly SyncOpWire[],
  acks: readonly SyncAck[],
): Promise<boolean> {
  const byId = new Map(acks.map((ack) => [ack.id, ack]));
  let missingAck = false;

  for (const op of ops) {
    const ack = byId.get(op.id);
    if (ack == null) {
      missingAck = true;
      await markFailed(db, [op.id]);
      continue;
    }
    if (ack.status === "synced") {
      await acknowledgeOpSynced(db, op.id, { ackId: ack.id });
      continue;
    }
    // This server doesn't know the op type yet (app newer than server): keep
    // the op and retry after a server update instead of dropping it.
    if (ack.reason === "unsupported_type") {
      deferredOpIds.add(op.id);
      await markFailed(db, [op.id]);
      continue;
    }
    await acknowledgeOpRejected(db, op.id, {
      ackId: ack.id,
      reason: ack.reason,
    });
  }
  return !missingAck;
}

/**
 * A 400 for a whole batch means the server refused something in it (older
 * servers validated the batch as one). Send each op alone so the good ones
 * still upload and only the refused op is held back.
 */
async function sendOneByOne(
  db: SQLiteDatabase,
  token: string,
  ops: readonly SyncOpWire[],
): Promise<DrainOutcome> {
  for (let i = 0; i < ops.length; i += 1) {
    const op = ops[i];
    try {
      const response = await postSyncOps(token, [op]);
      await applyAcks(db, [op], Array.isArray(response.acks) ? response.acks : []);
    } catch (err) {
      if (isBadRequest(err)) {
        deferredOpIds.add(op.id);
        await markFailed(db, [op.id]);
        continue;
      }
      setLastDrainError(drainErrorMessage(err));
      await markFailed(
        db,
        ops.slice(i).map((rest) => rest.id),
      );
      return "failed";
    }
  }
  setLastDrainError(null);
  return "sent";
}

/** One drain at a time: the background loop and a sign-out flush share it. */
let drainQueue: Promise<unknown> = Promise.resolve();

/**
 * Drain pending/failed outbox rows to POST /v1/sync.
 * No-ops without a user JWT.
 */
export function drainPendingServerOps(
  db: SQLiteDatabase,
  accessToken: string | null | undefined,
): Promise<DrainOutcome> {
  const run = drainQueue.then(() => drainOnce(db, accessToken));
  drainQueue = run.catch(() => undefined);
  return run;
}

async function drainOnce(
  db: SQLiteDatabase,
  accessToken: string | null | undefined,
): Promise<DrainOutcome> {
  const token = accessToken?.trim() ?? "";
  if (!token) return "idle";

  const rows = await listDrainableOps(db, 50, [...deferredOpIds]);
  if (rows.length === 0) return "idle";

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

  if (ops.length === 0) return "idle";

  try {
    const response = await postSyncOps(token, ops);
    const complete = await applyAcks(
      db,
      ops,
      Array.isArray(response.acks) ? response.acks : [],
    );
    setLastDrainError(null);
    // An op the server skipped would otherwise be resent right away.
    return complete ? "sent" : "failed";
  } catch (err) {
    if (isBadRequest(err) && ops.length > 1) {
      return sendOneByOne(db, token, ops);
    }
    if (isBadRequest(err)) {
      deferredOpIds.add(ops[0].id);
    }
    setLastDrainError(drainErrorMessage(err));
    await markFailed(
      db,
      ops.map((op) => op.id),
    );
    return "failed";
  }
}

/**
 * Upload everything this device can right now (before sign-out). Returns how
 * many ops are still waiting afterwards; 0 means the account has it all.
 */
export async function drainUntilIdle(
  db: SQLiteDatabase,
  accessToken: string | null | undefined,
  maxRounds = 20,
): Promise<number> {
  for (let round = 0; round < maxRounds; round += 1) {
    const outcome = await drainPendingServerOps(db, accessToken);
    if (outcome !== "sent") break;
  }
  const counts = await countDrainableOps(db);
  return counts.pending + counts.failed;
}
