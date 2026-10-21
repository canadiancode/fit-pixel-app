import type {
  JourneyDirection,
  WeightJourneyProgress,
} from "./weight-journey-math";

/**
 * Weight wording that follows the goal's direction: someone cutting sees
 * "lose" and "down" as progress, someone bulking sees "gain" and "up", and a
 * maintainer sees their range. Never frames either direction as bad.
 */

type Format = (value: number | null | undefined) => string;

export function journeyTitle(direction: JourneyDirection | null): string {
  switch (direction) {
    case "lose":
      return "Weight loss goal";
    case "gain":
      return "Weight gain goal";
    case "maintain":
      return "Maintaining weight";
    default:
      return "Your journey";
  }
}

/** One-line headline, e.g. "22 LBS to lose" or "8 LBS to gain". */
export function journeyHeadline(
  journey: WeightJourneyProgress | null,
  format: Format,
  hidden: boolean,
): string {
  if (journey == null) return "Log a weigh-in to start";
  if (journey.direction === "maintain") {
    if (journey.inRange) return "In your range";
    const side = journey.current > journey.target ? "above" : "below";
    return hidden ? `Just ${side} range` : `${format(journey.remaining)} ${side} range`;
  }
  if (journey.goalReached) return "Goal weight reached!";
  const percent = Math.round(journey.progress * 100);
  if (hidden) return `${percent}% of the way`;
  const verb = journey.direction === "lose" ? "lose" : "gain";
  return `${format(journey.remaining)} to ${verb}`;
}

/** What the next milestone asks for and pays. */
export function nextMilestoneLine(
  journey: WeightJourneyProgress | null,
  format: Format,
  hidden: boolean,
): string {
  if (journey == null) return "Your first reading becomes your start weight.";
  if (journey.direction === "maintain") {
    return "Stay within range of your target each week.";
  }
  const next = journey.nextMilestone;
  if (next == null) return "Every milestone reached. Set a new target any time.";
  const reward =
    next.reward != null ? ` unlocks ${next.reward.label}` : " earns XP";
  const toward = journey.direction === "lose" ? "Down to" : "Up to";
  return hidden
    ? `Next milestone${reward}`
    : `${toward} ${format(next.threshold)}${reward}`;
}

/**
 * Trend summary for a change in the rolling average. Movement toward the
 * goal reads as progress; movement away gets encouragement, not alarm.
 */
export function trendSummary(input: {
  change: number | null;
  direction: JourneyDirection | null;
  steady: number;
  hidden: boolean;
  format: Format;
  rangeLabel: string;
}): string {
  const { change, direction, steady, hidden, format, rangeLabel } = input;
  if (change == null) return "Log two weigh-ins to see your trend.";

  const moved = Math.abs(change) >= steady;
  const amount = `${change < 0 ? "Down" : "Up"} ${format(Math.abs(change))}`;
  const prefix = hidden ? "" : moved ? `${amount} · ` : "";

  if (!moved) {
    return direction === "maintain" || direction == null
      ? "Holding steady"
      : `Holding steady · ${rangeLabel}`;
  }
  if (direction == null || direction === "maintain") {
    return hidden ? (change < 0 ? "Trending down" : "Trending up") : `${amount} · ${rangeLabel}`;
  }
  const toward = direction === "lose" ? change < 0 : change > 0;
  return `${prefix}${toward ? "On track" : "Keep going"} · ${rangeLabel}`;
}

/** Caption under the target stepper explaining what the target implies. */
export function targetCaption(direction: JourneyDirection | null): string {
  switch (direction) {
    case "lose":
      return "Below your start weight: progress means going down.";
    case "gain":
      return "Above your start weight: progress means going up.";
    case "maintain":
      return "Close to your start weight: stay in range.";
    default:
      return "Set above your weight to build up, below to slim down.";
  }
}
