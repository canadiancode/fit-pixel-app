const { withEntitlementsPlist } = require("expo/config-plugins");

/**
 * Fit Pixel only reads from Apple Health, in the foreground, so drop the
 * background-delivery entitlement (an existing ios/ folder keeps old keys
 * otherwise).
 *
 * NSHealthUpdateUsageDescription must stay: App Store Connect rejects the
 * upload (ITMS-90683) because the HealthKit library references write APIs,
 * even though the app never requests write access. app.json sets a
 * read-only purpose string for it.
 *
 * Mods of one type run last-registered-first, so list this plugin *before*
 * the HealthKit plugin in app.json: its mod then runs after the HealthKit one
 * and has the final say.
 */
module.exports = function withHealthKitReadOnly(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults["com.apple.developer.healthkit.background-delivery"];
    return cfg;
  });
};
