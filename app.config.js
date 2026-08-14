// Load `.env` when this file is evaluated (Expo CLI also injects env; dotenv covers other tools).
require("dotenv").config();

/**
 * Merges onto `app.json`.
 *
 * - Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` for Google Maps (required for `PROVIDER_GOOGLE` in
 *   release builds; use one key with iOS + Android APIs enabled).
 * - Set `EXPO_PUBLIC_FIT_PIXEL_API_URL` for the Fit Pixel backend (food search, etc.).
 * - Set `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` for Auth.
 *   Never put the service-role key in this app or any `EXPO_PUBLIC_*` variable.
 * - FatSecret credentials stay on the Fit Pixel server only. Do not put client ID/secret
 *   in `extra` or any `EXPO_PUBLIC_*` variable.
 *
 * @param {{ config: import('expo/config').ExpoConfig }} ctx
 */
module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const fitPixelApiUrl =
    process.env.EXPO_PUBLIC_FIT_PIXEL_API_URL ?? "https://api.aurashields.com";

  return {
    ...config,
    plugins: [...(config.plugins ?? []), "expo-secure-store"],
    extra: {
      ...config.extra,
      fitPixelApiUrl,
    },
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        ...(googleMapsApiKey ? { googleMapsApiKey } : {}),
      },
    },
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        ...(googleMapsApiKey
          ? {
              googleMaps: {
                ...config.android?.config?.googleMaps,
                apiKey: googleMapsApiKey,
              },
            }
          : {}),
      },
    },
  };
};
