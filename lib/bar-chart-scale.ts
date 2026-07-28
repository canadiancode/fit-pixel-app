/**
 * Y-axis scaling for bar charts (mirrors `bar-chart.html` `generateMarkers` + height math).
 */

export type BarChartYScale = {
  markerValues: number[];
  lowestMarker: number;
  highestMarker: number;
  range: number;
};

/**
 * Snaps the Y domain to multiples of `increment`, matching the prototype HTML chart.
 *
 * @param yDomainFromZero When `true`, the domain floor is pinned to `0` so bar heights are
 *   proportional to absolute values. When `false`, the floor is the data minimum (snapped
 *   down to `increment`), matching the original `bar-chart.html` behavior.
 * @param targetVal When set, included in the domain so the goal line stays inside the plot
 *   (at the top when series values are empty or all below the target).
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

  const domainValues =
    targetVal !== undefined && Number.isFinite(targetVal)
      ? [...yValues, targetVal]
      : yValues;

  if (domainValues.length === 0) {
    return {
      markerValues: [0],
      lowestMarker: 0,
      highestMarker: 0,
      range: 0,
    };
  }

  const lowestVal = Math.min(...domainValues);
  const highestVal = Math.max(...domainValues);
  const lowestMarker = yDomainFromZero
    ? 0
    : Math.floor(lowestVal / increment) * increment;
  const highestMarker = Math.ceil(highestVal / increment) * increment;
  const markers: number[] = [];
  for (let i = lowestMarker; i <= highestMarker; i += increment) {
    markers.push(i);
  }
  const range = highestMarker - lowestMarker;
  return {
    markerValues: markers,
    lowestMarker,
    highestMarker,
    range,
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
