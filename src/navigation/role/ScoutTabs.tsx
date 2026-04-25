// ScoutTabs — 4 tabs per Part 2 §2.1: Dashboard, Letters, Trends, Onboarding
// Part 35 of the conversion guide describes scout nav + Kanban pipeline.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';

import ScoutDashboard from '@/screens/scout/ScoutDashboard';
import ScoutLettersScreen from '@/screens/scout/ScoutLettersScreen';
import { makePlaceholder } from '@/navigation/PlaceholderScreen';

// PORT-PENDING: Lovable source at offerhound-repo/src/pages/ScoutTrends.tsx (171 LOC) — schedule in next wave
const ScoutTrendsScreen = makePlaceholder('Scout Trends', 'Arrives in Session 4', 'Victory Native charts + gesture-driven tooltips.');
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/ScoutOnboarding.tsx (154 LOC) — schedule in next wave
const ScoutOnboardingScreen = makePlaceholder('Scout Onboarding', 'Arrives in Session 7', 'Scout-specific onboarding flow.');

const Tab = createBottomTabNavigator();

export default function ScoutTabs() {
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
      <Tab.Screen name="DashboardTab" component={ScoutDashboard} options={{ title: 'Home' }} />
      <Tab.Screen name="LettersTab" component={ScoutLettersScreen} options={{ title: 'Letters' }} />
      <Tab.Screen name="TrendsTab" component={ScoutTrendsScreen} options={{ title: 'Trends' }} />
      <Tab.Screen name="OnboardingTab" component={ScoutOnboardingScreen} options={{ title: 'Guide' }} />
    </Tab.Navigator>
  );
}
