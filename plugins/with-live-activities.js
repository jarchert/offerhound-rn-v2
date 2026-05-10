/**
 * with-live-activities.js
 *
 * Expo config plugin that prepares the iOS target for ActivityKit Live Activities.
 *
 * What this plugin does:
 *   - Adds `NSSupportsLiveActivities = true` to Info.plist so the OS lets the
 *     app start/update/end Live Activities.
 *   - Adds `NSSupportsLiveActivitiesFrequentUpdates = true` so remote APNS
 *     updates at higher frequency are allowed (used for camp countdowns).
 *   - (No separate Widget Extension is created here — see LIVE_ACTIVITIES_SETUP.md.
 *      Creating a real Widget Extension target requires xcodeproj mutation that
 *      is best done once-off via `expo prebuild` + manual Xcode configuration.
 *      The Swift sources in `ios-prebuild-assets/LiveActivities/` are the
 *      source-of-truth files that must be copied into that extension target.)
 *
 * Entitlements: Live Activities themselves do NOT require a new entitlement.
 * The existing `aps-environment` entitlement is reused for APNS-pushed updates.
 *
 * Registered in app.json under `expo.plugins`.
 */

const { withInfoPlist } = require('expo/config-plugins');

function withLiveActivities(config) {
  // Gate: only run when EXPO_INCLUDE_LIVE_ACTIVITIES === 'true'. Even though
  // NSSupportsLiveActivities is cheap to add, any Info.plist key that
  // references a capability without an associated extension/target can
  // trigger `-[UIApplication _reportAppLaunchFinishedForProcessWithIdentifier:]`
  // to hang when App Intents enumerate capabilities at cold start on iOS 26.
  // No-op by default — flip env var on once Live Activities are actually used.
  if (process.env.EXPO_INCLUDE_LIVE_ACTIVITIES !== 'true') {
    return config;
  }
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.NSSupportsLiveActivities = true;
    cfg.modResults.NSSupportsLiveActivitiesFrequentUpdates = true;
    return cfg;
  });
}

module.exports = withLiveActivities;
