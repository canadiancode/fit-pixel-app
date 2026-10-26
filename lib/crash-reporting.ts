import * as Sentry from "@sentry/react-native";
import * as Updates from "expo-updates";

/**
 * Fit Pixel's Sentry project. A DSN only lets clients send events, so it is
 * safe to ship; keeping it here means builds and `eas update` bundles both get
 * it. EXPO_PUBLIC_SENTRY_DSN overrides it (e.g. to point at a test project).
 */
const SENTRY_DSN =
  "https://cfe8668540d286ed75889f73d692526e@o4512295722418176.ingest.us.sentry.io/4512295739981824";

/**
 * Crash reporting via Sentry, in release builds only (always off in
 * development).
 *
 * Privacy: no user id, email, IP or request bodies (sendDefaultPii false), and
 * query strings are cut from network breadcrumbs because search terms ride in
 * them. Matches "Crash data, not linked to you" in the privacy manifest.
 */
export function initCrashReporting(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() || SENTRY_DSN;
  if (!dsn || __DEV__) return;

  Sentry.init({
    dsn,
    sendDefaultPii: false,
    environment: Updates.channel || "production",
    tracesSampleRate: 0,
    beforeBreadcrumb(breadcrumb) {
      const url = breadcrumb.data?.url;
      if (typeof url === "string" && url.includes("?")) {
        breadcrumb.data = { ...breadcrumb.data, url: url.split("?")[0] };
      }
      return breadcrumb;
    },
  });

  // Ties a crash to the OTA update that was running, not just the binary.
  if (Updates.updateId) {
    Sentry.setTag("update_id", Updates.updateId);
  }
}

/**
 * Sends a handled test error so a release build can be checked end to end
 * (Settings → Privacy & terms → tap the version 7 times). Returns false when
 * crash reporting is off (development builds), so the UI can say so.
 */
export function sendTestError(): boolean {
  if (!Sentry.getClient()) return false;
  Sentry.captureException(new Error(`Sentry test from Settings (${new Date().toISOString()})`));
  return true;
}
