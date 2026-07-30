// plugins/with-privacy-manifest.js
// Injects PrivacyInfo.xcprivacy into the iOS app bundle at build time.
// Required by Apple as of Spring 2024 for all App Store submissions.
// See: https://developer.apple.com/documentation/bundleresources/privacy_manifest_files

const { withXcodeProject, IOSConfig } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const PRIVACY_MANIFEST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- ================================================================
       NSPrivacyTracking: false — OfferHound does not track users across
       apps or websites owned by other companies for advertising.
       expo-tracking-transparency is present only to display the ATT
       prompt; the permission is unused.
       ================================================================ -->
  <key>NSPrivacyTracking</key>
  <false/>

  <!-- ================================================================
       Required-reason APIs used by the app (not just dependencies).
       ================================================================ -->
  <key>NSPrivacyAccessedAPITypes</key>
  <array>

    <!-- File timestamps: expo-file-system reads/writes timestamps on
         cached media files (highlight videos, profile photos).
         Reason C617.1: access timestamps on files the app itself wrote. -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>C617.1</string>
      </array>
    </dict>

    <!-- UserDefaults: expo-secure-store and @react-native-async-storage
         use NSUserDefaults for session/preference persistence.
         Reason CA92.1: app-provided functionality. -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>CA92.1</string>
      </array>
    </dict>

    <!-- Disk space: expo-file-system checks available disk space before
         writing large media files (video uploads, transcript PDFs).
         Reason E174.1: write / manage files on disk. -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryDiskSpace</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>E174.1</string>
      </array>
    </dict>

    <!-- System boot time: expo-notifications uses this to schedule
         local notifications relative to device uptime.
         Reason 35F9.1: calculate elapsed time on device. -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategorySystemBootTime</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>35F9.1</string>
      </array>
    </dict>

  </array>

  <!-- ================================================================
       Data collected by the app and linked to identity.
       All categories below are used for App Functionality only (not
       advertising or third-party sharing).
       ================================================================ -->
  <key>NSPrivacyCollectedDataTypes</key>
  <array>

    <!-- Email address — required for Supabase auth, account recovery,
         parent-consent emails (COPPA), and the minor-invite flow. -->
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeEmailAddress</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>

    <!-- Name — athlete/coach/parent display names stored on player_profiles,
         coach_profiles, and roster entries. -->
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeName</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>

    <!-- Photos/videos — uploaded by users as profile photos and
         highlight reels; stored in Supabase Storage. -->
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypePhotosorVideos</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>

    <!-- User ID — Supabase UUID assigned at registration; used to
         associate all profile data, messages, and activity. -->
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeUserID</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>

    <!-- Other user content — recruiting letters, coach notes, camp
         performance scores, testimonials, and transcript content. -->
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeOtherUserContent</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>

  </array>
</dict>
</plist>
PRIVACY_MANIFEST_EOF
`;

module.exports = function withPrivacyManifest(config) {
  return withXcodeProject(config, async (cfg) => {
    const projectRoot = cfg.modRequest.projectRoot;
    // getSourceRoot returns the ios/<AppName> directory (e.g. ios/offerhoundv2)
    const iosDirPath = IOSConfig.Paths.getSourceRoot(projectRoot);
    const iosDir = path.basename(iosDirPath);

    // Write PrivacyInfo.xcprivacy into the iOS app folder
    const destPath = path.join(iosDirPath, 'PrivacyInfo.xcprivacy');
    fs.mkdirSync(iosDirPath, { recursive: true });
    fs.writeFileSync(destPath, PRIVACY_MANIFEST.trim(), 'utf8');

    // Add the file to the Xcode project so it's included in the app bundle
    const project = cfg.modResults;
    const groupName = iosDir;
    const opt = { target: project.getFirstTarget().uuid };

    if (!project.pbxFileReferences().find(([, f]) => f.path === '"PrivacyInfo.xcprivacy"')) {
      project.addResourceFile('PrivacyInfo.xcprivacy', opt, groupName);
    }

    return cfg;
  });
};
