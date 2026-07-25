/** Visual fill bounds for action row progress bars (distinct from Today's progress XP bar). */
export const ACTION_BAR_DISPLAY_MIN = 8;
export const ACTION_BAR_DISPLAY_MAX = 96;

/**
 * Map raw 0–100 progress into the bar artwork range.
 * True zero stays empty (no min fill) until the user has logged progress.
 */
export function clampActionBarPercent(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  if (raw >= ACTION_BAR_DISPLAY_MAX) return ACTION_BAR_DISPLAY_MAX;
  return Math.max(ACTION_BAR_DISPLAY_MIN, raw);
}
