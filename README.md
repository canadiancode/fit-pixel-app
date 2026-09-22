# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Auth + sync

Users must sign in with email/password (Supabase Auth, anon key only) before using tabs, habits, pixel, map, or chat. Sessions restore from expo-secure-store on cold start.

Food search and outbox drain require a session. Local SQLite is empty until the signed-in user logs data; there is no cloud pull yet (`GET /v1/habits` is 501).

Put these in `.env` (never a service-role key):

```
EXPO_PUBLIC_FIT_PIXEL_API_URL=https://api.aurashields.com
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
```

The Google Maps key is required for **Android** (`PROVIDER_GOOGLE`). iOS uses Apple Maps and can run without it. After changing the Maps key, rebuild the Android native app (`npm run android`) so it is written into `AndroidManifest.xml`.

EAS preview/production builds must embed the `EXPO_PUBLIC_*` values (local Metro `.env` is not shipped in TestFlight or Play). `eas.json` sets the API URL and pins each profile to an EAS environment (`development` / `preview` / `production`). Push secrets with:

```
npx eas env:push development --path .env --force
npx eas env:push preview --path .env --force
npx eas env:push production --path .env --force
```

Then `npx eas env:list preview` (names only). Never add a service-role key to EAS or any `EXPO_PUBLIC_*` variable.

Session tokens are stored in expo-secure-store, not SQLite. Sign-out revokes the refresh token, wipes SecureStore, and resets local data.

Password reset: the app emails a link to `https://api.aurashields.com/auth/callback`. Set the new password in the browser, then sign in to Fit Pixel. Do not enable magic-link or OAuth on the custom `fitpixel://` scheme alone.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Run on a device or emulator (required — **Expo Go is not supported**)

   This app uses Apple HealthKit (`@kingstinct/react-native-healthkit`) on iOS and Health Connect (`react-native-health-connect`) on Android. Those native modules are **not** included in Expo Go. You need a [development build](https://docs.expo.dev/develop/development-builds/introduction/).

   **First time (install the dev app on your iPhone):**

   ```bash
   npm run ios:device
   ```

   Connect the iPhone with USB (or set up wireless debugging in Xcode), trust the Mac, and pick your device when prompted. Xcode must be installed; use a free Apple ID for signing if needed.

   **First time (install the dev app on Android):**

   ```bash
   npm run android:device
   ```

   Or `npm run android` for the emulator. Android Studio + an SDK/emulator (or a USB-debuggable phone) is required. After adding Health Connect or the Maps API key, rebuild so the native project picks up plugins and `AndroidManifest` changes.

   On Android 13 and below, install [Health Connect](https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata) from Play. Android 14+ includes it in the system.

   **Every day (Metro + reload in the dev app):**

   ```bash
   npm start
   ```

   Open the **Fit Pixel** app on your phone (not Expo Go). If the phone cannot reach your Mac over Wi‑Fi, use a tunnel:

   ```bash
   npx expo start --dev-client --tunnel
   ```

   Optional: `npm run prewarm:ios` or `npm run prewarm:android` in a second terminal so the first JS load does not time out.

   **Web only** (no HealthKit / Health Connect):

   ```bash
   npm run web
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/) — use this for iOS/Android
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Play Store / EAS Submit (Android)

Production Android builds use a **remote EAS upload keystore** (`credentialsSource: remote` on the production profile). The first `eas build -p android --profile production` creates and stores that keystore — do not use the local debug keystore for Play.

Submit a Play draft to the internal track:

```
npx eas build -p android --profile production
npx eas submit -p android --profile production
```

`eas.json` `submit.production.android` is set to `track: internal` and `releaseStatus: draft`. Link a Play Console service account in EAS (`eas credentials` or the Expo dashboard). The JSON key itself stays out of git.

### Digital Asset Links (App Links)

Password-reset App Links use `https://api.aurashields.com/auth/callback`. Host a Digital Asset Links file at:

`https://api.aurashields.com/.well-known/assetlinks.json`

Use the template in `store/android/assetlinks.json.example`. The SHA-256 fingerprint must be the **Play / EAS upload certificate**, not the local debug keystore. After the first production Android build:

```
npx eas credentials -p android
```

### Health Connect on Play

Reading Health Connect in a production listing requires a [Health apps declaration](https://support.google.com/googleplay/android-developer/answer/14738291) in Play Console. Approval can take several days.

### Listing assets

Adaptive icons are already wired in `app.json` (`assets/images/android-icon-*.png`). Play Console still needs screenshots, a 1024×500 feature graphic, and a short/full description — checklist in `store/android/play-listing.txt`.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
