import * as SecureStore from "expo-secure-store";
import * as StoreReview from "expo-store-review";

/**
 * Levels where we ask for an App Store rating: an early win, a formed habit,
 * and the Big body upgrade. iOS also caps the prompt at 3 showings a year.
 */
const REVIEW_LEVELS = [3, 8, 15] as const;
const LAST_ASKED_KEY = "review_prompt_last_level";
/** Let the level-up land on screen before the system sheet covers it. */
const DELAY_MS = 1500;

let pending = false;

/**
 * Call when the Pixel reaches `level` through normal play. Asks at most once
 * per milestone in REVIEW_LEVELS, release builds only.
 */
export async function maybeAskForReview(level: number): Promise<void> {
  if (__DEV__ || pending) return;
  const milestone = [...REVIEW_LEVELS].reverse().find((l) => level >= l);
  if (milestone === undefined) return;

  pending = true;
  try {
    const last = Number((await SecureStore.getItemAsync(LAST_ASKED_KEY)) ?? 0);
    if (milestone <= last) return;
    if (!(await StoreReview.hasAction())) return;
    await SecureStore.setItemAsync(LAST_ASKED_KEY, String(milestone));
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    await StoreReview.requestReview();
  } catch {
    // Never let a rating prompt break the app.
  } finally {
    pending = false;
  }
}
