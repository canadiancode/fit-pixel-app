const { withEntitlementsPlist, withInfoPlist } = require("expo/config-plugins");

/**
 * Fit Pixel only reads from Apple Health, in the foreground.
 * @kingstinct/react-native-healthkit's plugin always writes
 * NSHealthUpdateUsageDescription (falling back to a default string), which
 * declares write access the app never requests and App Review flags.
 *
 * Mods of one type run last-registered-first, so list this plugin *before*
 * the HealthKit plugin in app.json: its mod then runs after the HealthKit one
 * and has the final say. It also drops background delivery, which the app
 * doesn't use (an existing ios/ folder keeps old keys otherwise).
 */
module.exports = function withHealthKitReadOnly(config) {
  config = withInfoPlist(config, (cfg) => {
    delete cfg.modResults.NSHealthUpdateUsageDescription;
    return cfg;
  });
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults["com.apple.developer.healthkit.background-delivery"];
    return cfg;
  });
};
