import type { SQLiteDatabase } from "expo-sqlite";

import { nowIso } from "../ids";
import { enqueueOp } from "../pending-ops";
import { PROFILE_LIMITS } from "./limits";
import {
  DEFAULT_APP_PROFILE,
  type AppProfile,
  type AppProfileUpdate,
} from "./types";

type ProfileRow = {
  displayName: string;
  bio: string;
  homeGymId: string | null;
  homeGymName: string | null;
  profileVisible: number;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  updatedAt: string;
};

function mapRow(row: ProfileRow): AppProfile {
  return {
    displayName: row.displayName,
    bio: row.bio,
    homeGymId: row.homeGymId,
    homeGymName: row.homeGymName,
    profileVisible: row.profileVisible === 1,
    instagram: row.instagram,
    tiktok: row.tiktok,
    youtube: row.youtube,
    updatedAt: row.updatedAt,
  };
}

function assertMaxLength(
  field: string,
  value: string,
  max: number,
): string {
  if (value.length > max) {
    throw new Error(`${field} must be at most ${max} characters`);
  }
  return value;
}

/**
 * Accept empty, @handles, or http(s) URLs. Reject other URL schemes
 * (javascript:, data:, etc.).
 */
function sanitizeSocialLink(
  field: string,
  value: string | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  assertMaxLength(field, trimmed, PROFILE_LIMITS.socialMax);

  const lower = trimmed.toLowerCase();
  if (lower.includes("://")) {
    if (!lower.startsWith("https://") && !lower.startsWith("http://")) {
      throw new Error(`${field} URLs must use http or https`);
    }
  }

  return trimmed;
}

function sanitizeOptionalText(
  field: string,
  value: string | null | undefined,
  max: number,
): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return assertMaxLength(field, trimmed, max);
}

function normalizeUpdate(
  current: AppProfile,
  update: AppProfileUpdate,
): Omit<AppProfile, "updatedAt"> {
  const displayName =
    update.displayName === undefined
      ? current.displayName
      : assertMaxLength(
          "displayName",
          update.displayName.trim(),
          PROFILE_LIMITS.displayNameMax,
        );

  const bio =
    update.bio === undefined
      ? current.bio
      : assertMaxLength("bio", update.bio.trim(), PROFILE_LIMITS.bioMax);

  const homeGymId =
    update.homeGymId === undefined
      ? current.homeGymId
      : sanitizeOptionalText(
          "homeGymId",
          update.homeGymId,
          PROFILE_LIMITS.homeGymIdMax,
        );

  const homeGymName =
    update.homeGymName === undefined
      ? current.homeGymName
      : sanitizeOptionalText(
          "homeGymName",
          update.homeGymName,
          PROFILE_LIMITS.homeGymNameMax,
        );

  return {
    displayName,
    bio,
    homeGymId,
    homeGymName,
    profileVisible: update.profileVisible ?? current.profileVisible,
    instagram:
      update.instagram === undefined
        ? current.instagram
        : sanitizeSocialLink("instagram", update.instagram),
    tiktok:
      update.tiktok === undefined
        ? current.tiktok
        : sanitizeSocialLink("tiktok", update.tiktok),
    youtube:
      update.youtube === undefined
        ? current.youtube
        : sanitizeSocialLink("youtube", update.youtube),
  };
}

function profileEqual(
  a: Omit<AppProfile, "updatedAt">,
  b: Omit<AppProfile, "updatedAt">,
): boolean {
  return (
    a.displayName === b.displayName &&
    a.bio === b.bio &&
    a.homeGymId === b.homeGymId &&
    a.homeGymName === b.homeGymName &&
    a.profileVisible === b.profileVisible &&
    a.instagram === b.instagram &&
    a.tiktok === b.tiktok &&
    a.youtube === b.youtube
  );
}

function profilePayload(profile: AppProfile): Record<string, unknown> {
  return {
    displayName: profile.displayName,
    bio: profile.bio,
    homeGymId: profile.homeGymId,
    homeGymName: profile.homeGymName,
    // Publish gate for future drain — always present.
    profileVisible: profile.profileVisible,
    instagram: profile.instagram,
    tiktok: profile.tiktok,
    youtube: profile.youtube,
    updatedAt: profile.updatedAt,
  };
}

async function seedProfileIfNeeded(db: SQLiteDatabase): Promise<AppProfile> {
  const updatedAt = nowIso();
  await db.runAsync(
    `INSERT OR IGNORE INTO app_profile (
      id, displayName, bio, homeGymId, homeGymName, profileVisible,
      instagram, tiktok, youtube, updatedAt
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    DEFAULT_APP_PROFILE.displayName,
    DEFAULT_APP_PROFILE.bio,
    DEFAULT_APP_PROFILE.homeGymId,
    DEFAULT_APP_PROFILE.homeGymName,
    DEFAULT_APP_PROFILE.profileVisible ? 1 : 0,
    DEFAULT_APP_PROFILE.instagram,
    DEFAULT_APP_PROFILE.tiktok,
    DEFAULT_APP_PROFILE.youtube,
    updatedAt,
  );

  const row = await db.getFirstAsync<ProfileRow>(
    `SELECT displayName, bio, homeGymId, homeGymName, profileVisible,
            instagram, tiktok, youtube, updatedAt
     FROM app_profile WHERE id = 1`,
  );
  if (row == null) {
    throw new Error("app_profile singleton missing after seed");
  }
  return mapRow(row);
}

/** Load draft profile (seeds empty defaults on first read). */
export async function getProfile(db: SQLiteDatabase): Promise<AppProfile> {
  const row = await db.getFirstAsync<ProfileRow>(
    `SELECT displayName, bio, homeGymId, homeGymName, profileVisible,
            instagram, tiktok, youtube, updatedAt
     FROM app_profile WHERE id = 1`,
  );
  if (row != null) {
    return mapRow(row);
  }
  return seedProfileIfNeeded(db);
}

/**
 * Partial profile update. Enqueues a `profile` fact (always includes
 * `profileVisible` as a publish gate).
 *
 * SECURITY: PII only; no passwords/tokens. Sanitize lengths + social URL schemes.
 */
export async function setProfile(
  db: SQLiteDatabase,
  update: AppProfileUpdate,
): Promise<AppProfile> {
  const current = await getProfile(db);
  const nextFields = normalizeUpdate(current, update);

  if (profileEqual(nextFields, current)) {
    return current;
  }

  const updatedAt = nowIso();
  await db.runAsync(
    `UPDATE app_profile SET
      displayName = ?, bio = ?, homeGymId = ?, homeGymName = ?,
      profileVisible = ?, instagram = ?, tiktok = ?, youtube = ?,
      updatedAt = ?
     WHERE id = 1`,
    nextFields.displayName,
    nextFields.bio,
    nextFields.homeGymId,
    nextFields.homeGymName,
    nextFields.profileVisible ? 1 : 0,
    nextFields.instagram,
    nextFields.tiktok,
    nextFields.youtube,
    updatedAt,
  );

  const next: AppProfile = { ...nextFields, updatedAt };

  await enqueueOp(db, "profile", profilePayload(next), {
    clientClockAt: updatedAt,
  });

  return next;
}
