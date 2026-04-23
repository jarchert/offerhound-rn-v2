// AgencyTabs — 2 tabs per Part 2 §2.1: Dashboard, Letters
// Part 35 describes agency multi-recruiter collaboration + staff management.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';

import { makePlaceholder } from '@/navigation/PlaceholderScreen';

const AgencyDashboard = makePlaceholder('Agency Dashboard', 'Arrives in Session 8', 'Agency role lands in Session 8 with staff manager + team view + letters.');
const AgencyLettersScreen = makePlaceholder('Agency Letters', 'Arrives in Session 4', 'AI letter composer.');

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
      <Tab.Screen name="DashboardTab" component={AgencyDashboard} options={{ title: 'Home' }} />
      <Tab.Screen name="LettersTab" component={AgencyLettersScreen} options={{ title: 'Letters' }} />
    </Tab.Navigator>
  );
}
