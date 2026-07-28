import { useSQLiteContext } from "expo-sqlite";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_APP_PREFS,
  DEFAULT_APP_PROFILE,
  getDayBoundary,
  getPrefs,
  getProfile,
  setPrefs,
  setProfile,
  unlockTheme,
  type AppPrefs,
  type AppPrefsUpdate,
  type AppProfile,
  type AppProfileUpdate,
} from "@/lib/db";

type PrefsProfileContextValue = {
  prefs: AppPrefs;
  profile: AppProfile;
  /** False until prefs + profile have been read once. */
  isHydrated: boolean;
  updatePrefs: (update: AppPrefsUpdate) => Promise<AppPrefs>;
  updateProfile: (update: AppProfileUpdate) => Promise<AppProfile>;
  unlockAppTheme: (themeId: string) => Promise<AppPrefs>;
};

const PrefsProfileContext = createContext<PrefsProfileContextValue | null>(
  null,
);

const INITIAL_PREFS: AppPrefs = {
  ...DEFAULT_APP_PREFS,
  unlockedThemeIds: [...DEFAULT_APP_PREFS.unlockedThemeIds],
  timeZone: "UTC",
  updatedAt: "",
};

const INITIAL_PROFILE: AppProfile = {
  ...DEFAULT_APP_PROFILE,
  updatedAt: "",
};

export function PrefsProfileProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [prefs, setPrefsState] = useState<AppPrefs>(INITIAL_PREFS);
  const [profile, setProfileState] = useState<AppProfile>(INITIAL_PROFILE);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        // Ensure day boundary exists before consolidating prefs.
        await getDayBoundary(db);
        const [loadedPrefs, loadedProfile] = await Promise.all([
          getPrefs(db),
          getProfile(db),
        ]);
        if (!cancelled) {
          setPrefsState(loadedPrefs);
          setProfileState(loadedProfile);
        }
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db]);

  const updatePrefs = useCallback(
    async (update: AppPrefsUpdate) => {
      const next = await setPrefs(db, update);
      setPrefsState(next);
      return next;
    },
    [db],
  );

  const updateProfile = useCallback(
    async (update: AppProfileUpdate) => {
      const next = await setProfile(db, update);
      setProfileState(next);
      return next;
    },
    [db],
  );

  const unlockAppTheme = useCallback(
    async (themeId: string) => {
      const next = await unlockTheme(db, themeId);
      setPrefsState(next);
      return next;
    },
    [db],
  );

  const value = useMemo<PrefsProfileContextValue>(
    () => ({
      prefs,
      profile,
      isHydrated,
      updatePrefs,
      updateProfile,
      unlockAppTheme,
    }),
    [
      prefs,
      profile,
      isHydrated,
      updatePrefs,
      updateProfile,
      unlockAppTheme,
    ],
  );

  return (
    <PrefsProfileContext.Provider value={value}>
      {children}
    </PrefsProfileContext.Provider>
  );
}

export function usePrefsProfile(): PrefsProfileContextValue {
  const ctx = useContext(PrefsProfileContext);
  if (ctx == null) {
    throw new Error(
      "usePrefsProfile must be used within PrefsProfileProvider",
    );
  }
  return ctx;
}
