// HSCoachTabs — 2 tabs per Part 2 §2.1: Dashboard, Letters
// Part 35 describes HS Coach endorsement composer + film/transcript verification.
// HSCoachDashboardScreen is now the full RN port of the Lovable HSCoachDashboard page
// (see screens/hs-coach/HSCoachDashboardScreen.tsx).
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';
import { LayoutDashboard, Mail } from 'lucide-react-native';

import HSCoachDashboardScreen from '@/screens/hs-coach/HSCoachDashboardScreen';
import HSCoachLettersScreen from '@/screens/hs-coach/HSCoachLettersScreen';

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
      <Tab.Screen name="DashboardTab" component={HSCoachDashboardScreen} options={{ title: 'Home', tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} /> }} />
      <Tab.Screen name="LettersTab" component={HSCoachLettersScreen} options={{ title: 'Letters', tabBarIcon: ({ color, size }) => <Mail size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
