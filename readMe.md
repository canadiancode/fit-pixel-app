# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Auth + sync

The app stays usable offline without an account. **Settings → Account** is email/password via Supabase Auth (anon key only). Food search and outbox drain require a session.

Put only these in `.env` (never a service-role key):

```
EXPO_PUBLIC_FIT_PIXEL_API_URL=https://api.aurashields.com
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Session tokens are stored in expo-secure-store, not SQLite. Sign-out revokes the refresh token, wipes SecureStore, and resets local data.

Password reset uses `https://api.aurashields.com/auth/callback` (HTTPS). Do not enable magic-link or OAuth on the custom `onerepmax://` scheme alone.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Run on a device or simulator (required — **Expo Go is not supported**)

   This app uses Apple HealthKit via Nitro modules (`@kingstinct/react-native-healthkit`). Those native modules are **not** included in Expo Go. You need a [development build](https://docs.expo.dev/develop/development-builds/introduction/) installed on your phone or simulator.

   **First time (install the dev app on your iPhone):**

   ```bash
   npm run ios:device
   ```

   Connect the iPhone with USB (or set up wireless debugging in Xcode), trust the Mac, and pick your device when prompted. Xcode must be installed; use a free Apple ID for signing if needed.

   **Every day (Metro + reload in the dev app):**

   ```bash
   npm start
   ```

   Open the **Fit Pixel** app on your phone (not Expo Go). If the phone cannot reach your Mac over Wi‑Fi, use a tunnel:

   ```bash
   npx expo start --dev-client --tunnel
   ```

   **Web only** (no HealthKit):

   ```bash
   npm run web
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/) — use this for iOS/Android
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

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
