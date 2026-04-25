// AgencyTabs — 2 tabs per Part 2 §2.1: Dashboard, Letters
// Part 35 describes agency multi-recruiter collaboration + staff management.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';

import AgencyDashboardScreen from '@/screens/agency/AgencyDashboardScreen';
import LetterComposerScreen from '@/screens/shared/LetterComposerScreen';

const Tab = createBottomTabNavigator();

export default function AgencyTabs() {
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
      <Tab.Screen name="DashboardTab" component={AgencyDashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="LettersTab" component={LetterComposerScreen} options={{ title: 'Letters' }} />
    </Tab.Navigator>
  );
}
