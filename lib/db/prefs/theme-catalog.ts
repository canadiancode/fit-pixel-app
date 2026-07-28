/**
 * App color themes (local entitlement — cheatable until server grants).
 * Pixel cosmetics live in FileSystem inventory; these are shell color themes.
 */

export type AppThemeId = "blue" | "coral" | "emerald" | "violet";

export type AppThemeDefinition = {
  readonly id: AppThemeId;
  readonly name: string;
  readonly swatch: string;
  /** Minimum local XP level required to unlock (0 = free). Honor-system. */
  readonly unlockLevel: number;
};

export const APP_THEME_CATALOG: readonly AppThemeDefinition[] = [
  {
    id: "blue",
    name: "Ocean blue",
    swatch: "#03418c",
    unlockLevel: 0,
  },
  {
    id: "coral",
    name: "Coral",
    swatch: "#c4584e",
    unlockLevel: 3,
  },
  {
    id: "emerald",
    name: "Emerald",
    swatch: "#1f8f5b",
    unlockLevel: 5,
  },
  {
    id: "violet",
    name: "Violet",
    swatch: "#6b4fb8",
    unlockLevel: 8,
  },
] as const;

export const APP_THEME_IDS = APP_THEME_CATALOG.map((t) => t.id);

export const DEFAULT_THEME_ID: AppThemeId = "blue";

export function getThemeDefinition(
  id: string,
): AppThemeDefinition | undefined {
  return APP_THEME_CATALOG.find((t) => t.id === id);
}

export function isAppThemeId(value: string): value is AppThemeId {
  return (APP_THEME_IDS as readonly string[]).includes(value);
}
