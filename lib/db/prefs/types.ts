import {
  DEFAULT_DAY_STARTS_AT_MINUTES,
} from "../day-boundary/types";
import { DEFAULT_THEME_ID, type AppThemeId } from "./theme-catalog";

export const UNIT_SYSTEMS = ["metric", "imperial"] as const;
export type UnitSystem = (typeof UNIT_SYSTEMS)[number];

/**
 * Consolidated prefs view: `app_prefs` row + day boundary fields.
 *
 * Theme entitlement (`unlockedThemeIds`) is local / cheatable until a server
 * re-validates unlocks from XP / purchase facts.
 */
export type AppPrefs = {
  unitSystem: UnitSystem;
  selectedThemeId: AppThemeId;
  unlockedThemeIds: readonly AppThemeId[];
  notifAccountability: boolean;
  notifNews: boolean;
  dayStartsAtMinutes: number;
  timeZone: string;
  updatedAt: string;
};

export type AppPrefsUpdate = {
  unitSystem?: UnitSystem;
  selectedThemeId?: AppThemeId;
  unlockedThemeIds?: readonly AppThemeId[];
  notifAccountability?: boolean;
  notifNews?: boolean;
  dayStartsAtMinutes?: number;
  timeZone?: string;
};

/** Seed matches existing daily_goals defaults (oz / lb). */
export const DEFAULT_APP_PREFS = {
  unitSystem: "imperial" as UnitSystem,
  selectedThemeId: DEFAULT_THEME_ID,
  unlockedThemeIds: [DEFAULT_THEME_ID] as readonly AppThemeId[],
  notifAccountability: false,
  notifNews: false,
  dayStartsAtMinutes: DEFAULT_DAY_STARTS_AT_MINUTES,
} as const;
