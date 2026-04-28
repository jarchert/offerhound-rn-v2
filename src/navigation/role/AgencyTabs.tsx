// AgencyTabs — 2 tabs per Part 2 §2.1: Dashboard, Letters
// Part 35 describes agency multi-recruiter collaboration + staff management.
// AgencyDashboardScreen is now the full RN port of the Lovable AgencyDashboard page
// (see screens/agency/AgencyDashboardScreen.tsx).
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';
import { Building2, Mail } from 'lucide-react-native';

import AgencyDashboardScreen from '@/screens/agency/AgencyDashboardScreen';
import CoachLettersScreen from '@/screens/coach/CoachLettersScreen';

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
      <Tab.Screen name="DashboardTab" component={AgencyDashboardScreen} options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Building2 size={size} color={color} /> }} />
      <Tab.Screen name="LettersTab" component={CoachLettersScreen} options={{ title: 'Letters', tabBarIcon: ({ color, size }) => <Mail size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
