import * as Sentry from "@sentry/react-native";
import * as Updates from "expo-updates";

/**
 * Crash reporting via Sentry. Off until EXPO_PUBLIC_SENTRY_DSN is set (EAS env
 * for builds and `eas update`), and always off in development.
 *
 * Privacy: no user id, email, IP or request bodies (sendDefaultPii false), and
 * query strings are cut from network breadcrumbs because search terms ride in
 * them. Matches "Crash data, not linked to you" in the privacy manifest.
 */
export function initCrashReporting(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
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
