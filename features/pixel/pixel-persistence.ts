import {
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";

import { DEFAULT_PIXEL_LOADOUT } from "./default-loadout";
import {
  DEFAULT_PIXEL_INVENTORY,
  createRandomPixelLoadout,
  getPixelItem,
} from "./layer-assets";
import { PIXEL_LAYER_Z_INDEX, type PixelItemId, type PixelLoadout } from "./types";

/** Persisted under the app documents directory (already in the Expo native binary). */
const STATE_FILENAME = "pixel-user-state-v1.json";

/**
 * Bumped when the day-1 starter set shrinks (Phase 5.2 shop carve).
 * Missing/old versions re-seed inventory from DEFAULT_PIXEL_INVENTORY so
 * pre-shop "everything owned" grants do not keep shop items forever.
 */
export const PIXEL_INVENTORY_GRANT_VERSION = 2;

const LAYER_IDS = Object.keys(PIXEL_LAYER_Z_INDEX) as (keyof typeof PIXEL_LAYER_Z_INDEX)[];

export type PixelPersistedState = {
  loadout: PixelLoadout;
  inventory: readonly PixelItemId[];
  inventoryGrantVersion: number;
};

type RawPersistedState = {
  loadout?: unknown;
  inventory?: unknown;
  inventoryGrantVersion?: unknown;
};

function getStateUri(): string | null {
  if (documentDirectory == null) return null;
  return `${documentDirectory}${STATE_FILENAME}`;
}

function isItemId(value: unknown): value is PixelItemId {
  return typeof value === "string" && value.length > 0;
}

/**
 * Keep starter grants plus previously unlocked ids.
 * Pre–grant-version-2 saves are re-seeded (starter only).
 */
function normalizeInventory(
  raw: unknown,
  grantVersion: number,
): PixelItemId[] {
  if (grantVersion < PIXEL_INVENTORY_GRANT_VERSION) {
    return [...DEFAULT_PIXEL_INVENTORY];
  }
  const saved = Array.isArray(raw)
    ? raw.filter(isItemId)
    : ([] as PixelItemId[]);
  return Array.from(new Set([...DEFAULT_PIXEL_INVENTORY, ...saved]));
}

/** Drop unknown / wrong-layer / not-owned equipped ids; fill missing layers from default. */
function normalizeLoadout(
  raw: unknown,
  inventory: readonly PixelItemId[],
): PixelLoadout {
  const owned = new Set(inventory);
  const incoming =
    raw != null && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const loadout: PixelLoadout = {};
  for (const layerId of LAYER_IDS) {
    const candidate = incoming[layerId];
    if (isItemId(candidate)) {
      const item = getPixelItem(candidate);
      if (item != null && item.layer === layerId && owned.has(candidate)) {
        loadout[layerId] = candidate;
        continue;
      }
    }
    const fallback = DEFAULT_PIXEL_LOADOUT[layerId];
    if (fallback != null && owned.has(fallback)) {
      loadout[layerId] = fallback;
    }
  }
  return loadout;
}

export function createDefaultPixelPersistedState(): PixelPersistedState {
  return {
    loadout: createRandomPixelLoadout(DEFAULT_PIXEL_INVENTORY),
    inventory: [...DEFAULT_PIXEL_INVENTORY],
    inventoryGrantVersion: PIXEL_INVENTORY_GRANT_VERSION,
  };
}

function parsePersistedState(raw: string | null): PixelPersistedState {
  if (raw == null) {
    return createDefaultPixelPersistedState();
  }

  try {
    const parsed = JSON.parse(raw) as RawPersistedState;
    const savedGrantVersion =
      typeof parsed.inventoryGrantVersion === "number"
        ? parsed.inventoryGrantVersion
        : 0;
    const inventory = normalizeInventory(parsed.inventory, savedGrantVersion);
    const loadout = normalizeLoadout(parsed.loadout, inventory);
    return {
      loadout,
      inventory,
      inventoryGrantVersion: PIXEL_INVENTORY_GRANT_VERSION,
    };
  } catch {
    return createDefaultPixelPersistedState();
  }
}

/** Read loadout + inventory from device storage (falls back to defaults). */
export async function loadPixelPersistedState(): Promise<PixelPersistedState> {
  try {
    const uri = getStateUri();
    if (uri == null) {
      return createDefaultPixelPersistedState();
    }

    const info = await getInfoAsync(uri);
    if (!info.exists) {
      return createDefaultPixelPersistedState();
    }

    const raw = await readAsStringAsync(uri);
    return parsePersistedState(raw);
  } catch {
    return createDefaultPixelPersistedState();
  }
}

/** Persist loadout + inventory for the next app launch. */
export async function savePixelPersistedState(
  state: PixelPersistedState,
): Promise<void> {
  const payload: PixelPersistedState = {
    loadout: state.loadout,
    inventory: [...state.inventory],
    inventoryGrantVersion: PIXEL_INVENTORY_GRANT_VERSION,
  };
  try {
    const uri = getStateUri();
    if (uri == null) return;
    await writeAsStringAsync(uri, JSON.stringify(payload));
  } catch {
    // Ignore write failures — in-memory state remains the source of truth this session.
  }
}

/** Remove on-device pixel cosmetics after sign-out. */
export async function deletePixelPersistedState(): Promise<void> {
  try {
    const uri = getStateUri();
    if (uri == null) return;
    const info = await getInfoAsync(uri);
    if (info.exists) {
      await deleteAsync(uri, { idempotent: true });
    }
  } catch {
    // Best-effort wipe.
  }
}
