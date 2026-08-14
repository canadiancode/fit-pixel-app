import { useSQLiteContext } from "expo-sqlite";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useXpState } from "@/features/xp/xp-state-context";
import { useAuth } from "@/features/auth/auth-context";
import { enqueueOp, nowIso, uuid } from "@/lib/db";

import { DEFAULT_PIXEL_LOADOUT } from "./default-loadout";
import {
  DEFAULT_PIXEL_INVENTORY,
  getPixelItem,
} from "./layer-assets";
import {
  PIXEL_INVENTORY_GRANT_VERSION,
  loadPixelPersistedState,
  savePixelPersistedState,
} from "./pixel-persistence";
import { getShopOffer } from "./shop-catalog";
import type { PixelItemId, PixelLayerId, PixelLoadout } from "./types";

export type UnlockItemResult =
  | { ok: true }
  | {
      ok: false;
      reason: "unknown" | "not_shop" | "already_owned" | "level_locked";
    };

type PixelLoadoutContextValue = {
  /** Equipped item id per layer. */
  loadout: PixelLoadout;
  /** Item ids the user owns (starter set + unlocked shop items). */
  inventory: readonly PixelItemId[];
  /** False until device storage has been read once. */
  isHydrated: boolean;
  ownsItem: (itemId: PixelItemId) => boolean;
  /** Equip an owned catalog item on its layer. */
  selectItem: (layerId: PixelLayerId, itemId: PixelItemId) => void;
  /**
   * Unlock a shop offer if local level meets the gate.
   * SECURITY: local level/XP checks are honor-system until server re-validates.
   */
  unlockItem: (itemId: PixelItemId) => Promise<UnlockItemResult>;
};

const PixelLoadoutContext = createContext<PixelLoadoutContextValue | null>(
  null,
);

export function PixelLoadoutProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { xp } = useXpState();
  const { dataEpoch } = useAuth();
  const [loadout, setLoadout] = useState<PixelLoadout>(DEFAULT_PIXEL_LOADOUT);
  const [inventory, setInventory] = useState<readonly PixelItemId[]>(
    DEFAULT_PIXEL_INVENTORY,
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const hasHydratedRef = useRef(false);
  const inventoryRef = useRef(inventory);
  inventoryRef.current = inventory;

  useEffect(() => {
    let cancelled = false;
    hasHydratedRef.current = false;
    setIsHydrated(false);

    void (async () => {
      const saved = await loadPixelPersistedState();
      if (cancelled) return;
      setLoadout(saved.loadout);
      setInventory(saved.inventory);
      hasHydratedRef.current = true;
      setIsHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [dataEpoch]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    void savePixelPersistedState({
      loadout,
      inventory,
      inventoryGrantVersion: PIXEL_INVENTORY_GRANT_VERSION,
    });
  }, [loadout, inventory]);

  const ownsItem = useCallback(
    (itemId: PixelItemId) => inventory.includes(itemId),
    [inventory],
  );

  const selectItem = useCallback(
    (layerId: PixelLayerId, itemId: PixelItemId) => {
      const item = getPixelItem(itemId);
      if (item == null || item.layer !== layerId) return;
      if (!inventory.includes(itemId)) return;
      setLoadout((current) => ({ ...current, [layerId]: itemId }));
    },
    [inventory],
  );

  const unlockItem = useCallback(
    async (itemId: PixelItemId): Promise<UnlockItemResult> => {
      const offer = getShopOffer(itemId);
      if (offer == null) {
        return { ok: false, reason: getPixelItem(itemId) == null ? "unknown" : "not_shop" };
      }
      if (inventoryRef.current.includes(itemId)) {
        return { ok: false, reason: "already_owned" };
      }
      // SECURITY: cheatable until server re-validates entitlement from facts.
      if (xp.level < offer.requiredLevel) {
        return { ok: false, reason: "level_locked" };
      }

      const unlockedAt = nowIso();
      const opId = uuid();

      setInventory((current) =>
        current.includes(itemId) ? current : [...current, itemId],
      );

      await enqueueOp(
        db,
        "inventory_unlock",
        {
          itemId,
          reason: "level_gate",
          requiredLevel: offer.requiredLevel,
          clientLevel: xp.level,
          clientLifetimeXp: xp.lifetimeXp,
          unlockedAt,
        },
        { id: opId, clientClockAt: unlockedAt },
      );

      return { ok: true };
    },
    [db, xp.level, xp.lifetimeXp],
  );

  const value = useMemo(
    () => ({
      loadout,
      inventory,
      isHydrated,
      ownsItem,
      selectItem,
      unlockItem,
    }),
    [loadout, inventory, isHydrated, ownsItem, selectItem, unlockItem],
  );

  if (!isHydrated) {
    return null;
  }

  return (
    <PixelLoadoutContext.Provider value={value}>
      {children}
    </PixelLoadoutContext.Provider>
  );
}

export function usePixelLoadout(): PixelLoadoutContextValue {
  const value = useContext(PixelLoadoutContext);
  if (value == null) {
    throw new Error("usePixelLoadout must be used within PixelLoadoutProvider");
  }
  return value;
}
