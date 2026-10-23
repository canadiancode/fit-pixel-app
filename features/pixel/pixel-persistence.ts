import {
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";

import { completeLoadout, DEFAULT_PIXEL_LOADOUT } from "./default-loadout";
import { DEFAULT_PIXEL_INVENTORY, getPixelItem } from "./layer-assets";
import { REWARD_ITEM_IDS } from "./shop-catalog";
import {
  PIXEL_FIGURE_LAYERS,
  PIXEL_LAYER_Z_INDEX,
  type PixelGender,
  type PixelItemId,
  type PixelLoadout,
} from "./types";

/** Persisted under the app documents directory (already in the Expo native binary). */
const STATE_FILENAME = "pixel-user-state-v1.json";

/**
 * Bumped when the day-1 starter set changes (Phase 5.2 shop carve).
 * Missing/old versions re-seed inventory from DEFAULT_PIXEL_INVENTORY so
 * pre-shop "everything owned" grants do not keep shop items forever.
 * v4: new character art. Old character parts are retired, so the look is
 * reset and the user picks male / female again (scene items are kept).
 */
export const PIXEL_INVENTORY_GRANT_VERSION = 4;

const LAYER_IDS = Object.keys(PIXEL_LAYER_Z_INDEX) as (keyof typeof PIXEL_LAYER_Z_INDEX)[];
const FIGURE_LAYER_SET = new Set<string>(PIXEL_FIGURE_LAYERS);

export type PixelPersistedState = {
  loadout: PixelLoadout;
  inventory: readonly PixelItemId[];
  inventoryGrantVersion: number;
  /** `null` until the user picks male / female (first launch prompt). */
  gender: PixelGender | null;
};

type RawPersistedState = {
  loadout?: unknown;
  inventory?: unknown;
  inventoryGrantVersion?: unknown;
  gender?: unknown;
};

function getStateUri(): string | null {
  if (documentDirectory == null) return null;
  return `${documentDirectory}${STATE_FILENAME}`;
}

function isItemId(value: unknown): value is PixelItemId {
  return typeof value === "string" && value.length > 0;
}

function isGender(value: unknown): value is PixelGender {
  return value === "male" || value === "female";
}

/**
 * Keep starter grants plus previously unlocked ids still in the catalog.
 * Pre–grant-version-2 saves are re-seeded (starter only).
 */
function normalizeInventory(
  raw: unknown,
  grantVersion: number,
): PixelItemId[] {
  if (grantVersion < 2) {
    return [...DEFAULT_PIXEL_INVENTORY];
  }
  let saved = Array.isArray(raw)
    ? raw.filter(isItemId).filter((id) => getPixelItem(id) != null)
    : ([] as PixelItemId[]);
  // v3: weight rewards briefly leaked into the starter set (build 21). Drop
  // them; the weight journey re-grants any its milestones actually earned.
  if (grantVersion < 3) {
    saved = saved.filter((id) => !REWARD_ITEM_IDS.has(id));
  }
  return Array.from(new Set([...DEFAULT_PIXEL_INVENTORY, ...saved]));
}

/**
 * Drop unknown / wrong-layer / not-owned equipped ids and fill gaps from the
 * default look. Character layers are only kept for a picked gender whose
 * save is on the current art (v4+).
 */
function normalizeLoadout(
  raw: unknown,
  inventory: readonly PixelItemId[],
  keepCharacter: boolean,
): PixelLoadout {
  const owned = new Set(inventory);
  const incoming =
    raw != null && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const loadout: PixelLoadout = {};
  for (const layerId of LAYER_IDS) {
    if (!keepCharacter && FIGURE_LAYER_SET.has(layerId)) continue;
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
  return completeLoadout(loadout);
}

export function createDefaultPixelPersistedState(): PixelPersistedState {
  return {
    loadout: { ...DEFAULT_PIXEL_LOADOUT },
    inventory: [...DEFAULT_PIXEL_INVENTORY],
    inventoryGrantVersion: PIXEL_INVENTORY_GRANT_VERSION,
    gender: null,
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
    const gender =
      savedGrantVersion >= 4 && isGender(parsed.gender) ? parsed.gender : null;
    const inventory = normalizeInventory(parsed.inventory, savedGrantVersion);
    const loadout = normalizeLoadout(parsed.loadout, inventory, gender != null);
    return {
      loadout,
      inventory,
      inventoryGrantVersion: PIXEL_INVENTORY_GRANT_VERSION,
      gender,
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
    gender: state.gender,
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
