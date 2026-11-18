import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';

import React, { useCallback, useEffect } from 'react';
import { AppState,View,Text,Pressable,StyleSheet,ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer,DarkTheme,DefaultTheme } from '@react-navigation/native';
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

import { AuthProvider,useAuth } from '@/contexts/AuthContext';
import { ThemeProvider,useTheme } from '@/contexts/ThemeContext';
import { SportProvider } from '@/contexts/SportContext';
import { ImpersonationProvider } from '@/contexts/ImpersonationContext';
import { AthleteProfileProvider } from '@/contexts/AthleteProfileContext';
import { PodcastPlayerProvider } from '@/contexts/PodcastPlayerContext';
import { CookiePreferencesProvider } from '@/contexts/CookiePreferencesContext';

import RootNavigator from '@/navigation/RootNavigator';
import { linking } from '@/navigation/linking';
import { navigationRef } from '@/navigation/navigationRef';
import ErrorBoundary from '@/components/ErrorBoundary';
import OfflineBanner from '@/components/OfflineBanner';
import ImpersonationBanner from '@/components/ImpersonationBanner';
import { FirstLaunchConsentModal, useCookieConsent } from '@/components/FirstLaunchConsentModal';
import { initIAP, teardownIAP } from '@/lib/iap';
import { colors } from '@/lib/theme';
import {resolvedPalette} from '@/lib/adaptiveTheme';

function ThemedNavigation({children}:{children:React.ReactNode}) {
  const {theme}=useTheme();const palette=resolvedPalette(theme),base=theme==='dark'?DarkTheme:DefaultTheme;
  const {isLoading,user,userRole,roleError,retryRoleLookup,signOut}=useAuth();
  if(user&&roleError)return <View style={{flex:1,backgroundColor:palette.background,alignItems:'center',justifyContent:'center',padding:24,gap:16}}><Text style={{color:palette.foreground}}>Your account role could not be loaded.</Text><Pressable accessibilityRole="button" onPress={()=>void retryRoleLookup()}><Text style={{color:palette.primary}}>Retry account loading</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>void signOut()}><Text style={{color:palette.foreground}}>Sign out</Text></Pressable></View>;
  // Resolve the session before React Navigation consumes a cold-start link.
  if(isLoading||(user&&!userRole))return <View style={{flex:1,backgroundColor:palette.background,alignItems:'center',justifyContent:'center'}}><ActivityIndicator accessibilityLabel="Restoring session" color={palette.primary}/></View>;
  return <NavigationContainer ref={navigationRef} linking={linking} theme={{...base,colors:{...base.colors,background:palette.background,card:palette.card,text:palette.foreground,border:palette.border,primary:palette.primary}}}>{children}</NavigationContainer>;
}
function ThemedStatusBar(){const {theme}=useTheme();return <StatusBar style={theme==='dark'?'light':'dark'}/>;}

// Keep the native splash visible until fonts + providers are ready.
SplashScreen.preventAutoHideAsync().catch(() => {});

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

  // First-launch cookie consent modal — shown once on fresh install.
  const { visible: consentVisible, handleAcceptAll, handleAcceptEssential, handleCustomize } = useCookieConsent();

  // Hide splash once fonts are ready.
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

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

  if (!fontsLoaded && !fontError) {
    // Splash is still up — render nothing yet.
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
                          <ThemedNavigation>
                            <ImpersonationBanner />
                            <OfflineBanner />
                            <RootNavigator />
                            <FirstLaunchConsentModal
                              visible={consentVisible}
                              onAcceptAll={handleAcceptAll}
                              onAcceptEssential={handleAcceptEssential}
                              onCustomize={handleCustomize}
                            />
                          </ThemedNavigation>
                          <Toast />
                          <ThemedStatusBar />
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
