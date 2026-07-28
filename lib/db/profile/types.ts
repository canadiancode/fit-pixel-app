/**
 * Draft local profile (singleton). PII — store only what Settings UI needs.
 *
 * `profileVisible=false` is a hard publish gate for future sync/drain: never
 * treat a profile as public without checking this flag server-side.
 * Never store passwords / auth tokens here or in pending_server_ops.
 */

export type AppProfile = {
  displayName: string;
  bio: string;
  homeGymId: string | null;
  homeGymName: string | null;
  /** Future publish filter — always included in profile op payloads. */
  profileVisible: boolean;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  updatedAt: string;
};

export type AppProfileUpdate = {
  displayName?: string;
  bio?: string;
  homeGymId?: string | null;
  homeGymName?: string | null;
  profileVisible?: boolean;
  instagram?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
};

export const DEFAULT_APP_PROFILE = {
  displayName: "",
  bio: "",
  homeGymId: null as string | null,
  homeGymName: null as string | null,
  profileVisible: true,
  instagram: null as string | null,
  tiktok: null as string | null,
  youtube: null as string | null,
} as const;

/** Fallback display name when the draft field is empty. */
export const PROFILE_DISPLAY_NAME_FALLBACK = "Fit Pixel";
