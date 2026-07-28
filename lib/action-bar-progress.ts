/** Visual fill bounds for action row progress bars (distinct from Today's progress XP bar). */
export const ACTION_BAR_DISPLAY_MIN = 8;
export const ACTION_BAR_DISPLAY_MAX = 96;

/**
 * Map raw 0–100 goal progress into the bar artwork range [8, 96].
 * 0% → 8, 100% → 96 (linear). Keeps the end-cap inside the container art.
 */
export function clampActionBarPercent(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) {
    return ACTION_BAR_DISPLAY_MIN;
  }
  const progress = Math.min(100, raw) / 100;
  return (
    ACTION_BAR_DISPLAY_MIN +
    progress * (ACTION_BAR_DISPLAY_MAX - ACTION_BAR_DISPLAY_MIN)
  );
}
