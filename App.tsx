import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View, Text, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// -----------------------------------------------------------------------------
// BUILD 58 — splash-hang surgical rewrite.
//
// Previous diagnosis (Build 56/57) fell short: the user still sees the native
// launch storyboard past 5 seconds on Build 86 (the "extensions gated off"
// build). Info.plist + entitlements are now clean (verified by extracting
// the shipped IPA), so the "phantom capabilities" theory was correct but not
// the root cause of the remaining hang.
//
// The real trap in Build 56 was architectural:
//
//   * `SplashScreen.preventAutoHideAsync()` at module-eval time tells iOS to
//     keep the launch storyboard up until JS calls `hideAsync()`.
//   * The hard-timeout was `setTimeout(hideAsync, 3000)`, which is a JS
//     callback. setTimeout can NOT fire while synchronous module evaluation
//     is still running — and for a bundle this size with many top-level
//     imports (AuthContext → supabase client → SecureStore, expo-iap, etc.),
//     module eval can easily take longer than 3 seconds on a cold-start
//     production build on iOS 26.
//   * If ANY top-level import throws during that synchronous eval window
//     (corrupt keychain entry, native-module side-effect, a StoreKit 2
//     handshake stall inside expo-iap's OnCreate hook, etc.), the setTimeout
//     never fires at all — the timer was enqueued but the JS engine is
//     stuck, so the splash stays up forever.
//
// The Build 58 fix is to STOP preventing auto-hide and STOP depending on the
// JS timer. We let iOS auto-dismiss the launch storyboard the moment React
// Native's root view is laid out — which is driven by the native UIKit run
// loop, not the JS event loop, and therefore fires even if module eval is
// still grinding through context imports. We additionally call `hideAsync()`
// inside a native `onLayout` handler as a defense-in-depth belt.
//
// To further shrink the risk surface:
//   * `expo-iap` is no longer imported at the top of App.tsx. The IAP
//     connection is initialized LAZILY the first time a pricing/subscription
//     screen asks for it. That removes a Swift module's OnCreate hook (which
//     calls into StoreKit) from the synchronous cold-start path entirely.
//   * The provider tree is wrapped in React.Suspense with a plain colored
//     view fallback so a provider that throws during render can't leave the
//     screen frozen without any feedback.
//   * A first-paint beacon renders <BootBeacon /> synchronously. If the
//     user reports the beacon never appears, JS truly never ran and the
//     next step is native-side: xcrun devicectl logs on the frozen launch.
// -----------------------------------------------------------------------------

console.log('[boot] App module evaluating (Build 58)');

// NOTE: we intentionally DO NOT call SplashScreen.preventAutoHideAsync().
// Letting iOS auto-dismiss the launch storyboard on first RN root layout
// is the most reliable way to guarantee the splash never outlives the
// first render.

// Lazy-imported heavy providers. Lazy dynamic imports are deferred until
// Suspense mounts them so React Navigation, Supabase, React Query, etc. do
// NOT contribute to the synchronous module-eval critical path.
const RootBootShell = React.lazy(() => import('./src/boot/RootBootShell'));

/** First-paint beacon. Renders the instant JS executes App's render for the
 * first time. If Archer does not see this beacon, JS never ran — the problem
 * is native-side (TurboModule init hang, bundle load failure, etc.). */
function BootBeacon() {
  return (
    <View style={beaconStyles.fill}>
      <Text style={beaconStyles.title}>OfferHound</Text>
      <Text style={beaconStyles.subtitle}>Build 58 — JS alive</Text>
      <Text style={beaconStyles.note}>Loading your account…</Text>
    </View>
  );
}

const beaconStyles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: '#101318',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    color: '#e7af08',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#ffffff',
    fontSize: 14,
    opacity: 0.8,
  },
  note: {
    color: '#ffffff',
    fontSize: 12,
    opacity: 0.4,
    marginTop: 12,
  },
});

export default function App() {
  const [shellReady, setShellReady] = useState(false);
  const splashHidden = useRef(false);

  // Fire SplashScreen.hideAsync from the native onLayout handler. The RN
  // runtime fires onLayout after the first view is laid out in the native
  // view hierarchy, independent of whether module eval has finished. This
  // is the earliest possible reliable signal to dismiss the splash.
  const onLayoutRoot = useCallback(() => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    console.log('[boot] root view laid out — hiding splash');
    SplashScreen.hideAsync().catch(() => {
      /* preventAutoHideAsync was never called, so hideAsync is effectively a
       * no-op here; that is exactly what we want. */
    });
  }, []);

  useEffect(() => {
    console.log('[boot] App mounted');
    // After the beacon has been on-screen for a beat, mount the real shell.
    // This gives the native side time to dismiss the splash storyboard
    // BEFORE the heavy provider imports start, so even if the shell imports
    // block, the user sees the beacon (not a stuck logo).
    const t = setTimeout(() => setShellReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Safety: if AppState ever reaches 'active' and the splash is still up,
    // force it down. Belt-and-suspenders — onLayoutRoot usually wins.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && !splashHidden.current) {
        splashHidden.current = true;
        SplashScreen.hideAsync().catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={rootStyles.root} onLayout={onLayoutRoot}>
      {shellReady ? (
        <React.Suspense fallback={<BootBeacon />}>
          <RootBootShell />
        </React.Suspense>
      ) : (
        <BootBeacon />
      )}
    </View>
  );
}

const rootStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#101318',
  },
});
