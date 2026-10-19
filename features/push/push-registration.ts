import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { registerPushToken, unregisterPushToken } from "@/lib/api/push";

/** Device-level: survives sign-out, like the iOS notification switch. */
const OPT_OUT_KEY = "fitpixel.push.socialOptOut";
/** Last token sent to the server, so sign-out can remove it offline-first. */
const TOKEN_KEY = "fitpixel.push.token";
/** When the "turn on notifications?" pre-prompt was last dismissed. */
const SOFT_ASK_KEY = "fitpixel.push.softAskedAt";

export const ANDROID_CHANNEL_ID = "social";
const SOFT_ASK_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const SIGN_OUT_UNREGISTER_TIMEOUT_MS = 4000;

async function readKey(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeKey(key: string, value: string | null): Promise<void> {
  try {
    if (value == null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // Best effort: worst case we re-register or re-ask.
  }
}

export async function getSocialPushOptOut(): Promise<boolean> {
  return (await readKey(OPT_OUT_KEY)) === "1";
}

export async function setSocialPushOptOut(optOut: boolean): Promise<void> {
  await writeKey(OPT_OUT_KEY, optOut ? "1" : null);
}

export async function canSoftAsk(): Promise<boolean> {
  const at = Number(await readKey(SOFT_ASK_KEY));
  return !Number.isFinite(at) || Date.now() - at > SOFT_ASK_COOLDOWN_MS;
}

export async function markSoftAsked(): Promise<void> {
  await writeKey(SOFT_ASK_KEY, String(Date.now()));
}

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Friends & messages",
    importance: Notifications.AndroidImportance.HIGH,
  });
}

function easProjectId(): string | undefined {
  const fromEas = Constants.easConfig?.projectId;
  const fromExtra = (
    Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined
  )?.eas?.projectId;
  return fromEas ?? fromExtra;
}

function pushPlatform(): "ios" | "android" | null {
  if (Platform.OS === "ios" || Platform.OS === "android") return Platform.OS;
  return null;
}

/**
 * Fetch this device's Expo push token and register it for the signed-in user.
 * Caller must already hold notification permission.
 */
export async function registerDeviceForPush(
  accessToken: string,
  token?: string,
): Promise<string | null> {
  const platform = pushPlatform();
  if (!platform) return null;
  await ensureAndroidChannel();
  const expoToken =
    token ??
    (await Notifications.getExpoPushTokenAsync({ projectId: easProjectId() }))
      .data;
  await registerPushToken(accessToken, expoToken, platform);
  await writeKey(TOKEN_KEY, expoToken);
  return expoToken;
}

/** Remove this device's token from the server (if we registered one). */
export async function unregisterDeviceForPush(
  accessToken: string | null | undefined,
): Promise<void> {
  const token = await readKey(TOKEN_KEY);
  await writeKey(TOKEN_KEY, null);
  if (!token || !accessToken) return;
  await unregisterPushToken(accessToken, token);
}

/**
 * Sign-out path: bounded so a slow network never blocks signing out. If it
 * fails, the next account to register this device takes the token over.
 */
export async function unregisterDeviceForPushOnSignOut(
  accessToken: string | null | undefined,
): Promise<void> {
  await Promise.race([
    unregisterDeviceForPush(accessToken).catch(() => undefined),
    new Promise<void>((resolve) =>
      setTimeout(resolve, SIGN_OUT_UNREGISTER_TIMEOUT_MS),
    ),
  ]);
}

/** Local-only forget (account deleted: the server rows are already gone). */
export async function forgetDevicePushToken(): Promise<void> {
  await writeKey(TOKEN_KEY, null);
}
