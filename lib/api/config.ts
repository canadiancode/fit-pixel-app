import Constants from "expo-constants";

/**
 * Fit Pixel API base URL (no trailing slash).
 * Set `EXPO_PUBLIC_FIT_PIXEL_API_URL` in `.env` (e.g. https://api.aurashields.com).
 * Defaults to production so food search works once FatSecret is live on the server.
 */
export function getFitPixelApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_FIT_PIXEL_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  const fromExtra = Constants.expoConfig?.extra?.fitPixelApiUrl;
  if (typeof fromExtra === "string" && fromExtra.trim()) {
    return fromExtra.trim().replace(/\/$/, "");
  }

  return "https://api.aurashields.com";
}
