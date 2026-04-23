// HSCoachTabs — 2 tabs per Part 2 §2.1: Dashboard, Letters
// Part 35 describes HS Coach endorsement composer + film/transcript verification.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';

import { makePlaceholder } from '@/navigation/PlaceholderScreen';

const HSCoachDashboard = makePlaceholder('HS Coach Dashboard', 'Arrives in Session 8', 'HS Coach role lands in Session 8 with endorsement composer + film/transcript verification.');
const HSCoachLettersScreen = makePlaceholder('HS Coach Letters', 'Arrives in Session 4', 'AI letter composer.');

const Tab = createBottomTabNavigator();

export default function HSCoachTabs() {
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
      <Tab.Screen name="DashboardTab" component={HSCoachDashboard} options={{ title: 'Home' }} />
      <Tab.Screen name="LettersTab" component={HSCoachLettersScreen} options={{ title: 'Letters' }} />
    </Tab.Navigator>
  );
}
