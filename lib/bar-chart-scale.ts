/**
 * Y-axis scaling for bar charts (mirrors `bar-chart.html` `generateMarkers` + height math).
 */

export type BarChartYScale = {
  markerValues: number[];
  lowestMarker: number;
  highestMarker: number;
  range: number;
};

/** Most gaps between Y-axis labels; past this the labels overlap the plot. */
const MAX_MARKER_INTERVALS = 6;
/** Step multipliers tried per power of ten (×1, ×2, ×2.5, ×4, ×5, ×10, …). */
const NICE_STEP_MULTIPLIERS = [1, 2, 2.5, 4, 5] as const;
/** Leading digits that read well on an axis (e.g. 5K, 25 oz, 60 min); rules out 4 h, 8K, 37.5. */
const NICE_LEADING_VALUES = [1, 1.5, 2, 2.5, 3, 5, 6] as const;

function isNiceStep(step: number): boolean {
  if (!Number.isInteger(step)) return false;
  const leading = step / 10 ** Math.floor(Math.log10(step));
  return NICE_LEADING_VALUES.some((nice) => Math.abs(leading - nice) < 1e-9);
}

/** `formatBarChartYAxisLabel` shows `value` without rounding (1.5K yes, 1.25K → "1.3K" no). */
function hasExactLabel(value: number): boolean {
  return Math.abs(value) < 1000
    ? Number.isInteger(value)
    : Number.isInteger(Math.round((value / 100) * 1e9) / 1e9);
}

function snapDomain(
  lowestVal: number,
  highestVal: number,
  step: number,
  yDomainFromZero: boolean,
  hasTarget: boolean,
) {
  const lowestMarker = yDomainFromZero ? 0 : Math.floor(lowestVal / step) * step;
  let highestMarker = Math.ceil(highestVal / step) * step;
  if (!hasTarget && highestMarker === lowestMarker) {
    highestMarker += step;
  }
  return { lowestMarker, highestMarker };
}

/** Smallest nice multiple of `increment` that fits in `MAX_MARKER_INTERVALS` gaps. */
function pickStep(
  lowestVal: number,
  highestVal: number,
  increment: number,
  yDomainFromZero: boolean,
  hasTarget: boolean,
) {
  for (let scale = 1; ; scale *= 10) {
    for (const multiplier of NICE_STEP_MULTIPLIERS) {
      const step = increment * multiplier * scale;
      // ×1 always counts, so the search ends even for an unusual `increment`.
      if (multiplier !== 1 && !isNiceStep(step)) continue;
      const domain = snapDomain(lowestVal, highestVal, step, yDomainFromZero, hasTarget);
      const intervals = Math.round(
        (domain.highestMarker - domain.lowestMarker) / step,
      );
      if (intervals > MAX_MARKER_INTERVALS) continue;
      const labelsExact = Array.from({ length: intervals + 1 }, (_, index) =>
        hasExactLabel(domain.lowestMarker + index * step),
      ).every(Boolean);
      if (multiplier === 1 || labelsExact) return { step, ...domain };
    }
  }
}

/**
 * Snaps the Y domain to multiples of a step, starting from `increment` (matching the
 * prototype HTML chart) and growing it to a nice multiple of `increment` when the data
 * would need more than `MAX_MARKER_INTERVALS` labels (e.g. a 35 h sleep day at 1 h steps
 * becomes 0–40 h in 10 h steps).
 *
 * @param yDomainFromZero When `true`, the domain floor is pinned to `0` so bar heights are
 *   proportional to absolute values. When `false`, the floor is the data minimum (snapped
 *   down to the step), matching the original `bar-chart.html` behavior.
 * @param targetVal When set, included in the domain so the goal line stays inside the plot
 *   (at the top when series values are empty or all below the target). When omitted, a
 *   zero-range domain (empty or all-zero series) expands by one step.
 */
export function generateMarkers(
  yValues: readonly number[],
  increment: number,
  yDomainFromZero = false,
  targetVal?: number,
): BarChartYScale {
  if (increment <= 0) {
    throw new Error("Bar chart increment must be positive");
  }

  const hasTarget = targetVal !== undefined && Number.isFinite(targetVal);
  const domainValues = (hasTarget ? [...yValues, targetVal] : [...yValues]).filter(
    (value) => Number.isFinite(value),
  );

  if (domainValues.length === 0) {
    if (!hasTarget) {
      return {
        markerValues: [0, increment],
        lowestMarker: 0,
        highestMarker: increment,
        range: increment,
      };
    }
    return {
      markerValues: [0],
      lowestMarker: 0,
      highestMarker: 0,
      range: 0,
    };
  }

  const lowestVal = Math.min(...domainValues);
  const highestVal = Math.max(...domainValues);

  const { step, lowestMarker, highestMarker } = pickStep(
    lowestVal,
    highestVal,
    increment,
    yDomainFromZero,
    hasTarget,
  );
  const intervals = Math.round((highestMarker - lowestMarker) / step);
  const markers = Array.from(
    { length: intervals + 1 },
    (_, index) => lowestMarker + index * step,
  );
  return {
    markerValues: markers,
    lowestMarker,
    highestMarker,
    range: highestMarker - lowestMarker,
  };
}

/**
 * Compact Y-axis tick text: values ≥ 1_000 use a `K` suffix (e.g. `10_000` → `10K`, `9_500` → `9.5K`).
 * Values below 1_000 stay as plain integers (e.g. steps in hundreds, minutes, ounces).
 */
export function formatBarChartYAxisLabel(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  const abs = Math.abs(value);
  if (abs < 1000) {
    return String(Math.trunc(value));
  }
  const sign = value < 0 ? "-" : "";
  const k = abs / 1000;
  const rounded = Number.isInteger(k) ? k : Math.round(k * 10) / 10;
  const body = String(rounded).replace(/\.0$/, "");
  return `${sign}${body}K`;
}

/** Same formula as the HTML chart: percent distance from the bottom of the plot. */
export function percentHeightFromBottom(
  value: number,
  lowestMarker: number,
  highestMarker: number,
): number {
  const range = highestMarker - lowestMarker;
  if (range <= 0) {
    return 0;
  }
  return ((value - lowestMarker) / range) * 100;
}
