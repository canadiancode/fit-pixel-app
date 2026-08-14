import { requireOptionalNativeModule } from "expo-modules-core";
import type { SupportedStorage } from "@supabase/supabase-js";

/** Stay under typical SecureStore value limits by chunking the session JSON. */
const CHUNK_SIZE = 1800;

type SecureStoreModule = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

function loadSecureStore(): SecureStoreModule | null {
  if (requireOptionalNativeModule("ExpoSecureStore") == null) {
    return null;
  }
  try {
    // Native module is present; load the JS wrapper only then so Expo Go /
    // stale dev clients don't crash on import.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-secure-store") as SecureStoreModule;
  } catch {
    return null;
  }
}

const SecureStore = loadSecureStore();

function createMemoryStorage(): SupportedStorage {
  const map = new Map<string, string>();
  return {
    async getItem(key: string): Promise<string | null> {
      return map.get(key) ?? null;
    },
    async setItem(key: string, value: string): Promise<void> {
      map.set(key, value);
    },
    async removeItem(key: string): Promise<void> {
      map.delete(key);
    },
  };
}

function createSecureStoreAdapter(store: SecureStoreModule): SupportedStorage {
  async function deleteChunks(key: string): Promise<void> {
    const countRaw = await store.getItemAsync(`${key}_chunks`);
    const count = countRaw ? Number(countRaw) : 0;
    if (Number.isFinite(count) && count > 0) {
      for (let i = 0; i < count; i += 1) {
        await store.deleteItemAsync(`${key}_${i}`);
      }
      await store.deleteItemAsync(`${key}_chunks`);
    }
    await store.deleteItemAsync(key);
  }

  return {
    async getItem(key: string): Promise<string | null> {
      const countRaw = await store.getItemAsync(`${key}_chunks`);
      if (countRaw) {
        const count = Number(countRaw);
        if (!Number.isFinite(count) || count <= 0) {
          return store.getItemAsync(key);
        }
        const parts: string[] = [];
        for (let i = 0; i < count; i += 1) {
          parts.push((await store.getItemAsync(`${key}_${i}`)) ?? "");
        }
        return parts.join("");
      }
      return store.getItemAsync(key);
    },

    async setItem(key: string, value: string): Promise<void> {
      await deleteChunks(key);
      if (value.length <= CHUNK_SIZE) {
        await store.setItemAsync(key, value);
        return;
      }
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }
      await store.setItemAsync(`${key}_chunks`, String(chunks.length));
      for (let i = 0; i < chunks.length; i += 1) {
        await store.setItemAsync(`${key}_${i}`, chunks[i] ?? "");
      }
    },

    async removeItem(key: string): Promise<void> {
      await deleteChunks(key);
    },
  };
}

if (__DEV__ && SecureStore == null) {
  console.warn(
    "[supabase] expo-secure-store is not in this native binary. Sessions stay in memory until you rebuild the dev client (npx expo run:ios / run:android, or EAS).",
  );
}

/**
 * Access + refresh tokens live in SecureStore when the native module is
 * linked; otherwise an in-memory store so a stale binary can still boot.
 */
export const supabaseSecureStore: SupportedStorage =
  SecureStore != null
    ? createSecureStoreAdapter(SecureStore)
    : createMemoryStorage();

export async function wipeSupabaseSecureStore(
  storageKey?: string,
): Promise<void> {
  const possible = [
    ...(storageKey ? [storageKey] : []),
    "sb-auth-token",
    "supabase.auth.token",
  ];
  for (const key of possible) {
    await supabaseSecureStore.removeItem(key);
  }
}
