// PublicTabs — unauthenticated browse per Part 2 §2.1
// Tabs: Landing, Discover (auth-only), Podcasts, Account
// Discover is intentionally hidden from unauthenticated users — the tab is
// not rendered in the tab bar at all (Bug: Group 4 #8). Since PublicTabs is
// currently only mounted for unauthenticated sessions the tab will always be
// absent here, but the conditional keeps behaviour correct if the navigator
// is ever reused in a mixed-auth surface.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';
import { useAuth } from '@/contexts/AuthContext';

import LandingScreen from '@/screens/auth/LandingScreen';
import SportPickerScreen from '@/screens/shared/SportPickerScreen';
import PublicDiscoverScreen from '@/screens/shared/PublicDiscoverScreen';
import PodcastScreen from '@/screens/influencer/PodcastScreen';
import SignInScreen from '@/screens/auth/SignInScreen';

// PORT-PENDING: no Lovable source mapped to a dedicated public-only screen beyond the
// four tabs above (Landing, Discover/SportPicker, Podcasts, Account/SignIn). If a future
// public-only surface (e.g. a dedicated Discover hub distinct from the sport picker) gets
// designed in Lovable, port it here and reintroduce a placeholder during the gap.

const Tab = createBottomTabNavigator();

export default function PublicTabs() {
  const { isAuthenticated } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.foregroundSubtle,
        tabBarLabelStyle: {
          fontFamily: typography.fontFamily.bodyMedium,
          fontSize: 11,
          letterSpacing: 0.5,
        },
      }}>
      <Tab.Screen name="LandingTab" component={LandingScreen} options={{ title: 'Home' }} />
      {isAuthenticated && (
        <Tab.Screen name="DiscoverTab" component={PublicDiscoverScreen} options={{ title: 'Discover' }} />
      )}
      <Tab.Screen name="PodcastsTab" component={PodcastScreen} options={{ title: 'Podcasts' }} />
      <Tab.Screen name="AccountTab" component={SignInScreen} options={{ title: 'Account' }} />
    </Tab.Navigator>
  );
}
