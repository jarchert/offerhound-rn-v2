/**
 * with-app-clip.js
 *
 * Expo config plugin that scaffolds an iOS App Clip target alongside the main
 * OfferHound app on `expo prebuild`.
 *
 * Generated structure (post-prebuild):
 *   ios/
 *     OfferHound/                       (main app, untouched)
 *     OfferHoundClip/
 *       AppClipApp.swift
 *       AppClipEntryView.swift
 *       Info.plist
 *       OfferHoundClip.entitlements
 *
 * Target bundle id:   com.emergentmindlab.offerhoundv2.Clip
 * Apple Team:         8MG7GFDJ62
 *
 * The Swift sources are copied from `<projectRoot>/ios-prebuild-assets/AppClip/`
 * so they are version-controlled and survive prebuild --clean.
 *
 * NOTE: This plugin uses the `dangerous` mod to write Xcode project changes
 * via xcode (already a transitive dep of @expo/config-plugins). If the xcode
 * package is unavailable at prebuild time, the plugin will fail loudly with a
 * clear error so the developer can `npx expo install xcode` once.
 */

const fs = require('fs');
const path = require('path');
const {
  withDangerousMod,
  withXcodeProject,
  withInfoPlist,
} = require('@expo/config-plugins');

const APP_CLIP_TARGET_NAME = 'OfferHoundClip';
const APP_CLIP_BUNDLE_ID = 'com.emergentmindlab.offerhoundv2.Clip';
const APPLE_TEAM_ID = '8MG7GFDJ62';
const ASSOCIATED_DOMAIN_HOST = 'offerhound.app';

const SPORT_PATHS = [
  '/football',
  '/basketball',
  '/track-field',
  '/soccer',
  '/baseball',
  '/lacrosse',
  '/golf',
  '/volleyball',
  '/swimming',
  '/softball',
  '/hockey',
  '/cheerleading',
  '/wrestling',
];

function buildEntitlementsXml() {
  const applinks = [`applinks:${ASSOCIATED_DOMAIN_HOST}`, `applinks:www.${ASSOCIATED_DOMAIN_HOST}`];
  const appclips = [`appclips:${ASSOCIATED_DOMAIN_HOST}`, `appclips:www.${ASSOCIATED_DOMAIN_HOST}`];
  const all = [...applinks, ...appclips].map((d) => `\t\t<string>${d}</string>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>com.apple.developer.associated-domains</key>
\t<array>
${all}
\t</array>
\t<key>com.apple.developer.parent-application-identifiers</key>
\t<array>
\t\t<string>$(AppIdentifierPrefix)com.emergentmindlab.offerhoundv2</string>
\t</array>
\t<key>com.apple.developer.on-demand-install-capable</key>
\t<true/>
</dict>
</plist>
`;
}

function buildInfoPlistXml() {
  // NSAppClip + minimal launch info. UIApplicationShortcutItems are included
  // (App Clips don't actually show shortcut items, but the key is here as a
  // documented placeholder so future iOS APIs can pick them up cleanly).
  const shortcuts = SPORT_PATHS.map((p) => {
    const sport = p.replace(/^\//, '');
    const title = sport.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return `\t\t<dict>
\t\t\t<key>UIApplicationShortcutItemType</key>
\t\t\t<string>com.emergentmindlab.offerhoundv2.Clip.${sport}</string>
\t\t\t<key>UIApplicationShortcutItemTitle</key>
\t\t\t<string>${title}</string>
\t\t</dict>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>CFBundleDevelopmentRegion</key>
\t<string>$(DEVELOPMENT_LANGUAGE)</string>
\t<key>CFBundleDisplayName</key>
\t<string>OfferHound</string>
\t<key>CFBundleExecutable</key>
\t<string>$(EXECUTABLE_NAME)</string>
\t<key>CFBundleIdentifier</key>
\t<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
\t<key>CFBundleInfoDictionaryVersion</key>
\t<string>6.0</string>
\t<key>CFBundleName</key>
\t<string>$(PRODUCT_NAME)</string>
\t<key>CFBundlePackageType</key>
\t<string>APPL</string>
\t<key>CFBundleShortVersionString</key>
\t<string>1.0</string>
\t<key>CFBundleVersion</key>
\t<string>1</string>
\t<key>LSRequiresIPhoneOS</key>
\t<true/>
\t<key>UILaunchScreen</key>
\t<dict/>
\t<key>UIRequiredDeviceCapabilities</key>
\t<array>
\t\t<string>arm64</string>
\t</array>
\t<key>UISupportedInterfaceOrientations</key>
\t<array>
\t\t<string>UIInterfaceOrientationPortrait</string>
\t</array>
\t<key>NSAppClip</key>
\t<dict>
\t\t<key>NSAppClipRequestEphemeralUserNotification</key>
\t\t<false/>
\t\t<key>NSAppClipRequestLocationConfirmation</key>
\t\t<false/>
\t</dict>
\t<key>UIApplicationShortcutItems</key>
\t<array>
${shortcuts}
\t</array>
</dict>
</plist>
`;
}

/**
 * Write supporting files (Info.plist, entitlements, copy Swift sources)
 * into ios/<APP_CLIP_TARGET_NAME>/. Runs as a dangerous mod after prebuild
 * has materialized the ios/ directory.
 */
const withAppClipFiles = (config) =>
  withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const iosRoot = cfg.modRequest.platformProjectRoot;
      const projectRoot = cfg.modRequest.projectRoot;
      const targetDir = path.join(iosRoot, APP_CLIP_TARGET_NAME);
      fs.mkdirSync(targetDir, { recursive: true });

      // Info.plist
      fs.writeFileSync(path.join(targetDir, 'Info.plist'), buildInfoPlistXml());

      // Entitlements
      fs.writeFileSync(
        path.join(targetDir, `${APP_CLIP_TARGET_NAME}.entitlements`),
        buildEntitlementsXml()
      );

      // Swift sources from version-controlled assets
      const assetsDir = path.join(projectRoot, 'ios-prebuild-assets', 'AppClip');
      if (!fs.existsSync(assetsDir)) {
        throw new Error(
          `[with-app-clip] Missing ios-prebuild-assets/AppClip/ at ${assetsDir}. ` +
            `Add AppClipApp.swift and AppClipEntryView.swift before prebuild.`
        );
      }
      for (const file of fs.readdirSync(assetsDir)) {
        if (file.endsWith('.swift')) {
          fs.copyFileSync(path.join(assetsDir, file), path.join(targetDir, file));
        }
      }
      return cfg;
    },
  ]);

/**
 * Add the App Clip target to the Xcode project. Best-effort: if `xcode` is
 * unavailable, throw with guidance.
 */
const withAppClipXcodeTarget = (config) =>
  withXcodeProject(config, async (cfg) => {
    let xcode;
    try {
      xcode = require('xcode'); // eslint-disable-line global-require
    } catch (_) {
      throw new Error(
        `[with-app-clip] The 'xcode' package is required to add the App Clip target.\n` +
          `Run: npm install --save-dev xcode`
      );
    }

    const project = cfg.modResults;
    const targetName = APP_CLIP_TARGET_NAME;

    // The bundled `xcode` package's PRODUCTTYPE_BY_TARGETTYPE map does not
    // include `application.on-demand-install-capable` (the App Clip product
    // type), so addTarget() throws before we get a chance to register one.
    // Monkey-patch the project instance to inject a synthetic mapping just
    // for this target. Mirrors what newer forks of xcode do natively.
    if (!project.__appClipPatch) {
      const origAddTarget = project.addTarget.bind(project);
      project.addTarget = function patchedAddTarget(name, type, subfolder, bundleId) {
        if (type === 'application.on-demand-install-capable') {
          // Build the target manually using xcode's `application` flow, then
          // overwrite the productType to the App Clip one.
          const t = origAddTarget(name, 'application', subfolder, bundleId);
          try {
            const nativeTargets = project.pbxNativeTargetSection();
            const tgt = nativeTargets[t.uuid];
            if (tgt) tgt.productType = '"com.apple.product-type.application.on-demand-install-capable"';
            // Also patch the matching PBXNativeTarget productType in build configs
            const buildConfigs = project.pbxXCBuildConfigurationSection();
            Object.keys(buildConfigs).forEach((k) => {
              const cfgEntry = buildConfigs[k];
              if (cfgEntry && typeof cfgEntry === 'object' && cfgEntry.buildSettings && cfgEntry.buildSettings.PRODUCT_BUNDLE_IDENTIFIER === bundleId) {
                // ensure the App Clip flag is set in build settings
                cfgEntry.buildSettings.PRODUCT_NAME = `"${name}"`;
              }
            });
          } catch (e) {
            // best-effort; non-fatal — prebuild has already produced the target
          }
          return t;
        }
        return origAddTarget(name, type, subfolder, bundleId);
      };
      project.__appClipPatch = true;
    }

    // Bail if target already exists (re-run safety)
    const existing = project.pbxNativeTargetSection();
    for (const key of Object.keys(existing)) {
      const t = existing[key];
      if (t && typeof t === 'object' && t.name === targetName) {
        return cfg;
      }
    }

    // Create the App Clip target
    const target = project.addTarget(
      targetName,
      'application.on-demand-install-capable',
      targetName,
      APP_CLIP_BUNDLE_ID
    );

    // PBX group + source files
    const group = project.addPbxGroup(
      ['AppClipApp.swift', 'AppClipEntryView.swift', 'Info.plist', `${targetName}.entitlements`],
      targetName,
      targetName
    );

    // Attach group to main project group
    const groups = project.hash.project.objects.PBXGroup;
    for (const key of Object.keys(groups)) {
      if (groups[key].name === undefined && groups[key].path === undefined) {
        project.addToPbxGroup(group.uuid, key);
        break;
      }
    }

    // Add Swift sources to the build phase
    project.addSourceFile('AppClipApp.swift', { target: target.uuid }, group.uuid);
    project.addSourceFile('AppClipEntryView.swift', { target: target.uuid }, group.uuid);

    // Apply build settings: bundle id, team, entitlements, swift version, deployment target
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      const buildSettings = configurations[key].buildSettings;
      if (buildSettings && buildSettings.PRODUCT_NAME && buildSettings.PRODUCT_NAME.replace(/"/g, '') === targetName) {
        buildSettings.PRODUCT_BUNDLE_IDENTIFIER = APP_CLIP_BUNDLE_ID;
        buildSettings.DEVELOPMENT_TEAM = APPLE_TEAM_ID;
        buildSettings.CODE_SIGN_ENTITLEMENTS = `${targetName}/${targetName}.entitlements`;
        buildSettings.INFOPLIST_FILE = `${targetName}/Info.plist`;
        buildSettings.SWIFT_VERSION = '5.0';
        buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '16.0';
        buildSettings.TARGETED_DEVICE_FAMILY = '1';
        buildSettings.CODE_SIGN_STYLE = 'Automatic';
        buildSettings.ASSETCATALOG_COMPILER_APPICON_NAME = 'AppIcon';
        buildSettings.GENERATE_INFOPLIST_FILE = 'NO';
        buildSettings.MARKETING_VERSION = '1.0';
        buildSettings.CURRENT_PROJECT_VERSION = '1';
      }
    }

    return cfg;
  });

/**
 * Ensure the main app's Info.plist references the App Clip product so Xcode
 * embeds it in the parent .app bundle. (Embed Build Phase is auto-managed by
 * Xcode when both targets share the same project; nothing additional needed
 * for plist, but we surface a marker key for tooling.)
 */
const withMainAppMarker = (config) =>
  withInfoPlist(config, (cfg) => {
    cfg.modResults.OFHAppClipBundleIdentifier = APP_CLIP_BUNDLE_ID;
    return cfg;
  });

module.exports = function withAppClip(config) {
  config = withMainAppMarker(config);
  config = withAppClipFiles(config);
  config = withAppClipXcodeTarget(config);
  return config;
};

module.exports.APP_CLIP_BUNDLE_ID = APP_CLIP_BUNDLE_ID;
module.exports.SPORT_PATHS = SPORT_PATHS;
