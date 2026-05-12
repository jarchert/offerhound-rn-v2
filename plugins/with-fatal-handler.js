/**
 * with-fatal-handler.js
 *
 * Expo config plugin that injects an RCTFatalHandler + RCTFatalExceptionHandler
 * into the iOS app delegate at build time.
 *
 * WHY THIS EXISTS:
 * React Native 0.83 + iOS 26 has a crash where any NSException thrown from
 * any ObjC TurboModule void method hits objc_exception_rethrow →
 * __cxa_rethrow → std::terminate → SIGABRT. The crash path is:
 *
 *   JS error → ExceptionsManager.reportException (void TurboModule call)
 *     → RCTExceptionsManager -reportException: → RCTFatal(error)
 *       → @throw NSException (in production, no DEBUG guard)
 *         → performVoidMethodInvocation @catch → @throw (rethrow)
 *           → objc_exception_rethrow → __cxa_rethrow → std::terminate
 *
 * patch-package already removes the @throw at the performVoidMethodInvocation
 * level. This plugin installs a handler at the RCTFatal level so even if
 * the patch doesn't apply (e.g. prebuilt framework), the exception is still
 * caught before it can propagate to the rethrow site.
 *
 * The handler logs the error and continues — the app stays alive.
 */

const { withAppDelegate } = require('@expo/config-plugins');

const FATAL_HANDLER_CODE = `
  // ---- iOS 26 + RN 0.83 crash fix: install RCTFatal handlers ----
  // Prevents NSException rethrow → __cxa_rethrow → std::terminate crash.
  // See: facebook/react-native#46204, #47891
  RCTSetFatalHandler(^(NSError *error) {
    NSLog(@"[OfferHound] RCTFatal intercepted (iOS 26 crash prevention): %@", error.localizedDescription);
  });
  RCTSetFatalExceptionHandler(^(NSException *exception) {
    NSLog(@"[OfferHound] RCTFatalException intercepted (iOS 26 crash prevention): %@ — %@", exception.name, exception.reason);
  });
  // ---- end iOS 26 fix ----
`;

const IMPORT_LINE = '#import <React/RCTAssert.h>';

module.exports = function withFatalHandler(config) {
  return withAppDelegate(config, (mod) => {
    const contents = mod.modResults.contents;

    // Only apply to Objective-C app delegates (Swift projects differ)
    if (!contents.includes('@implementation AppDelegate')) {
      return mod;
    }

    // Add the import if not already present
    let newContents = contents;
    if (!newContents.includes(IMPORT_LINE)) {
      newContents = newContents.replace(
        /#import "AppDelegate\.h"/,
        `#import "AppDelegate.h"\n${IMPORT_LINE}`
      );
    }

    // Inject handler setup at the top of application:didFinishLaunchingWithOptions:
    if (!newContents.includes('RCTSetFatalHandler')) {
      newContents = newContents.replace(
        /- \(BOOL\)application:\(UIApplication \*\)application didFinishLaunchingWithOptions:/,
        (match) => match
      );
      // Insert after the opening brace of didFinishLaunchingWithOptions
      newContents = newContents.replace(
        /(didFinishLaunchingWithOptions:[^\{]*\{)/,
        `$1\n${FATAL_HANDLER_CODE}`
      );
    }

    mod.modResults.contents = newContents;
    return mod;
  });
};
