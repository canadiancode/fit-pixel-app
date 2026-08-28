import type { SQLiteDatabase } from "expo-sqlite";

import { nowIso } from "../ids";

/**
 * Last signed-in user id only — never JWTs or passwords.
 * Used to wipe local SQLite when a different account signs in on this device.
 */
export async function getLastAuthUserId(
  db: SQLiteDatabase,
): Promise<string | null> {
  const row = await db.getFirstAsync<{ lastUserId: string | null }>(
    `SELECT lastUserId FROM auth_local WHERE id = 1`,
  );
  const value = row?.lastUserId?.trim();
  return value ? value : null;
}

export async function setLastAuthUserId(
  db: SQLiteDatabase,
  userId: string | null,
): Promise<void> {
  await db.runAsync(
    `UPDATE auth_local SET lastUserId = ?, updatedAt = ? WHERE id = 1`,
    userId,
    nowIso(),
  );
}
