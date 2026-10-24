# Android

Fit Pixel runs on Android from the same codebase. Health data comes from
**Health Connect** (`hooks/*.android.ts`, `features/actions/weight/health-weight-samples.android.ts`),
the map uses **Google Maps**, and push goes through **FCM** via Expo.

## Run it locally

One-time toolchain on a Mac (no Android Studio needed):

```
brew install openjdk@17
brew install --cask android-commandlinetools
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=$HOME/Library/Android/sdk
yes | sdkmanager --sdk_root=$ANDROID_HOME --licenses
sdkmanager --sdk_root=$ANDROID_HOME "cmdline-tools;latest" "platform-tools" "emulator" \
  "platforms;android-36" "build-tools;36.0.0" "system-images;android-35;google_apis_playstore;arm64-v8a"
avdmanager create avd -n FitPixel_API35 -k "system-images;android-35;google_apis_playstore;arm64-v8a" -d pixel_7
```

Then `npm run android` builds the dev client, installs it on the running
emulator, and starts Metro. Use a **Play Store** system image: it ships Health
Connect, which the dashboard needs.

If Gradle dies with `OutOfMemoryError: Metaspace`, run the build with more
memory: `./gradlew assembleRelease "-Dorg.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1536m"`.

### Testing against a local backend

To sign up test accounts without touching production, run Supabase locally
(`npx supabase start` in a folder holding `fit-pixel-server/supabase/migrations`)
and a copy of `fit-pixel-server` with `SUPABASE_URL=http://127.0.0.1:54321`.
Then point the app at them **in `.env` itself**. Exporting `EXPO_PUBLIC_*` in
the shell is not enough: Expo's dev bundle still reads `.env`. Restart Metro
with `--clear`, and check the served bundle no longer contains the production
Supabase ref before signing up. `adb reverse tcp:54321 tcp:54321` (and the API
and Metro ports) lets the emulator reach `127.0.0.1`. Only debug builds allow
plain `http://`; release builds need HTTPS.

## Keys and files

| What | Where | Without it |
| --- | --- | --- |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | `.env` and the EAS env (Google Cloud → enable **Maps SDK for Android**) | Map tab shows "The map isn't available right now." |
| `google-services.json` | Project root for local builds, or EAS file env var `GOOGLE_SERVICES_JSON` (Firebase → Android app `com.fitpixel.app`) | No push notifications on Android; the toggle still works, the token step fails quietly |
| FCM V1 service account key | expo.dev → Project → Credentials → Android | Expo can't deliver pushes to Android |
| Upload keystore | `eas credentials -p android` (once, interactive) | `eas-android-production.yml` fails: EAS won't make a keystore in non-interactive mode |
| Play service account key | expo.dev → Credentials → Android → Google Service Account | `--auto-submit` / `eas submit` can't upload |

## Release

1. Run `eas credentials -p android` once and let EAS generate the upload keystore.
2. Run **EAS Android production** (`.github/workflows/eas-android-production.yml`)
   from GitHub Actions with `submit` off. It produces an `.aab`.
3. Upload that first `.aab` to Play Console by hand (internal testing track):
   Google requires the first upload to go through the console.
4. After that, run the workflow with `submit` on; `eas.json` sends it to the
   internal track as a draft.

For friends without Play access, `eas build -p android --profile preview` makes
an `.apk` they can install straight from the EAS link (Android's TestFlight
equivalent; they need to allow installs from their browser).

## Play Console checklist

- **Health apps declaration** (App content → Health apps): list the six read
  permissions (steps, active calories, resting heart rate, weight, hydration,
  sleep) and why. Health Connect's permission sheet links to
  `https://api.aurashields.com/privacy` through
  `plugins/with-health-connect-rationale.js`.
- **Data safety**: mirror the iOS privacy label (email, user ID, name, health,
  fitness, messages, other user content, crash data; none used for tracking).
- **Privacy policy URL**: `https://api.aurashields.com/privacy`.
- **Account deletion URL**: Play asks for a web link; Settings → Account in the
  app covers in-app deletion.
- **Closed testing**: personal developer accounts need a closed test with at
  least 12 opted-in testers for 14 days before production access.
- **App links**: `api.aurashields.com/.well-known/assetlinks.json` still has a
  placeholder fingerprint (`fit-pixel-server/src/routes/well-known.ts`). Put in
  the SHA-256 of the **Play app signing** key (Play Console → App integrity)
  and the EAS upload key so `/auth/callback` links open the app.
