import React, { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import {
  QueryClient,
  QueryClientProvider,
  onlineManager,
  focusManager,
} from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';
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
import { colors } from '@/lib/theme';

// -----------------------------------------------------------------------------
// RootBootShell — the real app. Lazy-loaded from App.tsx so the heavy provider
// tree (Supabase client construction, SecureStore reads, React Query setup,
// React Navigation linking resolution, etc.) never contributes to the
// synchronous cold-start module-eval path that decides whether the native
// launch storyboard gets dismissed in time.
//
// IMPORTANT: `expo-iap` is intentionally NOT imported anywhere in this file
// tree. It is dynamically `require()`-d from Pricing/Subscription screens so
// StoreKit 2 handshake latency can never stall boot.
// -----------------------------------------------------------------------------

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

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
);

export default function RootBootShell() {
  const [fontsLoaded, fontError] = useFonts({
    BebasNeue_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Render the providers as soon as fonts resolve OR a short safety timeout
  // fires. Falls back to system fonts rather than leaving the user on a
  // spinner forever.
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    if (fontsLoaded || fontError) {
      console.log(
        `[boot] fonts ${fontsLoaded ? 'loaded' : 'errored'}` +
          (fontError ? ` (${fontError.message})` : ''),
      );
      setFontsReady(true);
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const t = setTimeout(() => {
      setFontsReady((prev: boolean) => {
        if (!prev) {
          console.warn('[boot] fonts safety timeout — rendering with fallbacks');
        }
        return true;
      });
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  // Wire AppState → focusManager for React Query background refetch.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) =>
      focusManager.setFocused(s === 'active'),
    );
    return () => sub.remove();
  }, []);

  // Lazy IAP init — fire-and-forget, well AFTER the first paint. We do NOT
  // block anything on this. If StoreKit stalls, only the Pricing screen
  // should care, and it can call initIAP() again on demand.
  useEffect(() => {
    const t = setTimeout(() => {
      import('@/lib/iap')
        .then(({ initIAP }) => initIAP().catch((e) => console.warn('[IAP] init failed', e)))
        .catch((e) => console.warn('[IAP] module import failed', e));
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  // Render a blank view while fonts are resolving. App.tsx is already
  // showing the boot beacon behind us via Suspense, so a blank View here
  // is safe — it layers on top of the beacon until providers mount.
  if (!fontsReady) {
    return <View style={styles.root} />;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
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
});
