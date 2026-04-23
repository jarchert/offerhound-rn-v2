// ParentTabs — 2 tabs per Part 2 §2.1: Dashboard, TrustSafety
// Part 33 describes parent experience + COPPA consent flows.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';

import ParentDashboard from '@/screens/parent/ParentDashboard';
import { makePlaceholder } from '@/navigation/PlaceholderScreen';

const ParentTrustSafetyScreen = makePlaceholder('Trust & Safety', 'Arrives in Session 8', 'Parental oversight, consent management, and safety controls.');

const Tab = createBottomTabNavigator();

export default function ParentTabs() {
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
      <Tab.Screen name="DashboardTab" component={ParentDashboard} options={{ title: 'Home' }} />
      <Tab.Screen name="TrustSafetyTab" component={ParentTrustSafetyScreen} options={{ title: 'Safety' }} />
    </Tab.Navigator>
  );
}
