// Load `.env` when this file is evaluated (Expo CLI also injects env; dotenv covers other tools).
require("dotenv").config();

const fs = require("fs");
const path = require("path");

/**
 * The pixel fonts ship one weight each. iOS ignores a bold/semibold `fontWeight` on them,
 * but Android falls back to Roboto, so embed them natively with every weight mapped to the
 * same file. `useFonts` in `app/_layout.tsx` still loads them for iOS and web.
 */
const ANDROID_PIXEL_FONTS = [
  ["PressStart2P", "./assets/fonts/PressStart2P-Regular.ttf"],
  ["PixeloidSans", "./assets/fonts/PixeloidSans-lxa3y.ttf"],
].map(([fontFamily, path]) => ({
  fontFamily,
  fontDefinitions: [100, 200, 300, 400, 500, 600, 700, 800, 900].map((weight) => ({
    path,
    weight,
  })),
}));

/**
 * Merges onto `app.json`.
 *
 * - Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` for Google Maps (required for `PROVIDER_GOOGLE` in
 *   release builds; use one key with iOS + Android APIs enabled).
 * - Set `EXPO_PUBLIC_FIT_PIXEL_API_URL` for the Fit Pixel backend (food search, etc.).
 * - Set `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` for Auth.
 *   Never put the service-role key in this app or any `EXPO_PUBLIC_*` variable.
 * - Android push (FCM) needs `google-services.json` from Firebase: either drop it in the project
 *   root (local builds) or upload it as the EAS file env var `GOOGLE_SERVICES_JSON`.
 * - FatSecret credentials stay on the Fit Pixel server only. Do not put client ID/secret
 *   in `extra` or any `EXPO_PUBLIC_*` variable.
 *
 * @param {{ config: import('expo/config').ExpoConfig }} ctx
 */
module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const fitPixelApiUrl =
    process.env.EXPO_PUBLIC_FIT_PIXEL_API_URL ?? "https://api.fitpixel.app";
  const localGoogleServices = path.join(process.cwd(), "google-services.json");
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ??
    (fs.existsSync(localGoogleServices) ? "./google-services.json" : undefined);

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      "expo-secure-store",
      ["expo-font", { android: { fonts: ANDROID_PIXEL_FONTS } }],
    ],
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
      ...(googleServicesFile ? { googleServicesFile } : {}),
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
