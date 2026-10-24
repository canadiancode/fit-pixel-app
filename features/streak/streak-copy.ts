/**
 * Streak celebration tiers and copy. The takeover grows with the streak:
 * each tier adds effects on top of the last (see streak-celebration.tsx).
 */
export type StreakTier = 1 | 2 | 3 | 4 | 5;

export function getStreakTier(count: number): StreakTier {
  if (count >= 30) return 5;
  if (count >= 14) return 4;
  if (count >= 7) return 3;
  if (count >= 3) return 2;
  return 1;
}

export const STREAK_TIER_NAMES: Record<StreakTier, string> = {
  1: "SPARK",
  2: "KINDLE",
  3: "BLAZE",
  4: "INFERNO",
  5: "LEGEND",
};

/** Headline / accent color per tier. */
export const STREAK_TIER_COLORS: Record<StreakTier, string> = {
  1: "#FFFFFF",
  2: "#7FE7FF",
  3: "#FFD23F",
  4: "#FFB02E",
  5: "#FFE680",
};

const MILESTONES: Readonly<Record<number, { title: string; line: string }>> = {
  1: {
    title: "STREAK STARTED",
    line: "Day one. Every streak starts with showing up.",
  },
  3: {
    title: "3-DAY STREAK",
    line: "Three days in a row. You're building something.",
  },
  7: {
    title: "1-WEEK STREAK",
    line: "A full week. This is how habits are made.",
  },
  14: {
    title: "2-WEEK STREAK",
    line: "Two weeks strong. This is who you are now.",
  },
  21: {
    title: "3-WEEK STREAK",
    line: "21 days straight. It's not a phase, it's a habit.",
  },
  30: {
    title: "1-MONTH STREAK",
    line: "A whole month of showing up. Legendary.",
  },
  50: {
    title: "50-DAY STREAK",
    line: "Fifty days. Your Pixel is in awe of you.",
  },
  75: {
    title: "75-DAY STREAK",
    line: "Seventy-five days. Most people never get here.",
  },
  100: {
    title: "100-DAY STREAK",
    line: "Triple digits. Absolutely unstoppable.",
  },
  150: {
    title: "150-DAY STREAK",
    line: "150 days. Consistency is your superpower.",
  },
  200: {
    title: "200-DAY STREAK",
    line: "Two hundred days. Hall of fame material.",
  },
  365: {
    title: "1-YEAR STREAK",
    line: "A full year. You're not the same person who started.",
  },
};

const DAILY_LINES = [
  "Another day stronger. Keep stacking them.",
  "You showed up again. That's the whole game.",
  "Consistency looks good on you.",
  "Your Pixel felt that one.",
  "Stacking days like reps.",
  "Small steps, every day. That's how it's done.",
  "Momentum is building. Don't stop now.",
  "Future you says thanks.",
  "One more day in the books. Proud of you.",
  "Progress compounds. You're proof.",
  "Day after day. That's what champions do.",
  "The streak lives on. So does the glow-up.",
] as const;

export function isStreakMilestone(count: number): boolean {
  return MILESTONES[count] != null || (count > 365 && count % 100 === 0);
}

export function getStreakCopy(count: number): { title: string; line: string } {
  const milestone = MILESTONES[count];
  if (milestone != null) return milestone;
  if (count > 365 && count % 100 === 0) {
    return {
      title: `${count}-DAY STREAK`,
      line: "Still going. You're writing the record book.",
    };
  }
  return {
    title: `${count}-DAY STREAK`,
    line: DAILY_LINES[count % DAILY_LINES.length],
  };
}

/** The Pixel's victory move: varies by day, with bigger moves unlocked by tier. */
export type PixelMove = "hop" | "flex" | "spin" | "flip";

export function getPixelMove(count: number, tier: StreakTier): PixelMove {
  const moves: readonly PixelMove[] =
    tier === 1
      ? ["hop"]
      : tier === 2
        ? ["hop", "flex"]
        : tier === 3
          ? ["hop", "flex", "spin"]
          : ["flex", "spin", "flip"];
  // Milestones always get the biggest move this tier has.
  if (isStreakMilestone(count)) return moves[moves.length - 1];
  return moves[count % moves.length];
}
