import type { SQLiteDatabase } from "expo-sqlite";

import { fetchServerXp } from "@/lib/api/xp";
import {
  enqueueUnsyncedWeightXpAwards,
  getXpState,
  hasUnsyncedXpOps,
  setXpStateFromServer,
} from "@/lib/db";

/**
 * Adopt the server's XP total once this device has nothing XP-related left to
 * sync, so My Pixel shows the same level as the leaderboard and other devices.
 * Also the one place weight awards are queued (see enqueueUnsyncedWeightXpAwards).
 * Quietly does nothing offline, signed out, or against a server without
 * GET /v1/me/xp. Returns true when local XP changed.
 */
export async function reconcileXpWithServer(
  db: SQLiteDatabase,
  accessToken: string | null | undefined,
): Promise<boolean> {
  const token = accessToken?.trim() ?? "";
  if (!token) return false;
  if (await hasUnsyncedXpOps(db)) return false;

  const before = await getXpState(db);
  let server;
  try {
    server = await fetchServerXp(token);
  } catch {
    return false;
  }
  if (!Number.isFinite(server.lifetimeXp)) return false;

  // The server answered, so it scores weight XP: send any weigh-in or
  // milestone award it hasn't seen, and wait for that sync before adopting
  // its total (queuing triggers a drain, which calls this again).
  if ((await enqueueUnsyncedWeightXpAwards(db)) > 0) return false;

  return setXpStateFromServer(db, {
    lifetimeXp: server.lifetimeXp,
    expectUpdatedAt: before.updatedAt,
  });
}
