import { normalizeGymSearchText } from "./gym-catalog";

/**
 * Map filters, built only from what we know about a gym: its name, where it
 * is, how many Pixels are in its chat, and your relationship to it.
 */

export type GymShowFilter = "all" | "joined" | "favourites";

/** Gym "type", read from the name (the catalog has no category field). */
export type GymKind =
  | "fitness-world"
  | "anytime"
  | "planet"
  | "club16"
  | "goodlife"
  | "evolve"
  | "golds"
  | "fit4less"
  | "community"
  | "independent";

export const GYM_KIND_LABELS: Record<GymKind, string> = {
  "fitness-world": "Fitness World",
  anytime: "Anytime Fitness",
  planet: "Planet Fitness",
  club16: "Club16",
  goodlife: "GoodLife",
  evolve: "Evolve Strength",
  golds: "Gold's Gym",
  fit4less: "Fit4Less",
  community: "Community & rec centres",
  independent: "Independent gyms",
};

/** Name fragments per chain, checked in order (first match wins). */
const KIND_PATTERNS: [GymKind, RegExp][] = [
  ["fitness-world", /\bfitness world\b/],
  ["anytime", /\banytime fitness\b/],
  ["planet", /\bplanet fitness\b/],
  ["club16", /\bclub ?16\b/],
  ["goodlife", /\bgoodlife\b/],
  ["evolve", /\bevolve strength\b/],
  ["golds", /\bgold'?s gym\b/],
  ["fit4less", /\bfit4less\b/],
  [
    "community",
    /\b(community|recreation|rec centre|aquatic|sportsplex|leisure complex|ywca|centre for active living|sfu)\b/,
  ],
];

export function gymKind(name: string): GymKind {
  const normalized = normalizeGymSearchText(name);
  for (const [kind, pattern] of KIND_PATTERNS) {
    if (pattern.test(normalized)) return kind;
  }
  return "independent";
}

/** Distance choices in km; null = any distance. */
export const GYM_DISTANCE_OPTIONS: readonly (number | null)[] = [
  null,
  2,
  5,
  10,
  25,
];

export type GymFilters = {
  show: GymShowFilter;
  maxKm: number | null;
  /** Only gyms with at least one Pixel in their chat. */
  activeOnly: boolean;
  /** Empty = every kind. */
  kinds: readonly GymKind[];
};

export const DEFAULT_GYM_FILTERS: GymFilters = {
  show: "all",
  maxKm: null,
  activeOnly: false,
  kinds: [],
};

/** How many filters differ from the defaults (for the badge on the button). */
export function activeFilterCount(filters: GymFilters): number {
  return (
    (filters.show !== "all" ? 1 : 0) +
    (filters.maxKm != null ? 1 : 0) +
    (filters.activeOnly ? 1 : 0) +
    (filters.kinds.length > 0 ? 1 : 0)
  );
}

type FilterableGym = {
  name: string;
  latitude: number;
  longitude: number;
  memberCount: number;
  joined: boolean;
  favorite?: boolean;
};

type LatLng = { latitude: number; longitude: number };

function distanceKm(from: LatLng, to: LatLng): number {
  const R = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.latitude * Math.PI) / 180) *
      Math.cos((to.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Gyms that pass every filter. A distance filter without a known location is
 * ignored (the sheet disables it until location is on).
 */
export function applyGymFilters<T extends FilterableGym>(
  gyms: readonly T[],
  filters: GymFilters,
  near: LatLng | null,
): T[] {
  const kinds = new Set(filters.kinds);
  return gyms.filter((gym) => {
    if (filters.show === "joined" && !gym.joined) return false;
    if (filters.show === "favourites" && !gym.favorite) return false;
    if (filters.activeOnly && gym.memberCount < 1) return false;
    if (kinds.size > 0 && !kinds.has(gymKind(gym.name))) return false;
    if (filters.maxKm != null && near != null) {
      if (distanceKm(near, gym) > filters.maxKm) return false;
    }
    return true;
  });
}

/** Kinds that exist in this gym list, most gyms first. */
export function availableGymKinds(
  gyms: readonly { name: string }[],
): { kind: GymKind; count: number }[] {
  const counts = new Map<GymKind, number>();
  for (const gym of gyms) {
    const kind = gymKind(gym.name);
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => {
      // Community and independent read best at the end.
      const tail = (k: GymKind) =>
        k === "community" ? 1 : k === "independent" ? 2 : 0;
      return tail(a.kind) - tail(b.kind) || b.count - a.count;
    });
}
