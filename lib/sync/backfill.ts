import type { SQLiteDatabase } from "expo-sqlite";

import { enqueueUnqueuedHabitLogs, enqueueUnqueuedWeightJourney } from "@/lib/db";
import { enqueueUnqueuedTraining } from "@/lib/db/training";

/**
 * Make sure every fact on this device has an outbox op, so the account's
 * backup is complete. Covers data saved by builds that predate a sync type
 * (finished workouts, plans, the weight journey) and a log saved just before
 * the app was killed. Rows restored from the server are skipped.
 * Returns how many ops were queued.
 */
export async function enqueueMissingSyncOps(db: SQLiteDatabase): Promise<number> {
  let queued = await enqueueUnqueuedHabitLogs(db);
  queued += await enqueueUnqueuedTraining(db);
  if (await enqueueUnqueuedWeightJourney(db)) queued += 1;
  return queued;
}
