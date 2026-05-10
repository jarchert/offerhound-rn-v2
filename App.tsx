import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';

import React, { useCallback, useEffect, useState } from 'react';
import { AppState, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider, onlineManager, focusManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SportProvider } from '@/contexts/SportContext';
import { ImpersonationProvider } from '@/contexts/ImpersonationContext';
import { AthleteProfileProvider } from '@/contexts/AthleteProfileContext';
import { PodcastPlayerProvider } from '@/contexts/PodcastPlayerContext';
import { CookiePreferencesProvider } from '@/contexts/CookiePreferencesContext';

import RootNavigator from '@/navigation/RootNavigator';
import { linking } from '@/navigation/linking';
import ErrorBoundary from '@/components/ErrorBoundary';
import OfflineBanner from '@/components/OfflineBanner';
import ImpersonationBanner from '@/components/ImpersonationBanner';
import { initIAP, teardownIAP } from '@/lib/iap';
import { colors } from '@/lib/theme';

// -----------------------------------------------------------------------------
// Splash-screen hardening (Build 56)
// -----------------------------------------------------------------------------
//   * Native iOS splash will NOT dismiss until `SplashScreen.hideAsync()` is
//     called AFTER the React root has been laid out. If JS hangs anywhere
//     during boot (Google Fonts fetch stall, Supabase getSession timeout, a
//     native module throwing synchronously, a corrupted SecureStore entry,
//     React Navigation linking resolution…) the splash stays up and the app
//     looks frozen.
//   * Defense in depth: (1) call preventAutoHideAsync at import-time, (2)
//     schedule an unconditional 3s hard-hide from the top of the module so
//     the splash can never outlive that window regardless of what JS does
//     next, (3) still honor fonts-ready + root-view onLayout as the primary
//     hide paths when the normal boot path wins, (4) top-level ErrorBoundary
//     also force-hides the splash on any render-time crash, and (5) emit
//     console.log boot milestones so the next freeze report lands with
//     actionable device-log breadcrumbs.
// -----------------------------------------------------------------------------

console.log('[boot] App module evaluating');

// Keep the native splash visible until fonts + providers are ready.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Hard safety timeout — if anything hangs during boot we force the splash to
// hide after this many ms so the user sees the UI (using system fonts as a
// fallback) instead of a frozen splash.
const BOOT_TIMEOUT_MS = 6000;
// Absolute ceiling — no matter what boot does, the native splash is force-
// dismissed within this window. This alone cures the vast majority of
// "app frozen on splash" reports.
const HARD_SPLASH_TIMEOUT_MS = 3000;

// Always-call splash hide helper — safe to call repeatedly.
async function hideSplashSafe(tag: string) {
  try {
    await SplashScreen.hideAsync();
    console.log(`[boot] splash hidden (${tag})`);
  } catch {
    /* no-op — hideAsync() is idempotent; a second call can reject. */
  }
}

// Fire-and-forget hard timeout. Runs at module-evaluation time so it starts
// counting the instant the JS bundle is executed, independent of React
// rendering.
setTimeout(() => {
  hideSplashSafe('hard-timeout');
}, HARD_SPLASH_TIMEOUT_MS);

// React Query — offline-first + 24h cache.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      gcTime: 1000 * 60 * 60 * 24,
      staleTime: 1000 * 60 * 5,
      retry: (failureCount) => failureCount < 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 3,
    },
  },
});

// Wire React Query's online/focus managers to RN primitives.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
);

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    BebasNeue_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Safety flag — flips true either when fonts resolve OR the timeout fires.
  // Guarantees we never sit on the splash indefinitely.
  const [bootReady, setBootReady] = useState(false);

  useEffect(() => {
    console.log('[boot] App component mounted');
  }, []);

  // Flip bootReady the moment fonts resolve (success or error).
  useEffect(() => {
    if (fontsLoaded || fontError) {
      console.log(
        `[boot] fonts ${fontsLoaded ? 'loaded' : 'errored'}${fontError ? ` (${fontError.message})` : ''}`,
      );
      setBootReady(true);
    }
  }, [fontsLoaded, fontError]);

  // Absolute safety timeout — force boot even if useFonts never settles.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!bootReady) {
        console.warn(
          '[boot] splash safety timeout fired — forcing UI render with fallback fonts.',
        );
        setBootReady(true);
      }
    }, BOOT_TIMEOUT_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once bootReady flips, hide the splash in a finally-safe way.
  useEffect(() => {
    if (bootReady) {
      hideSplashSafe('boot-ready');
    }
  }, [bootReady]);

  // Backup: fire the splash hide on first root-view layout. On iOS the native
  // splash will only dismiss once the RN root view has been laid out by the
  // native side, so pairing bootReady with onLayout eliminates the "fonts
  // resolved but splash still up" race.
  const onLayoutRootView = useCallback(async () => {
    console.log('[boot] root view laid out');
    if (bootReady) {
      await hideSplashSafe('root-onLayout');
    }
  }, [bootReady]);

  useEffect(() => {
    // Wire AppState → focusManager for React Query background refetch.
    const sub = AppState.addEventListener('change', (s) =>
      focusManager.setFocused(s === 'active'),
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    initIAP().catch((e) => console.warn('[IAP] init failed', e));
    return () => {
      teardownIAP().catch(() => {});
    };
  }, []);

  if (!bootReady) {
    // Splash is still up — render nothing yet. The safety timeout guarantees
    // we will eventually render even if useFonts / Expo Font never resolves.
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root} onLayout={onLayoutRootView}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <CookiePreferencesProvider>
                <SportProvider>
                  <AuthProvider>
                    <ImpersonationProvider>
                      <AthleteProfileProvider>
                        <PodcastPlayerProvider>
                          <NavigationContainer linking={linking}>
                            <ImpersonationBanner />
                            <OfflineBanner />
                            <RootNavigator />
                          </NavigationContainer>
                          <Toast />
                          <StatusBar style="light" />
                        </PodcastPlayerProvider>
                      </AthleteProfileProvider>
                    </ImpersonationProvider>
                  </AuthProvider>
                </SportProvider>
              </CookiePreferencesProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
