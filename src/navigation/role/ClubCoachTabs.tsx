// ClubCoachTabs — 3 tabs per Part 2 §2.1: Dashboard, Camps, Letters
// Part 34 of the conversion guide describes club coach CRM + messaging hub.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';

import CampsScreen from '@/screens/shared/CampsScreen';
import { makePlaceholder } from '@/navigation/PlaceholderScreen';

const ClubCoachDashboard = makePlaceholder('Club Coach Dashboard', 'Arrives in Session 8', 'Club Coach role lands in Session 8 with full CRM + messaging + calendar integration.');
const ClubLettersScreen = makePlaceholder('Club Letters', 'Arrives in Session 4', 'AI letter composer.');

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
      <Tab.Screen name="DashboardTab" component={ClubCoachDashboard} options={{ title: 'Home' }} />
      <Tab.Screen name="CampsTab" component={CampsScreen} options={{ title: 'Camps' }} />
      <Tab.Screen name="LettersTab" component={ClubLettersScreen} options={{ title: 'Letters' }} />
    </Tab.Navigator>
  );
}
