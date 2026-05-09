// PublicTabs — unauthenticated browse per Part 2 §2.1
// 4 tabs: Landing, Discover, Podcasts, Account
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { colors, typography } from '@/lib/theme';

import LandingScreen from '@/screens/auth/LandingScreen';
import SportPickerScreen from '@/screens/shared/SportPickerScreen';
import PodcastScreen from '@/screens/influencer/PodcastScreen';
import SignInScreen from '@/screens/auth/SignInScreen';

// PORT-PENDING: no Lovable source mapped to a dedicated public-only screen beyond the
// four tabs above (Landing, Discover/SportPicker, Podcasts, Account/SignIn). If a future
// public-only surface (e.g. a dedicated Discover hub distinct from the sport picker) gets
// designed in Lovable, port it here and reintroduce a placeholder during the gap.

const PublicDiscoverScreen = SportPickerScreen; // Session 2: sport picker acts as discover hub

const Tab = createBottomTabNavigator();

export default function PublicTabs() {
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
      <Tab.Screen name="DiscoverTab" component={PublicDiscoverScreen} options={{ title: 'Discover' }} />
      <Tab.Screen name="PodcastsTab" component={PodcastScreen} options={{ title: 'Podcasts' }} />
      {/* Build 54 fix: Sign In tab now routes straight to the dedicated AuthStack
          (no embedded footer nav), rather than rendering SignInScreen inside the tab bar. */}
      <Tab.Screen
        name="AccountTab"
        component={SignInScreen}
        options={{ title: 'Sign In' }}
        listeners={({ navigation }: any) => ({
          tabPress: (e: any) => {
            e.preventDefault();
            navigation.getParent()?.dispatch(
              CommonActions.navigate({ name: 'AuthStack' as never })
            );
          },
        })}
      />
    </Tab.Navigator>
  );
}
