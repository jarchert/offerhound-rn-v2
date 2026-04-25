// ClubCoachTabs — 3 tabs per Part 2 §2.1: Dashboard, Camps, Letters.
// The Home tab now points at the full ported ClubCoachDashboardScreen
// (Lovable parity: 13 inner tabs covering teams, camps, calendar, staff,
// CRM, messaging, media, social, insights, directory, saved athletes, profile).
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';

import CampsScreen from '@/screens/shared/CampsScreen';
import ClubCoachDashboardScreen from '@/screens/club/ClubCoachDashboardScreen';
import LetterComposerScreen from '@/screens/shared/LetterComposerScreen';

const Tab = createBottomTabNavigator();

export default function ClubCoachTabs() {
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
      <Tab.Screen name="DashboardTab" component={ClubCoachDashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="CampsTab" component={CampsScreen} options={{ title: 'Camps' }} />
      <Tab.Screen name="LettersTab" component={LetterComposerScreen} options={{ title: 'Letters' }} />
    </Tab.Navigator>
  );
}
