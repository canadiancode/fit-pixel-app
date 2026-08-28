import type { Session, User } from "@supabase/supabase-js";
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

import { AUTH_PASSWORD_MIN_LENGTH } from "@/features/auth/auth-constants";
import {
  AUTH_COPY,
  isSurfacedResetError,
  mapAuthError,
} from "@/features/auth/auth-errors";
import { deletePixelPersistedState } from "@/features/pixel/pixel-persistence";
import {
  getLastAuthUserId,
  setLastAuthUserId,
  wipeLocalUserData,
} from "@/lib/db";
import {
  AUTH_CALLBACK_URL,
  getSupabaseClient,
  wipeSupabaseSecureStore,
} from "@/lib/supabase";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isReady: boolean;
  dataEpoch: number;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ needsEmailConfirm: boolean }>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function storageKeyFromUrl(url: string): string | undefined {
  try {
    const host = new URL(url).hostname;
    const ref = host.split(".")[0];
    if (ref) return `sb-${ref}-auth-token`;
  } catch {
    return undefined;
  }
  return undefined;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const client = getSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(!client);
  const [dataEpoch, setDataEpoch] = useState(0);

  const adoptSessionUser = useCallback(
    async (userId: string): Promise<boolean> => {
      const last = await getLastAuthUserId(db);
      if (last === userId) {
        return false;
      }
      if (last != null) {
        await wipeLocalUserData(db);
        await deletePixelPersistedState();
      }
      await setLastAuthUserId(db, userId);
      return last != null;
    },
    [db],
  );

  useEffect(() => {
    if (!client) {
      setIsReady(true);
      return;
    }

    let cancelled = false;

    void client.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      const next = data.session ?? null;
      if (next?.user.id) {
        const switched = await adoptSessionUser(next.user.id);
        if (cancelled) return;
        if (switched) {
          setDataEpoch((value) => value + 1);
        }
      }
      if (cancelled) return;
      setSession(next);
      setIsReady(true);
    });

    const { data } = client.auth.onAuthStateChange((_event, next) => {
      void (async () => {
        if (next?.user.id) {
          const switched = await adoptSessionUser(next.user.id);
          if (cancelled) return;
          if (switched) {
            setDataEpoch((value) => value + 1);
          }
        }
        if (cancelled) return;
        setSession(next);
        setIsReady(true);
      })();
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [adoptSessionUser, client]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!client) {
        throw new Error(AUTH_COPY.notConfigured);
      }
      const { error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw new Error(mapAuthError(error, "signIn"));
      }
    },
    [client],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (!client) {
        throw new Error(AUTH_COPY.notConfigured);
      }
      if (password.length < AUTH_PASSWORD_MIN_LENGTH) {
        throw new Error(AUTH_COPY.weakPassword);
      }
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) {
        throw new Error(mapAuthError(error, "signUp"));
      }
      return { needsEmailConfirm: data.session == null };
    },
    [client],
  );

  const resetPassword = useCallback(
    async (email: string) => {
      if (!client) {
        throw new Error(AUTH_COPY.notConfigured);
      }
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: AUTH_CALLBACK_URL,
      });
      if (error && isSurfacedResetError(error)) {
        throw new Error(mapAuthError(error, "reset"));
      }
    },
    [client],
  );

  const signOut = useCallback(async () => {
    if (client) {
      await client.auth.signOut({ scope: "global" });
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
      await wipeSupabaseSecureStore(url ? storageKeyFromUrl(url) : undefined);
    }
    await wipeLocalUserData(db);
    await deletePixelPersistedState();
    await setLastAuthUserId(db, null);
    setSession(null);
    setDataEpoch((value) => value + 1);
  }, [client, db]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isReady,
      dataEpoch,
      configured: client != null,
      signIn,
      signUp,
      resetPassword,
      signOut,
    }),
    [
      session,
      isReady,
      dataEpoch,
      client,
      signIn,
      signUp,
      resetPassword,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx == null) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
