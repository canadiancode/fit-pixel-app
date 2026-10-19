import { fitPixelFetch } from "./client";

export type PushPlatform = "ios" | "android";

/** Claim this device's Expo push token for the signed-in user. */
export async function registerPushToken(
  accessToken: string,
  token: string,
  platform: PushPlatform,
): Promise<void> {
  await fitPixelFetch<{ ok: true }>("/v1/push-tokens", {
    method: "POST",
    accessToken,
    json: { token, platform },
  });
}

/** Stop pushes to this device for the signed-in user. */
export async function unregisterPushToken(
  accessToken: string,
  token: string,
): Promise<void> {
  await fitPixelFetch<{ ok: true }>("/v1/push-tokens", {
    method: "DELETE",
    accessToken,
    json: { token },
  });
}
